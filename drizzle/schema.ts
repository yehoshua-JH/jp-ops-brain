import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  index,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * For Ops Brain, this is a single-user app (Reef only).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Operational domains — the 10 core categories for tagging session outputs.
 * Pre-loaded with ideal end states on first launch.
 */
export const domains = mysqlTable("domains", {
  id: int("id").autoincrement().primaryKey(),
  tag: varchar("tag", { length: 50 }).notNull().unique(), // e.g., "TIME-TRACKING", "INVOICING"
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Employee time tracking"
  tier: varchar("tier", { length: 50 }).notNull(), // "Core ops", "Client & revenue", "Growth & product"
  color: varchar("color", { length: 20 }).notNull(), // "teal", "blue", "purple", etc.
  idealEndState: text("idealEndState").notNull(), // Full description of the target state
  isEditable: boolean("isEditable").default(true).notNull(), // Ideal end states are editable but not deletable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Domain = typeof domains.$inferSelect;
export type InsertDomain = typeof domains.$inferInsert;

/**
 * Meeting sessions — each processed meeting input becomes a session record.
 */
export const sessions = mysqlTable(
  "sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionNumber: int("sessionNumber").notNull().unique(), // Auto-incremented session identifier
    date: timestamp("date").notNull(), // Meeting date
    inputFormat: varchar("inputFormat", { length: 50 }).notNull(), // "Raw transcript", "AI notes", "Bullet points", "Mixed"
    meetingType: varchar("meetingType", { length: 50 }).notNull(), // "1:1", "team", "client", "founder", "ops", "deep-dive", "other"
    participants: text("participants").notNull(), // JSON array of participant names
    tone: varchar("tone", { length: 100 }), // "aligned", "tense", "exploratory", etc.
    executiveSummary: text("executiveSummary").notNull(), // 1 paragraph for founder
    operationalSummary: text("operationalSummary").notNull(), // 2-3 paragraphs for ops team
    keyPoints: text("keyPoints").notNull(), // JSON array of {domain, point} objects
    activeBlockers: text("activeBlockers").notNull(), // JSON array of blocker strings
    decisionsMade: text("decisionsMade").notNull(), // JSON array of decision strings
    actionItems: text("actionItems").notNull(), // JSON array of {owner, task, deadline, priority} objects
    openQuestions: text("openQuestions").notNull(), // JSON array of question strings
    systemMaturityNotes: text("systemMaturityNotes").notNull(), // JSON array of {domain, maturity, change} objects
    changelogDelta: text("changelogDelta").notNull(), // "Since last session..." or "Baseline established"
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    sessionNumberIdx: index("sessionNumber_idx").on(table.sessionNumber),
    dateIdx: index("date_idx").on(table.date),
  })
);

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Session-domain maturity tracking — records the maturity level of each domain at each session.
 */
export const sessionDomainMaturity = mysqlTable(
  "session_domain_maturity",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    domainId: int("domainId").notNull(),
    maturityLevel: mysqlEnum("maturityLevel", [
      "Not started",
      "Early",
      "Developing",
      "Functional with gaps",
      "Solid",
      "World-class",
    ]).notNull(),
    explanation: text("explanation").notNull(), // Why this maturity level
    changeFromPrevious: varchar("changeFromPrevious", { length: 50 }), // "No change", "Improved", "Regressed"
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("sessionId_idx").on(table.sessionId),
    domainIdIdx: index("domainId_idx").on(table.domainId),
  })
);

export type SessionDomainMaturity = typeof sessionDomainMaturity.$inferSelect;
export type InsertSessionDomainMaturity = typeof sessionDomainMaturity.$inferInsert;

/**
 * Action items extracted from sessions.
 */
