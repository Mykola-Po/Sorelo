import { relations, sql } from "drizzle-orm";
import {
  bigint,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "viewer",
  "editor",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "archived",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);
export const conceptTypeEnum = pgEnum("concept_type", [
  "thought",
  "state",
  "belief",
  "experience",
  "fact",
  "trigger",
  "custom",
]);
export const relationTypeEnum = pgEnum("relation_type", [
  "causes",
  "strengthens",
  "weakens",
  "explains",
  "contradicts",
]);
export const scenarioRunStatusEnum = pgEnum("scenario_run_status", [
  "pending",
  "completed",
  "failed",
]);
export const entityOriginTypeEnum = pgEnum("entity_origin_type", [
  "manual",
  "ai_suggested",
  "imported",
]);

export const learningSchema = pgSchema("learning");
export const appPrivateSchema = pgSchema("app_private");

export const sourceFragmentTypeEnum = learningSchema.enum("source_fragment_type", [
  "manual_note",
  "import",
  "chat",
  "scenario_prompt",
  "observation",
]);
export const suggestionBatchTypeEnum = learningSchema.enum(
  "suggestion_batch_type",
  [
    "extract",
    "link",
    "retype",
    "scenario_seed",
    "scenario_eval",
    "promote_apply",
    "inbox_review",
  ]
);
export const suggestionBatchStatusEnum = learningSchema.enum(
  "suggestion_batch_status",
  ["pending", "completed", "failed", "cancelled"]
);
export const suggestionTypeEnum = learningSchema.enum("suggestion_type", [
  "create_concept",
  "update_concept",
  "create_link",
  "update_link",
  "merge_candidate",
  "park_for_review",
  "create_scenario_seed",
  "scenario_hypothesis",
]);
export const suggestionTargetEntityTypeEnum = learningSchema.enum(
  "suggestion_target_entity_type",
  ["concept", "link", "scenario", "map", "none"]
);
export const suggestionResolutionTypeEnum = learningSchema.enum(
  "suggestion_resolution_type",
  [
    "accepted",
    "rejected",
    "edited",
    "split",
    "merged",
    "retyped",
    "relinked",
    "confidence_changed",
    "context_limited",
  ]
);
export const mapVersionTriggerTypeEnum = learningSchema.enum(
  "map_version_trigger_type",
  [
    "manual_edit",
    "suggestion_resolution",
    "scenario_feedback",
    "import",
    "system_rebuild",
  ]
);
export const lineageEntityTypeEnum = learningSchema.enum("lineage_entity_type", [
  "concept",
  "link",
  "scenario",
]);
export const lineageTransitionTypeEnum = learningSchema.enum(
  "lineage_transition_type",
  ["split", "merge", "rename", "retype", "archive", "restore"]
);
export const scenarioRunFeedbackVerdictEnum = learningSchema.enum(
  "scenario_run_feedback_verdict",
  ["useful", "partly_useful", "wrong"]
);
export const scenarioStepFeedbackVerdictEnum = learningSchema.enum(
  "scenario_step_feedback_verdict",
  ["correct", "overstated", "wrong_link", "missing_context", "wrong_effect"]
);

export const inboxSourceTypeEnum = appPrivateSchema.enum("inbox_source_type", [
  "manual_note",
  "transcript",
  "chat",
  "upload",
  "import",
]);
export const inboxItemStatusEnum = appPrivateSchema.enum("inbox_item_status", [
  "received",
  "persisted",
  "normalized",
  "segmented",
  "interpreted",
  "scored",
  "resolved",
  "clarification_requested",
  "promoted",
  "ready_for_review",
  "parked",
  "discarded",
  "applied",
  "failed_needs_review",
]);
export const inboxFragmentTypeEnum = appPrivateSchema.enum(
  "inbox_fragment_type",
  ["statement", "question", "constraint", "claim", "observation", "intent", "unknown"]
);
export const inboxFragmentSourceKindEnum = appPrivateSchema.enum(
  "inbox_fragment_source_kind",
  ["item_raw", "clarification_answer"]
);
export const inboxHypothesisTypeEnum = appPrivateSchema.enum(
  "inbox_hypothesis_type",
  [
    "interpretation",
    "candidate_structure",
    "relation_cluster",
    "actionable_summary",
  ]
);
export const suggestionApplyStatusEnum = learningSchema.enum(
  "suggestion_apply_status",
  ["pending", "applied", "failed", "not_applicable"]
);
export const canonicalMutationTypeEnum = learningSchema.enum(
  "canonical_mutation_type",
  ["create_concept", "update_concept", "create_link"]
);
export const inboxAtomTypeEnum = appPrivateSchema.enum("inbox_atom_type", [
  "entity",
  "relation",
  "intent",
  "question",
  "constraint",
  "claim",
  "observation",
]);
export const inboxRouteEnum = appPrivateSchema.enum("inbox_route", [
  "promote",
  "clarify",
  "park",
  "discard",
]);
export const inboxStructuredPacketTypeEnum = appPrivateSchema.enum(
  "inbox_structured_packet_type",
  [
    "concept_packet",
    "link_packet",
    "mixed_packet",
    "clarification_packet",
    "parked_packet",
  ]
);
export const inboxStructuredPacketStatusEnum = appPrivateSchema.enum(
  "inbox_structured_packet_status",
  ["draft", "ready", "emitted"]
);
export const inboxMergeTargetObjectTypeEnum = appPrivateSchema.enum(
  "inbox_merge_target_object_type",
  ["concept", "link", "scenario", "map"]
);
export const inboxMergeCandidateDecisionEnum = appPrivateSchema.enum(
  "inbox_merge_candidate_decision",
  ["pending", "accepted", "rejected"]
);
export const inboxClarificationStatusEnum = appPrivateSchema.enum(
  "inbox_clarification_status",
  ["pending", "answered", "dismissed", "expired"]
);
export const inboxEmbeddingOwnerTypeEnum = appPrivateSchema.enum(
  "inbox_embedding_owner_type",
  ["item", "fragment", "hypothesis", "atom", "packet"]
);
export const inboxWorkflowEventStatusEnum = appPrivateSchema.enum(
  "inbox_workflow_event_status",
  ["started", "completed", "failed"]
);
export const inboxPipelineAttemptTriggerKindEnum = appPrivateSchema.enum(
  "inbox_pipeline_attempt_trigger_kind",
  ["manual_process", "clarification_rerun"]
);
export const inboxPipelineRunStatusEnum = appPrivateSchema.enum(
  "inbox_pipeline_run_status",
  ["running", "completed", "failed"]
);
export const inboxExecutionFailureCodeEnum = appPrivateSchema.enum(
  "inbox_execution_failure_code",
  ["conflict", "validation", "persistence", "pipeline", "unknown"]
);

