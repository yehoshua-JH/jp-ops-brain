/**
 * GlobalVoiceButton — floating mic button always visible in the bottom-right corner.
 *
 * How it works:
 * 1. User taps the mic button (or long-presses any item that sets context via useVoiceContext)
 * 2. Browser records audio
 * 3. Audio is uploaded and sent to brain.voiceUpdate with the current context
 * 4. GPT-4o transcribes + interprets the update and routes it to the correct DB field
 * 5. User sees a confirmation with what was heard and what was updated
 *
 * Context can be set from any page via the useVoiceContext hook:
 *   const { setContext } = useVoiceContext();
 *   setContext({ entityType: "blocker", entityId: 5, entityName: "Invoice delay" });
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, CheckCircle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useVoiceContext } from "@/contexts/VoiceContext";
import { useLocation } from "wouter";

type Phase = "idle" | "recording" | "processing" | "confirming" | "error";

export default function GlobalVoiceButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [actionSummary, setActionSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [location] = useLocation();
  const { context, clearContext } = useVoiceContext();

  const voiceUpdateMutation = trpc.brain.voiceUpdate.useMutation();
  const utils = trpc.useUtils();

  // Auto-dismiss confirmation after 6 seconds
  useEffect(() => {
    if (phase === "confirming") {
      const timer = setTimeout(() => {
        setPhase("idle");
        clearContext();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [phase, clearContext]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) {
          setPhase("idle");
          toast.info("Recording too short — try again.");
          return;
        }
        setPhase("processing");
        try {
          // Upload audio
          const formData = new FormData();
          formData.append("file", blob, "voice-update.webm");
          const uploadRes = await fetch("/api/upload-audio", { method: "POST", body: formData });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();

          // Send to brain.voiceUpdate with context
          const result = await voiceUpdateMutation.mutateAsync({
            audioUrl: url,
            context: {
              entityType: context?.entityType ?? "general",
              entityId: context?.entityId,
              entityName: context?.entityName,
              currentPage: location,
            },
          });

          setTranscript(result.transcript ?? "");
          if (result.success) {
            // Describe what happened
            const action = result.action;
            let summary = "";
            if (action?.action === "updateBlocker") summary = `Updated blocker #${action.id}`;
            else if (action?.action === "updateActionItem") summary = `Updated action item #${action.id}`;
            else if (action?.action === "updateClient") summary = `Updated client #${action.id}`;
            else if (action?.action === "updateEmployee") summary = `Updated employee #${action.id}`;
            else if (action?.action === "updateSession") summary = `Updated session #${action.id}`;
            else if (action?.action === "addNote") summary = `Added note to ${action.entityType} #${action.id}`;
            else summary = result.message ?? "Update applied";
            setActionSummary(summary);
            setPhase("confirming");
            // Invalidate relevant queries
            utils.blockers.getAll.invalidate();
            utils.blockers.getOpen.invalidate();
            utils.actionItems.getAll.invalidate();
            utils.clients.getAll.invalidate();
            utils.employees.getAll.invalidate();
            utils.sessions.getAll.invalidate();
          } else {
            setErrorMsg(result.message ?? "Could not apply update");
            setPhase("error");
          }
        } catch (err: any) {
          console.error("[GlobalVoice] Error:", err);
          setErrorMsg(err?.message ?? "Something went wrong");
          setPhase("error");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch {
      toast.error("Microphone access denied.");
    }
  }, [context, location, voiceUpdateMutation, utils]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (phase === "idle") startRecording();
    else if (phase === "recording") stopRecording();
    else if (phase === "confirming" || phase === "error") {
      setPhase("idle");
      clearContext();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const buttonColor =
    phase === "recording" ? "bg-red-500 hover:bg-red-600 shadow-red-500/40" :
    phase === "processing" ? "bg-indigo-400 cursor-wait" :
    phase === "confirming" ? "bg-emerald-500 hover:bg-emerald-600" :
    phase === "error" ? "bg-orange-500 hover:bg-orange-600" :
    "bg-indigo-600 hover:bg-indigo-700";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Context indicator — shows what item the mic is focused on */}
      {context && phase === "idle" && (
        <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-lg flex items-center gap-2 max-w-[220px]">
          <span className="text-indigo-400 font-medium capitalize">{context.entityType}</span>
          <span className="text-foreground truncate">{context.entityName ?? `#${context.entityId}`}</span>
          <button onClick={clearContext} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Transcript / result bubble */}
      {(phase === "confirming" || phase === "error") && (
        <div className={`rounded-xl px-4 py-3 text-sm shadow-lg max-w-[280px] border ${
          phase === "confirming" ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"
        }`}>
          {phase === "confirming" ? (
            <>
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 mb-1">
                <CheckCircle className="w-4 h-4" /> {actionSummary}
              </div>
              <p className="text-xs text-emerald-600 italic">"{transcript}"</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-semibold text-orange-700 mb-1">
                <XCircle className="w-4 h-4" /> Couldn't apply update
              </div>
              <p className="text-xs text-orange-600">{errorMsg}</p>
              {transcript && <p className="text-xs text-orange-500 mt-1 italic">Heard: "{transcript}"</p>}
            </>
          )}
        </div>
      )}

      {/* Recording pulse indicator */}
      {phase === "recording" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Recording... tap to stop
          {context && <span className="text-xs opacity-70">· {context.entityName ?? context.entityType}</span>}
        </div>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={phase === "processing"}
        className={`w-14 h-14 rounded-full text-white shadow-lg transition-all duration-150 active:scale-95 flex items-center justify-center ${buttonColor} ${phase === "recording" ? "animate-pulse" : ""}`}
        title={
          phase === "idle" ? "Voice update — tap to speak" :
          phase === "recording" ? "Recording — tap to stop" :
          phase === "processing" ? "Processing..." :
          phase === "confirming" ? "Done — tap to dismiss" :
          "Error — tap to dismiss"
        }
      >
        {phase === "processing" ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : phase === "recording" ? (
          <MicOff className="w-6 h-6" />
        ) : phase === "confirming" ? (
          <CheckCircle className="w-6 h-6" />
        ) : phase === "error" ? (
          <XCircle className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Label */}
      {phase === "idle" && (
        <span className="text-xs text-muted-foreground text-right">
          {context ? "Voice update ready" : "Voice update"}
        </span>
      )}
    </div>
  );
}
