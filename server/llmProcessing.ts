import { invokeLLM } from "./_core/llm";

export interface ProcessingResult {
  keyPoints: string[];
  decisions: string[];
  blockers: string[];
  actionItems: Array<{
    task: string;
    owner?: string;
    priority?: "HIGH" | "MEDIUM" | "LOW";
    deadline?: string;
  }>;
  domainTags: string[];
  summary: string;
}

const OPERATIONAL_DOMAINS = [
  "Product & Engineering",
  "Go-to-Market & Sales",
  "Customer Success & Operations",
  "Finance & Business Operations",
  "People & Culture",
  "Fundraising & Investor Relations",
  "Brand & Communications",
  "Strategic Partnerships",
  "Technology Infrastructure",
  "Data & Analytics",
];

function extractJsonContent(content: any): string {
  if (typeof content === "string") {
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();
    
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return cleaned.slice(jsonStart, jsonEnd + 1);
    }
    return cleaned;
  }
  
  if (Array.isArray(content)) {
    const textParts = content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text || "")
      .join("\n");
    return textParts || "{}";
  }
  
  return "{}";
}

async function stage1SingleMeeting(
  meetingInput: string,
  meetingType: string,
  participants: string
): Promise<ProcessingResult> {
  const participantList = participants.split(",").map(p => p.trim());
  const firstParticipant = participantList[0] || "Speaker 1";
  const secondParticipant = participantList[1] || "Speaker 2";

  const prompt = `You are an operations intelligence analyst analyzing a meeting transcript with alternating speakers.

CRITICAL: This is a speech-to-text transcript that may be garbled. Your job is to:
1. Parse alternating speakers (first speaker, second speaker, etc.)
2. Attribute statements accurately to the correct speaker
3. Extract key points, decisions, blockers, and action items
4. Be careful NOT to swap speaker identities

Meeting Type: ${meetingType}
Participants: ${participants}
First Speaker: ${firstParticipant}
Second Speaker: ${secondParticipant}

Meeting Transcript:
${meetingInput}

IMPORTANT SPEAKER ATTRIBUTION RULES:
- The first participant (${firstParticipant}) typically speaks first and asks questions/drives the agenda
- The second participant (${secondParticipant}) responds and provides information about their experience/capabilities
- Look for contextual clues: "I'm looking for", "I need", "I have experience with" to identify who is speaking
- Do NOT swap speaker roles - be very careful about this
- When extracting action items, clearly identify who owns each task

Extract and return a JSON object with the following structure:
{
  "keyPoints": ["point 1", "point 2", ...],
  "decisions": ["decision 1", "decision 2", ...],
  "blockers": ["blocker 1", "blocker 2", ...],
  "actionItems": [
    {"task": "description", "owner": "name (${firstParticipant} or ${secondParticipant})", "priority": "HIGH|MEDIUM|LOW", "deadline": "YYYY-MM-DD or null"},
    ...
  ],
  "domainTags": ["domain1", "domain2", ...],
  "summary": "brief 2-3 sentence summary - be very careful to attribute roles correctly"
}

Categorize domain tags from these operational domains: ${OPERATIONAL_DOMAINS.join(", ")}

ACCURACY REQUIREMENT: Double-check speaker attribution before returning. If you're uncertain about who said something, mark it as "Unknown" rather than guessing.

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = extractJsonContent(messageContent);
    const parsed = JSON.parse(content);

    return {
      keyPoints: parsed.keyPoints || [],
      decisions: parsed.decisions || [],
      blockers: parsed.blockers || [],
      actionItems: parsed.actionItems || [],
      domainTags: parsed.domainTags || [],
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("[LLM] Error in stage1SingleMeeting:", error);
    throw error;
  }
}

async function stage2DailyBatch(
  sessions: ProcessingResult[]
): Promise<ProcessingResult> {
  const aggregatedContent = sessions
    .map(
      (s, i) =>
        `Session ${i + 1}:\nKey Points: ${s.keyPoints.join(", ")}\nDecisions: ${s.decisions.join(", ")}\nBlockers: ${s.blockers.join(", ")}`
    )
    .join("\n\n");

  const prompt = `As an operations analyst, aggregate these daily sessions into a cohesive daily rollup.

${aggregatedContent}

Return a JSON object with aggregated insights:
{
  "keyPoints": ["aggregated point 1", ...],
  "decisions": ["aggregated decision 1", ...],
  "blockers": ["aggregated blocker 1", ...],
  "actionItems": [...],
  "domainTags": ["domain1", ...],
  "summary": "daily summary"
}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = extractJsonContent(messageContent);
    const parsed = JSON.parse(content);

    return {
      keyPoints: parsed.keyPoints || [],
      decisions: parsed.decisions || [],
      blockers: parsed.blockers || [],
      actionItems: parsed.actionItems || [],
      domainTags: parsed.domainTags || [],
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("[LLM] Error in stage2DailyBatch:", error);
    throw error;
  }
}

