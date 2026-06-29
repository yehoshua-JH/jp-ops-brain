import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Upload, Loader2, Volume2, VolumeX, Brain, StopCircle } from "lucide-react";
import { toast } from "sonner";

/** Strip markdown symbols before passing text to TTS */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // bold
    .replace(/\*(.+?)\*/g, "$1")        // italic
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1") // underline/italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "")  // inline code / code blocks
    .replace(/^#{1,6}\s+/gm, "")         // headings
    .replace(/^>\s+/gm, "")              // blockquotes
    .replace(/!\[.*?\]\(.*?\)/g, "")     // images
    .replace(/\[(.+?)\]\(.*?\)/g, "$1") // links — keep label
    .replace(/[-*+]\s+/g, "")           // list bullets
    .replace(/^\d+\.\s+/gm, "")         // numbered lists
    .replace(/[|\\]/g, " ")             // table pipes
    .replace(/\n{3,}/g, "\n\n")         // excess blank lines
    .trim();
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  source?: string;
};

type RecordingState = "idle" | "recording" | "processing" | "speaking";

export default function VoiceAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello. I'm your Ops Brain. Hold the mic button and ask me anything about your operations — team status, client health, open issues, decisions, or processes. You can also drop a recording and I'll extract everything from it automatically.",
      timestamp: new Date(),
    },
  ]);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.brain.ask.useMutation();
  const transcribeMutation = trpc.brain.transcribeRecording.useMutation();
  const processSessionMutation = trpc.sessions.process.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── OpenAI TTS-1-HD playback ─────────────────────────────────────────────────
  const speak = useCallback(
    async (text: string) => {
      if (isMuted) return;
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      const cleaned = cleanForSpeech(text);
      if (!cleaned) return;
      try {
        setRecordingState("speaking");
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
        });
        if (!res.ok) {
          console.warn("[TTS] Server error, skipping voice");
          setRecordingState("idle");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setRecordingState("idle");
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setRecordingState("idle");
        };
        await audio.play();
      } catch (err) {
        console.error("[TTS] Playback error:", err);
        setRecordingState("idle");
      }
    },
    [isMuted]
  );

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setRecordingState("idle");
  }, []);

  const addMessage = useCallback((role: "user" | "assistant", content: string, source?: string) => {
    const msg: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
      source,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const sendTextToAI = useCallback(
    async (text: string) => {
      addMessage("user", text);
      setRecordingState("processing");
      try {
        const result = await askMutation.mutateAsync({ question: text });
        const reply = (result as { answer?: string; source?: string }).answer ?? "I couldn't find an answer. Try rephrasing.";
        addMessage("assistant", reply, (result as { source?: string }).source);
        speak(reply);
      } catch {
        const err = "Sorry, I had trouble connecting. Please try again.";
        addMessage("assistant", err);
        speak(err);
        setRecordingState("idle");
      }
    },
    [addMessage, askMutation, speak]
  );

  // ── Voice recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) {
          setRecordingState("idle");
          return;
        }
        setRecordingState("processing");
        try {
          // Upload to storage then transcribe
          const formData = new FormData();
          formData.append("file", blob, "voice-query.webm");
          const uploadRes = await fetch("/api/upload-audio", {
            method: "POST",
            body: formData,
          });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const { url } = await uploadRes.json();
          const transcribeResult = await transcribeMutation.mutateAsync({ audioUrl: url });
          if (transcribeResult.transcript) {
            await sendTextToAI(transcribeResult.transcript);
          } else {
            setRecordingState("idle");
          }
        } catch {
          toast.error("Could not process voice input. Try typing instead.");
          setRecordingState("idle");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState("recording");
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  }, [sendTextToAI, transcribeMutation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /** Single click handler — toggles between start and stop */
  const handleMicClick = useCallback(() => {
    if (recordingState === "idle") {
      startRecording();
    } else if (recordingState === "recording") {
      stopRecording();
    } else if (recordingState === "speaking") {
      stopSpeaking();
    }
  }, [recordingState, startRecording, stopRecording, stopSpeaking]);

  // ── File upload for recordings ────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.size > 16 * 1024 * 1024) {
        toast.error("File too large. Max 16MB.");
        return;
      }
      setUploadProgress("Uploading recording...");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload-audio", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();

        setUploadProgress("Transcribing...");
        const transcribeResult = await transcribeMutation.mutateAsync({ audioUrl: url });

        if (!transcribeResult.transcript) {
          toast.error("Could not transcribe audio.");
          return;
        }

        setUploadProgress("Extracting operational intelligence...");
        addMessage(
          "user",
          `[Recording uploaded: ${file.name}]\n\n${transcribeResult.transcript.slice(0, 200)}...`
        );

        const processResult = await processSessionMutation.mutateAsync({
          rawText: transcribeResult.transcript,
          meetingType: "daily_checkin",
          participants: ["Yehoshua", "Reef"],
        });

        const sessionNum = (processResult as { session?: { sessionNumber?: number } }).session?.sessionNumber ?? "new";
        const reply = `Recording processed and saved as Session #${sessionNum}. I extracted key decisions, action items, and blockers. The data is now searchable across the Ops Brain. What would you like to know about it?`;
        addMessage("assistant", reply);
        speak(reply);
        toast.success("Recording processed and filed successfully.");
      } catch (err) {
        toast.error("Failed to process recording.");
        console.error(err);
      } finally {
        setUploadProgress(null);
      }
    },
    [addMessage, processSessionMutation, speak, transcribeMutation]
  );

  const micButtonColor =
    recordingState === "recording"
      ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40"
      : recordingState === "speaking"
      ? "bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/40"
      : recordingState === "processing"
      ? "bg-muted cursor-not-allowed"
      : "bg-indigo-600/20 hover:bg-indigo-600/40 border-2 border-indigo-500/50";

  const micLabel =
    recordingState === "recording"
      ? "Tap to send"
      : recordingState === "processing"
      ? "Processing..."
      : recordingState === "speaking"
      ? "Tap to stop"
      : "Tap to speak";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Ops Brain Assistant</h1>
            <p className="text-xs text-foreground">Voice-first CEO assistant · GPT-4o</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs border-0 ${
              recordingState === "recording"
                ? "bg-red-500/20 text-red-400"
                : recordingState === "processing"
                ? "bg-yellow-500/20 text-yellow-400"
                : recordingState === "speaking"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-muted/30 text-foreground"
            }`}
          >
            {recordingState === "recording"
              ? "● Listening"
              : recordingState === "processing"
              ? "● Thinking"
              : recordingState === "speaking"
              ? "● Speaking"
              : "Ready"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-foreground hover:text-foreground"
            onClick={() => {
              if (!isMuted && recordingState === "speaking") stopSpeaking();
              setIsMuted((m) => !m);
            }}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                <Brain className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 !text-white rounded-tr-sm"
                  : "bg-card/8 text-foreground border border-border rounded-tl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.source && (
                <p className="text-xs text-foreground mt-2 border-t border-border pt-2">
                  Source: {msg.source}
                </p>
              )}
              <p className="text-xs text-foreground mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {(recordingState === "processing" || uploadProgress) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <div className="bg-card/8 border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground">
              {uploadProgress ?? "Searching operational data..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div className="px-6 pb-2">
          <p className="text-xs text-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What are our top open issues?",
              "Who is a single point of failure?",
              "What's the status of Talk & Save?",
              "What did we decide in Session 42?",
              "Which processes have no backup owner?",
              "What's our biggest churn risk?",
            ].map((q) => (
              <button
                key={q}
                onClick={() => sendTextToAI(q)}
                className="text-xs bg-muted/30 hover:bg-card/10 border border-border rounded-full px-3 py-1.5 text-foreground hover:text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone hint */}
      <div
        className="mx-6 mb-3 border border-dashed border-border rounded-xl px-4 py-3 text-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4 text-foreground mx-auto mb-1" />
        <p className="text-xs text-foreground">Drop a recording here or click to upload · mp3, m4a, webm, wav · max 16MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Voice mic button */}
      <div className="flex flex-col items-center pb-6 pt-2 gap-2">
        <button
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 select-none ${micButtonColor}`}
          onClick={handleMicClick}
          disabled={recordingState === "processing" || !!uploadProgress}
          aria-label={micLabel}
        >
          {recordingState === "processing" ? (
            <Loader2 className="w-8 h-8 text-foreground animate-spin" />
          ) : recordingState === "recording" ? (
            <Square className="w-8 h-8 text-white fill-white" />
          ) : recordingState === "speaking" ? (
            <StopCircle className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-foreground" />
          )}
        </button>
        <p className="text-xs text-foreground">{micLabel}</p>
      </div>
    </div>
  );
}
