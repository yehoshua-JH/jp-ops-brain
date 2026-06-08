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

function extractJsonContent(content: string | (Record<string, unknown> | { type: string; text: string } | { type: string; image_url: Record<string, unknown> } | { type: string; file_url: Record<string, unknown> })[]): string {
  if (typeof content === "string") {
    return content;
  }
  return "{}";
}

/**
 * Stage 1: Single Meeting Processing
 * Extract key points, decisions, blockers, and action items from raw meeting input
 */
async function stage1SingleMeeting(
  meetingInput: string,
  meetingType: string,
  participants: string
): Promise<ProcessingResult> {
  const prompt = `You are an operations intelligence analyst. Analyze this meeting transcript/notes and extract structured operational insights.

Meeting Type: ${meetingType}
Participants: ${participants}

Meeting Content:
${meetingInput}

Extract and return a JSON object with the following structure:
{
  "keyPoints": ["point 1", "point 2", ...],
  "decisions": ["decision 1", "decision 2", ...],
  "blockers": ["blocker 1", "blocker 2", ...],
  "actionItems": [
    {"task": "description", "owner": "name", "priority": "HIGH|MEDIUM|LOW", "deadline": "YYYY-MM-DD"},
    ...
  ],
  "domainTags": ["domain1", "domain2", ...],
  "summary": "brief 2-3 sentence summary"
}

Categorize domain tags from these operational domains: ${OPERATIONAL_DOMAINS.join(", ")}

Return ONLY valid JSON, no markdown formatting.`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const messageContent = response.choices[0]?.message?.content;
  const content = extractJsonContent(messageContent as string);
  const parsed = JSON.parse(content);

  return {
    keyPoints: parsed.keyPoints || [],
    decisions: parsed.decisions || [],
    blockers: parsed.blockers || [],
    actionItems: parsed.actionItems || [],
    domainTags: parsed.domainTags || [],
    summary: parsed.summary || "",
  };
}

/**
 * Stage 2: Daily Batch Processing
 * Aggregate multiple sessions from a single day
 */
async function stage2DailyBatch(
  sessions: ProcessingResult[]
): Promise<ProcessingResult> {
  const aggregatedContent = sessions
    .map(
      (s, i) =>
        `Session ${i + 1}:\nKey Points: ${s.keyPoints.join(", ")}\nDecisions: ${s.decisions.join(", ")}\nBlockers: ${s.blockers.join(", ")}`
    )
    .join("\n\n");

  const prompt = `You are an operations intelligence analyst. Synthesize these daily meeting sessions into a cohesive daily rollup.

${aggregatedContent}

Identify:
1. Recurring themes and patterns
2. Critical blockers that appeared multiple times
3. High-priority action items
4. Key decisions that impact multiple domains
5. Overall operational health assessment

Return a JSON object with:
{
  "keyPoints": ["consolidated point 1", ...],
  "decisions": ["key decision 1", ...],
  "blockers": ["critical blocker 1", ...],
  "actionItems": [{"task": "...", "owner": "...", "priority": "HIGH|MEDIUM|LOW"}, ...],
  "domainTags": ["domain1", ...],
  "summary": "daily rollup summary"
}

Return ONLY valid JSON.`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const messageContent = response.choices[0]?.message?.content;
  const content = extractJsonContent(messageContent as string);
  const parsed = JSON.parse(content);

  return {
    keyPoints: parsed.keyPoints || [],
    decisions: parsed.decisions || [],
    blockers: parsed.blockers || [],
    actionItems: parsed.actionItems || [],
    domainTags: parsed.domainTags || [],
    summary: parsed.summary || "",
  };
}

/**
 * Stage 3: Weekly Review
 * Analyze weekly patterns and trends
 */
async function stage3WeeklyReview(
  dailySessions: ProcessingResult[]
): Promise<ProcessingResult> {
  const weeklyContent = dailySessions
    .map(
      (s, i) =>
        `Day ${i + 1}: ${s.summary}\nKey blockers: ${s.blockers.join(", ")}`
    )
    .join("\n\n");

  const prompt = `You are an operations intelligence analyst. Conduct a weekly review of daily operations.

${weeklyContent}

Analyze:
1. Weekly trends and patterns
2. Recurring blockers (flag if appearing 3+ times)
3. Strategic priorities emerging
4. Domain maturity progression
5. Risk assessment

Return a JSON object with:
{
  "keyPoints": ["weekly insight 1", ...],
  "decisions": ["strategic decision 1", ...],
  "blockers": ["chronic blocker 1 (appeared 3+ times)", ...],
  "actionItems": [{"task": "...", "owner": "...", "priority": "HIGH"}, ...],
  "domainTags": ["domain1", ...],
  "summary": "comprehensive weekly review"
}

Return ONLY valid JSON.`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const messageContent = response.choices[0]?.message?.content;
  const content = extractJsonContent(messageContent as string);
  const parsed = JSON.parse(content);

  return {
    keyPoints: parsed.keyPoints || [],
    decisions: parsed.decisions || [],
    blockers: parsed.blockers || [],
    actionItems: parsed.actionItems || [],
    domainTags: parsed.domainTags || [],
    summary: parsed.summary || "",
  };
}

/**
 * Stage 4: Monthly Review
 * Strategic assessment and domain maturity updates
 */
async function stage4MonthlyReview(
  weeklySessions: ProcessingResult[]
): Promise<ProcessingResult> {
  const monthlyContent = weeklySessions
    .map((s, i) => `Week ${i + 1}: ${s.summary}`)
    .join("\n\n");

  const prompt = `You are an operations intelligence analyst. Conduct a comprehensive monthly strategic review.

${monthlyContent}

Assess:
1. Domain maturity progression (Early → Functional with gaps → Optimized)
2. Strategic achievements this month
3. Critical risks and blockers
4. Recommended focus areas for next month
5. Overall operational health score (0-100)

Return a JSON object with:
{
  "keyPoints": ["strategic achievement 1", ...],
  "decisions": ["strategic decision 1", ...],
  "blockers": ["critical risk 1", ...],
  "actionItems": [{"task": "...", "owner": "...", "priority": "HIGH"}, ...],
  "domainTags": ["domain1", ...],
  "summary": "comprehensive monthly strategic review with health assessment"
}

Return ONLY valid JSON.`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const messageContent = response.choices[0]?.message?.content;
  const content = extractJsonContent(messageContent as string);
  const parsed = JSON.parse(content);

  return {
    keyPoints: parsed.keyPoints || [],
    decisions: parsed.decisions || [],
    blockers: parsed.blockers || [],
    actionItems: parsed.actionItems || [],
    domainTags: parsed.domainTags || [],
    summary: parsed.summary || "",
  };
}

/**
 * Main processing function: Execute full 4-stage pipeline
 */
export async function processMeetingFull4Stage(
  meetingInput: string,
  meetingType: string,
  participants: string
): Promise<ProcessingResult> {
  // Stage 1: Single Meeting
  const stage1Result = await stage1SingleMeeting(
    meetingInput,
    meetingType,
    participants
  );

  // For a single session, stages 2-4 would normally aggregate multiple sessions
  // For now, we return Stage 1 result with a note that stages 2-4 require batch processing
  return stage1Result;
}

export { stage1SingleMeeting, stage2DailyBatch, stage3WeeklyReview, stage4MonthlyReview };
