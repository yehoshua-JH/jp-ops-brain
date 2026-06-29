/**
 * RiskUpdateSheet — universal "Update Risk" bottom sheet.
 *
 * Supports three risk types:
 *   - "blocker"  → blockers table (resolve, escalate, add note)
 *   - "client"   → clients table  (status, healthScore, notes, riskFlags)
 *   - "employee" → employees table (status, criticalityScore, notes)
 *
 * Usage:
 *   <RiskUpdateSheet
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     riskType="blocker"
 *     id={blocker.id}
 *     title={blocker.description}
 *     currentStatus={blocker.status}
 *     onUpdated={() => utils.blockers.getOpen.invalidate()}
 *   />
 */
import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, CheckCircle2, AlertTriangle, TrendingDown, Clock, Flame, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskType = "blocker" | "client" | "employee";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => Promise<unknown>;
}

interface RiskUpdateSheetProps {
  open: boolean;
  onClose: () => void;
  riskType: RiskType;
  id: number;
  title: string;
  subtitle?: string;
  currentStatus?: string;
  onUpdated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  const map: Record<string, string> = {
    open: "bg-red-500/20 text-red-400 border-red-500/30",
    resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    at_risk: "bg-red-500/20 text-red-400 border-red-500/30",
    churned: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    prospect: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return map[status] ?? "bg-muted/30 text-foreground border-border";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RiskUpdateSheet({
  open,
  onClose,
  riskType,
  id,
  title,
  subtitle,
  currentStatus,
  onUpdated,
}: RiskUpdateSheetProps) {
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const utils = trpc.useUtils();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const resolveBlocker = trpc.blockers.resolve.useMutation();
  const updateBlockerNote = trpc.blockers.updateNote.useMutation();
  const escalateBlocker = trpc.blockers.escalate.useMutation();
  const updateClientRisk = trpc.clients.updateRisk.useMutation();
  const updateEmployeeRisk = trpc.employees.updateRisk.useMutation();
  const transcribeMutation = trpc.brain.transcribeRecording.useMutation();

  // ── Invalidation helper ────────────────────────────────────────────────────
  const invalidate = useCallback(() => {
    if (riskType === "blocker") {
      utils.blockers.getAll.invalidate();
      utils.blockers.getOpen.invalidate();
      utils.blockers.getChronic.invalidate();
    } else if (riskType === "client") {
      utils.clients.getAll.invalidate();
    } else if (riskType === "employee") {
      utils.employees.getAll.invalidate();
    }
    onUpdated?.();
  }, [riskType, utils, onUpdated]);

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) { setIsRecording(false); return; }
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, "risk-note.webm");
          const uploadRes = await fetch("/api/upload-audio", { method: "POST", body: formData });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();
          const result = await transcribeMutation.mutateAsync({ audioUrl: url });
          if (result.transcript) {
            setNote((prev) => prev ? `${prev}\n${result.transcript}` : result.transcript);
          }
        } catch {
          toast.error("Could not transcribe voice note.");
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  }, [transcribeMutation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleMic = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // ── Quick actions ──────────────────────────────────────────────────────────
  const withSave = (fn: () => Promise<unknown>) => async () => {
    setIsSaving(true);
    try {
      await fn();
      invalidate();
      toast.success("Risk updated.");
      setNote("");
      onClose();
    } catch {
      toast.error("Failed to update. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const quickActions: QuickAction[] = riskType === "blocker"
    ? [
        {
          label: "Mark Resolved",
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
          action: withSave(() => resolveBlocker.mutateAsync({ id, resolutionNote: note || "Resolved via quick update." })),
        },
        {
          label: "Escalate",
          icon: <Flame className="w-4 h-4" />,
          color: "border-red-500/40 text-red-400 hover:bg-red-500/10",
          action: withSave(() => escalateBlocker.mutateAsync({ id, note: note || undefined })),
        },
        {
          label: "Monitoring",
          icon: <TrendingDown className="w-4 h-4" />,
          color: "border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10",
          action: withSave(() => updateBlockerNote.mutateAsync({ id, note: `[Monitoring] ${note || "Being watched."}` })),
        },
        {
          label: "Snooze 7 days",
          icon: <Clock className="w-4 h-4" />,
          color: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
          action: withSave(() => {
            const snoozeDate = new Date();
            snoozeDate.setDate(snoozeDate.getDate() + 7);
            return updateBlockerNote.mutateAsync({ id, note: `[Snoozed until ${snoozeDate.toLocaleDateString()}] ${note || ""}`.trim() });
          }),
        },
        {
          label: "Add Note",
          icon: <StickyNote className="w-4 h-4" />,
          color: "border-border text-foreground hover:bg-muted/30",
          action: withSave(() => updateBlockerNote.mutateAsync({ id, note })),
        },
      ]
    : riskType === "client"
    ? [
        {
          label: "Mark Active",
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
          action: withSave(() => updateClientRisk.mutateAsync({ id, status: "active", notes: note || undefined })),
        },
        {
          label: "Mark At-Risk",
          icon: <AlertTriangle className="w-4 h-4" />,
          color: "border-red-500/40 text-red-400 hover:bg-red-500/10",
          action: withSave(() => updateClientRisk.mutateAsync({ id, status: "at_risk", notes: note || undefined })),
        },
        {
          label: "Scheduled Call",
          icon: <Clock className="w-4 h-4" />,
          color: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
          action: withSave(() => updateClientRisk.mutateAsync({ id, notes: `[Scheduled call] ${note || ""}`.trim() })),
        },
        {
          label: "Sent Proposal",
          icon: <StickyNote className="w-4 h-4" />,
          color: "border-purple-500/40 text-purple-400 hover:bg-purple-500/10",
          action: withSave(() => updateClientRisk.mutateAsync({ id, notes: `[Sent proposal] ${note || ""}`.trim() })),
        },
        {
          label: "Add Note",
          icon: <StickyNote className="w-4 h-4" />,
          color: "border-border text-foreground hover:bg-muted/30",
          action: withSave(() => updateClientRisk.mutateAsync({ id, notes: note })),
        },
      ]
    : /* employee */ [
        {
          label: "Mark Active",
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
          action: withSave(() => updateEmployeeRisk.mutateAsync({ id, status: "active", notes: note || undefined })),
        },
        {
          label: "Mark At-Risk",
          icon: <AlertTriangle className="w-4 h-4" />,
          color: "border-red-500/40 text-red-400 hover:bg-red-500/10",
          action: withSave(() => updateEmployeeRisk.mutateAsync({ id, status: "at_risk", notes: note || undefined })),
        },
        {
          label: "Raise Risk Score",
          icon: <Flame className="w-4 h-4" />,
          color: "border-orange-500/40 text-orange-400 hover:bg-orange-500/10",
          action: withSave(() => updateEmployeeRisk.mutateAsync({ id, criticalityScore: 9, notes: note || undefined })),
        },
        {
          label: "Lower Risk Score",
          icon: <TrendingDown className="w-4 h-4" />,
          color: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
          action: withSave(() => updateEmployeeRisk.mutateAsync({ id, criticalityScore: 4, notes: note || undefined })),
        },
        {
          label: "Add Note",
          icon: <StickyNote className="w-4 h-4" />,
          color: "border-border text-foreground hover:bg-muted/30",
          action: withSave(() => updateEmployeeRisk.mutateAsync({ id, notes: note })),
        },
      ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs border ${riskType === "blocker" ? "border-red-500/30 text-red-400 bg-red-500/10" : riskType === "client" ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" : "border-orange-500/30 text-orange-400 bg-orange-500/10"}`}
                >
                  {riskType === "blocker" ? "Blocker" : riskType === "client" ? "Client Risk" : "People Risk"}
                </Badge>
                {currentStatus && (
                  <Badge variant="outline" className={`text-xs border ${statusColor(currentStatus)}`}>
                    {currentStatus.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-base font-semibold text-foreground leading-snug">{title}</SheetTitle>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Quick action chips */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((qa) => (
              <Button
                key={qa.label}
                variant="outline"
                size="sm"
                disabled={isSaving}
                className={`h-8 text-xs gap-1.5 border ${qa.color} bg-transparent`}
                onClick={qa.action}
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : qa.icon}
                {qa.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Voice + text note area */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Add a Note</p>
          <div className="relative">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isRecording
                  ? "● Listening — speak your update..."
                  : isTranscribing
                  ? "Transcribing..."
                  : "Type a note, or tap the mic to speak it..."
              }
              className="min-h-[80px] pr-12 resize-none bg-muted/20 border-border text-sm"
              disabled={isRecording || isTranscribing}
            />
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-2 top-2 w-8 h-8 ${isRecording ? "text-red-400 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
              onClick={toggleMic}
              disabled={isTranscribing}
              title={isRecording ? "Tap to stop recording" : "Tap to record voice note"}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
              Recording… tap mic to stop
            </p>
          )}
        </div>

        {/* Save note button (only if note has content and no quick action was used) */}
        {note.trim() && (
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isSaving}
            onClick={quickActions.find((q) => q.label === "Add Note")?.action}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Note
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