export const actionItems = mysqlTable(
  "action_items",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    owner: varchar("owner", { length: 100 }).notNull(), // Person responsible
    task: text("task").notNull(), // What needs to be done
    deadline: timestamp("deadline"), // When it's due (nullable for "ASAP")
    priority: mysqlEnum("priority", ["HIGH", "MED", "LOW"]).notNull(),
    status: mysqlEnum("status", ["open", "complete"]).default("open").notNull(),
    domainTag: varchar("domainTag", { length: 50 }), // Optional domain association
    sourceSession: int("sourceSession").notNull(), // Session number where this originated
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"), // When marked complete
  },
  (table) => ({
    sessionIdIdx: index("sessionId_idx").on(table.sessionId),
    ownerIdx: index("owner_idx").on(table.owner),
    statusIdx: index("status_idx").on(table.status),
    priorityIdx: index("priority_idx").on(table.priority),
    deadlineIdx: index("deadline_idx").on(table.deadline),
  })
);

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

/**
 * Blockers extracted from sessions.
 */
export const blockers = mysqlTable(
  "blockers",
  {
    id: int("id").autoincrement().primaryKey(),
    description: text("description").notNull(), // What is blocking progress
    firstAppearedSession: int("firstAppearedSession").notNull(), // Session number where first mentioned
    timesAppeared: int("timesAppeared").default(1).notNull(), // How many sessions mentioned this
    status: mysqlEnum("status", ["open", "resolved"]).default("open").notNull(),
    resolutionNote: text("resolutionNote"), // How it was resolved
    domainTag: varchar("domainTag", { length: 50 }).notNull(), // Which domain this affects
    isChronicFlag: boolean("isChronicFlag").default(false).notNull(), // Automatically set when timesAppeared >= 3
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"), // When marked resolved
  },
  (table) => ({
    domainTagIdx: index("domainTag_idx").on(table.domainTag),
    statusIdx: index("status_idx").on(table.status),
    isChronicFlagIdx: index("isChronicFlag_idx").on(table.isChronicFlag),
  })
);

export type Blocker = typeof blockers.$inferSelect;
export type InsertBlocker = typeof blockers.$inferInsert;

/**
 * Blocker session references — tracks which sessions mentioned each blocker.
 */
export const blockerSessions = mysqlTable(
  "blocker_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    blockerId: int("blockerId").notNull(),
    sessionId: int("sessionId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    blockerIdIdx: index("blockerId_idx").on(table.blockerId),
    sessionIdIdx: index("sessionId_idx").on(table.sessionId),
  })
);

export type BlockerSession = typeof blockerSessions.$inferSelect;
export type InsertBlockerSession = typeof blockerSessions.$inferInsert;

/**
 * Rollup reports — daily, weekly, and monthly aggregations.
 */
export const rollups = mysqlTable(
  "rollups",
  {
    id: int("id").autoincrement().primaryKey(),
    type: mysqlEnum("type", ["Daily Rollup", "Weekly Review", "Monthly Review"]).notNull(),
    date: timestamp("date").notNull(), // Start date of the period
    endDate: timestamp("endDate").notNull(), // End date of the period
    executiveSummary: text("executiveSummary").notNull(),
    operationalSummary: text("operationalSummary").notNull(),
    consolidatedKeyPoints: text("consolidatedKeyPoints").notNull(), // JSON array
    blockers: text("blockers").notNull(), // JSON array
    decisionsMade: text("decisionsMade").notNull(), // JSON array
    allActionItems: text("allActionItems").notNull(), // JSON array
    openQuestions: text("openQuestions").notNull(), // JSON array
    recurringThemes: text("recurringThemes"), // For daily/weekly only
    systemMaturitySnapshot: text("systemMaturitySnapshot").notNull(), // JSON array of {domain, maturity, change}
    changelogDelta: text("changelogDelta").notNull(), // "Moved forward:" and "Still stuck:"
    topPriorities: text("topPriorities"), // For daily only — top 3 priorities
    timelineStamp: text("timelineStamp"), // For monthly only — one-line summary for timeline
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("type_idx").on(table.type),
    dateIdx: index("date_idx").on(table.date),
  })
);

export type Rollup = typeof rollups.$inferSelect;
export type InsertRollup = typeof rollups.$inferInsert;

/**
 * Master timeline — chronological record of operational growth.
 */
