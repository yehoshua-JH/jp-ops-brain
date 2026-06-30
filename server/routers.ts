import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import * as db from "./db";
import { processMeeting } from "./llmProcessing";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// ─── Auth ────────────────────────────────────────────────────────────────────
const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  }),
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { compare } = await import("bcryptjs");
      const appUsername = process.env.APP_USERNAME || "admin";
      const appPasswordHash = process.env.APP_PASSWORD_HASH || "";
      const appPasswordPlain = process.env.APP_PASSWORD || "";
      let valid = false;
      if (appPasswordHash.startsWith("$2")) {
        valid = input.username === appUsername && await compare(input.password, appPasswordHash);
      } else if (appPasswordPlain) {
        valid = input.username === appUsername && input.password === appPasswordPlain;
      }
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      const openId = `local_${appUsername}`;
      await db.upsertUser({ openId, name: appUsername, email: null, loginMethod: "password", lastSignedIn: new Date() });
      const user = await db.getUserByOpenId(openId);
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User creation failed" });
      const token = await sdk.createSessionToken(openId, { name: appUsername });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { success: true, user };
    }),
});

// ─── Sessions ────────────────────────────────────────────────────────────────
const sessionsRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllSessions();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getSessionById(input.id);
    }),

  getByNumber: protectedProcedure
    .input(z.object({ sessionNumber: z.number() }))
    .query(async ({ input }) => {
      return await db.getSessionByNumber(input.sessionNumber);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      executiveSummary: z.string().optional(),
      keyPoints: z.string().optional(),
      decisionsMade: z.string().optional(),
      actionItems: z.string().optional(),
      openQuestions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateSessionFields(id, updates);
      return { success: true };
    }),

  process: protectedProcedure
    .input(
      z.object({
        rawText: z.string().min(1),
        meetingType: z.string().default("ops"),
        participants: z.array(z.string()).default([]),
        meetingDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const sessionNumber = await db.getNextSessionNumber();
        const result = await processMeeting({
          meetingInput: input.rawText,
          meetingType: input.meetingType,
          participants: input.participants.join(", "),
        });
        // Build structured key points with domain tags
        const keyPointsStructured = (result.keyPoints || []).map((point: string, i: number) => ({
          domain: (result.domainTags || [])[i] || "OPS",
          point,
        }));
        // Build structured blockers
        const blockersStructured = (result.blockers || []).map((b: string) => ({
          description: b,
          domain: "OPS",
          severity: "medium",
        }));
        const session = await db.createSession({
          sessionNumber,
          date: input.meetingDate ? new Date(input.meetingDate) : new Date(),
          inputFormat: "Raw transcript",
          meetingType: input.meetingType,
          participants: JSON.stringify(input.participants),
          tone: "neutral",
          executiveSummary: result.summary,
          operationalSummary: result.summary,
          keyPoints: JSON.stringify(keyPointsStructured),
          activeBlockers: JSON.stringify(blockersStructured),
          decisionsMade: JSON.stringify(result.decisions || []),
          actionItems: JSON.stringify(result.actionItems || []),
          openQuestions: JSON.stringify([]),
          systemMaturityNotes: JSON.stringify([]),
          changelogDelta: "",
        });
        return { success: true, session };
      } catch (error) {
        console.error("[Sessions] Process error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to process session" });
      }
    }),
});

// ─── Action Items ─────────────────────────────────────────────────────────────
const actionItemsRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllActionItems();
  }),

  getOpen: protectedProcedure.query(async () => {
    return await db.getActionItemsByStatus("open");
  }),

  getByOwner: protectedProcedure
    .input(z.object({ owner: z.string() }))
    .query(async ({ input }) => {
      return await db.getActionItemsByOwner(input.owner);
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["open", "complete"]) }))
    .mutation(async ({ input }) => {
      await db.updateActionItemStatus(input.id, input.status);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      task: z.string().optional(),
      owner: z.string().optional(),
      priority: z.enum(["HIGH", "MED", "LOW"]).optional(),
      status: z.enum(["open", "complete"]).optional(),
      deadline: z.string().nullable().optional(),
      completionNote: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateActionItemFields(id, updates);
      return { success: true };
    }),
});

