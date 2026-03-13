import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import {
  docsHubManifestSchema,
  docsHubTierOrder,
  type DocsHubManifest,
  type DocsHubResolvedDocument,
} from "@/features/docs-hub/content";

const handbookManifestPath = path.join(process.cwd(), "handbook", "manifest.json");

async function readDocsHubManifest(): Promise<DocsHubManifest> {
  const rawManifest = await fs.readFile(handbookManifestPath, "utf8");
  const parsedManifest = docsHubManifestSchema.parse(JSON.parse(rawManifest));

  return {
    sections: [...parsedManifest.sections].sort(
      (left, right) => docsHubTierOrder[left.tier] - docsHubTierOrder[right.tier]
    ),
  };
}

export async function loadDocsHubSections() {
  return (await readDocsHubManifest()).sections;
}

export async function findDocsHubDocument(
  documentId: string
): Promise<DocsHubResolvedDocument | null> {
  const sections = await loadDocsHubSections();

  for (const section of sections) {
    const document = section.documents.find((entry) => entry.id === documentId);

    if (document) {
      return {
        ...document,
        sectionId: section.id,
        sectionTitle: section.title,
        tier: section.tier,
      };
    }
  }

  return null;
}
