import * as db from "./db";

export async function generateCoworkExport() {
  const files: Record<string, string> = {};

  try {
    const sessions = await db.getAllSessions();

    for (const session of sessions) {
      const sessionDate = session.date.toISOString().split("T")[0];
      const filename = `sessions/session-${String(session.sessionNumber).padStart(3, "0")}-${sessionDate}.md`;

      const participants = JSON.parse(session.participants || "[]");
      const keyPoints = JSON.parse(session.keyPoints || "[]");
      const blockers = JSON.parse(session.activeBlockers || "[]");
      const decisions = JSON.parse(session.decisionsMade || "[]");
      const actionItems = JSON.parse(session.actionItems || "[]");
      const questions = JSON.parse(session.openQuestions || "[]");
      const maturityNotes = JSON.parse(session.systemMaturityNotes || "[]");

      let content = `# Session ${session.sessionNumber} - ${sessionDate}\n\n`;
      content += `**Meeting Type:** ${session.meetingType}\n`;
      content += `**Participants:** ${participants.join(", ")}\n`;
      content += `**Input Format:** ${session.inputFormat}\n\n`;

      content += `## Executive Summary\n${session.executiveSummary}\n\n`;
      content += `## Operational Summary\n${session.operationalSummary}\n\n`;

      if (keyPoints.length > 0) {
        content += `## Key Points\n`;
        keyPoints.forEach((kp: any) => {
          content += `- **[${kp.domain}]** ${kp.point}\n`;
        });
        content += "\n";
      }

      if (decisions.length > 0) {
        content += `## Decisions Made\n`;
        decisions.forEach((d: string) => {
          content += `- ${d}\n`;
        });
        content += "\n";
      }

      if (blockers.length > 0) {
        content += `## Active Blockers\n`;
        blockers.forEach((b: string) => {
          content += `- ${b}\n`;
        });
        content += "\n";
      }

      if (actionItems.length > 0) {
        content += `## Action Items\n`;
        actionItems.forEach((ai: any) => {
          content += `- **${ai.task}** (Owner: ${ai.owner || "TBD"}, Priority: ${ai.priority || "MEDIUM"}, Deadline: ${ai.deadline || "TBD"})\n`;
        });
        content += "\n";
      }

      if (questions.length > 0) {
        content += `## Open Questions\n`;
        questions.forEach((q: string) => {
          content += `- ${q}\n`;
        });
        content += "\n";
      }

      if (maturityNotes.length > 0) {
        content += `## System Maturity Notes\n`;
        maturityNotes.forEach((note: any) => {
          content += `- **${note.domain}** → ${note.maturity} (${note.change})\n`;
        });
        content += "\n";
      }

      if (session.changelogDelta) {
        content += `## Changelog\n${session.changelogDelta}\n`;
      }

      files[filename] = content;
    }

    const allActionItems = await db.getAllActionItems();
    let actionItemsContent = `# All Action Items\n\n`;
    actionItemsContent += `**Generated:** ${new Date().toISOString()}\n\n`;

    const openItems = allActionItems.filter((ai) => ai.status === "open");
    const completedItems = allActionItems.filter((ai) => ai.status === "complete");

    if (openItems.length > 0) {
      actionItemsContent += `## Open Action Items (${openItems.length})\n`;
      openItems.forEach((ai) => {
        const isOverdue = ai.deadline && new Date(ai.deadline) < new Date();
        const overdueTag = isOverdue ? " ⚠️ OVERDUE" : "";
        actionItemsContent += `- **${ai.task}**${overdueTag}\n`;
        actionItemsContent += `  - Owner: ${ai.owner || "TBD"}\n`;
        const deadlineStr = ai.deadline ? new Date(ai.deadline).toISOString().split("T")[0] : "TBD";
        actionItemsContent += `  - Priority: ${ai.priority}\n`;
        actionItemsContent += `  - Deadline: ${deadlineStr}\n`;
        actionItemsContent += `  - Session: #${ai.sourceSession}\n\n`;
      });
    }

    if (completedItems.length > 0) {
      actionItemsContent += `## Completed Action Items (${completedItems.length})\n`;
      completedItems.forEach((ai) => {
        actionItemsContent += `- ✓ ${ai.task}\n`;
        actionItemsContent += `  - Owner: ${ai.owner || "TBD"}\n`;
        const completedDate = ai.completedAt ? new Date(ai.completedAt).toISOString().split("T")[0] : "Unknown";
        actionItemsContent += `  - Completed: ${completedDate}\n\n`;
      });
    }

    files["action-items.md"] = actionItemsContent;

    const allBlockers = await db.getAllBlockers();
    let blockersContent = `# All Blockers\n\n`;
    blockersContent += `**Generated:** ${new Date().toISOString()}\n\n`;

    const activeBlockers = allBlockers.filter((b) => b.status === "open");
    const resolvedBlockers = allBlockers.filter((b) => b.status === "resolved");

    if (activeBlockers.length > 0) {
      blockersContent += `## Active Blockers (${activeBlockers.length})\n`;
      activeBlockers.forEach((b) => {
        const isChronic = b.isChronicFlag ? " 🔴 CHRONIC" : "";
        blockersContent += `- ${b.description}${isChronic}\n`;
        blockersContent += `  - Domain: ${b.domainTag || "General"}\n`;
        blockersContent += `  - First Appeared: Session #${b.firstAppearedSession}\n`;
        blockersContent += `  - Times Appeared: ${b.timesAppeared}\n`;
        if (b.resolutionNote) {
          blockersContent += `  - Resolution Note: ${b.resolutionNote}\n`;
        }
        blockersContent += "\n";
      });
    }

    if (resolvedBlockers.length > 0) {
      blockersContent += `## Resolved Blockers (${resolvedBlockers.length})\n`;
      resolvedBlockers.forEach((b) => {
        blockersContent += `- ✓ ${b.description}\n`;
        blockersContent += `  - Resolved: ${b.resolvedAt ? new Date(b.resolvedAt).toISOString().split("T")[0] : "Unknown"}\n`;
        if (b.resolutionNote) {
          blockersContent += `  - Resolution: ${b.resolutionNote}\n`;
        }
        blockersContent += "\n";
      });
    }

    files["blockers.md"] = blockersContent;

    let timelineContent = `# Master Timeline\n\n`;
    timelineContent += `**Generated:** ${new Date().toISOString()}\n\n`;
    timelineContent += `Timeline entries will be populated from monthly reviews and manual milestones.\n`;
    files["timeline.md"] = timelineContent;

    let indexContent = `# Ops Brain Export\n\n`;
    indexContent += `**Generated:** ${new Date().toISOString()}\n`;
    indexContent += `**Total Sessions:** ${sessions.length}\n`;
    indexContent += `**Total Action Items:** ${allActionItems.length}\n`;
    indexContent += `**Total Blockers:** ${allBlockers.length}\n\n`;

    indexContent += `## Contents\n`;
    indexContent += `- **sessions/** - Individual session reports\n`;
    indexContent += `- **action-items.md** - All action items (open and completed)\n`;
    indexContent += `- **blockers.md** - All blockers (active and resolved)\n`;
    indexContent += `- **timeline.md** - Master timeline\n\n`;

    indexContent += `## Quick Stats\n`;
    const openActionCount = openItems.length;
    const chronicBlockerCount = activeBlockers.filter((b) => b.isChronicFlag).length;
    const recentSessions = sessions.slice(-5).map((s) => `#${s.sessionNumber}`).join(", ");
    indexContent += `- Open Action Items: ${openActionCount}\n`;
    indexContent += `- Chronic Blockers: ${chronicBlockerCount}\n`;
    indexContent += `- Recent Sessions: ${recentSessions}\n`;

    files["README.md"] = indexContent;

    return {
      success: true,
      files,
      timestamp: new Date().toISOString(),
      fileCount: Object.keys(files).length,
    };
  } catch (error) {
    console.error("[Cowork Export] Error:", error);
    throw error;
  }
}
