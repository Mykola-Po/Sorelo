import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import {
  InboxCommandError,
  answerInboxClarificationCommand,
  createInboxItemCommand,
  processInboxItemCommand,
} from "@/features/inbox/commands";
import { db, sqlClient } from "@/shared/db/client";
import {
  inboxClarificationRequests,
  inboxItems,
  maps,
  users,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";

type InboxScopeFixture = {
  userId: string;
  workspaceId: string;
  mapId: string;
};

const trackedWorkspaceIds: string[] = [];
const trackedUserIds: string[] = [];

function createSlug(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function createInboxScopeFixture(label: string) {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const mapId = randomUUID();
  const workspaceSlug = createSlug(`inbox-${label}`);
  const now = new Date();
  const nowIso = now.toISOString();

  await sqlClient`
    insert into auth.users (
      id,
      aud,
      role,
      email,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    ) values (
      ${userId},
      'authenticated',
      'authenticated',
      ${`${workspaceSlug}@example.com`},
      ${nowIso},
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      ${nowIso},
      ${nowIso},
      false,
      false
    )
  `;

  await db.insert(users).values({
    id: userId,
    email: `${workspaceSlug}@example.com`,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaces).values({
    id: workspaceId,
    slug: workspaceSlug,
    name: `Inbox ${label}`,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: randomUUID(),
    workspaceId,
    userId,
    role: "owner",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(maps).values({
    id: mapId,
    workspaceId,
    title: `Map ${label}`,
    slug: createSlug(`map-${label}`),
    subjectLabel: "Alex",
    description: "Inbox integration fixture.",
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  trackedWorkspaceIds.push(workspaceId);
  trackedUserIds.push(userId);

  return {
    userId,
    workspaceId,
    mapId,
  } satisfies InboxScopeFixture;
}

async function expectInboxCommandError(
  work: Promise<unknown>,
  input: {
    statusCode: number;
    code: InboxCommandError["code"];
    message: string;
  }
) {
  await expect(work).rejects.toMatchObject({
    name: "InboxCommandError",
    statusCode: input.statusCode,
    code: input.code,
    message: input.message,
  });
}

describe.sequential("inbox commands integration", () => {
  beforeEach(() => {
    trackedWorkspaceIds.length = 0;
    trackedUserIds.length = 0;
  });

  afterEach(async () => {
    if (trackedWorkspaceIds.length > 0) {
      await db
        .delete(workspaces)
        .where(inArray(workspaces.id, [...trackedWorkspaceIds]));
    }

    if (trackedUserIds.length > 0) {
      for (const userId of trackedUserIds) {
        await sqlClient`
          delete from auth.users
          where id = ${userId}
        `;
      }
    }
  });

  it("creates inbox items, replays matching idempotent creates, and rejects cross-workspace reuse", async () => {
    const scope = await createInboxScopeFixture("create");
    const otherScope = await createInboxScopeFixture("other");
    const idempotencyKey = `integration-${randomUUID()}`;

    const created = await createInboxItemCommand({
      userId: scope.userId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceType: "manual_note",
      rawText: "Public criticism causes withdrawal.",
      sourceRef: null,
      idempotencyKey,
    });

    const replay = await createInboxItemCommand({
      userId: scope.userId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceType: "manual_note",
      rawText: "Public criticism causes withdrawal.",
      sourceRef: null,
      idempotencyKey,
    });

    expect(created.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.item.id).toBe(created.item.id);

    await expectInboxCommandError(
      createInboxItemCommand({
        userId: otherScope.userId,
        workspaceId: otherScope.workspaceId,
        mapId: otherScope.mapId,
        sourceType: "manual_note",
        rawText: "Public criticism causes withdrawal.",
        sourceRef: null,
        idempotencyKey,
      }),
      {
        statusCode: 409,
        code: "inbox_duplicate_conflict",
        message:
          "Idempotency key already belongs to another workspace, map, or user.",
      }
    );

    await expectInboxCommandError(
      createInboxItemCommand({
        userId: scope.userId,
        workspaceId: scope.workspaceId,
        mapId: scope.mapId,
        sourceType: "manual_note",
        rawText: "The same key cannot create a different signal.",
        sourceRef: null,
        idempotencyKey,
      }),
      {
        statusCode: 409,
        code: "inbox_duplicate_conflict",
        message:
          "Idempotency key already belongs to a different inbox item in this workspace map.",
      }
    );
  });

  it("processes scoped inbox items and rejects cross-workspace access", async () => {
    const scope = await createInboxScopeFixture("process");
    const otherScope = await createInboxScopeFixture("process-other");
    const created = await createInboxItemCommand({
      userId: scope.userId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction.",
      sourceRef: null,
      idempotencyKey: `process-${randomUUID()}`,
    });

    const detail = await processInboxItemCommand({
      workspaceId: scope.workspaceId,
      itemId: created.item.id,
    });

    expect(detail.item.id).toBe(created.item.id);
    expect(detail.item.workspaceId).toBe(scope.workspaceId);
    expect(detail.item.mapId).toBe(scope.mapId);
    expect(detail.item.status).not.toBe("received");

    await expectInboxCommandError(
      processInboxItemCommand({
        workspaceId: otherScope.workspaceId,
        itemId: created.item.id,
      }),
      {
        statusCode: 404,
        code: "inbox_item_not_found",
        message: "Inbox item not found.",
      }
    );
  });

  it("returns a conflict for invalid process state transitions", async () => {
    const scope = await createInboxScopeFixture("state");
    const created = await createInboxItemCommand({
      userId: scope.userId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceType: "manual_note",
      rawText: "Need clarification before any rerun.",
      sourceRef: null,
      idempotencyKey: `state-${randomUUID()}`,
    });

    await db
      .update(inboxItems)
      .set({
        status: "clarification_requested",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, created.item.id));

    await expectInboxCommandError(
      processInboxItemCommand({
        workspaceId: scope.workspaceId,
        itemId: created.item.id,
      }),
      {
        statusCode: 409,
        code: "inbox_process_state_conflict",
        message:
          "Inbox item is waiting for a clarification answer and cannot be blindly reprocessed.",
      }
    );
  });

  it("returns a conflict when another worker already holds the processing lease", async () => {
    const scope = await createInboxScopeFixture("lease");
    const created = await createInboxItemCommand({
      userId: scope.userId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceType: "manual_note",
      rawText: "This item is already being processed elsewhere.",
      sourceRef: null,
      idempotencyKey: `lease-${randomUUID()}`,
    });

    await db
      .update(inboxItems)
      .set({
        processingClaimId: randomUUID(),
        processingClaimedByUserId: scope.userId,
        processingLeaseExpiresAt: new Date(Date.now() + 60_000),
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, created.item.id));

    await expectInboxCommandError(
      processInboxItemCommand({
        workspaceId: scope.workspaceId,
        itemId: created.item.id,
      }),
      {
        statusCode: 409,
        code: "inbox_process_state_conflict",
        message: "Inbox item is already being processed by another worker.",
      }
    );
  });

  it("reruns clarification answers inside the declared workspace and blocks cross-workspace answers", async () => {
    const scope = await createInboxScopeFixture("clarification");
    const otherScope = await createInboxScopeFixture("clarification-other");
    const created = await createInboxItemCommand({
      userId: scope.userId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceType: "manual_note",
      rawText: "What exactly triggers the reaction first?",
      sourceRef: null,
      idempotencyKey: `clarification-${randomUUID()}`,
    });

    await db
      .update(inboxItems)
      .set({
        status: "clarification_requested",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, created.item.id));

    const [request] = await db
      .insert(inboxClarificationRequests)
      .values({
        itemId: created.item.id,
        question: "What exactly triggers the reaction first?",
        reason: "The missing trigger detail changes the route.",
        status: "pending",
      })
      .returning({
        id: inboxClarificationRequests.id,
      });

    if (!request) {
      throw new Error("Clarification request setup failed.");
    }

    await expectInboxCommandError(
      answerInboxClarificationCommand({
        workspaceId: otherScope.workspaceId,
        requestId: request.id,
        answerText: "It starts when the criticism comes from a close partner.",
      }),
      {
        statusCode: 404,
        code: "inbox_clarification_request_not_found",
        message: "Clarification request not found.",
      }
    );

    const detail = await answerInboxClarificationCommand({
      workspaceId: scope.workspaceId,
      requestId: request.id,
      answerText: "It starts when the criticism comes from a close partner.",
    });

    expect(detail.item.id).toBe(created.item.id);
    expect(
      detail.clarificationRequests.some((entry) => entry.status === "answered")
    ).toBe(true);

    await expectInboxCommandError(
      answerInboxClarificationCommand({
        workspaceId: scope.workspaceId,
        requestId: request.id,
        answerText: "A second answer should conflict.",
      }),
      {
        statusCode: 409,
        code: "inbox_clarification_state_conflict",
        message: "Clarification request is no longer pending.",
      }
    );
  });
});
