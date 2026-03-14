import "server-only";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getE2EAuthProfile,
  isE2EAuthBypassEnabled,
  E2E_AUTH_COOKIE,
  E2E_AUTH_USER_COOKIE,
} from "@/shared/auth/e2e";
import { env } from "@/shared/config/env";
import { createServerSupabaseClient } from "@/shared/auth/supabase/server";
import { db } from "@/shared/db/client";
import {
  authIdentities,
  userPreferences,
  users,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type SyncedUserProfile = CurrentUser & {
  emailVerifiedAt: Date | null;
};

type SupabaseIdentity = {
  provider?: string | null;
  id?: string | null;
  identity_id?: string | null;
  last_sign_in_at?: string | null;
  identity_data?: Record<string, unknown> | null;
};

function asIdentityRecords(input: unknown): SupabaseIdentity[] {
  return Array.isArray(input) ? (input as SupabaseIdentity[]) : [];
}

function getIdentitySubject(identity: SupabaseIdentity) {
  if (identity.id) {
    return identity.id;
  }

  if (identity.identity_id) {
    return identity.identity_id;
  }

  const profile = identity.identity_data;
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const subject =
    profile.sub ??
    profile.user_id ??
    profile.id ??
    profile.provider_id ??
    profile.email;

  return typeof subject === "string" ? subject : null;
}

export async function syncAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const profile = {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    avatarUrl: user.user_metadata.avatar_url ?? null,
    emailVerifiedAt: user.email_confirmed_at
      ? new Date(user.email_confirmed_at)
      : null,
  } satisfies SyncedUserProfile;

  const identityRecords = asIdentityRecords(
    (user as { identities?: unknown }).identities
  )
    .map((identity) => {
      const provider =
        typeof identity.provider === "string" ? identity.provider : null;
      const providerSubject = getIdentitySubject(identity);

      if (!provider || !providerSubject) {
        return null;
      }

      const rawProfile =
        identity.identity_data && typeof identity.identity_data === "object"
          ? identity.identity_data
          : {};
      const identityEmail = rawProfile.email;

      return {
        userId: user.id,
        provider,
        providerSubject,
        email: typeof identityEmail === "string" ? identityEmail : user.email,
        rawProfile,
        lastSignInAt: identity.last_sign_in_at
          ? new Date(identity.last_sign_in_at)
          : new Date(),
      };
    })
    .filter(
      (
        identity
      ): identity is {
        userId: string;
        provider: string;
        providerSubject: string;
        email: string;
        rawProfile: Record<string, unknown>;
        lastSignInAt: Date;
      } => identity !== null
    );

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        emailVerifiedAt: profile.emailVerifiedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: profile.emailVerifiedAt,
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(userPreferences)
      .values({
        userId: user.id,
      })
      .onConflictDoNothing({
        target: userPreferences.userId,
      });

    if (identityRecords.length > 0) {
      for (const identity of identityRecords) {
        await tx
          .insert(authIdentities)
          .values(identity)
          .onConflictDoUpdate({
            target: [
              authIdentities.provider,
              authIdentities.providerSubject,
            ],
            set: {
              userId: user.id,
              email: identity.email,
              rawProfile: identity.rawProfile,
              lastSignInAt: identity.lastSignInAt,
              updatedAt: new Date(),
            },
          });
      }
    }
  });

  return profile;
}

async function hasE2EAuthCookie() {
  if (!isE2EAuthBypassEnabled()) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(E2E_AUTH_COOKIE)?.value === "1";
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getE2EAuthUserId() {
  const cookieStore = await cookies();
  const candidate = cookieStore.get(E2E_AUTH_USER_COOKIE)?.value ?? "";

  if (UUID_V4_PATTERN.test(candidate)) {
    return candidate;
  }

  return "11111111-1111-4111-8111-111111111111";
}

async function syncE2EAuthenticatedUser() {
  const e2eUserId = await getE2EAuthUserId();
  let profile = getE2EAuthProfile(e2eUserId) satisfies SyncedUserProfile;

  const serviceKey = env.SUPABASE_SECRET_KEY;
  if (serviceKey) {
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let resolvedAuthUserId = profile.id;
    const created = await admin.auth.admin.createUser({
      id: profile.id,
      email: profile.email,
      email_confirm: true,
      user_metadata: {
        full_name: profile.fullName,
      },
    });

    if (created.data.user) {
      resolvedAuthUserId = created.data.user.id;
    } else {
      const listedUsers = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const availableUsers = listedUsers.data.users ?? [];
      const userByEmail = availableUsers.find(
        (user) => user.email?.toLowerCase() === profile.email.toLowerCase()
      );
      const fallbackUser = availableUsers[0];

      if (userByEmail) {
        resolvedAuthUserId = userByEmail.id;
        profile = {
          ...profile,
          id: userByEmail.id,
          email: userByEmail.email ?? profile.email,
        };
      } else if (fallbackUser) {
        resolvedAuthUserId = fallbackUser.id;
        profile = {
          ...profile,
          id: fallbackUser.id,
          email: fallbackUser.email ?? profile.email,
        };
      } else {
        throw new Error(created.error?.message ?? "Unable to create E2E user.");
      }
    }

    if (resolvedAuthUserId !== profile.id) {
      profile = { ...profile, id: resolvedAuthUserId };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        emailVerifiedAt: profile.emailVerifiedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: profile.emailVerifiedAt,
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(userPreferences)
      .values({
        userId: profile.id,
      })
      .onConflictDoNothing({
        target: userPreferences.userId,
      });
  });

  return profile;
}

export async function getCurrentSession() {
  if (await hasE2EAuthCookie()) {
    return {
      data: {
        session: {
          access_token: "e2e-auth-token",
        },
      },
      error: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
  if (await hasE2EAuthCookie()) {
    return syncE2EAuthenticatedUser();
  }

  return syncAuthenticatedUser();
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function getWorkspaceAccess(
  userId: string,
  workspaceSlug: string
) {
  const rows = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      workspace: {
        id: workspaces.id,
        slug: workspaces.slug,
        name: workspaces.name,
      },
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug)
      )
    );

  return rows[0] ?? null;
}

export async function requireWorkspaceAccess(workspaceSlug: string) {
  const user = await requireUser();
  const access = await getWorkspaceAccess(user.id, workspaceSlug);

  if (!access) {
    redirect("/app/new-workspace");
  }

  return {
    user,
    access,
  };
}
