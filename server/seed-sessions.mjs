/**
 * Seed script: loads all real JivePilot sessions (27-43) into the database.
 * Run with: node server/seed-sessions.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const conn = await createConnection(DATABASE_URL);

// Helper: insert a session, skip if sessionNumber already exists
async function upsertSession(s) {
  const [existing] = await conn.execute(
    "SELECT id FROM sessions WHERE sessionNumber = ?",
    [s.sessionNumber]
  );
  if (existing.length > 0) {
    console.log(`  [skip] Session ${s.sessionNumber} already exists`);
    return;
  }
  await conn.execute(
    `INSERT INTO sessions
      (sessionNumber, date, inputFormat, meetingType, participants, tone,
       executiveSummary, operationalSummary, keyPoints, activeBlockers,
       decisionsMade, actionItems, openQuestions, systemMaturityNotes, changelogDelta)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      s.sessionNumber,
      s.date,
      s.inputFormat,
      s.meetingType,
      JSON.stringify(s.participants),
      s.tone,
      s.executiveSummary,
      s.operationalSummary,
      JSON.stringify(s.keyPoints),
      JSON.stringify(s.activeBlockers),
      JSON.stringify(s.decisionsMade),
      JSON.stringify(s.actionItems),
      JSON.stringify(s.openQuestions),
      JSON.stringify(s.systemMaturityNotes),
      s.changelogDelta,
    ]
  );
  console.log(`  [ok]   Session ${s.sessionNumber} inserted`);
}

const sessions = [
  {
    sessionNumber: 27,
    date: new Date("2026-06-15"),
    inputFormat: "Audio transcription + user notes",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Noma"],
    tone: "supportive",
    executiveSummary: "Role clarification and confidence-building conversation between Yehoshua and Noma. Noma is competent within her defined domain (HR, operations, onboarding, hours tracking, contracts) but anxious because she was being asked to own Mike's processes without clear boundaries or training. Yehoshua shifts approach from replacement to proper support and structure.",
    operationalSummary: "Noma's domain clarified: she owns HR operations, contractor onboarding, contract management, hours tracking support, and recruitment coordination. She does NOT own Mike's account management processes, finance/invoicing decisions, or technical platform work. Noma commits to daily/weekly WhatsApp updates. Questions about Mike's processes should go to Mike directly.",
    keyPoints: [
      { domain: "HR-OPS", point: "Noma confident in HR, onboarding, contracts, hours tracking" },
      { domain: "HR-OPS", point: "Noma NOT responsible for Mike's account management processes" },
      { domain: "HR-OPS", point: "Daily/weekly WhatsApp updates agreed as communication cadence" },
      { domain: "PROCESS-DOCUMENTATION", point: "Onboarding workflows charted with Yehoshua on PayP" },
      { domain: "TEAM-MGMT", point: "Noma anxious about being labeled incompetent for knowledge gaps outside her domain" },
    ],
    activeBlockers: [
      "Mike's processes not documented — Noma cannot answer questions about them",
      "No clear handover from Mike to Noma for account management",
    ],
    decisionsMade: [
      "Noma's domain boundaries clearly defined — HR, onboarding, hours, contracts",
      "Questions about Mike's processes go to Mike directly, not Noma",
      "Daily/weekly WhatsApp updates as communication standard",
    ],
    actionItems: [
      { owner: "Yehoshua", task: "Provide Noma with structured task assignments and process documentation", deadline: "ASAP", priority: "HIGH" },
      { owner: "Noma", task: "Send daily/weekly WhatsApp updates on completed tasks and blockers", deadline: "Ongoing", priority: "HIGH" },
      { owner: "Mike", task: "Document account management processes for handover", deadline: "ASAP", priority: "HIGH" },
    ],
    openQuestions: [
      "Who takes over Mike's client relationship management long-term?",
      "What is the timeline for Mike's full departure?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "Domain boundaries clarified; structure being put in place" },
      { domain: "PROCESS-DOCUMENTATION", maturity: "Early", change: "Onboarding charted; Mike's processes undocumented" },
    ],
    changelogDelta: "Noma's role boundaries clarified. Communication cadence established.",
  },
  {
    sessionNumber: 28,
    date: new Date("2026-06-15"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Mike"],
    tone: "tense",
    executiveSummary: "Difficult conversation between Yehoshua and Mike about Mike's departure timeline, knowledge transfer, and account management handover. Mike is transitioning out but the timeline and process are unclear. Key concern: Mike owns critical client relationships and processes that have not been documented or transferred.",
    operationalSummary: "Mike's departure is confirmed but timeline unclear. He owns Talk & Save account management, SOW creation, KPI definition, and client communication. None of this is documented. Yehoshua needs Mike to document processes and transfer knowledge before leaving. Tension around Mike's perceived lack of initiative in the handover process.",
    keyPoints: [
      { domain: "CLIENT-MGMT", point: "Mike owns Talk & Save relationship — critical handover needed" },
      { domain: "PROCESS-DOCUMENTATION", point: "Mike's account management processes not documented" },
      { domain: "HR-OPS", point: "Mike departure timeline unclear — creates planning uncertainty" },
      { domain: "TEAM-MGMT", point: "Tension between Yehoshua and Mike about handover initiative" },
    ],
    activeBlockers: [
      "Mike's processes undocumented — knowledge trapped with departing employee",
      "Talk & Save handover not started",
      "Departure timeline not confirmed",
    ],
    decisionsMade: [
      "Mike to document all account management processes before departure",
      "Talk & Save handover plan to be created",
    ],
    actionItems: [
      { owner: "Mike", task: "Document Talk & Save account management process", deadline: "This week", priority: "HIGH" },
      { owner: "Mike", task: "Confirm departure date with Yehoshua", deadline: "ASAP", priority: "HIGH" },
      { owner: "Yehoshua", task: "Identify replacement for Mike's account management role", deadline: "This week", priority: "HIGH" },
    ],
    openQuestions: [
      "What is Mike's confirmed last day?",
      "Who takes over Talk & Save account management?",
      "What is the KPI framework Mike was using?",
    ],
    systemMaturityNotes: [
      { domain: "CLIENT-MGMT", maturity: "At Risk", change: "Key account manager departing with undocumented processes" },
      { domain: "PROCESS-DOCUMENTATION", maturity: "Early", change: "Critical processes not documented before departure" },
    ],
    changelogDelta: "Mike departure confirmed. Knowledge transfer risk identified as critical.",
  },
  {
    sessionNumber: 29,
    date: new Date("2026-06-17"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Noma"],
    tone: "exploratory",
    executiveSummary: "Follow-up session with Noma covering operational updates, hours tracking status, and planning for Mike's replacement. Discussion of the new HR system being built and Noma's role in testing and adopting it.",
    operationalSummary: "Hours tracking updates reviewed. New HR system development discussed — Noma to be primary user. Mike's replacement search ongoing. Talk & Save hours and invoicing status reviewed. Noma's workload assessed and found manageable with current scope.",
    keyPoints: [
      { domain: "HR-OPS", point: "New HR system in development — Noma to be primary user" },
      { domain: "TIME-TRACKING", point: "Hours tracking improving but still gaps with some contractors" },
      { domain: "INVOICING", point: "Talk & Save invoicing on track" },
      { domain: "TEAM-MGMT", point: "Mike replacement search ongoing" },
    ],
    activeBlockers: [
      "Mike replacement not yet identified",
      "Some contractors still not tracking hours consistently",
    ],
    decisionsMade: [
      "Noma to be primary user and tester of new HR system",
      "Weekly check-ins with Noma to continue",
    ],
    actionItems: [
      { owner: "Noma", task: "Review and test new HR system features as they are built", deadline: "Ongoing", priority: "MED" },
      { owner: "Yehoshua", task: "Continue building HR system with Noma's feedback", deadline: "Ongoing", priority: "HIGH" },
    ],
    openQuestions: [
      "When will the new HR system be ready for full use?",
      "Who is the best candidate to replace Mike?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "New system in development; Noma engaged" },
      { domain: "TIME-TRACKING", maturity: "Developing", change: "Improving but gaps remain" },
    ],
    changelogDelta: "HR system development confirmed. Noma designated as primary user.",
  },
  {
    sessionNumber: 30,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription",
    meetingType: "team",
    participants: ["Yehoshua Kotlar", "Reef Liggayu", "Noma"],
    tone: "aligned",
    executiveSummary: "Three-way alignment session covering operational status, Talk & Save account management transition, and the new HR system. Reef introduced as new Operations Manager. Roles and responsibilities clarified between Reef and Noma.",
    operationalSummary: "Reef's role as Operations Manager confirmed. Noma continues as HR lead. Talk & Save account management transitioning to Reef with support from Kim and Alex. New HR system demo reviewed. Action items distributed across team.",
    keyPoints: [
      { domain: "TEAM-MGMT", point: "Reef confirmed as Operations Manager — new senior hire" },
      { domain: "CLIENT-MGMT", point: "Talk & Save transitioning to Reef for account management" },
      { domain: "HR-OPS", point: "New HR system demo reviewed — 90% complete" },
      { domain: "PROCESS-DOCUMENTATION", point: "Role boundaries between Reef and Noma clarified" },
    ],
    activeBlockers: [
      "Talk & Save transition not yet complete",
      "HR system still in testing",
    ],
    decisionsMade: [
      "Reef takes over Talk & Save account management",
      "Noma continues as HR lead under Reef's direction",
      "Weekly team alignment sessions to continue",
    ],
    actionItems: [
      { owner: "Reef", task: "Get up to speed on Talk & Save account management", deadline: "This week", priority: "HIGH" },
      { owner: "Noma", task: "Brief Reef on all active HR processes", deadline: "This week", priority: "HIGH" },
      { owner: "Yehoshua", task: "Complete HR system and schedule full demo", deadline: "Next week", priority: "HIGH" },
    ],
    openQuestions: [
      "What is the full scope of Reef's responsibilities?",
      "When does the HR system go live?",
    ],
    systemMaturityNotes: [
      { domain: "TEAM-MGMT", maturity: "Developing", change: "Reef onboarded as Operations Manager" },
      { domain: "CLIENT-MGMT", maturity: "Developing", change: "Talk & Save transition in progress" },
    ],
    changelogDelta: "Reef joins as Operations Manager. Talk & Save transition begins.",
  },
  {
    sessionNumber: 31,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription + notes",
    meetingType: "ops",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Deep-dive operations session between Yehoshua and Reef covering Talk & Save KPI framework, contractor management, and the new HR system capabilities. Reef getting up to speed on all operational areas.",
    operationalSummary: "Talk & Save KPI framework reviewed — Kim and Alex's roles and performance expectations defined. Contractor management process discussed. HR system features walked through including time tracking, KPI templates, weekly updates, and one-on-ones. Reef assigned to lead Talk & Save KPI pilot.",
    keyPoints: [
      { domain: "CLIENT-MGMT", point: "Talk & Save KPI framework being defined — Kim (110 hrs) and Alex (40 hrs SEO)" },
      { domain: "HR-OPS", point: "HR system features: time tracking, KPIs, weekly updates, one-on-ones, feedback" },
      { domain: "PROCESS-DOCUMENTATION", point: "Contractor management process documented in HR system" },
      { domain: "TEAM-MGMT", point: "Reef to lead Talk & Save KPI pilot" },
    ],
    activeBlockers: [
      "Talk & Save KPI framework not yet finalized",
      "Kim and Alex SOWs need updating for new hour allocations",
    ],
    decisionsMade: [
      "Reef leads Talk & Save KPI pilot starting July 1",
      "Kim hours to increase from 80 to 110 per month",
      "Alex added for 40 hours SEO work",
    ],
    actionItems: [
      { owner: "Reef", task: "Prepare Talk & Save KPI framework for pilot", deadline: "July 1", priority: "HIGH" },
      { owner: "Yehoshua", task: "Update Kim SOW to 110 hours", deadline: "June 30", priority: "HIGH" },
      { owner: "Yehoshua", task: "Create Alex SOW for 40 hours SEO", deadline: "June 30", priority: "HIGH" },
    ],
    openQuestions: [
      "What are the specific KPIs for Talk & Save?",
      "How will KPI performance be measured and reported?",
    ],
    systemMaturityNotes: [
      { domain: "CLIENT-MGMT", maturity: "Developing", change: "KPI framework being defined for Talk & Save pilot" },
      { domain: "HR-OPS", maturity: "Developing", change: "HR system features comprehensive; pilot starting" },
    ],
    changelogDelta: "Talk & Save KPI pilot confirmed for July 1. Kim and Alex SOWs being updated.",
  },
  {
    sessionNumber: 32,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Micaela"],
    tone: "exploratory",
    executiveSummary: "Onboarding and role definition session with Micaela, new contractor joining JivePilot. Discussion of her background, skills, and potential role in operations and client management support.",
    operationalSummary: "Micaela's background reviewed — strong in operations, project management, and client communication. Potential role: operations support and client management assistance. Trial period discussed. Reporting structure to Reef confirmed.",
    keyPoints: [
      { domain: "HR-OPS", point: "Micaela onboarding — operations and client management background" },
      { domain: "TEAM-MGMT", point: "Micaela reports to Reef for operations work" },
      { domain: "CLIENT-MGMT", point: "Micaela may support Talk & Save account management" },
    ],
    activeBlockers: [
      "Micaela's specific role and tasks not yet defined",
      "SOW not yet created for Micaela",
    ],
    decisionsMade: [
      "Micaela joins on trial basis reporting to Reef",
      "Role to be defined based on first two weeks of work",
    ],
    actionItems: [
      { owner: "Reef", task: "Define specific tasks and projects for Micaela", deadline: "This week", priority: "HIGH" },
      { owner: "Yehoshua", task: "Create SOW for Micaela", deadline: "This week", priority: "HIGH" },
    ],
    openQuestions: [
      "What is Micaela's hourly rate and hours allocation?",
      "Which specific clients will Micaela support?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "New contractor Micaela onboarding" },
      { domain: "TEAM-MGMT", maturity: "Developing", change: "Team expanding with operations support" },
    ],
    changelogDelta: "Micaela joins JivePilot on trial basis. Role to be defined.",
  },
  {
    sessionNumber: 33,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Reef Liggayu", "Noma"],
    tone: "aligned",
    executiveSummary: "Reef and Noma alignment session covering HR processes, contractor management, and operational handover from Mike. Reef getting up to speed on all HR and operations processes that Noma manages.",
    operationalSummary: "Noma briefed Reef on all active HR processes: contractor onboarding, hours tracking, contract management, and communication protocols. Reef and Noma agreed on working relationship and escalation paths. Key gap identified: Mike's account management processes still undocumented.",
    keyPoints: [
      { domain: "HR-OPS", point: "Noma briefed Reef on all active HR processes" },
      { domain: "PROCESS-DOCUMENTATION", point: "Mike's account management processes still undocumented — key gap" },
      { domain: "TEAM-MGMT", point: "Reef and Noma working relationship and escalation paths agreed" },
      { domain: "TIME-TRACKING", point: "Hours tracking process reviewed — some contractors still inconsistent" },
    ],
    activeBlockers: [
      "Mike's account management processes not documented",
      "Some contractors not tracking hours consistently",
    ],
    decisionsMade: [
      "Reef and Noma to have weekly check-ins",
      "Noma escalates HR issues to Reef before Yehoshua",
    ],
    actionItems: [
      { owner: "Noma", task: "Document all active HR processes for Reef's reference", deadline: "This week", priority: "HIGH" },
      { owner: "Reef", task: "Schedule weekly check-ins with Noma", deadline: "This week", priority: "MED" },
    ],
    openQuestions: [
      "When will Mike's processes be documented?",
      "Which contractors are consistently not tracking hours?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "Reef and Noma alignment established" },
      { domain: "PROCESS-DOCUMENTATION", maturity: "Early", change: "Mike's processes still undocumented" },
    ],
    changelogDelta: "Reef-Noma working relationship established. Weekly check-ins confirmed.",
  },
  {
    sessionNumber: 34,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription + notes",
    meetingType: "ops",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Deep operational planning session covering JivePilot's overall operational structure, client portfolio review, financial status, and 30-day priorities. Reef getting comprehensive overview of the business.",
    operationalSummary: "Full business review: 4 active clients (Talk & Save, Zip Kosher, Jacob's Real Estate, Noma), ~20-30 contractors, financial status reviewed. Talk & Save is largest client and most complex. Zip Kosher has issues with Elizabeth's performance. Jacob's Real Estate is new and needs attention. Operational maturity assessment done across all domains.",
    keyPoints: [
      { domain: "CLIENT-MGMT", point: "4 active clients: Talk & Save (largest), Zip Kosher (issues), Jacob's Real Estate (new), Noma" },
      { domain: "FINANCE", point: "Financial status reviewed — invoicing mostly on track" },
      { domain: "HR-OPS", point: "20-30 contractors across all clients" },
      { domain: "TEAM-MGMT", point: "Reef to take ownership of all client relationships" },
    ],
    activeBlockers: [
      "Elizabeth (Zip Kosher) performance issues — time fraud suspected",
      "Jacob's Real Estate onboarding not complete",
      "No centralized client health tracking",
    ],
    decisionsMade: [
      "Reef takes ownership of all client relationships",
      "Elizabeth situation to be investigated and resolved",
      "Jacob's Real Estate to be prioritized for proper onboarding",
    ],
    actionItems: [
      { owner: "Reef", task: "Review all client accounts and assess health", deadline: "This week", priority: "HIGH" },
      { owner: "Reef", task: "Investigate Elizabeth's time tracking at Zip Kosher", deadline: "This week", priority: "HIGH" },
      { owner: "Yehoshua", task: "Complete Jacob's Real Estate SOW and onboarding", deadline: "This week", priority: "HIGH" },
    ],
    openQuestions: [
      "What is the full scope of Elizabeth's time fraud?",
      "What does Jacob's Real Estate need from JivePilot?",
      "What is the monthly revenue from each client?",
    ],
    systemMaturityNotes: [
      { domain: "CLIENT-MGMT", maturity: "Developing", change: "Reef taking ownership; client health tracking needed" },
      { domain: "FINANCE", maturity: "Developing", change: "Invoicing on track; no centralized tracking" },
    ],
    changelogDelta: "Reef takes ownership of all client relationships. Elizabeth investigation begins.",
  },
  {
    sessionNumber: 35,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "exploratory",
    executiveSummary: "Strategic planning session covering JivePilot's growth strategy, new business development, and the role of AI and automation in scaling the business. Discussion of the Ops Brain concept and its potential as a product.",
    operationalSummary: "Growth strategy discussed: focus on talent placement and custom automation projects. Ops Brain concept introduced as potential product. AwareCam discussed as separate product line. Ari (BizDev) being brought on to pitch $50K+ automation projects. Target market: companies wanting to cut manual labor with AI.",
    keyPoints: [
      { domain: "BIZDEV", point: "Ari joining as BizDev to pitch $50K+ automation projects" },
      { domain: "BIZDEV", point: "Target market: companies wanting AI automation and voice agents" },
      { domain: "OPS-BRAIN", point: "Ops Brain concept introduced as potential SaaS product" },
      { domain: "AWARECAM", point: "AwareCam discussed as separate product line" },
    ],
    activeBlockers: [
      "No formal sales process for automation projects",
      "Ops Brain not yet built as product",
    ],
    decisionsMade: [
      "Ari to pitch automation projects to companies wanting to cut manual labor",
      "Ops Brain to be developed as replicable SaaS product",
    ],
    actionItems: [
      { owner: "Yehoshua", task: "Brief Ari on product offerings and pitch strategy", deadline: "This week", priority: "HIGH" },
      { owner: "Yehoshua", task: "Start building Ops Brain as product", deadline: "Next 2 weeks", priority: "HIGH" },
    ],
    openQuestions: [
      "What is the pricing model for automation projects?",
      "Who are the first target companies for Ari to pitch?",
    ],
    systemMaturityNotes: [
      { domain: "BIZDEV", maturity: "Emerging", change: "Ari joining; automation pitch strategy being defined" },
      { domain: "OPS-BRAIN", maturity: "Emerging", change: "Concept defined; development starting" },
    ],
    changelogDelta: "BizDev strategy defined. Ops Brain development starting. Ari joining.",
  },
  {
    sessionNumber: 36,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription + notes",
    meetingType: "ops",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Finance and invoicing deep-dive covering the full invoicing workflow, contractor payment process, and financial handover from Mike. Reef taking ownership of finance coordination.",
    operationalSummary: "Full invoicing workflow documented: hours collection → verification → invoice generation → client approval → payment → contractor payment. Mike's finance processes reviewed and transferred to Reef. Key gap: no automated invoicing — all manual. Stripe integration discussed for future.",
    keyPoints: [
      { domain: "FINANCE", point: "Full invoicing workflow: hours → verify → invoice → approve → pay" },
      { domain: "FINANCE", point: "All invoicing currently manual — no automation" },
      { domain: "FINANCE", point: "Mike's finance processes transferred to Reef" },
      { domain: "INVOICING", point: "Stripe integration discussed for future automation" },
    ],
    activeBlockers: [
      "No automated invoicing — all manual and time-consuming",
      "No centralized finance tracking system",
    ],
    decisionsMade: [
      "Reef takes ownership of finance coordination",
      "Automated invoicing to be prioritized in JivePilot app",
    ],
    actionItems: [
      { owner: "Reef", task: "Take over monthly invoicing process from Mike", deadline: "End of month", priority: "HIGH" },
      { owner: "Yehoshua", task: "Build automated invoicing in JivePilot app", deadline: "Next sprint", priority: "HIGH" },
    ],
    openQuestions: [
      "What is the current monthly invoice total across all clients?",
      "How long does the manual invoicing process take each month?",
    ],
    systemMaturityNotes: [
      { domain: "FINANCE", maturity: "Developing", change: "Reef taking ownership; automation planned" },
      { domain: "INVOICING", maturity: "Early", change: "All manual; automation needed" },
    ],
    changelogDelta: "Reef takes over finance coordination. Automated invoicing prioritized.",
  },
  {
    sessionNumber: 37,
    date: new Date("2026-06-22"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "JivePilot app deep-dive covering all current features, roadmap, and Reef's role in testing and feedback. Comprehensive walkthrough of the new HR system, time tracking, KPI framework, and client management features.",
    operationalSummary: "Full JivePilot app walkthrough: HR system (12+ features), time tracking (client/project/task level), KPI templates, weekly updates, one-on-ones, feedback, performance reviews, candidate management, document vault. Reef to be power user and provide feedback. App ~90% complete.",
    keyPoints: [
      { domain: "TECH-PLATFORM", point: "JivePilot app ~90% complete — 12+ HR system features" },
      { domain: "TECH-PLATFORM", point: "Time tracking: client-level, project-level, task-level" },
      { domain: "HR-OPS", point: "KPI framework with templates ready for pilot" },
      { domain: "TECH-PLATFORM", point: "Document vault and Pandadocs integration built" },
    ],
    activeBlockers: [
      "App features untested in real-world use",
      "Some features need refinement based on user feedback",
    ],
    decisionsMade: [
      "Reef to be primary tester and feedback provider for JivePilot app",
      "Talk & Save to be first pilot client for KPI system",
    ],
    actionItems: [
      { owner: "Reef", task: "Test all JivePilot app features and provide feedback", deadline: "Next 2 weeks", priority: "HIGH" },
      { owner: "Yehoshua", task: "Fix bugs identified during Reef's testing", deadline: "Ongoing", priority: "HIGH" },
    ],
    openQuestions: [
      "Which features need the most refinement?",
      "What is the timeline for full production deployment?",
    ],
    systemMaturityNotes: [
      { domain: "TECH-PLATFORM", maturity: "Developing", change: "App 90% complete; entering testing phase" },
      { domain: "HR-OPS", maturity: "Developing", change: "KPI framework ready for pilot" },
    ],
    changelogDelta: "JivePilot app 90% complete. Reef designated as primary tester.",
  },
  {
    sessionNumber: 38,
    date: new Date("2026-06-25"),
    inputFormat: "Audio transcription + notes",
    meetingType: "ops",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Critical planning session covering the Zip Kosher crisis (Elizabeth fired for time fraud), Jacob's Real Estate churn risk, Talk & Save KPI pilot preparation, and the AM-HR workflow for SOW/MSA generation. Multiple urgent action items identified.",
    operationalSummary: "Elizabeth fired from Zip Kosher for time fraud (claimed 140 hours overtime on 180 hours regular — 78% overtime, actual hours 5-6 per day not 9). Client down from 1.5 FTE to 0.5 FTE (Melissa part-time only). Jacob's Real Estate requesting contractor change less than 1 month in — churn risk. Talk & Save KPI pilot confirmed for July 1. Kim SOW needs updating to 110 hours, Alex SOW needed for 40 hours SEO.",
    keyPoints: [
      { domain: "HR-OPS", point: "Elizabeth fired for time fraud — 140 overtime on 180 regular hours claimed" },
      { domain: "CLIENT-MGMT", point: "Zip Kosher down from 1.5 FTE to 0.5 FTE — Melissa only" },
      { domain: "CLIENT-MGMT", point: "Jacob's Real Estate requesting contractor change <1 month in — churn risk" },
      { domain: "CLIENT-MGMT", point: "Talk & Save KPI pilot confirmed for July 1" },
      { domain: "PROCESS-DOCUMENTATION", point: "AM-HR workflow for SOW/MSA generation documented" },
    ],
    activeBlockers: [
      "Zip Kosher understaffed — only Melissa (part-time) remaining",
      "Jacob's Real Estate churn risk — contractor change request",
      "Kim and Alex SOWs not yet updated/created",
    ],
    decisionsMade: [
      "Elizabeth terminated for time fraud and policy violations",
      "Zip Kosher to be managed with Melissa only until replacement found",
      "Talk & Save KPI pilot starts July 1",
      "Kim SOW updated to 110 hours, Alex SOW created for 40 hours SEO",
    ],
    actionItems: [
      { owner: "Reef", task: "Find replacement for Elizabeth at Zip Kosher", deadline: "ASAP", priority: "HIGH" },
      { owner: "Reef", task: "Address Jacob's Real Estate contractor change request", deadline: "This week", priority: "HIGH" },
      { owner: "Yehoshua", task: "Update Kim SOW to 110 hours", deadline: "June 30", priority: "HIGH" },
      { owner: "Yehoshua", task: "Create Alex SOW for 40 hours SEO", deadline: "June 30", priority: "HIGH" },
      { owner: "Reef", task: "Prepare Talk & Save KPI pilot framework", deadline: "July 1", priority: "HIGH" },
    ],
    openQuestions: [
      "Who replaces Elizabeth at Zip Kosher?",
      "What is the Jacob's Real Estate contractor change request about?",
      "What are the specific KPIs for Talk & Save pilot?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "Time fraud case handled; policy enforcement improving" },
      { domain: "CLIENT-MGMT", maturity: "Developing", change: "Two at-risk clients identified; active management needed" },
      { domain: "PROCESS-DOCUMENTATION", maturity: "Developing", change: "AM-HR SOW workflow documented" },
    ],
    changelogDelta: "Elizabeth terminated. Zip Kosher crisis managed. Jacob's Real Estate churn risk identified. Talk & Save KPI pilot confirmed.",
  },
  {
    sessionNumber: 39,
    date: new Date("2026-06-25"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Reef Liggayu", "Mo"],
    tone: "exploratory",
    executiveSummary: "Onboarding and role definition session with Mo, new contractor joining JivePilot. Discussion of Mo's background in digital marketing, SEO, and content creation. Potential role supporting Talk & Save and other clients.",
    operationalSummary: "Mo's background: digital marketing, SEO, content creation, social media management. Potential role: supporting Talk & Save marketing and content needs. Trial period discussed. Reporting to Reef. Hours and rate to be defined based on first project.",
    keyPoints: [
      { domain: "HR-OPS", point: "Mo onboarding — digital marketing and SEO background" },
      { domain: "CLIENT-MGMT", point: "Mo may support Talk & Save marketing and content" },
      { domain: "TEAM-MGMT", point: "Mo reports to Reef; trial period" },
    ],
    activeBlockers: [
      "Mo's specific role and tasks not yet defined",
      "SOW not yet created for Mo",
    ],
    decisionsMade: [
      "Mo joins on trial basis reporting to Reef",
      "First project to be assigned from Talk & Save or other client needs",
    ],
    actionItems: [
      { owner: "Reef", task: "Define first project for Mo", deadline: "This week", priority: "HIGH" },
      { owner: "Yehoshua", task: "Create SOW for Mo", deadline: "This week", priority: "MED" },
    ],
    openQuestions: [
      "What is Mo's hourly rate and hours allocation?",
      "Which specific client will Mo support first?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "Mo onboarding adds digital marketing capability" },
      { domain: "TEAM-MGMT", maturity: "Developing", change: "Team growing with specialized skills" },
    ],
    changelogDelta: "Mo joins JivePilot on trial basis. Digital marketing capability added.",
  },
  {
    sessionNumber: 40,
    date: new Date("2026-06-25"),
    inputFormat: "Audio transcription + notes",
    meetingType: "ops",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Weekly operations review covering all active clients, contractor status, and upcoming priorities. Talk & Save KPI pilot preparation, Zip Kosher recovery plan, and Jacob's Real Estate situation reviewed.",
    operationalSummary: "All client accounts reviewed. Talk & Save: KPI pilot on track for July 1, Kim and Alex transitions in progress. Zip Kosher: Melissa managing alone, replacement search ongoing. Jacob's Real Estate: contractor change request being addressed. New HR system ready for pilot use. Charne onboarding scheduled.",
    keyPoints: [
      { domain: "CLIENT-MGMT", point: "Talk & Save KPI pilot on track for July 1" },
      { domain: "CLIENT-MGMT", point: "Zip Kosher: Melissa solo until replacement found" },
      { domain: "CLIENT-MGMT", point: "Jacob's Real Estate contractor change being addressed" },
      { domain: "HR-OPS", point: "Charne onboarding scheduled for next session" },
    ],
    activeBlockers: [
      "Zip Kosher replacement search ongoing",
      "Jacob's Real Estate situation unresolved",
    ],
    decisionsMade: [
      "Charne to be onboarded as new HR lead",
      "Talk & Save KPI pilot starts July 1 as planned",
    ],
    actionItems: [
      { owner: "Reef", task: "Onboard Charne and brief on all HR processes", deadline: "This week", priority: "HIGH" },
      { owner: "Reef", task: "Resolve Jacob's Real Estate contractor change request", deadline: "This week", priority: "HIGH" },
      { owner: "Reef", task: "Continue Zip Kosher replacement search", deadline: "Ongoing", priority: "HIGH" },
    ],
    openQuestions: [
      "When will Zip Kosher replacement be found?",
      "What is the resolution for Jacob's Real Estate?",
    ],
    systemMaturityNotes: [
      { domain: "CLIENT-MGMT", maturity: "Developing", change: "Active management of multiple at-risk clients" },
      { domain: "HR-OPS", maturity: "Developing", change: "Charne joining as HR lead" },
    ],
    changelogDelta: "Charne onboarding confirmed. All client situations actively managed.",
  },
  {
    sessionNumber: 41,
    date: new Date("2026-06-25"),
    inputFormat: "Audio transcription",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Strategic alignment on JivePilot's operational maturity, the Ops Brain product concept, and the BizDev pitch strategy. Detailed discussion of employee intelligence and risk mitigation as key Ops Brain features.",
    operationalSummary: "Ops Brain product strategy finalized: 10 pillars including session intelligence, process library, issue intelligence, domain health tracking, AI recommendations, employee intelligence, knowledge base, stakeholder intelligence, compliance, and benchmarking. Employee intelligence identified as premium feature — criticality scoring, redundancy tracking, replacement readiness. BizDev pitch strategy for $50K+ automation projects defined.",
    keyPoints: [
      { domain: "OPS-BRAIN", point: "10-pillar Ops Brain product strategy defined" },
      { domain: "OPS-BRAIN", point: "Employee intelligence as premium feature — criticality and redundancy" },
      { domain: "BIZDEV", point: "BizDev pitch strategy for $50K+ automation projects defined" },
      { domain: "BIZDEV", point: "Ops Brain positioned as intelligence layer for automation investments" },
    ],
    activeBlockers: [
      "Ops Brain not yet built",
      "BizDev pitch materials not yet created",
    ],
    decisionsMade: [
      "Ops Brain to be built with JivePilot data as demo",
      "Employee intelligence to be premium feature",
      "Ari to pitch Ops Brain alongside automation projects",
    ],
    actionItems: [
      { owner: "Yehoshua", task: "Build Ops Brain app with real JivePilot data", deadline: "2 weeks", priority: "HIGH" },
      { owner: "Yehoshua", task: "Create BizDev pitch materials for Ari", deadline: "This week", priority: "HIGH" },
    ],
    openQuestions: [
      "What is the pricing model for Ops Brain SaaS?",
      "Who are the first target companies for Ops Brain?",
    ],
    systemMaturityNotes: [
      { domain: "OPS-BRAIN", maturity: "Developing", change: "Product strategy defined; development starting" },
      { domain: "BIZDEV", maturity: "Developing", change: "Pitch strategy defined; materials being created" },
    ],
    changelogDelta: "Ops Brain product strategy finalized. BizDev pitch strategy defined.",
  },
  {
    sessionNumber: 42,
    date: new Date("2026-06-25"),
    inputFormat: "Audio transcription + notes",
    meetingType: "onboarding",
    participants: ["Yehoshua Kotlar", "Reef Liggayu", "Charne"],
    tone: "exploratory",
    executiveSummary: "3-hour onboarding session for Charne (new HR lead) covering the new JivePilot HR system, all active client situations, critical HR issues (Elizabeth/Zip Kosher, Jacob's Real Estate churn risk), and operational workflows. Charne comes from 10 years at Virgin Atlantic.",
    operationalSummary: "Full HR system walkthrough: kudos, announcements, team pulse, milestones, one-on-ones, feedback, performance reviews, activity logs, multi-employer contracts, flexible time tracking, KPI framework, weekly updates, candidate management, document vault, Pandadocs integration. Critical issues briefed: Elizabeth fired for time fraud, Zip Kosher understaffed, Jacob's Real Estate churn risk. Talk & Save KPI pilot starting July 1.",
    keyPoints: [
      { domain: "HR-OPS", point: "Charne onboarded as new HR lead — 10 years Virgin Atlantic background" },
      { domain: "HR-OPS", point: "Full HR system walkthrough — 12+ features demonstrated" },
      { domain: "CLIENT-MGMT", point: "Elizabeth fired for time fraud — Zip Kosher down to 0.5 FTE" },
      { domain: "CLIENT-MGMT", point: "Jacob's Real Estate churn risk — requesting contractor change <1 month in" },
      { domain: "CLIENT-MGMT", point: "Talk & Save KPI pilot starting July 1" },
    ],
    activeBlockers: [
      "Zip Kosher understaffed — only Melissa remaining",
      "Jacob's Real Estate churn risk unresolved",
      "Kim and Alex SOWs not yet signed by Talk & Save",
    ],
    decisionsMade: [
      "Charne takes over HR lead role",
      "Talk & Save KPI pilot starts July 1",
      "Kim SOW updated to 110 hours, Alex SOW created for 40 hours SEO",
    ],
    actionItems: [
      { owner: "Charne", task: "Review all active HR processes and contractor files", deadline: "This week", priority: "HIGH" },
      { owner: "Reef", task: "Get Kim and Alex SOWs signed by Talk & Save by June 30", deadline: "June 30", priority: "HIGH" },
      { owner: "Reef", task: "Resolve Jacob's Real Estate contractor change request", deadline: "This week", priority: "HIGH" },
      { owner: "Reef", task: "Find Zip Kosher replacement for Elizabeth", deadline: "ASAP", priority: "HIGH" },
    ],
    openQuestions: [
      "When will Zip Kosher replacement be found?",
      "What is the resolution for Jacob's Real Estate?",
      "Are Kim and Alex SOWs signed?",
    ],
    systemMaturityNotes: [
      { domain: "HR-OPS", maturity: "Developing", change: "Charne onboarded; HR system ready for use" },
      { domain: "CLIENT-MGMT", maturity: "Developing", change: "Two at-risk clients; active management required" },
    ],
    changelogDelta: "Charne onboarded as HR lead. HR system fully demonstrated. Talk & Save KPI pilot confirmed for July 1.",
  },
  {
    sessionNumber: 43,
    date: new Date("2026-06-28"),
    inputFormat: "Fathom transcript",
    meetingType: "1:1",
    participants: ["Yehoshua Kotlar", "Reef Liggayu"],
    tone: "aligned",
    executiveSummary: "Weekly alignment covering AwareCam 2-week go-to-market plan, JivePilot app improvements (task categories, CRM pipeline), Charne check-in needed, and strategic discussion of Ops Brain Fathom API integration. AwareCam is functionally ready for pilots; dev handoff to Vizio (Leo & Daniel) imminent.",
    operationalSummary: "AwareCam GTM plan: Moshe to get 1-5 cameras live in Ukraine this week via RTSP. Wajid finishing LPR and Stripe testing. Dev handoff to Vizio by end of week. Critical bug: invite links pointing to .manus.space instead of correct domain. Ops Brain: Fathom API integration identified as key feature to eliminate manual session uploads. Charne didn't check in on Sunday as expected — Reef to follow up.",
    keyPoints: [
      { domain: "AWARECAM", point: "AwareCam ready for pilots — 2-week GTM plan starting" },
      { domain: "AWARECAM", point: "Critical bug: invite links point to .manus.space (wrong domain)" },
      { domain: "AWARECAM", point: "Dev handoff to Vizio (Leo & Daniel) by end of week" },
      { domain: "OPS-BRAIN", point: "Fathom API integration identified — auto-ingest meetings" },
      { domain: "HR-OPS", point: "Charne missed expected Sunday check-in — follow-up needed" },
      { domain: "JIVEPILOT-APP", point: "Task categories to be expanded beyond TCS-only" },
    ],
    activeBlockers: [
      "AwareCam invite links pointing to wrong domain (.manus.space)",
      "LPR integration not yet complete (Wajid working on it)",
      "Stripe order flow not yet tested end-to-end",
      "Charne missed Sunday check-in — status unknown",
    ],
    decisionsMade: [
      "AwareCam dev handed off to Vizio (Leo & Daniel) by end of week",
      "Moshe to onboard Ukraine cameras this week",
      "Ops Brain to integrate with Fathom API for auto-ingestion",
      "Ari to pitch using jivepilot.app/pilot sales funnel",
    ],
    actionItems: [
      { owner: "Reef", task: "Check in with Charne and update Yehoshua", deadline: "Immediately", priority: "HIGH" },
      { owner: "Yehoshua", task: "Send AwareCam deck to Reef for simplification", deadline: "Immediately", priority: "HIGH" },
      { owner: "Dev", task: "Fix AwareCam invite links — wrong domain (.manus.space)", deadline: "Immediately", priority: "HIGH" },
      { owner: "Moshe", task: "Contact Ukraine contact and get RTSP credentials for 1-5 cameras", deadline: "This week", priority: "HIGH" },
      { owner: "Wajid", task: "Complete LPR integration and Stripe order testing", deadline: "Today/Tomorrow", priority: "HIGH" },
      { owner: "Reef", task: "Compile SOW categories and add to JivePilot via Admin > Categories", deadline: "This week", priority: "MED" },
      { owner: "Reef", task: "Review AwareCam English docs on resources.awarecam.com", deadline: "This week", priority: "HIGH" },
      { owner: "Reef + Yehoshua", task: "Schedule work session to build AwareCam 2-week plan in JivePilot", deadline: "Tomorrow", priority: "HIGH" },
      { owner: "Reef", task: "Create JivePilot task for Kim's Timer app Rosetta trust prompt issue", deadline: "This week", priority: "MED" },
    ],
    openQuestions: [
      "Is Charne okay? Why did she miss Sunday check-in?",
      "When will Wajid finish LPR and Stripe testing?",
      "What is the correct base URL for the AwareCam portal?",
      "Should Ops Brain integrate with Fathom API or re.ai?",
    ],
    systemMaturityNotes: [
      { domain: "AWARECAM", maturity: "Developing", change: "Product ready for pilots; GTM plan starting" },
      { domain: "OPS-BRAIN", maturity: "Developing", change: "Fathom API integration identified as key feature" },
      { domain: "HR-OPS", maturity: "Developing", change: "Charne onboarding in progress; check-in missed" },
      { domain: "BIZDEV", maturity: "Developing", change: "Ari has sales funnel; pitching actively" },
    ],
    changelogDelta: "AwareCam GTM plan started. Dev handoff to Vizio imminent. Fathom API integration identified for Ops Brain.",
  },
];

console.log(`Seeding ${sessions.length} sessions...`);
for (const s of sessions) {
  await upsertSession(s);
}

// Also seed action items from the sessions
// We need a sessionId — get the id for each session we just inserted
console.log("\nSeeding action items from sessions...");
for (const s of sessions) {
  const [rows] = await conn.execute("SELECT id FROM sessions WHERE sessionNumber = ?", [s.sessionNumber]);
  if (!rows.length) continue;
  const sessionId = rows[0].id;

  for (const item of s.actionItems) {
    const [existing] = await conn.execute(
      "SELECT id FROM action_items WHERE task = ? AND sourceSession = ?",
      [item.task, s.sessionNumber]
    );
    if (existing.length > 0) continue;
    
    let deadlineDate = null;
    if (item.deadline && item.deadline !== "ASAP" && item.deadline !== "Ongoing" && item.deadline !== "Immediately" && item.deadline !== "Today/Tomorrow") {
      try {
        const d = new Date(item.deadline + " 2026");
        if (!isNaN(d.getTime())) deadlineDate = d;
      } catch {}
    }
    
    await conn.execute(
      `INSERT INTO action_items (sessionId, task, owner, deadline, priority, status, sourceSession, domainTag)
       VALUES (?, ?, ?, ?, ?, 'open', ?, NULL)`,
      [sessionId, item.task, item.owner, deadlineDate, item.priority, s.sessionNumber]
    );
  }
}

// Seed blockers from sessions
console.log("\nSeeding blockers from sessions...");
for (const s of sessions) {
  for (const blocker of s.activeBlockers) {
    const [existing] = await conn.execute(
      "SELECT id FROM blockers WHERE description = ? AND firstAppearedSession = ?",
      [blocker, s.sessionNumber]
    );
    if (existing.length > 0) continue;
    
    await conn.execute(
      `INSERT INTO blockers (description, status, firstAppearedSession, timesAppeared, domainTag, isChronicFlag)
       VALUES (?, 'open', ?, 1, 'GENERAL', false)`,
      [blocker, s.sessionNumber]
    );
  }
}

await conn.end();
console.log("\n✅ Seed complete!");
