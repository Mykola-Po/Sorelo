"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { env } from "@/shared/config/env";
import {
  E2E_AUTH_COOKIE,
  E2E_AUTH_USER_COOKIE,
  isE2EAuthBypassEnabled,
} from "@/shared/auth/e2e";
import { createServerSupabaseClient } from "@/shared/auth/supabase/server";

export async function signInWithGoogleAction() {
  if (isE2EAuthBypassEnabled()) {
    const cookieStore = await cookies();
    const e2eUserId = randomUUID();
    cookieStore.set(E2E_AUTH_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    cookieStore.set(E2E_AUTH_USER_COOKIE, e2eUserId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect("/app");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message ?? "Unable to start Google sign-in.");
  }

  redirect(data.url);
}

export async function signOutAction() {
  if (isE2EAuthBypassEnabled()) {
    const cookieStore = await cookies();
    cookieStore.delete(E2E_AUTH_COOKIE);
    cookieStore.delete(E2E_AUTH_USER_COOKIE);
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