// ─── Blockers ─────────────────────────────────────────────────────────────────
const blockersRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllBlockers();
  }),

  getOpen: protectedProcedure.query(async () => {
    return await db.getBlockersByStatus("open");
  }),

  getChronic: protectedProcedure.query(async () => {
    return await db.getChronicBlockers();
  }),

  resolve: protectedProcedure
    .input(z.object({ id: z.number(), resolutionNote: z.string() }))
    .mutation(async ({ input }) => {
      await db.resolveBlocker(input.id, input.resolutionNote);
      return { success: true };
    }),
  updateNote: protectedProcedure
    .input(z.object({ id: z.number(), note: z.string() }))
    .mutation(async ({ input }) => {
      await db.updateBlockerNote(input.id, input.note);
      return { success: true };
    }),
  escalate: protectedProcedure
    .input(z.object({ id: z.number(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.escalateBlocker(input.id, input.note);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      domainTag: z.string().optional(),
      resolutionNote: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateBlockerFields(id, updates);
      return { success: true };
    }),
});

// ─── Domains ──────────────────────────────────────────────────────────────────
const domainsRouter = router({
  getAll: protectedProcedure.query(async () => {
    const allDomains = await db.getAllDomains();
    const allMaturity = await db.getLatestDomainMaturity();
    return allDomains.map((d) => {
      const maturity = allMaturity.find((m) => m.domainId === d.id);
      const maturityMap: Record<string, number> = {
        "Not started": 10, "Early": 25, "Developing": 40,
        "Functional with gaps": 60, "Solid": 80, "World-class": 100,
      };
      return {
        ...d,
        currentMaturityScore: maturity ? (maturityMap[maturity.maturityLevel] ?? 0) : 0,
        currentMaturityLevel: maturity?.maturityLevel ?? "Not started",
        trend: maturity?.changeFromPrevious === "Improved" ? "improving"
          : maturity?.changeFromPrevious === "Regressed" ? "declining" : "stable",
      };
    });
  }),

  getMaturityHistory: protectedProcedure
    .input(z.object({ domainId: z.number() }))
    .query(async ({ input }) => {
      return await db.getSessionDomainMaturityByDomain(input.domainId);
    }),

  updateIdealEndState: protectedProcedure
    .input(z.object({ domainId: z.number(), idealEndState: z.string() }))
    .mutation(async ({ input }) => {
      await db.updateDomainIdealEndState(input.domainId, input.idealEndState);
      return { success: true };
    }),

  overrideMaturity: protectedProcedure
    .input(z.object({
      domainId: z.number(),
      maturityLevel: z.enum(["Not started", "Early", "Developing", "Functional with gaps", "Solid", "World-class"]),
      explanation: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.overrideDomainMaturity(input.domainId, input.maturityLevel, input.explanation);
      return { success: true };
    }),
});

// ─── Timeline ─────────────────────────────────────────────────────────────────
const timelineRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getTimelineEntries();
  }),
});