function inboxScoreColumn(name: string) {
  return numeric(name, {
    precision: 5,
    scale: 4,
    mode: "number",
  });
}

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("users_email_key").on(table.email)]
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerSubject: text("provider_subject").notNull(),
    email: varchar("email", { length: 320 }),
    rawProfile: jsonb("raw_profile")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_key").on(
      table.provider,
      table.providerSubject
    ),
    index("auth_identities_user_idx").on(table.userId),
  ]
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("workspaces_slug_key").on(table.slug)]
);

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastActiveWorkspaceId: uuid("last_active_workspace_id").references(
    () => workspaces.id,
    {
      onDelete: "set null",
    }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("editor"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.id],
      name: "workspace_members_pk",
    }),
    uniqueIndex("workspace_members_workspace_user_key").on(
      table.workspaceId,
      table.userId
    ),
    index("workspace_members_user_idx").on(table.userId),
    index("workspace_members_workspace_role_idx").on(
      table.workspaceId,
      table.role
    ),
  ]
);

export const maps = pgTable(
  "maps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    subjectLabel: varchar("subject_label", { length: 160 }).notNull(),
    description: text("description"),
    graphRevision: bigint("graph_revision", { mode: "number" })
      .notNull()
      .default(0),
    versionRevision: bigint("version_revision", { mode: "number" })
      .notNull()
      .default(0),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("maps_workspace_slug_key").on(table.workspaceId, table.slug),
    uniqueIndex("maps_id_workspace_key").on(table.id, table.workspaceId),
    index("maps_workspace_idx").on(table.workspaceId),
  ]
);

export const mapGraphOperations = pgTable(
  "map_graph_operations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id").notNull(),
    seq: bigint("seq", { mode: "number" }).notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").notNull(),
    clientMutationId: uuid("client_mutation_id").notNull(),
    opKind: varchar("op_kind", { length: 96 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId, table.workspaceId],
      foreignColumns: [maps.id, maps.workspaceId],
      name: "map_graph_operations_map_workspace_fk",
    }),
    uniqueIndex("map_graph_operations_map_seq_key").on(table.mapId, table.seq),
    uniqueIndex("map_graph_operations_map_client_mutation_key").on(
      table.mapId,
      table.clientId,
      table.clientMutationId
    ),
    index("map_graph_operations_map_seq_idx").on(table.mapId, table.seq),
  ]
);

export const concepts = pgTable(
  "concepts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    conceptType: conceptTypeEnum("concept_type").notNull().default("custom"),
    summary: varchar("summary", { length: 280 }),
    description: text("description"),
    originType: entityOriginTypeEnum("origin_type").notNull().default("manual"),
    originSuggestionId: uuid("origin_suggestion_id").references(
      () => learningSuggestions.id,
      {
        onDelete: "set null",
      }
    ),
    x: integer("x").notNull().default(160),
    y: integer("y").notNull().default(120),
    contentRevision: bigint("content_revision", { mode: "number" })
      .notNull()
      .default(0),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId, table.workspaceId],
      foreignColumns: [maps.id, maps.workspaceId],
      name: "concepts_map_workspace_fk",
    }),
    uniqueIndex("concepts_id_map_workspace_key").on(
      table.id,
      table.mapId,
      table.workspaceId
    ),
    index("concepts_map_idx").on(table.mapId),
    index("concepts_workspace_idx").on(table.workspaceId),
    index("concepts_map_type_idx").on(table.mapId, table.conceptType),
  ]
);

export const links = pgTable(
  "links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceConceptId: uuid("source_concept_id").notNull(),
    targetConceptId: uuid("target_concept_id").notNull(),
    relationType: relationTypeEnum("relation_type").notNull(),
    strength: integer("strength").notNull().default(1),
    description: text("description"),
    contentRevision: bigint("content_revision", { mode: "number" })
      .notNull()
      .default(0),
    originType: entityOriginTypeEnum("origin_type").notNull().default("manual"),
    originSuggestionId: uuid("origin_suggestion_id").references(
      () => learningSuggestions.id,
      {
        onDelete: "set null",
      }
    ),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByUserId: uuid("archived_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId, table.workspaceId],
      foreignColumns: [maps.id, maps.workspaceId],
      name: "links_map_workspace_fk",
    }),
    foreignKey({
      columns: [table.sourceConceptId, table.mapId, table.workspaceId],
      foreignColumns: [concepts.id, concepts.mapId, concepts.workspaceId],
      name: "links_source_concept_fk",
    }),
    foreignKey({
      columns: [table.targetConceptId, table.mapId, table.workspaceId],
      foreignColumns: [concepts.id, concepts.mapId, concepts.workspaceId],
      name: "links_target_concept_fk",
    }),
    index("links_map_idx").on(table.mapId),
    index("links_source_idx").on(table.sourceConceptId),
    index("links_target_idx").on(table.targetConceptId),
  ]
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    situation: text("situation").notNull(),
    seedConceptIds: jsonb("seed_concept_ids")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    originType: entityOriginTypeEnum("origin_type").notNull().default("manual"),
    originSuggestionId: uuid("origin_suggestion_id").references(
      () => learningSuggestions.id,
      {
        onDelete: "set null",
      }
    ),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId, table.workspaceId],
      foreignColumns: [maps.id, maps.workspaceId],
      name: "scenarios_map_workspace_fk",
    }),
    index("scenarios_map_idx").on(table.mapId),
    index("scenarios_workspace_idx").on(table.workspaceId),
  ]
);

