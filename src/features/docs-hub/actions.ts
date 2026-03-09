"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createDocsHubAccessCookieValue,
  DOCS_HUB_ACCESS_COOKIE,
} from "@/features/docs-hub/access";
import { env } from "@/shared/config/env";
import { handbookPath } from "@/shared/config/routes";

export type UnlockHandbookState = {
  error?: string;
};

export async function unlockHandbookAction(
  _previousState: UnlockHandbookState,
  formData: FormData
): Promise<UnlockHandbookState> {
  if (!env.DOCS_HUB_PASSWORD) {
    return {
      error: "DOCS_HUB_PASSWORD is not configured on the server.",
    };
  }

  const submittedPassword = formData.get("password");

  if (typeof submittedPassword !== "string" || submittedPassword.length === 0) {
    return {
      error: "Enter the shared password.",
    };
  }

  if (submittedPassword !== env.DOCS_HUB_PASSWORD) {
    return {
      error: "Incorrect password.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    DOCS_HUB_ACCESS_COOKIE,
    createDocsHubAccessCookieValue(
      env.DOCS_HUB_PASSWORD,
      env.SUPABASE_SECRET_KEY
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: handbookPath(),
      maxAge: 60 * 60 * 12,
    }
  );

  redirect(handbookPath());
}

export async function lockHandbookAction() {
  const cookieStore = await cookies();
  cookieStore.set(DOCS_HUB_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: handbookPath(),
    expires: new Date(0),
  });

  redirect(handbookPath());
}
