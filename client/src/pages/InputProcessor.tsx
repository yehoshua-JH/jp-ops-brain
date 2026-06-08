import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InputProcessor() {
  const [input, setInput] = useState("");
  const [meetingType, setMeetingType] = useState("1:1");
  const [participants, setParticipants] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState("");

  const handleProcess = async () => {
    if (!input.trim()) {
      toast.error("Please paste meeting input");
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Integrate with Claude API for processing
      // For now, show placeholder
      toast.success("Processing meeting input...");
      setOutput("Processing would happen here with Claude API integration");
    } catch (error) {
      toast.error("Failed to process input");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Process Meeting Input</h1>
        <p className="text-muted-foreground mt-2">
          Paste your meeting transcript, AI notes, or bullet points and let Claude transform them into structured operational intelligence.
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
                disabled={isProcessing || !input.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process with Claude"
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
                <div className="bg-muted p-4 rounded text-sm max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{output}</pre>
                </div>
              ) : (
                <div className="bg-muted p-4 rounded text-sm text-muted-foreground text-center py-8">
                  Processing output will appear here
                </div>
              )}
              {output && (
                <Button variant="outline" className="w-full">
                  Save Session
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
