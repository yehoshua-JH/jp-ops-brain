import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Reports() {
  const [selectedRollup, setSelectedRollup] = useState<"daily" | "weekly" | "monthly" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");

  const listSessions = trpc.sessions.getAll.useQuery();

  const handleGenerateRollup = async (type: "daily" | "weekly" | "monthly") => {
    setIsGenerating(true);
    try {
      // TODO: Replace with actual Claude API call for rollup generation
      const placeholderOutput = `
## ${type.charAt(0).toUpperCase() + type.slice(1)} Rollup Report

**Generated:** ${new Date().toLocaleString()}

### Summary
This is a placeholder for the ${type} rollup report. Once Claude API is integrated, this will:

${
  type === "daily"
    ? `
- Aggregate all sessions from today
- Identify daily themes and patterns
- Highlight blockers that appeared today
- Summarize action items due today
- Generate daily operational summary
`
    : type === "weekly"
      ? `
- Aggregate all daily rollups from this week
- Identify weekly trends and patterns
- Track domain maturity changes
- Summarize key decisions made
- Generate weekly strategic insights
`
      : `
- Aggregate all weekly reviews from this month
- Generate timeline stamp with auto-timestamp
- Update domain maturity assessments
- Identify monthly achievements and blockers
- Generate strategic recommendations for next month
`
}

### Sessions Included
${listSessions.data?.map((s) => `- Session #${s.sessionNumber} (${new Date(s.date).toLocaleDateString()})`).join("\n") || "No sessions"}

### Next Steps
1. Integrate Claude API for actual processing
2. Implement Prompt 2 (Daily Batch), Prompt 3 (Weekly Review), or Prompt 4 (Monthly Review)
3. Save rollup to database
4. Display in Master Timeline
      `.trim();

      setOutput(placeholderOutput);
      setSelectedRollup(type);
      toast.success(`${type} rollup generated (placeholder)`);
    } catch (error) {
      toast.error("Failed to generate rollup");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Rollups</h1>
        <p className="text-foreground mt-2">
          Generate daily, weekly, and monthly rollup reports using the 4-stage Claude pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Daily Rollup</h3>
          <p className="text-sm text-foreground mb-4">
            Aggregate all sessions from today and generate daily operational summary.
          </p>
          <Button
            onClick={() => handleGenerateRollup("daily")}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating && selectedRollup === "daily" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Daily Rollup"
            )}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Weekly Review</h3>
          <p className="text-sm text-foreground mb-4">
            Aggregate daily rollups and identify weekly trends and patterns.
          </p>
          <Button
            onClick={() => handleGenerateRollup("weekly")}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating && selectedRollup === "weekly" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Weekly Review"
            )}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Monthly Review</h3>
          <p className="text-sm text-foreground mb-4">
            Aggregate weekly reviews and generate timeline stamp with auto-timestamp.
          </p>
          <Button
            onClick={() => handleGenerateRollup("monthly")}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating && selectedRollup === "monthly" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Monthly Review"
            )}
          </Button>
        </Card>
      </div>

      {output && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">
              {selectedRollup ? selectedRollup.charAt(0).toUpperCase() + selectedRollup.slice(1) : ""} Rollup Output
            </h3>
            <Badge>{selectedRollup || ""}</Badge>
          </div>
          <div className="bg-muted p-4 rounded max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-sm">{output}</pre>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1">
              Save Report
            </Button>
            <Button variant="outline" className="flex-1">
              Export to PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