export const scenarioRuns = pgTable(
  "scenario_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scenarioId: uuid("scenario_id").references(() => scenarios.id, {
      onDelete: "set null",
    }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    triggerText: text("trigger_text").notNull(),
    startedByUserId: uuid("started_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: scenarioRunStatusEnum("status").notNull().default("completed"),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId, table.workspaceId],
      foreignColumns: [maps.id, maps.workspaceId],
      name: "scenario_runs_map_workspace_fk",
    }),
    index("scenario_runs_map_idx").on(table.mapId, table.createdAt),
    index("scenario_runs_scenario_idx").on(table.scenarioId),
  ]
);

export const scenarioRunSteps = pgTable(
  "scenario_run_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scenarioRunId: uuid("scenario_run_id")
      .notNull()
      .references(() => scenarioRuns.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    conceptId: uuid("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "restrict" }),
    viaLinkId: uuid("via_link_id").references(() => links.id, {
      onDelete: "set null",
    }),
    effectType: varchar("effect_type", { length: 64 }).notNull(),
    explanation: text("explanation").notNull(),
    score: integer("score").notNull().default(0),
  },
  (table) => [
    uniqueIndex("scenario_run_steps_run_order_key").on(
      table.scenarioRunId,
      table.stepOrder
    ),
    index("scenario_run_steps_run_idx").on(table.scenarioRunId),
    index("scenario_run_steps_concept_idx").on(table.conceptId),
  ]
);

export const learningSourceFragments = learningSchema.table(
  "source_fragments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id").references(() => maps.id, {
      onDelete: "set null",
    }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceType: sourceFragmentTypeEnum("source_type").notNull(),
    rawText: text("raw_text").notNull(),
    normalizedText: text("normalized_text").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("learning_source_fragments_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    index("learning_source_fragments_map_created_idx").on(
      table.mapId,
      table.createdAt
    ),
  ]
);

export const learningSuggestionBatches = learningSchema.table(
  "suggestion_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id").references(() => maps.id, {
      onDelete: "set null",
    }),
    initiatedByUserId: uuid("initiated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    inboxItemId: uuid("inbox_item_id").references(() => inboxItems.id, {
      onDelete: "set null",
    }),
    inboxPacketId: uuid("inbox_packet_id").references(
      () => inboxStructuredPackets.id,
      {
        onDelete: "set null",
      }
    ),
    batchType: suggestionBatchTypeEnum("batch_type").notNull(),
    modelName: varchar("model_name", { length: 160 }).notNull(),
    modelVersion: varchar("model_version", { length: 64 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 64 }).notNull(),
    inputHash: varchar("input_hash", { length: 128 }).notNull(),
    status: suggestionBatchStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
  },
  (table) => [
    index("learning_suggestion_batches_workspace_started_idx").on(
      table.workspaceId,
      table.startedAt
    ),
    index("learning_suggestion_batches_map_started_idx").on(
      table.mapId,
      table.startedAt
    ),
    index("learning_suggestion_batches_type_started_idx").on(
      table.batchType,
      table.startedAt
    ),
    index("learning_suggestion_batches_inbox_item_started_idx").on(
      table.inboxItemId,
      table.startedAt
    ),
    index("learning_suggestion_batches_inbox_packet_started_idx").on(
      table.inboxPacketId,
      table.startedAt
    ),
    index("learning_suggestion_batches_input_hash_idx").on(table.inputHash),
  ]
);

export const learningSuggestions = learningSchema.table(
  "suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => learningSuggestionBatches.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id").references(() => maps.id, {
      onDelete: "set null",
    }),
    inboxItemId: uuid("inbox_item_id").references(() => inboxItems.id, {
      onDelete: "set null",
    }),
    inboxPacketId: uuid("inbox_packet_id").references(
      () => inboxStructuredPackets.id,
      {
        onDelete: "set null",
      }
    ),
    sourceFragmentId: uuid("source_fragment_id").references(
      () => learningSourceFragments.id,
      {
        onDelete: "set null",
      }
    ),
    artifactOrder: integer("artifact_order").notNull().default(0),
    suggestionType: suggestionTypeEnum("suggestion_type").notNull(),
    targetEntityType: suggestionTargetEntityTypeEnum("target_entity_type")
      .notNull()
      .default("none"),
    targetEntityId: uuid("target_entity_id"),
    proposedPayload: jsonb("proposed_payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    rationale: text("rationale"),
    confidence: doublePrecision("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("learning_suggestions_batch_created_idx").on(
      table.batchId,
      table.createdAt
    ),
    index("learning_suggestions_batch_artifact_idx").on(
      table.batchId,
      table.artifactOrder
    ),
    index("learning_suggestions_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    index("learning_suggestions_map_created_idx").on(
      table.mapId,
      table.createdAt
    ),
    index("learning_suggestions_inbox_item_created_idx").on(
      table.inboxItemId,
      table.createdAt
    ),
    index("learning_suggestions_inbox_packet_created_idx").on(
      table.inboxPacketId,
      table.createdAt
    ),
    index("learning_suggestions_target_entity_idx").on(
      table.targetEntityType,
      table.targetEntityId
    ),
  ]
);

