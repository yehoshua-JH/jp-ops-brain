import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { processMeeting } from "./llmProcessing";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // DOMAINS
  // ============================================================================
  domains: router({
    list: publicProcedure.query(async () => {
      return await db.getAllDomains();
    }),

    getByTag: publicProcedure.input(z.object({ tag: z.string() })).query(async ({ input }) => {
      return await db.getDomainByTag(input.tag);
    }),

    updateIdealEndState: protectedProcedure
      .input(
        z.object({
          domainId: z.number(),
          idealEndState: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateDomainIdealEndState(input.domainId, input.idealEndState);
        return { success: true };
      }),

    seedDomains: protectedProcedure.mutation(async () => {
      const existingDomains = await db.getAllDomains();
      if (existingDomains.length > 0) {
        return { success: false, message: "Domains already seeded" };
      }

      const domainsToSeed = [
        {
          tag: "TIME-TRACKING",
          name: "Employee time tracking",
          tier: "Core ops",
          color: "teal",
          idealEndState:
            "Every employee logs time daily with zero chasing. Time entries are categorized by task type and linked to a client and project. A manager can pull a complete, accurate time report for any employee or client in under 60 seconds. Discrepancies are caught automatically before invoicing.",
        },
        {
          tag: "INVOICING",
          name: "Invoicing & billing",
          tier: "Core ops",
          color: "blue",
          idealEndState:
            "Invoices are generated automatically from time-tracking data, customized per client billing schedule (retainer vs. hourly), reviewed in one click, and sent without manual input. Zero invoicing errors. Average days to payment tracked and trending down.",
        },
        {
          tag: "TALENT-OPS",
          name: "Talent operations",
          tier: "Core ops",
          color: "purple",
          idealEndState:
            "A structured pipeline from sourcing to placement to ongoing performance management. Every professional has a profile, clear KPIs, a weekly reporting cadence, and a primary contact. Onboarding takes under 48 hours from match to embedded. Retention tracked and issues caught early.",
        },
        {
          tag: "TECH-PLATFORM",
          name: "Internal tech platform",
          tier: "Core ops",
          color: "gray",
          idealEndState:
            "A stable, bug-free platform where any team member performs core tasks without needing a developer. New features go through a structured backlog. Role-based permissions are self-managed. Single developer dependency eliminated.",
        },
        {
          tag: "CLIENT-OPS",
          name: "Client operations & account management",
          tier: "Client & revenue",
          color: "amber",
          idealEndState:
            "Every client has a documented account profile, defined billing setup, agreed KPIs, and a weekly update cadence. Client health visible at a glance. Account managers proactively flag issues before clients raise them. Renewals happen naturally.",
        },
        {
          tag: "CLIENT-PORTAL",
          name: "Client portal & reporting",
          tier: "Client & revenue",
          color: "green",
          idealEndState:
            "Every client has login access to a portal showing their embedded talent's hours, KPI progress, weekly updates, and invoices in real time. Zero 'can you send me an update?' requests — clients self-serve.",
        },
        {
          tag: "FINANCE",
          name: "Finance & cash flow",
          tier: "Client & revenue",
          color: "orange",
          idealEndState:
            "Revenue is predictable, payroll goes out on time every month, and cash flow is visible 30–60 days ahead. All billing is ACH or equivalent. Zero revenue lost to billing errors or missed invoices. Days Sales Outstanding under 15 days.",
        },
        {
          tag: "TEAM-MGMT",
          name: "Internal team management",
          tier: "Client & revenue",
          color: "pink",
          idealEndState:
            "Every internal team member has documented responsibilities, clear reporting lines, and exactly the tools and permissions they need. New team members fully operational within 5 business days. Founder removed from all recurring operational tasks within 90 days.",
        },
        {
          tag: "SALES-BD",
          name: "Sales & business development",
          tier: "Growth & product",
          color: "indigo",
          idealEndState:
            "A repeatable inbound and outbound pipeline that converts consistently. Every lead tracked and followed up systematically. Website booking flow works flawlessly. Sales conversations led by operators who deeply understand the service.",
        },
        {
          tag: "AI-SYSTEMS",
          name: "AI systems & automation",
          tier: "Growth & product",
          color: "cyan",
          idealEndState:
            "At least 3 internal ops workflows automated via AI within 6 months. AI products have documented delivery playbooks. AI capability cited as a reason for choosing JivePilot in new client intake. JivePilot uses internally what it sells externally.",
        },
      ];

      await db.insertDomains(domainsToSeed);
      return { success: true, count: domainsToSeed.length };
    }),
  }),

  // ============================================================================
  // SESSIONS
  // ============================================================================
  sessions: router({
    create: protectedProcedure
      .input(
        z.object({
          date: z.date(),
          inputFormat: z.string(),
          meetingType: z.string(),
          participants: z.array(z.string()),
          tone: z.string().optional(),
          executiveSummary: z.string(),
          operationalSummary: z.string(),
          keyPoints: z.array(
            z.object({
              domain: z.string(),
              point: z.string(),
            })
          ),
          activeBlockers: z.array(z.string()),
          decisionsMade: z.array(z.string()),
          actionItems: z.array(
            z.object({
              owner: z.string(),
              task: z.string(),
              deadline: z.string().optional(),
              priority: z.enum(["HIGH", "MED", "LOW"]),
            })
          ),
          openQuestions: z.array(z.string()),
          systemMaturityNotes: z.array(
            z.object({
              domain: z.string(),
              maturity: z.string(),
              change: z.string().optional(),
            })
          ),
          changelogDelta: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const sessionNumber = await db.getNextSessionNumber();

        const session = await db.createSession({
          sessionNumber,
          date: input.date,
          inputFormat: input.inputFormat,
          meetingType: input.meetingType,
          participants: JSON.stringify(input.participants),
          tone: input.tone,
          executiveSummary: input.executiveSummary,
          operationalSummary: input.operationalSummary,
          keyPoints: JSON.stringify(input.keyPoints),
          activeBlockers: JSON.stringify(input.activeBlockers),
          decisionsMade: JSON.stringify(input.decisionsMade),
          actionItems: JSON.stringify(input.actionItems),
          openQuestions: JSON.stringify(input.openQuestions),
          systemMaturityNotes: JSON.stringify(input.systemMaturityNotes),
          changelogDelta: input.changelogDelta,
        });

        // Create action items
        for (const item of input.actionItems) {
          await db.createActionItem({
            sessionId: sessionNumber,
            owner: item.owner,
            task: item.task,
            deadline: item.deadline ? new Date(item.deadline) : undefined,
            priority: item.priority,
            status: "open",
            domainTag: undefined,
            sourceSession: sessionNumber,
          });
        }

        // Create or update blockers
        for (const blocker of input.activeBlockers) {
          const blockerRecord = await db.getOrCreateBlocker(
            blocker,
            "GENERAL",
            sessionNumber
          );
          if (blockerRecord) {
            await db.addBlockerSession(blockerRecord.id, sessionNumber);
            if (blockerRecord.id) {
              const newCount = blockerRecord.timesAppeared + 1;
              await db.updateBlockerTimesAppeared(blockerRecord.id, newCount);
            }
          }
        }

        return { sessionNumber, success: true };
      }),

    list: publicProcedure.query(async () => {
      const allSessions = await db.getAllSessions();
      return allSessions.map((s) => ({
        ...s,
        participants: JSON.parse(s.participants),
        keyPoints: JSON.parse(s.keyPoints),
        activeBlockers: JSON.parse(s.activeBlockers),
        decisionsMade: JSON.parse(s.decisionsMade),
        actionItems: JSON.parse(s.actionItems),
        openQuestions: JSON.parse(s.openQuestions),
        systemMaturityNotes: JSON.parse(s.systemMaturityNotes),
      }));
    }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const session = await db.getSessionById(input.id);
      if (!session) return null;
      return {
        ...session,
        participants: JSON.parse(session.participants),
        keyPoints: JSON.parse(session.keyPoints),
        activeBlockers: JSON.parse(session.activeBlockers),
        decisionsMade: JSON.parse(session.decisionsMade),
        actionItems: JSON.parse(session.actionItems),
        openQuestions: JSON.parse(session.openQuestions),
        systemMaturityNotes: JSON.parse(session.systemMaturityNotes),
      };
    }),

    getByNumber: publicProcedure
      .input(z.object({ sessionNumber: z.number() }))
      .query(async ({ input }) => {
        const session = await db.getSessionByNumber(input.sessionNumber);
        if (!session) return null;
        return {
          ...session,
          participants: JSON.parse(session.participants),
          keyPoints: JSON.parse(session.keyPoints),
          activeBlockers: JSON.parse(session.activeBlockers),
          decisionsMade: JSON.parse(session.decisionsMade),
          actionItems: JSON.parse(session.actionItems),
          openQuestions: JSON.parse(session.openQuestions),
          systemMaturityNotes: JSON.parse(session.systemMaturityNotes),
        };
      }),
  }),

  // ============================================================================
  // ACTION ITEMS
  // ============================================================================
  actionItems: router({
    list: publicProcedure.query(async () => {
      return await db.getAllActionItems();
    }),

    listByStatus: publicProcedure
      .input(z.object({ status: z.enum(["open", "complete"]) }))
      .query(async ({ input }) => {
        return await db.getActionItemsByStatus(input.status);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["open", "complete"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateActionItemStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ============================================================================
  // BLOCKERS
  // ============================================================================
  blockers: router({
    list: publicProcedure.query(async () => {
      return await db.getAllBlockers();
    }),

    listByStatus: publicProcedure
      .input(z.object({ status: z.enum(["open", "resolved"]) }))
      .query(async ({ input }) => {
        return await db.getBlockersByStatus(input.status);
      }),

    listChronic: publicProcedure.query(async () => {
      return await db.getChronicBlockers();
    }),

    resolve: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          resolutionNote: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.resolveBlocker(input.id, input.resolutionNote);
        return { success: true };
      }),
  }),

  // ============================================================================
  // LLM PROCESSING
  // ============================================================================
  llm: router({
    processMeeting: protectedProcedure
      .input(
        z.object({
          meetingInput: z.string(),
          meetingType: z.string(),
          participants: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await processMeeting(input);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("LLM processing error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to process meeting with LLM",
          });
        }
      }),
  }),

  // ============================================================================
  // SETTINGS
  // ============================================================================
  settings: router({
    get: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSetting(input.key);
      }),

    set: protectedProcedure
      .input(
        z.object({
          key: z.string(),
          value: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await db.setSetting(input.key, input.value);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
