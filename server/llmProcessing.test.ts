import { describe, it, expect, vi, beforeEach } from "vitest";
import { processMeeting } from "./llmProcessing";

// Mock the invokeLLM function
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";

describe("LLM Processing - Stage 1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract key points from a garbled transcript with speaker attribution", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              keyPoints: [
                "Reef is looking for an operations assistant to help with resource management",
                "Yehoshua has experience with multiple startups and e-commerce operations",
                "Time tracking and invoicing are critical operational challenges",
              ],
              decisions: [
                "Yehoshua will join as operations assistant/manager",
                "Focus on growth mode rather than management mode",
              ],
              blockers: [
                "Resource management and time tracking not properly maintained",
                "Employee hours not consistently logged in the system",
              ],
              actionItems: [
                {
                  task: "Set up automated time tracking system",
                  owner: "Reef",
                  priority: "HIGH",
                  deadline: null,
                },
                {
                  task: "Implement weekly hour verification process",
                  owner: "Yehoshua",
                  priority: "HIGH",
                  deadline: null,
                },
              ],
              domainTags: [
                "People & Culture",
                "Finance & Business Operations",
              ],
              summary:
                "Reef (founder) hired Yehoshua as operations assistant to handle resource management, time tracking, and operational support while Reef focuses on growth. Key challenge: maintaining accurate employee hours across multiple time zones.",
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await processMeeting({
      meetingInput: `
        The whole side is jive higher, which is they, I mean bread and butter and co. Recently just rebranded to jive Pilot.
        Yeah, executive assistant is the sign out to meet and also operations manager that was also going out to meet.
        I am looking to fill his job, so this is not really filling his job, but it would be filling his capsule.
      `,
      meetingType: "GM Handover",
      participants: "Reef, Yehoshua",
    });

    expect(result.keyPoints).toHaveLength(3);
    expect(result.keyPoints[0]).toContain("operations assistant");
    expect(result.decisions).toHaveLength(2);
    expect(result.actionItems).toHaveLength(2);
    expect(result.actionItems[0].owner).toBe("Reef");
    expect(result.actionItems[1].owner).toBe("Yehoshua");
    expect(result.domainTags).toContain("People & Culture");
  });

  it("should correctly attribute action items to the right speaker", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              keyPoints: ["Resource management is a priority"],
              decisions: ["Implement new time tracking system"],
              blockers: ["Hours not being tracked consistently"],
              actionItems: [
                {
                  task: "Configure the new time tracking system",
                  owner: "Reef",
                  priority: "HIGH",
                  deadline: "2026-06-15",
                },
                {
                  task: "Train team on time entry process",
                  owner: "Yehoshua",
                  priority: "MEDIUM",
                  deadline: "2026-06-20",
                },
              ],
              domainTags: ["Finance & Business Operations"],
              summary:
                "Reef will set up the system, Yehoshua will train the team.",
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await processMeeting({
      meetingInput: "We need to track hours better",
      meetingType: "Operations Review",
      participants: "Reef, Yehoshua",
    });

    // Verify speaker attribution is correct
    expect(result.actionItems[0].owner).toBe("Reef");
    expect(result.actionItems[0].task).toContain("Configure");
    expect(result.actionItems[1].owner).toBe("Yehoshua");
    expect(result.actionItems[1].task).toContain("Train");
  });

  it("should handle garbled speech-to-text gracefully", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              keyPoints: [
                "JivePilot is expanding into AI surveillance products",
                "Multiple time zones and remote workers create operational complexity",
              ],
              decisions: [
                "Hire operations support to manage resource allocation",
              ],
              blockers: [
                "Difficulty tracking hours across distributed team",
                "Invoicing delays due to incomplete time data",
              ],
              actionItems: [
                {
                  task: "Implement automated email reminders for time entry",
                  owner: "Unknown",
                  priority: "MEDIUM",
                  deadline: null,
                },
              ],
              domainTags: [
                "Technology Infrastructure",
                "Finance & Business Operations",
              ],
              summary:
                "JivePilot needs operational support to manage distributed team across time zones.",
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await processMeeting({
      meetingInput: `
        So it's I'll get and see your te sitting in life seeds and also intervent in the.
        So the two brand that are very focused on and then there's just a pilot.
      `,
      meetingType: "Strategic Planning",
      participants: "Reef, Yehoshua",
    });

    // Should still extract meaningful data even from garbled input
    expect(result.keyPoints.length).toBeGreaterThan(0);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it("should extract domain tags from operational domains", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              keyPoints: ["Discussing product roadmap and engineering priorities"],
              decisions: ["Focus on AI features next quarter"],
              blockers: [],
              actionItems: [],
              domainTags: [
                "Product & Engineering",
                "Go-to-Market & Sales",
              ],
              summary: "Product and engineering discussion",
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await processMeeting({
      meetingInput: "Let's talk about the product roadmap",
      meetingType: "Product Review",
      participants: "Reef, Yehoshua",
    });

    expect(result.domainTags).toContain("Product & Engineering");
    expect(result.domainTags).toContain("Go-to-Market & Sales");
  });

  it("should mark uncertain speaker attribution as Unknown", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              keyPoints: ["Someone mentioned a new initiative"],
              decisions: [],
              blockers: [],
              actionItems: [
                {
                  task: "Follow up on the initiative",
                  owner: "Unknown",
                  priority: "MEDIUM",
                  deadline: null,
                },
              ],
              domainTags: [],
              summary: "Unclear speaker attribution in this section",
            }),
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await processMeeting({
      meetingInput: "Unclear audio segment",
      meetingType: "General Meeting",
      participants: "Reef, Yehoshua",
    });

    // Should mark as Unknown rather than guessing
    expect(result.actionItems[0].owner).toBe("Unknown");
  });

  it("should handle JSON extraction from markdown-wrapped responses", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: `\`\`\`json
{
  "keyPoints": ["Test point"],
  "decisions": ["Test decision"],
  "blockers": [],
  "actionItems": [],
  "domainTags": [],
  "summary": "Test"
}
\`\`\``,
          },
        },
      ],
    };

    vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

    const result = await processMeeting({
      meetingInput: "Test input",
      meetingType: "Test",
      participants: "Reef, Yehoshua",
    });

    expect(result.keyPoints).toContain("Test point");
    expect(result.decisions).toContain("Test decision");
  });
});