export const learningSuggestionResolutions = learningSchema.table(
  "suggestion_resolutions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    suggestionId: uuid("suggestion_id")
      .notNull()
      .references(() => learningSuggestions.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id").references(() => maps.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    resolutionType: suggestionResolutionTypeEnum("resolution_type").notNull(),
    beforePayload: jsonb("before_payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    afterPayload: jsonb("after_payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    applyStatus: suggestionApplyStatusEnum("apply_status")
      .notNull()
      .default("not_applicable"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    applyOutcome: jsonb("apply_outcome")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    applyError: text("apply_error"),
    reasonText: text("reason_text"),
    latencyMs: integer("latency_ms"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("learning_suggestion_resolutions_suggestion_key").on(
      table.suggestionId
    ),
    index("learning_suggestion_resolutions_workspace_resolved_idx").on(
      table.workspaceId,
      table.resolvedAt
    ),
    index("learning_suggestion_resolutions_map_resolved_idx").on(
      table.mapId,
      table.resolvedAt
    ),
    index("learning_suggestion_resolutions_type_resolved_idx").on(
      table.resolutionType,
      table.resolvedAt
    ),
    index("learning_suggestion_resolutions_apply_status_idx").on(
      table.applyStatus,
      table.resolvedAt
    ),
  ]
);

export const learningMapVersions = learningSchema.table(
  "map_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    triggerType: mapVersionTriggerTypeEnum("trigger_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    causedByResolutionId: uuid("caused_by_resolution_id").references(
      () => learningSuggestionResolutions.id,
      {
        onDelete: "set null",
      }
    ),
    snapshotJson: jsonb("snapshot_json")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    diffJson: jsonb("diff_json")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("learning_map_versions_map_version_key").on(
      table.mapId,
      table.versionNo
    ),
    index("learning_map_versions_map_version_desc_idx").on(
      table.mapId,
      table.versionNo
    ),
    index("learning_map_versions_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    index("learning_map_versions_resolution_created_idx").on(
      table.causedByResolutionId,
      table.createdAt
    ),
  ]
);

export const learningCanonicalMutationProvenance = learningSchema.table(
  "canonical_mutation_provenance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    mapVersionId: uuid("map_version_id")
      .notNull()
      .references(() => learningMapVersions.id, { onDelete: "cascade" }),
    entityType: lineageEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    mutationType: canonicalMutationTypeEnum("mutation_type").notNull(),
    originSuggestionId: uuid("origin_suggestion_id")
      .notNull()
      .references(() => learningSuggestions.id, { onDelete: "cascade" }),
    reviewResolutionId: uuid("review_resolution_id")
      .notNull()
      .references(() => learningSuggestionResolutions.id, {
        onDelete: "cascade",
      }),
    inboxItemId: uuid("inbox_item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    inboxPacketId: uuid("inbox_packet_id").references(
      () => inboxStructuredPackets.id,
      {
        onDelete: "set null",
      }
    ),
    appliedByUserId: uuid("applied_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("learning_canonical_mutation_provenance_map_version_key").on(
      table.mapVersionId
    ),
    index("learning_canonical_mutation_provenance_entity_idx").on(
      table.entityType,
      table.entityId
    ),
    index("learning_canonical_mutation_provenance_resolution_idx").on(
      table.reviewResolutionId
    ),
    index("learning_canonical_mutation_provenance_suggestion_idx").on(
      table.originSuggestionId
    ),
    index("learning_canonical_mutation_provenance_inbox_item_idx").on(
      table.inboxItemId
    ),
  ]
);

export const learningCanonicalMutationEvidence = learningSchema.table(
  "canonical_mutation_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provenanceId: uuid("provenance_id")
      .notNull()
      .references(() => learningCanonicalMutationProvenance.id, {
        onDelete: "cascade",
      }),
    inboxFragmentId: uuid("inbox_fragment_id")
      .notNull()
      .references(() => inboxFragments.id, { onDelete: "cascade" }),
    clarificationAnswerId: uuid("clarification_answer_id").references(
      () => inboxClarificationAnswers.id,
      {
        onDelete: "set null",
      }
    ),
    evidenceOrder: integer("evidence_order").notNull(),
    fragmentOrdinal: integer("fragment_ordinal").notNull(),
  },
  (table) => [
    uniqueIndex("learning_canonical_mutation_evidence_fragment_key").on(
      table.provenanceId,
      table.inboxFragmentId
    ),
    index("learning_canonical_mutation_evidence_provenance_order_idx").on(
      table.provenanceId,
      table.evidenceOrder
    ),
  ]
);

export const learningEntityLineage = learningSchema.table(
  "entity_lineage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    entityType: lineageEntityTypeEnum("entity_type").notNull(),
    fromEntityId: uuid("from_entity_id"),
    toEntityId: uuid("to_entity_id"),
    transitionType: lineageTransitionTypeEnum("transition_type").notNull(),
    causedByResolutionId: uuid("caused_by_resolution_id").references(
      () => learningSuggestionResolutions.id,
      {
        onDelete: "set null",
      }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("learning_entity_lineage_from_idx").on(
      table.mapId,
      table.entityType,
      table.fromEntityId
    ),
    index("learning_entity_lineage_to_idx").on(
      table.mapId,
      table.entityType,
      table.toEntityId
    ),
  ]
);

export const learningScenarioRunFeedback = learningSchema.table(
  "scenario_run_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scenarioRunId: uuid("scenario_run_id")
      .notNull()
      .references(() => scenarioRuns.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "cascade" }),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    overallScore: integer("overall_score").notNull(),
    verdict: scenarioRunFeedbackVerdictEnum("verdict").notNull(),
    feedbackText: text("feedback_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("learning_scenario_run_feedback_run_reviewer_key").on(
      table.scenarioRunId,
      table.reviewerUserId
    ),
  ]
);

export const learningScenarioStepFeedback = learningSchema.table(
  "scenario_step_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scenarioRunStepId: uuid("scenario_run_step_id")
      .notNull()
      .references(() => scenarioRunSteps.id, { onDelete: "cascade" }),
    scenarioRunId: uuid("scenario_run_id")
      .notNull()
      .references(() => scenarioRuns.id, { onDelete: "cascade" }),
    verdict: scenarioStepFeedbackVerdictEnum("verdict").notNull(),
    correctedExplanation: text("corrected_explanation"),
    correctedScore: integer("corrected_score"),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("learning_scenario_step_feedback_step_reviewer_key").on(
      table.scenarioRunStepId,
      table.reviewerUserId
    ),
  ]
);

export const inboxItems = appPrivateSchema.table(
  "inbox_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),
    mapId: uuid("map_id")
      .notNull()
      .references(() => maps.id, {
        onDelete: "restrict",
      }),
    sourceType: inboxSourceTypeEnum("source_type").notNull(),
    sourceRef: text("source_ref"),
    rawText: text("raw_text").notNull(),
    normalizedText: text("normalized_text"),
    language: varchar("language", { length: 32 }),
    status: inboxItemStatusEnum("status").notNull().default("received"),
    score: inboxScoreColumn("score"),
    confidence: inboxScoreColumn("confidence"),
    ambiguity: inboxScoreColumn("ambiguity"),
    risk: inboxScoreColumn("risk"),
    route: inboxRouteEnum("route"),
    processingClaimId: uuid("processing_claim_id"),
    processingClaimedByUserId: uuid("processing_claimed_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      }
    ),
    processingLeaseExpiresAt: timestamp("processing_lease_expires_at", {
      withTimezone: true,
    }),
    processingAttemptSeq: integer("processing_attempt_seq")
      .notNull()
      .default(0),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId, table.workspaceId],
      foreignColumns: [maps.id, maps.workspaceId],
      name: "inbox_items_map_workspace_fk",
    }),
    uniqueIndex("inbox_items_workspace_map_idempotency_key").on(
      table.workspaceId,
      table.mapId,
      table.idempotencyKey
    ),
    index("inbox_items_user_created_idx").on(
      table.userId,
      table.createdAt.desc()
    ),
    index("inbox_items_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt.desc()
    ),
    index("inbox_items_map_created_idx").on(table.mapId, table.createdAt.desc()),
    index("inbox_items_status_route_idx").on(table.status, table.route),
    index("inbox_items_processing_lease_idx").on(table.processingLeaseExpiresAt),
  ]
);

