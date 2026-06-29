import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import * as db from "./db";
import { processMeeting } from "./llmProcessing";
// invokeLLM replaced by direct OpenAI GPT-4o for brain.ask
import { transcribeAudio } from "./_core/voiceTranscription";

// ─── Auth ────────────────────────────────────────────────────────────────────
const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie("app_session");
    return { success: true };
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
        const session = await db.createSession({
          sessionNumber,
          date: input.meetingDate ? new Date(input.meetingDate) : new Date(),
          inputFormat: "Raw transcript",
          meetingType: input.meetingType,
          participants: JSON.stringify(input.participants),
          tone: "neutral",
          executiveSummary: result.summary,
          operationalSummary: result.summary,
          keyPoints: JSON.stringify(result.keyPoints || []),
          activeBlockers: JSON.stringify(result.blockers || []),
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

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            max_tokens: 1024,
            temperature: 0.4,
          }),
        });
        if (!openaiRes.ok) {
          const errBody = await openaiRes.text();
          console.error("[Brain] OpenAI error:", errBody);
          throw new Error("OpenAI API error");
        }
        const openaiData = await openaiRes.json() as { choices?: { message?: { content?: string } }[] };
        const answer = openaiData.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
        return { success: true, answer };
      } catch (error) {
        console.error("[Brain] Ask error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to process question" });
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
});

// ─── Processes ────────────────────────────────────────────────────────────────
const processesRouter = router({
  getAll: protectedProcedure.query(async () => {
    return await db.getAllProcesses();
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
