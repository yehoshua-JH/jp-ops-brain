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
  const processLLM = trpc.llm.processMeeting.useMutation();

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
      // Call the LLM processing endpoint
      const result = await processLLM.mutateAsync({
        meetingInput: input,
        meetingType,
        participants,
      });

      if (result.success && result.data) {
        const data = result.data;
        const formattedOutput = `
## Meeting Analysis Results

**Meeting Type:** ${meetingType}
**Participants:** ${participants}

### Key Points
${data.keyPoints.map((p: string) => `- ${p}`).join("\n")}

### Decisions Made
${data.decisions.map((d: string) => `- ${d}`).join("\n")}

### Blockers Identified
${data.blockers.map((b: string) => `- ${b}`).join("\n")}

### Action Items
${data.actionItems.map((ai: { task: string; owner?: string; priority?: string }) => `- **${ai.task}** (Owner: ${ai.owner || "TBD"}, Priority: ${ai.priority || "MEDIUM"})`).join("\n")}

### Domain Tags
${data.domainTags.map((tag: string) => `- ${tag}`).join("\n")}

### Summary
${data.summary}
        `.trim();

        setOutput(formattedOutput);
        toast.success("Meeting processed successfully!");
      } else {
        toast.error("Failed to process meeting");
      }
    } catch (error) {
      toast.error("Failed to process input");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSession = async () => {
    if (!output.trim()) {
      toast.error("Please process a meeting first");
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        date: new Date(),
        inputFormat: "text",
        meetingType,
        participants: participants.split(",").map((p) => p.trim()),
        executiveSummary: output.substring(0, 200),
        operationalSummary: output,
        keyPoints: [],
        activeBlockers: [],
        decisionsMade: [],
        actionItems: [],
        openQuestions: [],
        systemMaturityNotes: [],
        changelogDelta: "",
      });

      setSavedSessionNumber(session.sessionNumber);
      toast.success(`Session saved! (Session #${session.sessionNumber})`);
      setInput("");
      setOutput("");
      setParticipants("");
    } catch (error) {
      toast.error("Failed to save session");
      console.error(error);
    }
  };

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
        <div className="space-y-4">
          <Card className="p-6 min-h-96 bg-muted/50">
            <div className="space-y-4">
              <h3 className="font-semibold">Output Preview</h3>
              {output ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap break-words">
                    {output}
                  </div>
                  <Button
                    onClick={handleSaveSession}
                    disabled={createSession.isPending}
                    className="w-full"
                    variant="default"
                  >
                    {createSession.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Save Session
                      </>
                    )}
                  </Button>
                  {savedSessionNumber && (
                    <div className="text-sm text-green-600 font-semibold">
                      ✓ Session #{savedSessionNumber} saved
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Processing output will appear here
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