export const inboxFragments = appPrivateSchema.table(
  "inbox_fragments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    fragmentText: text("fragment_text").notNull(),
    fragmentType: inboxFragmentTypeEnum("fragment_type"),
    sourceKind: inboxFragmentSourceKindEnum("source_kind")
      .notNull()
      .default("item_raw"),
    clarificationAnswerId: uuid("clarification_answer_id").references(
      () => inboxClarificationAnswers.id,
      { onDelete: "set null" }
    ),
    spanStart: integer("span_start"),
    spanEnd: integer("span_end"),
  },
  (table) => [
    uniqueIndex("inbox_fragments_item_ordinal_key").on(table.itemId, table.ordinal),
    index("inbox_fragments_item_ordinal_idx").on(table.itemId, table.ordinal),
  ]
);

export const inboxHypotheses = appPrivateSchema.table(
  "inbox_hypotheses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    fragmentId: uuid("fragment_id").references(() => inboxFragments.id, {
      onDelete: "set null",
    }),
    rank: integer("rank").notNull(),
    hypothesisType: inboxHypothesisTypeEnum("hypothesis_type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    confidence: inboxScoreColumn("confidence").notNull(),
    explanation: text("explanation"),
    modelName: varchar("model_name", { length: 160 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 64 }).notNull(),
  },
  (table) => [
    index("inbox_hypotheses_item_rank_idx").on(table.itemId, table.rank),
  ]
);

export const inboxAtoms = appPrivateSchema.table(
  "inbox_atoms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    hypothesisId: uuid("hypothesis_id")
      .notNull()
      .references(() => inboxHypotheses.id, { onDelete: "cascade" }),
    atomType: inboxAtomTypeEnum("atom_type").notNull(),
    canonicalValue: text("canonical_value"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    confidence: inboxScoreColumn("confidence").notNull(),
  }
);

export const inboxStructuredPackets = appPrivateSchema.table(
  "structured_packets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    packetType: inboxStructuredPacketTypeEnum("packet_type").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    route: inboxRouteEnum("route").notNull(),
    status: inboxStructuredPacketStatusEnum("status").notNull().default("draft"),
  }
);

export const inboxMergeCandidates = appPrivateSchema.table(
  "merge_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    targetObjectType: inboxMergeTargetObjectTypeEnum("target_object_type").notNull(),
    targetObjectId: uuid("target_object_id").notNull(),
    similarity: inboxScoreColumn("similarity").notNull(),
    decision: inboxMergeCandidateDecisionEnum("decision"),
  },
  (table) => [
    index("inbox_merge_candidates_item_similarity_idx").on(
      table.itemId,
      table.similarity.desc()
    ),
  ]
);

export const inboxClarificationRequests = appPrivateSchema.table(
  "clarification_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    reason: text("reason").notNull(),
    status: inboxClarificationStatusEnum("status").notNull().default("pending"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("inbox_clarification_requests_item_pending_key")
      .on(table.itemId)
      .where(sql`${table.status} = 'pending'`),
  ]
);

export const inboxClarificationAnswers = appPrivateSchema.table(
  "clarification_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => inboxClarificationRequests.id, { onDelete: "cascade" }),
    answerText: text("answer_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("inbox_clarification_answers_request_key").on(table.requestId),
  ]
);

export const inboxEmbeddings = appPrivateSchema.table(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: inboxEmbeddingOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    embeddingModel: varchar("embedding_model", { length: 160 }).notNull(),
    contentHash: varchar("content_hash", { length: 128 }).notNull(),
  },
  (table) => [
    index("inbox_embeddings_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    uniqueIndex("inbox_embeddings_owner_content_hash_key").on(
      table.contentHash,
      table.embeddingModel,
      table.ownerType,
      table.ownerId
    ),
  ]
);

export const inboxWorkflowEvents = appPrivateSchema.table(
  "workflow_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    stepName: varchar("step_name", { length: 64 }).notNull(),
    status: inboxWorkflowEventStatusEnum("status").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    attemptNo: integer("attempt_no").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("inbox_workflow_events_item_created_idx").on(
      table.itemId,
      table.createdAt
    ),
  ]
);

export const inboxPipelineAttempts = appPrivateSchema.table(
  "inbox_pipeline_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inboxItems.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull(),
    triggerKind: inboxPipelineAttemptTriggerKindEnum("trigger_kind").notNull(),
    runnerKind: varchar("runner_kind", { length: 64 }).notNull(),
    status: inboxPipelineRunStatusEnum("status").notNull().default("running"),
    route: inboxRouteEnum("route"),
    reason: text("reason"),
    failureCode: inboxExecutionFailureCodeEnum("failure_code"),
    failureMessage: text("failure_message"),
    clarificationRequestId: uuid("clarification_request_id").references(
      () => inboxClarificationRequests.id,
      { onDelete: "set null" }
    ),
    clarificationAnswerId: uuid("clarification_answer_id").references(
      () => inboxClarificationAnswers.id,
      { onDelete: "set null" }
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    latencyMs: integer("latency_ms"),
  },
  (table) => [
    uniqueIndex("inbox_pipeline_attempts_item_attempt_key").on(
      table.itemId,
      table.attemptNo
    ),
    index("inbox_pipeline_attempts_item_attempt_idx").on(
      table.itemId,
      table.attemptNo.desc()
    ),
    index("inbox_pipeline_attempts_status_started_idx").on(
      table.status,
      table.startedAt.desc()
    ),
    index("inbox_pipeline_attempts_failure_started_idx").on(
      table.failureCode,
      table.startedAt.desc()
    ),
    uniqueIndex("inbox_pipeline_attempts_item_running_key")
      .on(table.itemId)
      .where(sql`${table.status} = 'running'`),
  ]
);

