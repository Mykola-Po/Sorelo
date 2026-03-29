import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PublicLandingPage } from "@/features/landing/components/public-landing-page";
import { getCurrentSession } from "@/shared/auth/session";
import { LOCALE_COOKIE, resolveSupportedLocale } from "@/shared/i18n/config";
import { landingMessages } from "@/shared/i18n/messages/landing";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session.data.session) {
    redirect("/app");
  }

  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const copy = landingMessages[locale];

  return <PublicLandingPage locale={locale} copy={copy} />;
}
