import { describe, expect, it } from "vitest";

import {
  findDocsHubDocument,
  loadDocsHubSections,
} from "@/features/docs-hub/manifest";

describe("docs hub manifest", () => {
  it("loads sections in authority-tier order", async () => {
    const sections = await loadDocsHubSections();

    expect(sections.map((section) => section.tier)).toEqual([
      "canon",
      "rules",
      "surfaces",
      "executable",
    ]);
    expect(sections.map((section) => section.id)).toEqual([
      "canon",
      "rules",
      "surfaces",
      "executable",
    ]);
  });

  it("keeps paths only on published documents", async () => {
    const sections = await loadDocsHubSections();
    const documents = sections.flatMap((section) => section.documents);
    const publishedDocuments = documents.filter(
      (document) => document.status === "existing"
    );
    const roadmapDocuments = documents.filter(
      (document) => document.status !== "existing"
    );

    expect(publishedDocuments.every((document) => Boolean(document.path))).toBe(
      true
    );
    expect(roadmapDocuments.every((document) => document.path === undefined)).toBe(
      true
    );
  });

  it("resolves document section metadata from the manifest", async () => {
    const document = await findDocsHubDocument("scenario-engine-v1");

    expect(document).not.toBeNull();
    expect(document?.tier).toBe("executable");
    expect(document?.sectionId).toBe("executable");
    expect(document?.sectionTitle).toBe("Executable Truth");
  });
});
