export type DocsHubDocumentStatus = "existing" | "next" | "planned";

export type DocsHubDocument = {
  id: string;
  title: string;
  status: DocsHubDocumentStatus;
  priority: "P0" | "P1" | "P2";
  owner: "product" | "engineering" | "shared";
  path: string;
  summary: string;
  tags: string[];
};

export type DocsHubSection = {
  id: string;
  title: string;
  summary: string;
  documents: DocsHubDocument[];
};

export const docsHubSections: DocsHubSection[] = [
  {
    id: "product-direction",
    title: "Product Direction",
    summary:
      "Defines what Sorelo is, who it serves, and what must remain stable across product, onboarding, and language.",
    documents: [
      {
        id: "source-of-truth",
        title: "Sorelo Source Of Truth",
        status: "existing",
        priority: "P0",
        owner: "product",
        path: "docs/product/sorelo-source-of-truth.md",
        summary:
          "Canonical statement of the product model: Map, Concept, Link, Inspector, Scenario.",
        tags: ["product", "core model", "terminology"],
      },
      {
        id: "content-framework",
        title: "Content Documentation Framework",
        status: "existing",
        priority: "P1",
        owner: "product",
        path: "docs/content/sorelo-content-documentation-framework.md",
        summary:
          "Language and content framework used to keep product copy stable and coherent.",
        tags: ["content", "copy", "messaging"],
      },
      {
        id: "product-spec",
        title: "Product Spec",
        status: "existing",
        priority: "P0",
        owner: "product",
        path: "docs/product/product-spec.md",
        summary:
          "Working product contract for v1 scope, non-goals, glossary, and first-user value.",
        tags: ["scope", "v1", "glossary", "product"],
      },
      {
        id: "user-flows",
        title: "User Flows",
        status: "next",
        priority: "P0",
        owner: "shared",
        path: "docs/product/user-flows.md",
        summary:
          "First-session, map-building, scenario, error, and mobile flows for real product behavior.",
        tags: ["ux", "onboarding", "flows", "mobile"],
      },
    ],
  },
  {
    id: "data-model",
    title: "Data Model",
    summary:
      "Separates canonical product truth from provenance, learning traces, and evaluation storage.",
    documents: [
      {
        id: "public-schema",
        title: "Public Schema",
        status: "next",
        priority: "P0",
        owner: "engineering",
        path: "docs/data/public-schema.md",
        summary:
          "Operational truth-layer for workspaces, maps, concepts, links, scenarios, runs, and activity.",
        tags: ["database", "public", "canonical state", "rls"],
      },
      {
        id: "learning-schema",
        title: "Learning Schema",
        status: "next",
        priority: "P0",
        owner: "engineering",
        path: "docs/data/learning-schema.md",
        summary:
          "Internal-only moat and ML/eval layer for source fragments, suggestions, resolutions, versions, and feedback.",
        tags: ["database", "learning", "moat", "provenance"],
      },
      {
        id: "entity-lifecycle",
        title: "Entity Lifecycle",
        status: "planned",
        priority: "P1",
        owner: "engineering",
        path: "docs/data/entity-lifecycle.md",
        summary:
          "Lifecycle rules for manual creation, suggestion-origin entities, archive, restore, split, merge, and lineage.",
        tags: ["concepts", "links", "lineage", "lifecycle"],
      },
      {
        id: "learning-pipeline",
        title: "Learning Pipeline",
        status: "planned",
        priority: "P1",
        owner: "engineering",
        path: "docs/data/learning-pipeline.md",
        summary:
          "Defines raw input to suggestion to resolution to provenance linkage without polluting canonical state.",
        tags: ["pipeline", "suggestions", "resolutions", "origin"],
      },
    ],
  },
  {
    id: "ux-and-interactions",
    title: "UX And Interactions",
    summary:
      "Documents the actual interaction model so the product remains canvas-first and predictable on desktop and mobile.",
    documents: [
      {
        id: "canvas-interactions",
        title: "Canvas Interactions",
        status: "next",
        priority: "P0",
        owner: "shared",
        path: "docs/ui/canvas-interactions.md",
        summary:
          "Interaction modes, selection rules, panel behavior, drag constraints, and click semantics.",
        tags: ["canvas", "inspector", "scenario", "interaction"],
      },
      {
        id: "design-rules",
        title: "Design Rules",
        status: "planned",
        priority: "P1",
        owner: "shared",
        path: "docs/ui/design-rules.md",
        summary:
          "Density, shell, spacing, local-scroll, and progressive-disclosure rules for the product UI.",
        tags: ["ui", "density", "layout", "scroll"],
      },
      {
        id: "scenario-engine-v1",
        title: "Scenario Engine V1",
        status: "next",
        priority: "P0",
        owner: "engineering",
        path: "docs/domain/scenario-engine-v1.md",
        summary:
          "Deterministic explainable scenario traversal contract, including relation semantics and scoring.",
        tags: ["scenario", "engine", "deterministic", "explainability"],
      },
    ],
  },
  {
    id: "security-and-permissions",
    title: "Security And Permissions",
    summary:
      "Defines who can do what, what stays internal, and how sensitive map and learning data should be handled.",
    documents: [
      {
        id: "permissions-matrix",
        title: "Permissions Matrix",
        status: "next",
        priority: "P0",
        owner: "engineering",
        path: "docs/security/permissions-matrix.md",
        summary:
          "Owner/admin/member matrix across maps, concepts, links, scenarios, learning, and settings.",
        tags: ["permissions", "roles", "security", "rls"],
      },
      {
        id: "data-governance",
        title: "Data Governance",
        status: "planned",
        priority: "P1",
        owner: "engineering",
        path: "docs/security/data-governance.md",
        summary:
          "Rules for handling sensitive human-model data and internal learning traces.",
        tags: ["privacy", "governance", "retention", "security"],
      },
      {
        id: "retention-and-deletion",
        title: "Retention And Deletion",
        status: "planned",
        priority: "P2",
        owner: "engineering",
        path: "docs/security/retention-and-deletion.md",
        summary:
          "Retention defaults, purge strategy, and deletion boundaries for workspaces and learning data.",
        tags: ["retention", "deletion", "purge", "compliance"],
      },
    ],
  },
  {
    id: "architecture-and-ops",
    title: "Architecture And Ops",
    summary:
      "Operational and technical contracts that keep the app deployable, debuggable, and maintainable.",
    documents: [
      {
        id: "architecture-overview",
        title: "Architecture Overview",
        status: "planned",
        priority: "P1",
        owner: "engineering",
        path: "docs/architecture/overview.md",
        summary:
          "High-level structure of App Router, features, shared modules, server-first flow, and route composition.",
        tags: ["architecture", "app router", "features", "shared"],
      },
      {
        id: "internal-api-contracts",
        title: "Internal API Contracts",
        status: "planned",
        priority: "P1",
        owner: "engineering",
        path: "docs/architecture/internal-api-contracts.md",
        summary:
          "Contracts for internal-only learning ingestion endpoints and server-side execution surfaces.",
        tags: ["api", "internal", "learning", "contracts"],
      },
      {
        id: "deploy-runbook",
        title: "Deploy Runbook",
        status: "next",
        priority: "P0",
        owner: "engineering",
        path: "docs/ops/deploy-runbook.md",
        summary:
          "Environment contract, migration order, deploy steps, rollback rules, and auth/runtime debugging.",
        tags: ["ops", "deploy", "vercel", "supabase"],
      },
      {
        id: "test-strategy",
        title: "Test Strategy",
        status: "planned",
        priority: "P1",
        owner: "engineering",
        path: "docs/qa/test-strategy.md",
        summary:
          "Unit, integration, and end-to-end boundaries for critical user and platform flows.",
        tags: ["qa", "testing", "release", "smoke"],
      },
    ],
  },
];

export const docsHubDocuments = docsHubSections.flatMap(
  (section) => section.documents
);

export function getDocsHubDocument(documentId: string) {
  return docsHubDocuments.find((document) => document.id === documentId) ?? null;
}
