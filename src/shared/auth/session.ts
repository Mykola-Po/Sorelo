import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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

export async function getCurrentSession() {
  const supabase = await createServerSupabaseClient();
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
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
