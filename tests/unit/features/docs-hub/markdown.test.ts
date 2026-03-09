import { describe, expect, it } from "vitest";

import { loadParsedDocsHubDocument } from "@/features/docs-hub/markdown";

describe("loadParsedDocsHubDocument", () => {
  it("loads and parses the product spec from docs", async () => {
    const loadedDocument = await loadParsedDocsHubDocument("product-spec");

    expect(loadedDocument).not.toBeNull();
    expect(loadedDocument?.document.path).toBe("docs/product/product-spec.md");
    expect(loadedDocument?.content.title).toBe("Sorelo Product Spec");
    expect(
      loadedDocument?.content.headings.some(
        (heading) => heading.text === "V1 Scope"
      )
    ).toBe(true);
  });
});