// ─── Reports ──────────────────────────────────────────────────────────────────
const reportsRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getRollupsByType("Daily Rollup");
  }),

  generateDaily: protectedProcedure
    .input(z.object({ sessionIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      try {
        const sessionsList = await Promise.all(input.sessionIds.map((id) => db.getSessionById(id)));
        const valid = sessionsList.filter((s): s is NonNullable<typeof s> => s != null);
        if (!valid.length) throw new Error("No valid sessions");
        return { success: true, count: valid.length };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate daily rollup" });
      }
    }),

  generateRollup: protectedProcedure
    .input(z.object({ type: z.enum(["daily", "weekly", "monthly"]) }))
    .mutation(async ({ input }) => {
      try {
        const [allSessions, openBlockers, openActions, domains, clients] = await Promise.all([
          db.getAllSessions(),
          db.getBlockersByStatus("open"),
          db.getActionItemsByStatus("open"),
          db.getAllDomains(),
          db.getAllClients(),
        ]);

        const now = new Date();
        let sessionWindow: typeof allSessions;
        let windowLabel: string;

        if (input.type === "daily") {
          const today = new Date(now); today.setHours(0,0,0,0);
          sessionWindow = allSessions.filter(s => new Date(s.date) >= today);
          if (!sessionWindow.length) sessionWindow = allSessions.slice(-3);
          windowLabel = `Today (${now.toLocaleDateString()})`;
        } else if (input.type === "weekly") {
          const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
          sessionWindow = allSessions.filter(s => new Date(s.date) >= weekAgo);
          if (!sessionWindow.length) sessionWindow = allSessions.slice(-10);
          windowLabel = "Last 7 days";
        } else {
          const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
          sessionWindow = allSessions.filter(s => new Date(s.date) >= monthAgo);
          if (!sessionWindow.length) sessionWindow = allSessions.slice(-20);
          windowLabel = "Last 30 days";
        }

        const sessionSummaries = sessionWindow
          .map(s => `Session ${s.sessionNumber} (${new Date(s.date).toLocaleDateString()}): ${s.executiveSummary}\nKey Points: ${Array.isArray(s.keyPoints) ? (s.keyPoints as string[]).join("; ") : s.keyPoints}`)
          .join("\n\n");

        const blockerSummary = openBlockers.slice(0, 15)
          .map(b => `[${b.domainTag}] ${b.description} (appeared ${b.timesAppeared}x)`)
          .join("\n");

        const actionSummary = openActions.slice(0, 20)
          .map(a => `${a.owner}: ${a.task} [${a.priority}]${a.deadline ? ` due ${new Date(a.deadline).toLocaleDateString()}` : ""}`)
          .join("\n");

        const clientSummary = clients
          .map(c => `${c.name}: health=${c.healthScore ?? "?"}%, status=${c.status ?? "active"}`)
          .join("\n");

        const domainSummary = domains
          .map(d => `${d.name}: ${d.idealEndState}`)
          .join("\n");

        const typePrompt = input.type === "daily"
          ? `Generate a concise DAILY ROLLUP REPORT for JivePilot operations covering ${windowLabel}. Structure it with these sections: ## Daily Rollup — ${now.toLocaleDateString()} / ### Sessions Today / ### Key Decisions Made / ### Blockers Surfaced / ### Action Items Due / ### Domain Health Snapshot / ### Tomorrow's Focus`
          : input.type === "weekly"
          ? `Generate a WEEKLY REVIEW REPORT for JivePilot operations covering ${windowLabel}. Sections: ## Weekly Review — Week of ${now.toLocaleDateString()} / ### Sessions This Week (${sessionWindow.length}) / ### Weekly Themes & Patterns / ### Domain Maturity Changes / ### Key Decisions / ### Blockers: New / Resolved / Chronic / ### Action Items: Completed / Overdue / New / ### Client Health Summary / ### Strategic Insights / ### Next Week's Priorities`
          : `Generate a MONTHLY REVIEW REPORT for JivePilot operations covering ${windowLabel}. Sections: ## Monthly Review — ${now.toLocaleString("default", {month:"long",year:"numeric"})} / ### Sessions This Month (${sessionWindow.length}) / ### Monthly Achievements / ### Domain Maturity Assessment / ### Client Portfolio Health / ### Team Performance / ### Recurring Blockers & Root Causes / ### Strategic Recommendations for Next Month / ### Timeline Stamp`;

        const systemPrompt = `You are the JivePilot Ops Brain generating a structured operational report. Use ONLY the data provided. Be specific, cite session numbers, and provide actionable insights. Do not fabricate data.\n\nCOMPANY: JivePilot — staffing and operations company. Key people: Yehoshua (CEO), Reef (Ops), Charné (HR), Mike (Finance).\n\nSESSIONS IN WINDOW:\n${sessionSummaries || "No sessions in this window"}\n\nOPEN BLOCKERS (${openBlockers.length} total):\n${blockerSummary || "None"}\n\nOPEN ACTION ITEMS (${openActions.length} total):\n${actionSummary || "None"}\n\nCLIENT HEALTH:\n${clientSummary || "No clients"}\n\nOPERATIONAL DOMAINS:\n${domainSummary}`;

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: typePrompt },
          ],
          maxTokens: 2000,
        });

        const report = typeof llmResult.choices?.[0]?.message?.content === "string"
          ? llmResult.choices[0].message.content
          : "Failed to generate report content.";

        return { success: true, report, sessionCount: sessionWindow.length, generatedAt: now.toISOString() };
      } catch (error) {
        console.error("[Reports] generateRollup error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate rollup report" });
      }
    }),
});

