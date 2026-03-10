import { describe, expect, it } from "vitest";

import {
  getLocaleLabel,
  resolveSupportedLocale,
} from "@/shared/i18n/config";

describe("i18n config", () => {
  it("resolves supported locales and falls back to english", () => {
    expect(resolveSupportedLocale("en")).toBe("en");
    expect(resolveSupportedLocale("uk")).toBe("uk");
    expect(resolveSupportedLocale("ru")).toBe("ru");
    expect(resolveSupportedLocale("de")).toBe("en");
    expect(resolveSupportedLocale(undefined)).toBe("en");
  });

  it("maps locale labels for UI switcher", () => {
    expect(getLocaleLabel("en")).toBe("EN");
    expect(getLocaleLabel("uk")).toBe("UA");
    expect(getLocaleLabel("ru")).toBe("RU");
  });
});
