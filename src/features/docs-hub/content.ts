import { z } from "zod";

export const docsHubDocumentStatusSchema = z.enum(["existing", "next", "planned"]);
export const docsHubDocumentOwnerSchema = z.enum([
  "product",
  "engineering",
  "shared",
]);
export const docsHubTierSchema = z.enum([
  "canon",
  "rules",
  "surfaces",
  "executable",
]);

export type DocsHubDocumentStatus = z.infer<typeof docsHubDocumentStatusSchema>;
export type DocsHubDocumentOwner = z.infer<typeof docsHubDocumentOwnerSchema>;
export type DocsHubTier = z.infer<typeof docsHubTierSchema>;

export const docsHubDocumentSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    status: docsHubDocumentStatusSchema,
    owner: docsHubDocumentOwnerSchema,
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    path: z.string().min(1).optional(),
    derivedFrom: z.array(z.string().min(1)).optional(),
    legacyNote: z.string().min(1).optional(),
  })
  .superRefine((document, ctx) => {
    if (document.status === "existing" && !document.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Existing documents require a path.",
        path: ["path"],
      });
    }

    if (document.status !== "existing" && document.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only existing documents can declare a path.",
        path: ["path"],
      });
    }
  });

export const docsHubSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tier: docsHubTierSchema,
  summary: z.string().min(1),
  documents: z.array(docsHubDocumentSchema).min(1),
});

export const docsHubManifestSchema = z
  .object({
    sections: z.array(docsHubSectionSchema).min(1),
  })
  .superRefine((manifest, ctx) => {
    const sectionIds = new Set<string>();
    const documentIds = new Set<string>();

    manifest.sections.forEach((section, sectionIndex) => {
      if (sectionIds.has(section.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate section id "${section.id}".`,
          path: ["sections", sectionIndex, "id"],
        });
      }

      sectionIds.add(section.id);

      section.documents.forEach((document, documentIndex) => {
        if (documentIds.has(document.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate document id "${document.id}".`,
            path: ["sections", sectionIndex, "documents", documentIndex, "id"],
          });
        }

        documentIds.add(document.id);
      });
    });
  });

export type DocsHubDocument = z.infer<typeof docsHubDocumentSchema>;
export type DocsHubSection = z.infer<typeof docsHubSectionSchema>;
export type DocsHubManifest = z.infer<typeof docsHubManifestSchema>;
export type DocsHubResolvedDocument = DocsHubDocument & {
  sectionId: string;
  sectionTitle: string;
  tier: DocsHubTier;
};

export const docsHubTierOrder: Record<DocsHubTier, number> = {
  canon: 0,
  rules: 1,
  surfaces: 2,
  executable: 3,
};

export function formatDocsHubStatus(status: DocsHubDocumentStatus) {
  if (status === "existing") {
    return "Existing";
  }

  if (status === "next") {
    return "Next";
  }

  return "Planned";
}

export function formatDocsHubTier(tier: DocsHubTier) {
  if (tier === "canon") {
    return "Canon";
  }

  if (tier === "rules") {
    return "Rules";
  }

  if (tier === "surfaces") {
    return "Surfaces";
  }

  return "Executable";
}