// ─── Voice & AI Brain ─────────────────────────────────────────────────────────
const brainRouter = router({
  // Transcribe uploaded audio recording
  transcribeRecording: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language || "en",
        });
        if ("error" in result) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }
        return { success: true, transcript: result.text, language: result.language };
      } catch (error) {
        console.error("[Brain] Transcription error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to transcribe audio" });
      }
    }),

  // AI Q&A — ask the brain anything about JivePilot operations
  ask: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
        conversationHistory: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Gather operational context from the database
        const [allSessions, openBlockers, openActions, domains] = await Promise.all([
          db.getAllSessions(),
          db.getBlockersByStatus("open"),
          db.getActionItemsByStatus("open"),
          db.getAllDomains(),
        ]);

        // Build a rich context string from real data
        const recentSessions = allSessions.slice(-10);
        const sessionContext = recentSessions
          .map(
            (s) =>
              `Session ${s.sessionNumber} (${new Date(s.date).toLocaleDateString()}): ${s.executiveSummary}`
          )
          .join("\n");

        const blockerContext = openBlockers
          .slice(0, 10)
          .map((b) => `[${b.domainTag}] ${b.description} (appeared ${b.timesAppeared}x)`)
          .join("\n");

        const actionContext = openActions
          .slice(0, 15)
          .map((a) => `${a.owner}: ${a.task} [${a.priority}]${a.deadline ? ` due ${new Date(a.deadline).toLocaleDateString()}` : ""}`)
          .join("\n");

        const domainContext = domains
          .map((d) => `${d.name}: ${d.idealEndState}`)
          .join("\n");

        const systemPrompt = `You are the JivePilot Ops Brain — an AI assistant with deep knowledge of JivePilot's operations, team, clients, and processes. You answer questions concisely and accurately based on the operational data below.

COMPANY: JivePilot — a staffing and operations company that places contractors with clients. Key people: Yehoshua (CEO/Founder), Reef (Operations), Charne (HR Lead, new), Mike (Finance/Sales), Kim (Talk & Save, expanding hours), Alex (Talk & Save, new hire), Yyer (Talk & Save SEO, transitioning out), Elizabeth (Zip Kosher, fired), Melissa (Zip Kosher, part-time).

ACTIVE CLIENTS: Talk & Save (healthy, expanding), Zip Kosher (at risk, down to 0.5 FTE after Elizabeth fired), Jacob's Real Estate (critical risk, requesting churn after 1 month), Noma (ongoing).

RECENT SESSION SUMMARIES (last 10):
${sessionContext}

OPEN BLOCKERS (${openBlockers.length} total):
${blockerContext || "None currently"}

OPEN ACTION ITEMS (${openActions.length} total):
${actionContext || "None currently"}

OPERATIONAL DOMAINS:
${domainContext}

Answer the user's question based on this data. Be specific and cite sources (e.g., "Based on Session 42..."). If you don't have enough data to answer, say so clearly. Keep answers concise but complete. Speak like a trusted chief of staff, not a generic AI.`;

        const messages = [
          ...input.conversationHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.question },
        ];

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        });
        const answer = llmResult.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
        return { success: true, answer };
      } catch (error) {
        console.error("[Brain] Ask error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to process question" });
      }
    }),

  // Context-aware voice update — transcribe audio, understand intent, route to correct DB field
  voiceUpdate: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        // Context about what the user was looking at when they pressed the mic
        context: z.object({
          entityType: z.enum(["blocker", "actionItem", "client", "employee", "session", "domain", "general"]),
          entityId: z.number().optional(),
          entityName: z.string().optional(),
          currentPage: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      // Step 1: Transcribe the audio
      const transcription = await transcribeAudio({ audioUrl: input.audioUrl, language: "en" });
      if ("error" in transcription) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: transcription.error });
      }
      const transcript = transcription.text;

      // Step 2: Load relevant context from DB
      const { entityType, entityId } = input.context;
      let entityData: any = null;
      if (entityId) {
        if (entityType === "blocker") entityData = await db.getBlockerById(entityId);
        else if (entityType === "actionItem") entityData = await db.getActionItemById(entityId);
        else if (entityType === "client") entityData = await db.getClientById(entityId);
        else if (entityType === "employee") entityData = await db.getEmployeeById(entityId);
        else if (entityType === "session") entityData = await db.getSessionById(entityId);
      }

      // Step 3: Ask GPT-4o to interpret the voice update and produce a structured action
      const contextDesc = entityData
        ? `The user was looking at ${entityType} #${entityId}: ${JSON.stringify(entityData).slice(0, 500)}`
        : `The user was on the ${input.context.currentPage ?? entityType} page.`;

      const systemPrompt = `You are the JivePilot Ops Brain. The user spoke a voice update while looking at their operations dashboard.

${contextDesc}

The user said: "${transcript}"

Interpret what the user wants to update and return a JSON action object. Possible actions:
- { "action": "updateBlocker", "id": number, "fields": { "description"?: string, "resolutionNote"?: string, "status"?: "open"|"resolved", "isChronicFlag"?: boolean } }
- { "action": "updateActionItem", "id": number, "fields": { "task"?: string, "owner"?: string, "status"?: "open"|"complete", "priority"?: "HIGH"|"MED"|"LOW", "deadline"?: string } }
- { "action": "updateClient", "id": number, "fields": { "status"?: string, "healthScore"?: number, "notes"?: string } }
- { "action": "updateEmployee", "id": number, "fields": { "role"?: string, "status"?: string, "criticalityScore"?: number, "replacementReadiness"?: number, "backupPerson"?: string, "notes"?: string } }
- { "action": "updateSession", "id": number, "fields": { "executiveSummary"?: string, "decisionsMade"?: string, "openQuestions"?: string } }
- { "action": "addNote", "entityType": string, "id": number, "note": string }
- { "action": "unknown", "message": string }

Return ONLY valid JSON. If you cannot determine the intent, return { "action": "unknown", "message": "explain why" }.`;

      const llmResult = await invokeLLM({
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" },
      });

      let parsedAction: any;
      try {
        const raw = llmResult.choices?.[0]?.message?.content;
        parsedAction = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        return { success: false, transcript, action: null, message: "Could not parse AI response" };
      }

      // Step 4: Execute the action
      try {
        if (parsedAction.action === "updateBlocker" && parsedAction.id) {
          await db.updateBlockerFields(parsedAction.id, parsedAction.fields ?? {});
        } else if (parsedAction.action === "updateActionItem" && parsedAction.id) {
          await db.updateActionItemFields(parsedAction.id, parsedAction.fields ?? {});
        } else if (parsedAction.action === "updateClient" && parsedAction.id) {
          await db.updateClientRisk(parsedAction.id, parsedAction.fields ?? {});
        } else if (parsedAction.action === "updateEmployee" && parsedAction.id) {
          await db.updateEmployeeRisk(parsedAction.id, parsedAction.fields ?? {});
        } else if (parsedAction.action === "updateSession" && parsedAction.id) {
          await db.updateSessionFields(parsedAction.id, parsedAction.fields ?? {});
        } else if (parsedAction.action === "addNote" && parsedAction.id) {
          // Append note to the entity's notes field
          if (parsedAction.entityType === "client") {
            const existing = await db.getClientById(parsedAction.id);
            const newNote = existing?.notes ? `${existing.notes}\n\n${parsedAction.note}` : parsedAction.note;
            await db.updateClientRisk(parsedAction.id, { notes: newNote });
          } else if (parsedAction.entityType === "employee") {
            const existing = await db.getEmployeeById(parsedAction.id);
            const newNote = existing?.notes ? `${existing.notes}\n\n${parsedAction.note}` : parsedAction.note;
            await db.updateEmployeeRisk(parsedAction.id, { notes: newNote });
          } else if (parsedAction.entityType === "blocker") {
            await db.updateBlockerFields(parsedAction.id, { resolutionNote: parsedAction.note });
          }
        }
        return { success: true, transcript, action: parsedAction, message: `Applied: ${parsedAction.action}` };
      } catch (err) {
        console.error("[VoiceUpdate] Execution error:", err);
        return { success: false, transcript, action: parsedAction, message: "Update parsed but failed to save" };
      }
    }),

  // Quick stats for dashboard
  getStats: protectedProcedure.query(async () => {
    const [allSessions, openBlockers, openActions, chronicBlockers] = await Promise.all([
      db.getAllSessions(),
      db.getBlockersByStatus("open"),
      db.getActionItemsByStatus("open"),
      db.getChronicBlockers(),
    ]);

    const overdueActions = openActions.filter(
      (a) => a.deadline && new Date(a.deadline) < new Date()
    );

    const highPriorityActions = openActions.filter((a) => a.priority === "HIGH");

    return {
      totalSessions: allSessions.length,
      openBlockers: openBlockers.length,
      chronicBlockers: chronicBlockers.length,
      openActionItems: openActions.length,
      overdueActionItems: overdueActions.length,
      highPriorityItems: highPriorityActions.length,
      lastSessionDate: allSessions.length > 0 ? allSessions[allSessions.length - 1].date : null,
    };
  }),
});

