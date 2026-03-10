import { Button, Flex } from "@radix-ui/themes";

import { setLocaleAction } from "@/shared/i18n/actions";
import {
  getLocaleLabel,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/shared/i18n/config";

type LocaleSwitcherProps = {
  currentLocale: SupportedLocale;
  redirectTo: string;
};

export function LocaleSwitcher({
  currentLocale,
  redirectTo,
}: LocaleSwitcherProps) {
  return (
    <form action={setLocaleAction} className="locale-switcher-form">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Flex gap="2" align="center" className="locale-switcher">
        {SUPPORTED_LOCALES.map((locale) => (
          <Button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            size="1"
            variant={currentLocale === locale ? "solid" : "ghost"}
            color={currentLocale === locale ? "blue" : "gray"}
            radius="full"
          >
            {getLocaleLabel(locale)}
          </Button>
        ))}
      </Flex>
    </form>
  );
}
