import * as db from "./db";

/**
 * Initialize the database with Session 1 data on first launch.
 * This runs once when the server starts if no sessions exist.
 */
export async function initializeDatabase() {
  try {
    // Check if Session 1 already exists
    const existingSession = await db.getSessionByNumber(1);
    if (existingSession) {
      console.log("[Init] Session 1 already exists, skipping initialization");
      return;
    }

    console.log("[Init] Initializing database with Session 1...");

    // Session 1 data from May 30, 2026 GM Handover
    const session1Data = {
      date: new Date("2026-05-30"),
      inputFormat: "Mixed",
      meetingType: "1:1",
      participants: ["Mike", "New Head of Operations"],
      tone: "informative",
      executiveSummary:
        "First meeting with outgoing GM before founder takes over. Core operational problems identified: employees not logging hours and CRM tools being too rigid. Current platform has invoice system, time tracking, and client profiles but several active bugs. Single developer dependency is a critical risk.",
      operationalSummary:
        "Mike provided a comprehensive handover of the current operational state. The Manus-built platform is mostly functional but has critical gaps: project creation is broken (blocking time logging), invoice reminder emails are unverified after a developer fix, and the website booking button is broken. The system requires frequent developer intervention for role changes and permissions. The new Head of Operations needs immediate platform access and must clarify working style with Yoshua (the sole developer). Key insight: silence from Yoshua means he forgot, not that he declined.",
      keyPoints: [
        {
          domain: "INVOICING",
          point: "Invoice reminder system built on Manus — sends daily emails until bookkeeper marks invoice as sent/paid",
        },
        {
          domain: "INVOICING",
          point: "Invoice dates driven by dropdown in client profile; system triggers on 1st of each month",
        },
        {
          domain: "INVOICING",
          point: "Invoice template not yet built — invoices still created manually as Word documents",
        },
        {
          domain: "INVOICING",
          point: "Reminder email bug was preventing sends; developer claims fixed, unverified",
        },
        {
          domain: "INVOICING",
          point: "Some clients require multiple invoices at different dates (retainer vs. hourly employees)",
        },
        {
          domain: "TIME-TRACKING",
          point: "Employees must create project → task → category before logging time",
        },
        {
          domain: "TIME-TRACKING",
          point: "Project creation bug confirmed — employees cannot save new projects",
        },
        {
          domain: "TIME-TRACKING",
          point: "Manual time entry disabled for some employees — creates gaps when timers are forgotten",
        },
        {
          domain: "TIME-TRACKING",
          point: "Idea raised: end-of-day auto-email to employees who did not log time",
        },
        {
          domain: "TIME-TRACKING",
          point: "Category filtering per role suggested (developers see dev categories only)",
        },
        {
          domain: "TECH-PLATFORM",
          point: "Single developer (Yoshua) responsible for all fixes — dependency risk",
        },
        {
          domain: "TECH-PLATFORM",
          point: "Platform mostly functional but has several active bugs",
        },
        {
          domain: "TECH-PLATFORM",
          point: "No self-service permission management — requires developer for every role change",
        },
        {
          domain: "TEAM-MGMT",
          point: "New Head of Operations needs manager access in system (ask Noma)",
        },
        {
          domain: "TEAM-MGMT",
          point: "Yoshua working style: needs frequent reminders, silence = forgot not declined",
        },
        {
          domain: "SALES-BD",
          point: "Website 'book a call' button is broken — marketing emails already sent",
        },
      ],
      activeBlockers: [
        "Project creation broken — employees cannot log time",
        "Invoice reminder emails unverified after developer fix",
        "Manual time entry disabled for some employees",
        "Website booking button broken",
      ],
      decisionsMade: [
        "Founder will take over operational lead role while new Head of Operations builds ops function from scratch",
        "New Head of Operations will document all meetings and decisions for institutional memory",
      ],
      actionItems: [
        {
          owner: "New Head of Operations",
          task: "Get manager access in platform (via Noma)",
          deadline: "ASAP",
          priority: "HIGH",
        },
        {
          owner: "New Head of Operations",
          task: "Alert Yoshua about broken website booking button",
          deadline: "ASAP",
          priority: "HIGH",
        },
        {
          owner: "New Head of Operations",
          task: "Clarify with Yoshua: ask permission before changes, or proceed independently?",
          deadline: "ASAP",
          priority: "MED",
        },
        {
          owner: "Yoshua",
          task: "Fix project creation bug",
          deadline: "ASAP",
          priority: "HIGH",
        },
        {
          owner: "Yoshua",
          task: "Confirm invoice reminder emails are sending",
          deadline: "ASAP",
          priority: "HIGH",
        },
      ],
      openQuestions: [
        "What is the current status of the invoice template build?",
        "How many clients are affected by the multiple-invoice-date requirement?",
        "What is the root cause of the project creation bug?",
      ],
      systemMaturityNotes: [
        {
          domain: "TIME-TRACKING",
          maturity: "Early",
          change: "System exists but core bug prevents use",
        },
        {
          domain: "INVOICING",
          maturity: "Developing",
          change: "Reminder system built but template missing and bug unverified",
        },
        {
          domain: "TECH-PLATFORM",
          maturity: "Functional with gaps",
          change: "Mostly working but single-dev dependency and active bugs",
        },
        {
          domain: "TEAM-MGMT",
          maturity: "Early",
          change: "Roles undefined, no self-service permissions",
        },
      ],
      changelogDelta: "Baseline established.",
    };

    // Create the session
    await db.createSession({
      sessionNumber: 1,
      date: session1Data.date,
      inputFormat: session1Data.inputFormat,
      meetingType: session1Data.meetingType,
      participants: JSON.stringify(session1Data.participants),
      tone: session1Data.tone,
      executiveSummary: session1Data.executiveSummary,
      operationalSummary: session1Data.operationalSummary,
      keyPoints: JSON.stringify(session1Data.keyPoints),
      activeBlockers: JSON.stringify(session1Data.activeBlockers),
      decisionsMade: JSON.stringify(session1Data.decisionsMade),
      actionItems: JSON.stringify(session1Data.actionItems),
      openQuestions: JSON.stringify(session1Data.openQuestions),
      systemMaturityNotes: JSON.stringify(session1Data.systemMaturityNotes),
      changelogDelta: session1Data.changelogDelta,
    });

    console.log("[Init] Session 1 created successfully");
  } catch (error) {
    console.error("[Init] Failed to initialize database:", error);
  }
}
