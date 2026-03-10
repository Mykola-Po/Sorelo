"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  LOCALE_COOKIE,
  resolveSupportedLocale,
} from "@/shared/i18n/config";

export async function setLocaleAction(formData: FormData) {
  const locale = resolveSupportedLocale(
    typeof formData.get("locale") === "string"
      ? (formData.get("locale") as string)
      : undefined
  );
  const redirectToValue =
    typeof formData.get("redirectTo") === "string"
      ? (formData.get("redirectTo") as string)
      : "/";
  const redirectTo =
    redirectToValue.startsWith("/") && !redirectToValue.startsWith("//")
      ? redirectToValue
      : "/";

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(redirectTo);
}