export const timeline = mysqlTable(
  "timeline",
  {
    id: int("id").autoincrement().primaryKey(),
    month: varchar("month", { length: 7 }).notNull(), // "2026-05", "2026-06", etc.
    timelineStamp: text("timelineStamp").notNull(), // One-line summary from monthly review
    rollupId: int("rollupId"), // Reference to the monthly review that generated this
    isManualMilestone: boolean("isManualMilestone").default(false).notNull(), // True if user manually added
    domainTags: text("domainTags"), // JSON array of domain tags relevant to this entry
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    monthIdx: index("month_idx").on(table.month),
    rollupIdIdx: index("rollupId_idx").on(table.rollupId),
  })
);

export type Timeline = typeof timeline.$inferSelect;
export type InsertTimeline = typeof timeline.$inferInsert;

/**
 * Quick notes — ephemeral notes that can be queried by Ops Brain chat.
 */
export const quickNotes = mysqlTable(
  "quick_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId"), // Optional reference to session
    content: text("content").notNull(), // The note text
    tags: text("tags"), // JSON array of tags for filtering
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("sessionId_idx").on(table.sessionId),
  })
);

export type QuickNote = typeof quickNotes.$inferSelect;
export type InsertQuickNote = typeof quickNotes.$inferInsert;

/**
 * Settings — app configuration like Cowork export path.
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Employees — people who work at or for JivePilot.
 */
export const employees = mysqlTable(
  "employees",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 100 }).notNull(),
    department: varchar("department", { length: 100 }),
    status: mysqlEnum("status", ["active", "inactive", "at_risk"]).default("active").notNull(),
    criticalityScore: int("criticalityScore").default(5).notNull(), // 1-10
    replacementReadiness: int("replacementReadiness").default(0).notNull(), // 0-100%
    processesOwned: text("processesOwned"), // JSON array of process names
    backupPerson: varchar("backupPerson", { length: 100 }),
    skills: text("skills"), // JSON array of skills
    notes: text("notes"),
    hireDate: timestamp("hireDate"),
    terminationDate: timestamp("terminationDate"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index("emp_name_idx").on(table.name),
    statusIdx: index("emp_status_idx").on(table.status),
  })
);

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Clients — companies JivePilot serves.
 */
export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    status: mysqlEnum("status", ["active", "at_risk", "churned", "prospect"]).default("active").notNull(),
    healthScore: int("healthScore").default(70).notNull(), // 0-100
    monthlyRevenue: decimal("monthlyRevenue", { precision: 10, scale: 2 }),
    teamSize: int("teamSize").default(0).notNull(),
    startDate: timestamp("startDate"),
    notes: text("notes"),
    riskFlags: text("riskFlags"), // JSON array of risk descriptions
    assignedTeam: text("assignedTeam"), // JSON array of employee names
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nameIdx: index("client_name_idx").on(table.name),
    statusIdx: index("client_status_idx").on(table.status),
  })
);

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Processes — documented SOPs and workflows.
 */
export const processes = mysqlTable(
  "processes",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(), // "HR", "Finance", "Client Ops", etc.
    owner: varchar("owner", { length: 100 }),
    backupOwner: varchar("backupOwner", { length: 100 }),
    documentationPct: int("documentationPct").default(0).notNull(), // 0-100%
    status: mysqlEnum("status", ["documented", "partial", "undocumented", "needs_update"]).default("undocumented").notNull(),
    automationOpportunity: mysqlEnum("automationOpportunity", ["high", "medium", "low", "none"]).default("none").notNull(),
    description: text("description"),
    steps: text("steps"), // JSON array of step strings
    domainTag: varchar("domainTag", { length: 50 }),
    linkedSessionIds: text("linkedSessionIds"), // JSON array of session numbers where discussed
    diagramUrl: varchar("diagramUrl", { length: 500 }), // URL to uploaded process diagram image
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("proc_category_idx").on(table.category),
    ownerIdx: index("proc_owner_idx").on(table.owner),
  })
);

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;