// ─── Employees ──────────────────────────────────────────────────────────────
const employeesRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllEmployees();
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getEmployeeById(input.id);
    }),
  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      role: z.string(),
      department: z.string().optional(),
      status: z.enum(["active", "inactive", "at_risk"]).optional(),
      criticalityScore: z.number().min(1).max(10).optional(),
      replacementReadiness: z.number().min(0).max(100).optional(),
      processesOwned: z.array(z.string()).optional(),
      backupPerson: z.string().optional(),
      skills: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
            await db.upsertEmployee({
        ...input,
        processesOwned: input.processesOwned ? JSON.stringify(input.processesOwned) : undefined,
        skills: input.skills ? JSON.stringify(input.skills) : undefined,
      });
      return { success: true };
    }),
  updateRisk: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "inactive", "at_risk"]).optional(),
      criticalityScore: z.number().min(1).max(10).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.updateEmployeeRisk(id, rest);
      return { success: true };
    }),
});
// ─── Clients ──────────────────────────────────────────────────────────────────
const clientsRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllClients();
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getClientById(input.id);
    }),
  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      status: z.enum(["active", "at_risk", "churned", "prospect"]).optional(),
      healthScore: z.number().min(0).max(100).optional(),
      monthlyRevenue: z.string().optional(),
      teamSize: z.number().optional(),
      notes: z.string().optional(),
      riskFlags: z.array(z.string()).optional(),
      assignedTeam: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertClient({
        ...input,
        riskFlags: input.riskFlags ? JSON.stringify(input.riskFlags) : undefined,
        assignedTeam: input.assignedTeam ? JSON.stringify(input.assignedTeam) : undefined,
      });
      return { success: true };
    }),
  updateRisk: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "at_risk", "churned", "prospect"]).optional(),
      healthScore: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
      riskFlags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, riskFlags, ...rest } = input;
      await db.updateClientRisk(id, {
        ...rest,
        riskFlags: riskFlags ? JSON.stringify(riskFlags) : undefined,
      });
      return { success: true };
    }),
});

