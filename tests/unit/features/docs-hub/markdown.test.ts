import { describe, expect, it } from "vitest";

import { loadParsedDocsHubDocument } from "@/features/docs-hub/markdown";

describe("loadParsedDocsHubDocument", () => {
  it("loads and parses the product spec from the handbook", async () => {
    const loadedDocument = await loadParsedDocsHubDocument("product-spec");

    expect(loadedDocument).not.toBeNull();
    expect(loadedDocument?.document.path).toBe("handbook/canon/product-spec.md");
    expect(loadedDocument?.content.title).toBe("Sorelo Product Spec");
    expect(
      loadedDocument?.content.headings.some(
        (heading) => heading.text === "V1 Scope"
      )
    ).toBe(true);
  });

  it("loads and parses the current user flows document from the handbook", async () => {
    const loadedDocument = await loadParsedDocsHubDocument("current-user-flows");

    expect(loadedDocument).not.toBeNull();
    expect(loadedDocument?.document.path).toBe(
      "handbook/surfaces/current-user-flows.md"
    );
    expect(loadedDocument?.content.title).toBe("Current Sorelo User Flows");
    expect(
      loadedDocument?.content.headings.some(
        (heading) => heading.text === "Primary V1 Flow"
      )
    ).toBe(true);
  });

  it("loads and parses the project working guide from the handbook", async () => {
    const loadedDocument = await loadParsedDocsHubDocument("project-working-guide");

    expect(loadedDocument).not.toBeNull();
    expect(loadedDocument?.document.path).toBe(
      "handbook/executable/project-working-guide.md"
    );
    expect(loadedDocument?.content.title).toBe("Project Working Guide");
    expect(
      loadedDocument?.content.headings.some(
        (heading) => heading.text === "Repository Map"
      )
    ).toBe(true);
  });

  it("returns null for roadmap entries without published files", async () => {
    await expect(loadParsedDocsHubDocument("surface-copy-audit")).resolves.toBeNull();
  });

  it("returns null for unknown document ids", async () => {
    await expect(loadParsedDocsHubDocument("missing-document")).resolves.toBeNull();
  });
});
