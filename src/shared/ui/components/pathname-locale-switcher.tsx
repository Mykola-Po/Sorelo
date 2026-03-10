"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { SupportedLocale } from "@/shared/i18n/config";
import { LocaleSwitcher } from "@/shared/ui/components/locale-switcher";

type PathnameLocaleSwitcherProps = {
  currentLocale: SupportedLocale;
};

export function PathnameLocaleSwitcher({
  currentLocale,
}: PathnameLocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const redirectTo = pathname ? `${pathname}${query ? `?${query}` : ""}` : "/";

  return (
    <LocaleSwitcher currentLocale={currentLocale} redirectTo={redirectTo} />
  );
}