// ─── Processes ────────────────────────────────────────────────────────────────
const processesRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllProcesses();
  }),
  gapAnalysis: protectedProcedure
    .input(z.object({ processId: z.number() }))
    .query(async ({ input }) => {
      const process = await db.getProcessById(input.processId);
      if (!process) return null;
      const [allBlockers, allClients, allSessions] = await Promise.all([
        db.getBlockersByStatus("open"),
        db.getAllClients(),
        db.getAllSessions(),
      ]);
      // Parse structured phases from JSON steps
      let phases: Array<{ phase: string; owner: string; steps: string[]; automation: string }> = [];
      try {
        const parsed = JSON.parse(process.steps ?? "[]");
        if (Array.isArray(parsed) && parsed[0]?.phase) phases = parsed;
      } catch { /* flat steps */ }
      const dataContext = [
        `CLIENTS: ${JSON.stringify(allClients.map((c: { name: string; status: string; healthScore: number | null; notes?: string | null }) => ({ name: c.name, status: c.status, healthScore: c.healthScore, notes: (c.notes ?? "").slice(0, 200) })))}`,
        `OPEN BLOCKERS: ${JSON.stringify(allBlockers.map((b: { description: string; domainTag: string; timesAppeared: number }) => ({ description: b.description, domainTag: b.domainTag, timesAppeared: b.timesAppeared })))}`,
        `RECENT SESSIONS (last 6): ${JSON.stringify(allSessions.slice(0, 6).map((s: { sessionNumber: number; executiveSummary?: string | null; decisionsMade?: string | null }) => ({ sessionNumber: s.sessionNumber, exec: (s.executiveSummary ?? "").slice(0, 200), decisions: (s.decisionsMade ?? "").slice(0, 150) })))}`,
      ].join("\n\n");
      const processContext = phases.length > 0
        ? `DEFINED PROCESS PHASES:\n${phases.map(p => `${p.phase} (${p.owner}):\n${p.steps.map(s => `  - ${s}`).join("\n")}\nAutomation: ${p.automation}`).join("\n\n")}`
        : `PROCESS STEPS: ${process.steps}`;
      const llmResp = await invokeLLM({
        messages: [
          { role: "system", content: "You are an operations analyst. Analyze the defined process against real operational data and return a structured gap analysis as JSON." },
          { role: "user", content: `${processContext}\n\n${dataContext}\n\nReturn a JSON object with this exact shape:\n{\n  \"overallScore\": 0-100,\n  \"summary\": \"2-3 sentence executive summary\",\n  \"phaseAnalysis\": [{\"phase\": \"\", \"status\": \"on_track|partial|gap|unknown\", \"finding\": \"\", \"evidence\": \"\", \"recommendation\": \"\"}],\n  \"criticalGaps\": [],\n  \"positives\": []\n}` },
        ],
        response_format: { type: "json_object" },
      });
      try {
        const rawContent = llmResp.choices[0].message.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        return { process, phases, analysis: JSON.parse(content) };
      } catch {
        return { process, phases, analysis: null };
      }
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getProcessById(input.id);
    }),
  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      category: z.string(),
      owner: z.string().optional(),
      backupOwner: z.string().optional(),
      documentationPct: z.number().min(0).max(100).optional(),
      status: z.enum(["documented", "partial", "undocumented", "needs_update"]).optional(),
      automationOpportunity: z.enum(["high", "medium", "low", "none"]).optional(),
      description: z.string().optional(),
      steps: z.array(z.string()).optional(),
      domainTag: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.upsertProcess({
        ...input,
        steps: input.steps ? JSON.stringify(input.steps) : undefined,
      });
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  auth: authRouter,
  system: systemRouter,
  sessions: sessionsRouter,
  actionItems: actionItemsRouter,
  blockers: blockersRouter,
  domains: domainsRouter,
  timeline: timelineRouter,
  reports: reportsRouter,
  brain: brainRouter,
  employees: employeesRouter,
  clients: clientsRouter,
  processes: processesRouter,
});

export type AppRouter = typeof appRouter;
