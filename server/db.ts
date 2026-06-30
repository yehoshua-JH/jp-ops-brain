import { eq, desc, and, gte, lte, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  domains,
  sessions,
  actionItems,
  blockers,
  blockerSessions,
  sessionDomainMaturity,
  rollups,
  timeline,
  quickNotes,
  settings,
  employees,
  clients,
  processes,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === `local_${ENV.appUsername}` || user.openId === process.env.OWNER_OPEN_ID) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// DOMAINS
// ============================================================================

export async function getAllDomains() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(domains).orderBy(domains.tag);
}

export async function getDomainByTag(tag: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(domains)
    .where(eq(domains.tag, tag))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertDomains(domainsToInsert: typeof domains.$inferInsert[]) {
  const db = await getDb();
  if (!db) return;
  await db.insert(domains).values(domainsToInsert);
}

export async function updateDomainIdealEndState(domainId: number, idealEndState: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(domains)
    .set({ idealEndState, updatedAt: new Date() })
    .where(eq(domains.id, domainId));
}

// ============================================================================
// SESSIONS
// ============================================================================

export async function getNextSessionNumber() {
  const db = await getDb();
  if (!db) return 1;
  const result = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.sessionNumber))
    .limit(1);
  return result.length > 0 ? result[0].sessionNumber + 1 : 1;
}

export async function createSession(session: typeof sessions.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(sessions).values(session);
  // Return the full inserted row by fetching by sessionNumber
  const inserted = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionNumber, session.sessionNumber!))
    .limit(1);
  return inserted.length > 0 ? inserted[0] : undefined;
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionByNumber(sessionNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionNumber, sessionNumber))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllSessions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sessions).orderBy(desc(sessions.date));
}

export async function getSessionsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(sessions)
    .where(and(gte(sessions.date, startDate), lte(sessions.date, endDate)))
    .orderBy(desc(sessions.date));
}

// ============================================================================
// SESSION DOMAIN MATURITY
// ============================================================================

export async function createSessionDomainMaturity(
  maturity: typeof sessionDomainMaturity.$inferInsert
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(sessionDomainMaturity).values(maturity);
}

export async function getSessionDomainMaturityByDomain(domainId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(sessionDomainMaturity)
    .where(eq(sessionDomainMaturity.domainId, domainId))
    .orderBy(desc(sessionDomainMaturity.sessionId));
}

// ============================================================================
// ACTION ITEMS
// ============================================================================

export async function createActionItem(item: typeof actionItems.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(actionItems).values(item);
}

export async function getAllActionItems() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(actionItems)
    .orderBy(desc(actionItems.priority), actionItems.deadline);
}

export async function getActionItemsByStatus(status: "open" | "complete") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.status, status))
    .orderBy(desc(actionItems.priority), actionItems.deadline);
}

export async function getActionItemsByOwner(owner: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.owner, owner))
    .orderBy(desc(actionItems.priority), actionItems.deadline);
}

export async function updateActionItemStatus(id: number, status: "open" | "complete") {
  const db = await getDb();
  if (!db) return;
  const completedAt = status === "complete" ? new Date() : null;
  await db
    .update(actionItems)
    .set({ status, completedAt })
    .where(eq(actionItems.id, id));
}

// ============================================================================
// BLOCKERS
// ============================================================================

export async function createBlocker(blocker: typeof blockers.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(blockers).values(blocker);
  return result;
}

export async function getAllBlockers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(blockers).orderBy(desc(blockers.createdAt));
}

export async function getBlockersByStatus(status: "open" | "resolved") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(blockers)
    .where(eq(blockers.status, status))
    .orderBy(desc(blockers.createdAt));
}

export async function getChronicBlockers() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(blockers)
    .where(eq(blockers.isChronicFlag, true))
    .orderBy(desc(blockers.timesAppeared));
}

export async function updateBlockerTimesAppeared(id: number, newCount: number) {
  const db = await getDb();
  if (!db) return;
  const isChronicFlag = newCount >= 3;
  await db
    .update(blockers)
    .set({ timesAppeared: newCount, isChronicFlag })
    .where(eq(blockers.id, id));
}

export async function resolveBlocker(id: number, resolutionNote: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(blockers)
    .set({ status: "resolved", resolutionNote, resolvedAt: new Date() })
    .where(eq(blockers.id, id));
}