export const inboxStepRuns = appPrivateSchema.table(
  "inbox_step_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => inboxPipelineAttempts.id, { onDelete: "cascade" }),
    stepName: varchar("step_name", { length: 64 }).notNull(),
    stepOrder: integer("step_order").notNull(),
    runNo: integer("run_no").notNull().default(1),
    status: inboxPipelineRunStatusEnum("status").notNull().default("running"),
    modelName: varchar("model_name", { length: 160 }),
    promptVersion: varchar("prompt_version", { length: 64 }),
    route: inboxRouteEnum("route"),
    reason: text("reason"),
    inputHash: varchar("input_hash", { length: 128 }),
    outputHash: varchar("output_hash", { length: 128 }),
    failureCode: inboxExecutionFailureCodeEnum("failure_code"),
    failureMessage: text("failure_message"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    latencyMs: integer("latency_ms"),
  },
  (table) => [
    uniqueIndex("inbox_step_runs_attempt_step_run_key").on(
      table.attemptId,
      table.stepOrder,
      table.runNo
    ),
    index("inbox_step_runs_attempt_step_idx").on(
      table.attemptId,
      table.stepOrder,
      table.runNo
    ),
    index("inbox_step_runs_status_started_idx").on(
      table.status,
      table.startedAt.desc()
    ),
    index("inbox_step_runs_failure_started_idx").on(
      table.failureCode,
      table.startedAt.desc()
    ),
  ]
);

export const appMigrations = appPrivateSchema.table("app_migrations", {
  version: varchar("version", { length: 160 }).primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** @deprecated Legacy compatibility table. Do not use for map-first product flows. */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("active"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("projects_workspace_slug_key").on(
      table.workspaceId,
      table.slug
    ),
    uniqueIndex("projects_id_workspace_key").on(table.id, table.workspaceId),
    index("projects_workspace_idx").on(table.workspaceId),
    index("projects_workspace_status_idx").on(table.workspaceId, table.status),
  ]
);

/** @deprecated Legacy compatibility table. Do not use for map-first product flows. */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: integer("priority").notNull().default(0),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "tasks_project_workspace_fk",
    }),
    foreignKey({
      columns: [table.workspaceId, table.assigneeUserId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
      name: "tasks_assignee_membership_fk",
    }),
    index("tasks_project_idx").on(table.projectId),
    index("tasks_workspace_idx").on(table.workspaceId),
    index("tasks_assignee_idx").on(table.assigneeUserId),
    index("tasks_workspace_status_idx").on(table.workspaceId, table.status),
    index("tasks_project_status_idx").on(table.projectId, table.status),
  ]
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 96 }).notNull(),
    requestId: uuid("request_id"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_log_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    index("activity_log_entity_idx").on(
      table.workspaceId,
      table.entityType,
      table.entityId
    ),
    index("activity_log_actor_idx").on(table.actorUserId, table.createdAt),
  ]
);

export const userRelations = relations(users, ({ many, one }) => ({
  identities: many(authIdentities),
  preferences: one(userPreferences),
}));

export const authIdentityRelations = relations(authIdentities, ({ one }) => ({
  user: one(users, {
    fields: [authIdentities.userId],
    references: [users.id],
  }),
}));

export const workspaceRelations = relations(workspaces, ({ many, one }) => ({
  creator: one(users, {
    fields: [workspaces.createdByUserId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  maps: many(maps),
  activity: many(activityLog),
}));

export const userPreferenceRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
    lastActiveWorkspace: one(workspaces, {
      fields: [userPreferences.lastActiveWorkspaceId],
      references: [workspaces.id],
    }),
  })
);

export const workspaceMemberRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
    invitedBy: one(users, {
      fields: [workspaceMembers.invitedByUserId],
      references: [users.id],
    }),
  })
);

export const mapRelations = relations(maps, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [maps.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [maps.createdByUserId],
    references: [users.id],
  }),
  concepts: many(concepts),
  links: many(links),
  scenarios: many(scenarios),
  scenarioRuns: many(scenarioRuns),
}));

