import { describe, expect, it } from "vitest";

import { resolveAppOrigin } from "@/shared/auth/origin";

describe("resolveAppOrigin", () => {
  it("prefers the request origin when it is available", () => {
    expect(
      resolveAppOrigin(
        {
          origin: "http://127.0.0.1:3000",
          host: "localhost:3000",
        },
        "http://localhost:3000"
      )
    ).toBe("http://127.0.0.1:3000");
  });

  it("builds an origin from forwarded host headers when origin is missing", () => {
    expect(
      resolveAppOrigin(
        {
          xForwardedProto: "http",
          xForwardedHost: "127.0.0.1:3000",
        },
        "http://localhost:3000"
      )
    ).toBe("http://127.0.0.1:3000");
  });

  it("falls back to the configured app origin when request headers are absent", () => {
    expect(resolveAppOrigin({}, "http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000"
    );
  });
});