export async function getOrCreateBlocker(description: string, domainTag: string, sessionNumber: number) {
  const db = await getDb();
  if (!db) return undefined;

  // Try to find existing blocker with same description
  const existing = await db
    .select()
    .from(blockers)
    .where(eq(blockers.description, description))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new blocker
  const result = await db.insert(blockers).values({
    description,
    domainTag,
    firstAppearedSession: sessionNumber,
    timesAppeared: 1,
    status: "open",
    isChronicFlag: false,
  });

  // Fetch and return the created blocker
  const created = await db
    .select()
    .from(blockers)
    .where(eq(blockers.description, description))
    .limit(1);

  return created.length > 0 ? created[0] : undefined;
}

export async function addBlockerSession(blockerId: number, sessionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(blockerSessions).values({ blockerId, sessionId });
}

// ============================================================================
// ROLLUPS
// ============================================================================

export async function createRollup(rollup: typeof rollups.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(rollups).values(rollup);
  return result;
}

export async function getRollupsByType(type: "Daily Rollup" | "Weekly Review" | "Monthly Review") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(rollups)
    .where(eq(rollups.type, type))
    .orderBy(desc(rollups.date));
}

export async function getRollupsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(rollups)
    .where(and(gte(rollups.date, startDate), lte(rollups.date, endDate)))
    .orderBy(desc(rollups.date));
}

// ============================================================================
// TIMELINE
// ============================================================================

export async function createTimelineEntry(entry: typeof timeline.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(timeline).values(entry);
}

export async function getTimelineEntries() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timeline).orderBy(desc(timeline.month));
}

export async function getTimelineByMonth(month: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(timeline)
    .where(eq(timeline.month, month))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// QUICK NOTES
// ============================================================================

export async function createQuickNote(note: typeof quickNotes.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(quickNotes).values(note);
}

export async function getAllQuickNotes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(quickNotes).orderBy(desc(quickNotes.createdAt));
}

export async function getQuickNotesBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.sessionId, sessionId))
    .orderBy(desc(quickNotes.createdAt));
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return result.length > 0 ? result[0].value : undefined;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

// ─── Employees ────────────────────────────────────────────────────────────────
export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees).orderBy(employees.name);
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0] ?? null;
}

export async function upsertEmployee(data: typeof employees.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(employees).set(data).where(eq(employees.id, data.id));
  } else {
    await db.insert(employees).values(data);
  }
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).orderBy(clients.name);
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0] ?? null;
}

export async function upsertClient(data: typeof clients.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(clients).set(data).where(eq(clients.id, data.id));
  } else {
    await db.insert(clients).values(data);
  }
}

// ─── Processes ────────────────────────────────────────────────────────────────
export async function getAllProcesses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(processes).orderBy(processes.category, processes.name);
}

export async function getProcessById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(processes).where(eq(processes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function upsertProcess(data: typeof processes.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(processes).set(data).where(eq(processes.id, data.id));
  } else {
    await db.insert(processes).values(data);
  }
}

export async function getLatestDomainMaturity() {
  const db = await getDb();
  if (!db) return [];
  // Get the most recent maturity record per domain
  const result = await db
    .select()
    .from(sessionDomainMaturity)
    .orderBy(sessionDomainMaturity.createdAt);
  // Return only the latest per domainId
  const latestMap = new Map<number, typeof result[0]>();
  for (const row of result) {
    latestMap.set(row.domainId, row);
  }
  return Array.from(latestMap.values());
}

// ─── Risk Quick-Update Helpers ────────────────────────────────────────────────

/** Add/update a note on a blocker without resolving it */
export async function updateBlockerNote(id: number, note: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(blockers).set({ resolutionNote: note }).where(eq(blockers.id, id));
}

/** Escalate a blocker — marks it chronic regardless of timesAppeared */
export async function escalateBlocker(id: number, note?: string) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = { isChronicFlag: true };
  if (note !== undefined) updates.resolutionNote = note;
  await db.update(blockers).set(updates).where(eq(blockers.id, id));
}

/** Quick-update client risk status, health score, or notes */
export async function updateClientRisk(
  id: number,
  updates: { status?: "active" | "at_risk" | "churned" | "prospect"; healthScore?: number; notes?: string; riskFlags?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients).set(updates).where(eq(clients.id, id));
}