export const conceptRelations = relations(concepts, ({ many, one }) => ({
  map: one(maps, {
    fields: [concepts.mapId],
    references: [maps.id],
  }),
  workspace: one(workspaces, {
    fields: [concepts.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [concepts.createdByUserId],
    references: [users.id],
  }),
  originSuggestion: one(learningSuggestions, {
    fields: [concepts.originSuggestionId],
    references: [learningSuggestions.id],
  }),
  outgoingLinks: many(links, { relationName: "outgoing_links" }),
  incomingLinks: many(links, { relationName: "incoming_links" }),
  scenarioSteps: many(scenarioRunSteps),
}));

export const linkRelations = relations(links, ({ one }) => ({
  map: one(maps, {
    fields: [links.mapId],
    references: [maps.id],
  }),
  workspace: one(workspaces, {
    fields: [links.workspaceId],
    references: [workspaces.id],
  }),
  sourceConcept: one(concepts, {
    fields: [links.sourceConceptId],
    references: [concepts.id],
    relationName: "outgoing_links",
  }),
  targetConcept: one(concepts, {
    fields: [links.targetConceptId],
    references: [concepts.id],
    relationName: "incoming_links",
  }),
  creator: one(users, {
    fields: [links.createdByUserId],
    references: [users.id],
  }),
  originSuggestion: one(learningSuggestions, {
    fields: [links.originSuggestionId],
    references: [learningSuggestions.id],
  }),
}));

export const scenarioRelations = relations(scenarios, ({ many, one }) => ({
  map: one(maps, {
    fields: [scenarios.mapId],
    references: [maps.id],
  }),
  workspace: one(workspaces, {
    fields: [scenarios.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [scenarios.createdByUserId],
    references: [users.id],
  }),
  originSuggestion: one(learningSuggestions, {
    fields: [scenarios.originSuggestionId],
    references: [learningSuggestions.id],
  }),
  runs: many(scenarioRuns),
}));

export const scenarioRunRelations = relations(
  scenarioRuns,
  ({ many, one }) => ({
    scenario: one(scenarios, {
      fields: [scenarioRuns.scenarioId],
      references: [scenarios.id],
    }),
    map: one(maps, {
      fields: [scenarioRuns.mapId],
      references: [maps.id],
    }),
    workspace: one(workspaces, {
      fields: [scenarioRuns.workspaceId],
      references: [workspaces.id],
    }),
    starter: one(users, {
      fields: [scenarioRuns.startedByUserId],
      references: [users.id],
    }),
    steps: many(scenarioRunSteps),
  })
);

export const scenarioRunStepRelations = relations(
  scenarioRunSteps,
  ({ one }) => ({
    scenarioRun: one(scenarioRuns, {
      fields: [scenarioRunSteps.scenarioRunId],
      references: [scenarioRuns.id],
    }),
    concept: one(concepts, {
      fields: [scenarioRunSteps.conceptId],
      references: [concepts.id],
    }),
    viaLink: one(links, {
      fields: [scenarioRunSteps.viaLinkId],
      references: [links.id],
    }),
  })
);

export const learningSourceFragmentRelations = relations(
  learningSourceFragments,
  ({ many, one }) => ({
    workspace: one(workspaces, {
      fields: [learningSourceFragments.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningSourceFragments.mapId],
      references: [maps.id],
    }),
    author: one(users, {
      fields: [learningSourceFragments.authorUserId],
      references: [users.id],
    }),
    suggestions: many(learningSuggestions),
  })
);

export const learningSuggestionBatchRelations = relations(
  learningSuggestionBatches,
  ({ many, one }) => ({
    workspace: one(workspaces, {
      fields: [learningSuggestionBatches.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningSuggestionBatches.mapId],
      references: [maps.id],
    }),
    initiator: one(users, {
      fields: [learningSuggestionBatches.initiatedByUserId],
      references: [users.id],
    }),
    inboxItem: one(inboxItems, {
      fields: [learningSuggestionBatches.inboxItemId],
      references: [inboxItems.id],
    }),
    inboxPacket: one(inboxStructuredPackets, {
      fields: [learningSuggestionBatches.inboxPacketId],
      references: [inboxStructuredPackets.id],
    }),
    suggestions: many(learningSuggestions),
  })
);

export const learningSuggestionRelations = relations(
  learningSuggestions,
  ({ many, one }) => ({
    batch: one(learningSuggestionBatches, {
      fields: [learningSuggestions.batchId],
      references: [learningSuggestionBatches.id],
    }),
    workspace: one(workspaces, {
      fields: [learningSuggestions.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningSuggestions.mapId],
      references: [maps.id],
    }),
    inboxItem: one(inboxItems, {
      fields: [learningSuggestions.inboxItemId],
      references: [inboxItems.id],
    }),
    inboxPacket: one(inboxStructuredPackets, {
      fields: [learningSuggestions.inboxPacketId],
      references: [inboxStructuredPackets.id],
    }),
    sourceFragment: one(learningSourceFragments, {
      fields: [learningSuggestions.sourceFragmentId],
      references: [learningSourceFragments.id],
    }),
    resolutions: many(learningSuggestionResolutions),
  })
);

export const learningSuggestionResolutionRelations = relations(
  learningSuggestionResolutions,
  ({ many, one }) => ({
    suggestion: one(learningSuggestions, {
      fields: [learningSuggestionResolutions.suggestionId],
      references: [learningSuggestions.id],
    }),
    workspace: one(workspaces, {
      fields: [learningSuggestionResolutions.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningSuggestionResolutions.mapId],
      references: [maps.id],
    }),
    actor: one(users, {
      fields: [learningSuggestionResolutions.actorUserId],
      references: [users.id],
    }),
    canonicalMutations: many(learningCanonicalMutationProvenance),
    lineageEntries: many(learningEntityLineage),
  })
);

export const learningMapVersionRelations = relations(
  learningMapVersions,
  ({ many, one }) => ({
    workspace: one(workspaces, {
      fields: [learningMapVersions.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningMapVersions.mapId],
      references: [maps.id],
    }),
    actor: one(users, {
      fields: [learningMapVersions.actorUserId],
      references: [users.id],
    }),
    causedByResolution: one(learningSuggestionResolutions, {
      fields: [learningMapVersions.causedByResolutionId],
      references: [learningSuggestionResolutions.id],
    }),
    canonicalMutations: many(learningCanonicalMutationProvenance),
  })
);

export const learningCanonicalMutationProvenanceRelations = relations(
  learningCanonicalMutationProvenance,
  ({ many, one }) => ({
    workspace: one(workspaces, {
      fields: [learningCanonicalMutationProvenance.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningCanonicalMutationProvenance.mapId],
      references: [maps.id],
    }),
    mapVersion: one(learningMapVersions, {
      fields: [learningCanonicalMutationProvenance.mapVersionId],
      references: [learningMapVersions.id],
    }),
    suggestion: one(learningSuggestions, {
      fields: [learningCanonicalMutationProvenance.originSuggestionId],
      references: [learningSuggestions.id],
    }),
    reviewResolution: one(learningSuggestionResolutions, {
      fields: [learningCanonicalMutationProvenance.reviewResolutionId],
      references: [learningSuggestionResolutions.id],
    }),
    inboxItem: one(inboxItems, {
      fields: [learningCanonicalMutationProvenance.inboxItemId],
      references: [inboxItems.id],
    }),
    inboxPacket: one(inboxStructuredPackets, {
      fields: [learningCanonicalMutationProvenance.inboxPacketId],
      references: [inboxStructuredPackets.id],
    }),
    appliedByUser: one(users, {
      fields: [learningCanonicalMutationProvenance.appliedByUserId],
      references: [users.id],
    }),
    evidence: many(learningCanonicalMutationEvidence),
  })
);

export const learningCanonicalMutationEvidenceRelations = relations(
  learningCanonicalMutationEvidence,
  ({ one }) => ({
    provenance: one(learningCanonicalMutationProvenance, {
      fields: [learningCanonicalMutationEvidence.provenanceId],
      references: [learningCanonicalMutationProvenance.id],
    }),
    inboxFragment: one(inboxFragments, {
      fields: [learningCanonicalMutationEvidence.inboxFragmentId],
      references: [inboxFragments.id],
    }),
    clarificationAnswer: one(inboxClarificationAnswers, {
      fields: [learningCanonicalMutationEvidence.clarificationAnswerId],
      references: [inboxClarificationAnswers.id],
    }),
  })
);

export const learningEntityLineageRelations = relations(
  learningEntityLineage,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [learningEntityLineage.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningEntityLineage.mapId],
      references: [maps.id],
    }),
    causedByResolution: one(learningSuggestionResolutions, {
      fields: [learningEntityLineage.causedByResolutionId],
      references: [learningSuggestionResolutions.id],
    }),
  })
);