async function stage3WeeklyReview(
  dailyRollups: ProcessingResult[]
): Promise<ProcessingResult> {
  const aggregatedContent = dailyRollups
    .map(
      (d, i) =>
        `Day ${i + 1}:\nKey Points: ${d.keyPoints.join(", ")}\nDecisions: ${d.decisions.join(", ")}\nBlockers: ${d.blockers.join(", ")}`
    )
    .join("\n\n");

  const prompt = `As an operations analyst, synthesize these daily rollups into a weekly review with strategic insights.

${aggregatedContent}

Return a JSON object with weekly insights:
{
  "keyPoints": ["weekly insight 1", ...],
  "decisions": ["strategic decision 1", ...],
  "blockers": ["critical blocker 1", ...],
  "actionItems": [...],
  "domainTags": ["domain1", ...],
  "summary": "weekly strategic summary"
}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = extractJsonContent(messageContent);
    const parsed = JSON.parse(content);

    return {
      keyPoints: parsed.keyPoints || [],
      decisions: parsed.decisions || [],
      blockers: parsed.blockers || [],
      actionItems: parsed.actionItems || [],
      domainTags: parsed.domainTags || [],
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("[LLM] Error in stage3WeeklyReview:", error);
    throw error;
  }
}

async function stage4MonthlyReview(
  weeklyReviews: ProcessingResult[]
): Promise<ProcessingResult> {
  const aggregatedContent = weeklyReviews
    .map(
      (w, i) =>
        `Week ${i + 1}:\nKey Points: ${w.keyPoints.join(", ")}\nDecisions: ${w.decisions.join(", ")}\nBlockers: ${w.blockers.join(", ")}`
    )
    .join("\n\n");

  const prompt = `As an operations strategist, synthesize these weekly reviews into a comprehensive monthly review with strategic recommendations.

${aggregatedContent}

Return a JSON object with monthly strategic insights:
{
  "keyPoints": ["monthly strategic insight 1", ...],
  "decisions": ["key decision 1", ...],
  "blockers": ["critical blocker 1", ...],
  "actionItems": [...],
  "domainTags": ["domain1", ...],
  "summary": "monthly strategic summary with recommendations"
}`;

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = extractJsonContent(messageContent);
    const parsed = JSON.parse(content);

    return {
      keyPoints: parsed.keyPoints || [],
      decisions: parsed.decisions || [],
      blockers: parsed.blockers || [],
      actionItems: parsed.actionItems || [],
      domainTags: parsed.domainTags || [],
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("[LLM] Error in stage4MonthlyReview:", error);
    throw error;
  }
}

export async function processMeeting(input: {
  meetingInput: string;
  meetingType: string;
  participants: string;
}): Promise<ProcessingResult> {
  return await stage1SingleMeeting(
    input.meetingInput,
    input.meetingType,
    input.participants
  );
}

export { stage2DailyBatch, stage3WeeklyReview, stage4MonthlyReview };