/** Quick-update employee risk status, criticality score, or notes */
export async function updateEmployeeRisk(
  id: number,
  updates: { status?: "active" | "inactive" | "at_risk"; criticalityScore?: number; notes?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set(updates).where(eq(employees.id, id));
}

// ─── Full-field Edit Helpers ──────────────────────────────────────────────────

/** Update any editable fields on a blocker */
export async function updateBlockerFields(
  id: number,
  updates: {
    description?: string;
    severity?: string;
    domainTag?: string;
    resolutionNote?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  const clean: Record<string, unknown> = {};
  if (updates.description !== undefined) clean.description = updates.description;
  if (updates.domainTag !== undefined) clean.domainTag = updates.domainTag;
  if (updates.resolutionNote !== undefined) clean.resolutionNote = updates.resolutionNote;
  if (Object.keys(clean).length > 0) {
    await db.update(blockers).set(clean).where(eq(blockers.id, id));
  }
}

/** Update any editable fields on an action item */
export async function updateActionItemFields(
  id: number,
  updates: {
    task?: string;
    owner?: string;
    priority?: "HIGH" | "MED" | "LOW";
    status?: "open" | "complete";
    deadline?: string | null;
    completionNote?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  const clean: Record<string, unknown> = {};
  if (updates.task !== undefined) clean.task = updates.task;
  if (updates.owner !== undefined) clean.owner = updates.owner;
  if (updates.priority !== undefined) clean.priority = updates.priority;
  if (updates.status !== undefined) {
    clean.status = updates.status;
    if (updates.status === "complete") clean.completedAt = new Date();
  }
  if (updates.deadline !== undefined) clean.deadline = updates.deadline ? new Date(updates.deadline) : null;
  if (Object.keys(clean).length > 0) {
    await db.update(actionItems).set(clean).where(eq(actionItems.id, id));
  }
}

/** Update editable fields on a session */
export async function updateSessionFields(
  id: number,
  updates: {
    executiveSummary?: string;
    keyPoints?: string;
    decisionsMade?: string;
    actionItems?: string;
    openQuestions?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  const clean: Record<string, unknown> = {};
  if (updates.executiveSummary !== undefined) clean.executiveSummary = updates.executiveSummary;
  if (updates.keyPoints !== undefined) clean.keyPoints = updates.keyPoints;
  if (updates.decisionsMade !== undefined) clean.decisionsMade = updates.decisionsMade;
  if (updates.actionItems !== undefined) clean.actionItems = updates.actionItems;
  if (updates.openQuestions !== undefined) clean.openQuestions = updates.openQuestions;
  if (Object.keys(clean).length > 0) {
    await db.update(sessions).set(clean).where(eq(sessions.id, id));
  }
}

/** Manually override a domain's maturity level (creates a new session_domain_maturity row with sessionId=0 for manual overrides) */
export async function overrideDomainMaturity(
  domainId: number,
  maturityLevel: "Not started" | "Early" | "Developing" | "Functional with gaps" | "Solid" | "World-class",
  explanation?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(sessionDomainMaturity).values({
    sessionId: 0, // 0 = manual override, not tied to a session
    domainId,
    maturityLevel,
    explanation: explanation ?? "Manual override",
    changeFromPrevious: "Improved",
  });
}

/** Get a single blocker by ID */
export async function getBlockerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(blockers).where(eq(blockers.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Get a single action item by ID */
export async function getActionItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(actionItems).where(eq(actionItems.id, id)).limit(1);
  return rows[0] ?? null;
}

// ─── User Management ─────────────────────────────────────────────────────────
/** Get all users (for superadmin user management page) */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(users.createdAt);
}

/** Create a new user with hashed password */
export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin" | "superadmin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${data.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    loginMethod: "password",
    passwordHash: data.passwordHash,
    role: data.role,
    lastSignedIn: new Date(),
  });
  return await db.select().from(users).where(eq(users.openId, openId)).limit(1).then(r => r[0]);
}

/** Update a user's password hash */
export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Update a user's role */
export async function updateUserRole(userId: number, role: "user" | "admin" | "superadmin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Delete a user */
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

/** Get user by email */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

/** Get user by ID */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