export const learningScenarioRunFeedbackRelations = relations(
  learningScenarioRunFeedback,
  ({ one }) => ({
    scenarioRun: one(scenarioRuns, {
      fields: [learningScenarioRunFeedback.scenarioRunId],
      references: [scenarioRuns.id],
    }),
    workspace: one(workspaces, {
      fields: [learningScenarioRunFeedback.workspaceId],
      references: [workspaces.id],
    }),
    map: one(maps, {
      fields: [learningScenarioRunFeedback.mapId],
      references: [maps.id],
    }),
    reviewer: one(users, {
      fields: [learningScenarioRunFeedback.reviewerUserId],
      references: [users.id],
    }),
  })
);

export const learningScenarioStepFeedbackRelations = relations(
  learningScenarioStepFeedback,
  ({ one }) => ({
    scenarioRunStep: one(scenarioRunSteps, {
      fields: [learningScenarioStepFeedback.scenarioRunStepId],
      references: [scenarioRunSteps.id],
    }),
    scenarioRun: one(scenarioRuns, {
      fields: [learningScenarioStepFeedback.scenarioRunId],
      references: [scenarioRuns.id],
    }),
    reviewer: one(users, {
      fields: [learningScenarioStepFeedback.reviewerUserId],
      references: [users.id],
    }),
  })
);

/** @deprecated Legacy compatibility relation. Do not use for map-first product flows. */
export const projectRelations = relations(projects, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [projects.createdByUserId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

/** @deprecated Legacy compatibility relation. Do not use for map-first product flows. */
export const taskRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeUserId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
  }),
}));

export const activityRelations = relations(activityLog, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [activityLog.workspaceId],
    references: [workspaces.id],
  }),
  actor: one(users, {
    fields: [activityLog.actorUserId],
    references: [users.id],
  }),
}));

export type WorkspaceRole = (typeof workspaceRoleEnum.enumValues)[number];
/** @deprecated Legacy compatibility type. Do not use for map-first product flows. */
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
/** @deprecated Legacy compatibility type. Do not use for map-first product flows. */
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type ConceptType = (typeof conceptTypeEnum.enumValues)[number];
export type RelationType = (typeof relationTypeEnum.enumValues)[number];
export type EntityOriginType = (typeof entityOriginTypeEnum.enumValues)[number];
export type ScenarioRunStatus =
  (typeof scenarioRunStatusEnum.enumValues)[number];
export type SourceFragmentType =
  (typeof sourceFragmentTypeEnum.enumValues)[number];
export type SuggestionBatchType =
  (typeof suggestionBatchTypeEnum.enumValues)[number];
export type SuggestionBatchStatus =
  (typeof suggestionBatchStatusEnum.enumValues)[number];
export type SuggestionType = (typeof suggestionTypeEnum.enumValues)[number];
export type SuggestionTargetEntityType =
  (typeof suggestionTargetEntityTypeEnum.enumValues)[number];
export type SuggestionResolutionType =
  (typeof suggestionResolutionTypeEnum.enumValues)[number];
export type SuggestionApplyStatus =
  (typeof suggestionApplyStatusEnum.enumValues)[number];
export type CanonicalMutationType =
  (typeof canonicalMutationTypeEnum.enumValues)[number];
export type MapVersionTriggerType =
  (typeof mapVersionTriggerTypeEnum.enumValues)[number];
export type LineageEntityType =
  (typeof lineageEntityTypeEnum.enumValues)[number];
export type LineageTransitionType =
  (typeof lineageTransitionTypeEnum.enumValues)[number];
export type ScenarioRunFeedbackVerdict =
  (typeof scenarioRunFeedbackVerdictEnum.enumValues)[number];
export type ScenarioStepFeedbackVerdict =
  (typeof scenarioStepFeedbackVerdictEnum.enumValues)[number];
export type InboxSourceType = (typeof inboxSourceTypeEnum.enumValues)[number];
export type InboxItemStatus = (typeof inboxItemStatusEnum.enumValues)[number];
export type InboxFragmentType = (typeof inboxFragmentTypeEnum.enumValues)[number];
export type InboxFragmentSourceKind =
  (typeof inboxFragmentSourceKindEnum.enumValues)[number];
export type InboxHypothesisType =
  (typeof inboxHypothesisTypeEnum.enumValues)[number];
export type InboxAtomType = (typeof inboxAtomTypeEnum.enumValues)[number];
export type InboxRoute = (typeof inboxRouteEnum.enumValues)[number];
export type InboxPacketType =
  (typeof inboxStructuredPacketTypeEnum.enumValues)[number];
export type InboxStructuredPacketStatus =
  (typeof inboxStructuredPacketStatusEnum.enumValues)[number];
export type InboxMergeTargetObjectType =
  (typeof inboxMergeTargetObjectTypeEnum.enumValues)[number];
export type InboxMergeCandidateDecision =
  (typeof inboxMergeCandidateDecisionEnum.enumValues)[number];
export type InboxClarificationStatus =
  (typeof inboxClarificationStatusEnum.enumValues)[number];
export type InboxEmbeddingOwnerType =
  (typeof inboxEmbeddingOwnerTypeEnum.enumValues)[number];
export type InboxWorkflowEventStatus =
  (typeof inboxWorkflowEventStatusEnum.enumValues)[number];
export type InboxPipelineAttemptTriggerKind =
  (typeof inboxPipelineAttemptTriggerKindEnum.enumValues)[number];
export type InboxPipelineRunStatus =
  (typeof inboxPipelineRunStatusEnum.enumValues)[number];
export type InboxExecutionFailureCode =
  (typeof inboxExecutionFailureCodeEnum.enumValues)[number];
