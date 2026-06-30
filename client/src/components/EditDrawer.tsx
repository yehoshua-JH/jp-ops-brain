/**
 * EditDrawer — universal inline edit panel.
 *
 * Renders a bottom sheet with editable fields for any item type.
 * Supports voice input on every text field via the mic button.
 *
 * Usage:
 *   <EditDrawer
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     title="Edit Blocker"
 *     fields={[{ key: "description", label: "Description", type: "textarea", value: blocker.description }]}
 *     onSave={(values) => updateBlocker.mutateAsync({ id, ...values })}
 *   />
 */
import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EditField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "date";
  value: string | null | undefined;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

interface EditDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: EditField[];
  onSave: (values: Record<string, string>) => Promise<unknown>;
  onUpdated?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EditDrawer({
  open,
  onClose,
  title,
  subtitle,
  fields,
  onSave,
  onUpdated,
}: EditDrawerProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""]))
  );
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.brain.transcribeRecording.useMutation();

  // Reset values when fields change (new item opened)
  const resetValues = useCallback(() => {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  }, [fields]);

  // ── Voice recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async (fieldKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) { setIsRecording(false); setActiveVoiceField(null); return; }
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, "edit-note.webm");
          const uploadRes = await fetch("/api/upload-audio", { method: "POST", body: formData });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();
          const result = await transcribeMutation.mutateAsync({ audioUrl: url });
          if (result.transcript) {
            setValues((prev) => ({
              ...prev,
              [fieldKey]: prev[fieldKey] ? `${prev[fieldKey]}\n${result.transcript}` : result.transcript,
            }));
          }
        } catch {
          toast.error("Could not transcribe voice note.");
        } finally {
          setIsTranscribing(false);
          setActiveVoiceField(null);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setActiveVoiceField(fieldKey);
    } catch {
      toast.error("Microphone access denied.");
    }
  }, [transcribeMutation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleMic = (fieldKey: string) => {
    if (isRecording && activeVoiceField === fieldKey) stopRecording();
    else if (!isRecording) startRecording(fieldKey);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(values);
      toast.success("Saved successfully.");
      onUpdated?.();
      onClose();
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) { resetValues(); onClose(); }
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border max-h-[90vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold text-foreground">{title}</SheetTitle>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {field.label}
              </Label>

              {field.type === "select" ? (
                <Select
                  value={values[field.key] ?? ""}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                >
                  <SelectTrigger className="bg-muted/20 border-border text-sm">
                    <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <div className="relative">
                  <Textarea
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={
                      isRecording && activeVoiceField === field.key
                        ? "● Listening — speak your update..."
                        : isTranscribing && activeVoiceField === field.key
                        ? "Transcribing..."
                        : field.placeholder ?? `Enter ${field.label.toLowerCase()}...`
                    }
                    className="min-h-[100px] pr-12 resize-none bg-muted/20 border-border text-sm"
                    disabled={isRecording || isTranscribing}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`absolute right-2 top-2 w-8 h-8 ${isRecording && activeVoiceField === field.key ? "text-red-400 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => toggleMic(field.key)}
                    disabled={isTranscribing || (isRecording && activeVoiceField !== field.key)}
                  >
                    {isRecording && activeVoiceField === field.key ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              ) : field.type === "date" ? (
                <Input
                  type="date"
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="bg-muted/20 border-border text-sm"
                />
              ) : (
                <div className="relative">
                  <Input
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                    className="pr-10 bg-muted/20 border-border text-sm"
                    disabled={isRecording || isTranscribing}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`absolute right-1 top-1 w-7 h-7 ${isRecording && activeVoiceField === field.key ? "text-red-400 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => toggleMic(field.key)}
                    disabled={isTranscribing || (isRecording && activeVoiceField !== field.key)}
                  >
                    {isRecording && activeVoiceField === field.key ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  </Button>
                </div>
              )}

              {isRecording && activeVoiceField === field.key && (
                <p className="text-xs text-red-400 animate-pulse">Recording... tap mic to stop</p>
              )}
              {isTranscribing && activeVoiceField === field.key && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Transcribing...
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={handleSave}
            disabled={isSaving || isRecording || isTranscribing}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
