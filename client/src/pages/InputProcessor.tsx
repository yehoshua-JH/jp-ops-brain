import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, CheckCircle, Upload, FileText, Mic, Calendar,
  Users, Tag, AlertTriangle, ListChecks, Lightbulb, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedSession {
  executiveSummary: string;
  operationalSummary: string;
  tone: string;
  keyPoints: Array<{ domain: string; point: string }>;
  actionItems: Array<{ task: string; owner: string; priority: string }>;
  decisionsMade: string[];
  activeBlockers: Array<{ description: string; domain: string; severity: string }>;
  openQuestions: string[];
  systemMaturityNotes: Array<{ domain: string; maturity: string; change: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InputProcessor() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [transcript, setTranscript] = useState("");
  const [meetingType, setMeetingType] = useState("1:1");
  const [participants, setParticipants] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split("T")[0]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsed, setParsed] = useState<ParsedSession | null>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [savedSessionNumber, setSavedSessionNumber] = useState<number | null>(null);

  const createSession = trpc.sessions.process.useMutation();

  // ─── File upload handler ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large — max 2MB for text transcripts");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setTranscript(text);
      toast.success(`Loaded: ${file.name}`);
    };
    reader.readAsText(file);
  };

  // ─── Process via GPT-4o ───────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!transcript.trim()) {
      toast.error("Paste a transcript or upload a file first");
      return;
    }
    if (!participants.trim()) {
      toast.error("Enter participant names (comma-separated)");
      return;
    }

    setIsProcessing(true);
    setParsed(null);
    try {
      const result = await createSession.mutateAsync({
        rawText: transcript,
        meetingType,
        participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
        meetingDate,
      });

      // The server returns { success, session } — pull the structured fields back
      const s = (result as any).session;
      if (s) {
        const safeJson = (v: any) => {
          if (!v) return [];
          if (typeof v === "string") {
            try { return JSON.parse(v); } catch { return []; }
          }
          return v;
        };
        setParsed({
          executiveSummary: s.executiveSummary || "",
          operationalSummary: s.operationalSummary || "",
          tone: s.tone || "neutral",
          keyPoints: safeJson(s.keyPoints),
          actionItems: safeJson(s.actionItems),
          decisionsMade: safeJson(s.decisionsMade),
          activeBlockers: safeJson(s.activeBlockers),
          openQuestions: safeJson(s.openQuestions),
          systemMaturityNotes: safeJson(s.systemMaturityNotes),
        });
        const sNum = s.sessionNumber;
        setSavedSessionNumber(sNum ?? null);
        toast.success(`Session #${sNum} processed and saved!`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to process transcript");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setTranscript("");
    setParticipants("");
    setMeetingDate(new Date().toISOString().split("T")[0]);
    setMeetingType("1:1");
    setParsed(null);
    setSavedSessionNumber(null);
  };

  // ─── Severity color ───────────────────────────────────────────────────────
  const severityColor = (s: string) =>
    s === "critical" ? "destructive" : s === "high" ? "outline" : "secondary";

  const priorityColor = (p: string) =>
    p?.toLowerCase() === "high" ? "destructive" : p?.toLowerCase() === "medium" ? "outline" : "secondary";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">New Session Intake</h1>
        <p className="text-muted-foreground mt-1">
          Drop in a raw transcript — AI will extract key points, decisions, blockers, action items, and domain maturity signals automatically.
        </p>
      </div>

      {!parsed ? (
        /* ── Input Form ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main input */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6 space-y-5">
              {/* Metadata row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Date</Label>
                  <Input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Meeting Type</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="team">Team Meeting</SelectItem>
                      <SelectItem value="strategy">Strategy Session</SelectItem>
                      <SelectItem value="client">Client Call</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="review">Review / Retrospective</SelectItem>
                      <SelectItem value="discovery">Discovery Call</SelectItem>
                      <SelectItem value="ops">Ops Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Participants</Label>
                <Input
                  placeholder="e.g. Yehoshua, Reef, Noma"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comma-separated. First name listed = primary speaker.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Transcript</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3" />
                    Upload .txt / .md
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.text"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <Textarea
                  placeholder={`Paste the full transcript here — any format works:\n\n• Raw speech-to-text\n• AI-generated meeting notes\n• Bullet point summary\n• WhatsApp export\n• Your own notes\n\nThe AI will parse and structure everything automatically.`}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="min-h-[400px] font-mono text-sm leading-relaxed"
                />
                {transcript && (
                  <p className="text-xs text-muted-foreground text-right">
                    {transcript.length.toLocaleString()} characters · ~{Math.round(transcript.split(/\s+/).length / 130)} min read
                  </p>
                )}
              </div>

              <Button
                onClick={handleProcess}
                disabled={isProcessing || !transcript.trim() || !participants.trim()}
                className="w-full h-11 text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing with GPT-4o…
                  </>
                ) : (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Process & Save Session
                  </>
                )}
              </Button>
            </Card>
          </div>

          {/* Tips sidebar */}
          <div className="space-y-4">
            <Card className="p-5 bg-muted/40 space-y-4">
              <h3 className="font-semibold text-sm">What gets extracted</h3>
              <div className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  ["Executive summary", "2–3 sentence overview"],
                  ["Key points", "Domain-tagged insights"],
                  ["Decisions made", "Confirmed choices"],
                  ["Action items", "Tasks with owners & priority"],
                  ["Active blockers", "Issues with severity"],
                  ["Open questions", "Unresolved items"],
                  ["Domain maturity", "Signals per operational domain"],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{title}</span>
                      <span className="text-xs block">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-muted/40 space-y-3">
              <h3 className="font-semibold text-sm">Transcript tips</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Any format works — raw speech-to-text, notes, bullets</li>
                <li>• Include speaker names if available for better attribution</li>
                <li>• Longer = better context for AI extraction</li>
                <li>• No need to clean up filler words or typos</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        /* ── Parsed Output ── */
        <div className="space-y-5">
          {/* Success banner */}
          <Card className="p-4 border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                Session #{savedSessionNumber} saved successfully
              </p>
              <p className="text-xs text-muted-foreground">
                {meetingDate} · {meetingType} · {participants}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/sessions")}>
                View in Library
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                New Session
              </Button>
            </div>
          </Card>

          {/* Tone badge */}
          {parsed.tone && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tone:</span>
              <Badge variant="outline" className="capitalize">{parsed.tone}</Badge>
            </div>
          )}

          {/* Summary */}
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Executive Summary
            </h3>
            <p className="text-sm leading-relaxed">{parsed.executiveSummary}</p>
            {parsed.operationalSummary && parsed.operationalSummary !== parsed.executiveSummary && (
              <>
                <button
                  className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => setShowFullSummary(!showFullSummary)}
                >
                  {showFullSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showFullSummary ? "Hide" : "Show"} operational detail
                </button>
                {showFullSummary && (
                  <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-border pl-3">
                    {parsed.operationalSummary}
                  </p>
                )}
              </>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Points */}
            {parsed.keyPoints?.length > 0 && (
              <Card className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Key Points ({parsed.keyPoints.length})
                </h3>
                <ul className="space-y-2">
                  {parsed.keyPoints.map((kp, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <Badge variant="outline" className="text-xs shrink-0 h-5 mt-0.5">
                        {typeof kp === "object" ? kp.domain : "—"}
                      </Badge>
                      <span>{typeof kp === "object" ? kp.point : String(kp)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Decisions */}
            {parsed.decisionsMade?.length > 0 && (
              <Card className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Decisions Made ({parsed.decisionsMade.length})
                </h3>
                <ul className="space-y-1.5">
                  {parsed.decisionsMade.map((d, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span>{String(d)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Action Items */}
            {parsed.actionItems?.length > 0 && (
              <Card className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <ListChecks className="h-4 w-4 text-blue-500" />
                  Action Items ({parsed.actionItems.length})
                </h3>
                <ul className="space-y-2">
                  {parsed.actionItems.map((ai, i) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <Badge variant={priorityColor(typeof ai === "object" ? ai.priority : "")} className="text-xs shrink-0 h-5 mt-0.5">
                        {typeof ai === "object" ? (ai.priority || "med") : "—"}
                      </Badge>
                      <div>
                        <span>{typeof ai === "object" ? ai.task : String(ai)}</span>
                        {typeof ai === "object" && ai.owner && (
                          <span className="text-xs text-muted-foreground block">→ {ai.owner}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Blockers */}
            {parsed.activeBlockers?.length > 0 && (
              <Card className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Blockers ({parsed.activeBlockers.length})
                </h3>
                <ul className="space-y-2">
                  {parsed.activeBlockers.map((b, i) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <Badge variant={severityColor(typeof b === "object" ? b.severity : "")} className="text-xs shrink-0 h-5 mt-0.5">
                        {typeof b === "object" ? (b.severity || "med") : "—"}
                      </Badge>
                      <span>{typeof b === "object" ? b.description : String(b)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Domain maturity */}
          {parsed.systemMaturityNotes?.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold text-sm">Domain Maturity Signals</h3>
              <div className="flex flex-wrap gap-2">
                {parsed.systemMaturityNotes.map((n, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1 text-xs">
                    <Badge variant="outline" className="text-xs h-4">{typeof n === "object" ? n.domain : "—"}</Badge>
                    <span className="font-medium">{typeof n === "object" ? n.maturity : String(n)}</span>
                    {typeof n === "object" && n.change && (
                      <span className="text-muted-foreground">· {n.change}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Open questions */}
          {parsed.openQuestions?.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold text-sm">Open Questions</h3>
              <ul className="space-y-1.5">
                {parsed.openQuestions.map((q, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground shrink-0">?</span>
                    <span>{String(q)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
