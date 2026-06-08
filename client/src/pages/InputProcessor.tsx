import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function InputProcessor() {
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [meetingType, setMeetingType] = useState("1:1");
  const [participants, setParticipants] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState("");
  const [savedSessionNumber, setSavedSessionNumber] = useState<number | null>(null);

  const createSession = trpc.sessions.create.useMutation();

  const handleProcess = async () => {
    if (!input.trim()) {
      toast.error("Please paste meeting input");
      return;
    }

    if (!participants.trim()) {
      toast.error("Please enter participants");
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Replace with actual Claude API call
      // For now, show a placeholder that demonstrates the structure
      const placeholderOutput = `
## Processing Meeting Input

**Meeting Type:** ${meetingType}
**Participants:** ${participants}
**Input Length:** ${input.length} characters

### 4-Stage Processing Pipeline

**Stage 1: Single Meeting Analysis**
- Extracting key points, decisions, blockers, and action items from raw input
- Categorizing by operational domain
- Identifying maturity implications

**Stage 2: Daily Batch Aggregation**
- Will aggregate all sessions from today
- Generate daily rollup report
- Identify recurring themes

**Stage 3: Weekly Review**
- Will aggregate daily rollups from this week
- Identify weekly trends and patterns
- Generate strategic insights

**Stage 4: Monthly Review**
- Will aggregate weekly reviews from this month
- Generate timeline stamp
- Update domain maturity assessments

---

**Note:** Processing through Manus LLM. This will extract key points, decisions, blockers, and action items, then categorize them by operational domain.

**Your Input Preview:**
${input.substring(0, 300)}${input.length > 300 ? "..." : ""}
      `.trim();

      setOutput(placeholderOutput);
      toast.success("Meeting input processed (placeholder mode)");
    } catch (error) {
      toast.error("Failed to process input");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSession = async () => {
    if (!output.trim()) {
      toast.error("Process meeting input first");
      return;
    }

    try {
      const result = await createSession.mutateAsync({
        date: new Date(),
        inputFormat: "Transcript",
        meetingType,
        participants: participants.split(",").map((p) => p.trim()),
        tone: "informative",
        executiveSummary: output.split("\n")[0] || "Meeting processed",
        operationalSummary: output,
        keyPoints: [
          {
            domain: "GENERAL",
            point: "Meeting processed and saved to session library",
          },
        ],
        activeBlockers: [],
        decisionsMade: [],
        actionItems: [],
        openQuestions: [],
        systemMaturityNotes: [],
        changelogDelta: "Session created from input processor",
      });

      setSavedSessionNumber(result.sessionNumber);
      toast.success(`Session #${result.sessionNumber} saved!`);

      // Reset form after short delay
      setTimeout(() => {
        setInput("");
        setParticipants("");
        setOutput("");
        setSavedSessionNumber(null);
      }, 2000);
    } catch (error) {
      toast.error("Failed to save session");
      console.error(error);
    }
  };

  if (savedSessionNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center space-y-6 max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">Session Saved!</h2>
            <p className="text-muted-foreground mt-2">
              Session #{savedSessionNumber} has been added to your library
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/library")}>
              View Library
            </Button>
            <Button className="flex-1" onClick={() => setSavedSessionNumber(null)}>
              Process Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Process Meeting Input</h1>
        <p className="text-muted-foreground mt-2">
          Paste your meeting transcript, AI notes, or bullet points. Manus will transform them into structured operational intelligence through a 4-stage pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="team">Team Meeting</SelectItem>
                    <SelectItem value="client">Client Call</SelectItem>
                    <SelectItem value="founder">Founder Session</SelectItem>
                    <SelectItem value="ops">Ops Meeting</SelectItem>
                    <SelectItem value="deep-dive">Deep Dive</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Participants (comma-separated)</Label>
                <Input
                  placeholder="e.g., Reef, Yehoshua, Yoshua"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                />
              </div>

              <div>
                <Label>Meeting Input</Label>
                <Textarea
                  placeholder="Paste transcript, AI-generated notes, or bullet points here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-96 font-mono text-sm"
                />
              </div>

              <Button
                onClick={handleProcess}
                disabled={isProcessing || !input.trim() || !participants.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Meeting"
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Output Preview</h3>
              {output ? (
                <>
                  <div className="bg-muted p-4 rounded text-sm max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs">{output}</pre>
                  </div>
                  <Button
                    onClick={handleSaveSession}
                    disabled={createSession.isPending}
                    className="w-full"
                  >
                    {createSession.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Session"
                    )}
                  </Button>
                </>
              ) : (
                <div className="bg-muted p-4 rounded text-sm text-muted-foreground text-center py-8">
                  Processing output will appear here
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
