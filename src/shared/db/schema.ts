import { relations, sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
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
    role: workspaceRoleEnum("role").notNull().default("member"),
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
    x: integer("x").notNull().default(160),
    y: integer("y").notNull().default(120),
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
  projects: many(projects),
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
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type ConceptType = (typeof conceptTypeEnum.enumValues)[number];
export type RelationType = (typeof relationTypeEnum.enumValues)[number];
export type ScenarioRunStatus =
  (typeof scenarioRunStatusEnum.enumValues)[number];
