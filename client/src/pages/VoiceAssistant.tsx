import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Upload, Loader2, Volume2, VolumeX, Brain } from "lucide-react";
import { toast } from "sonner";

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
  const [isHolding, setIsHolding] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.brain.ask.useMutation();
  const transcribeMutation = trpc.brain.transcribeRecording.useMutation();
  const processSessionMutation = trpc.sessions.process.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback(
    (text: string) => {
      if (isMuted || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      // Prefer a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes("Samantha") ||
          v.name.includes("Google US English") ||
          v.name.includes("en-US")
      );
      if (preferred) utterance.voice = preferred;
      utterance.onstart = () => setRecordingState("speaking");
      utterance.onend = () => setRecordingState("idle");
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isMuted]
  );

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

  const handleMicPointerDown = useCallback(() => {
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      startRecording();
    }, 200);
  }, [startRecording]);

  const handleMicPointerUp = useCallback(() => {
    setIsHolding(false);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (recordingState === "recording") stopRecording();
  }, [recordingState, stopRecording]);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("audio/")) handleFileUpload(file);
      else toast.error("Please drop an audio file (mp3, m4a, webm, wav).");
    },
    [handleFileUpload]
  );

  const micButtonColor =
    recordingState === "recording"
      ? "bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.6)]"
      : recordingState === "processing"
      ? "bg-yellow-500 hover:bg-yellow-600"
      : recordingState === "speaking"
      ? "bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
      : isHolding
      ? "bg-indigo-400 hover:bg-indigo-500"
      : "bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_20px_rgba(99,102,241,0.4)]";

  return (
    <div
      className="flex flex-col h-full min-h-[720px] bg-background text-foreground"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Ops Brain Assistant</h1>
            <p className="text-xs text-foreground/60">Voice-first · Powered by all your operational data</p>
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
                : "bg-muted/30 text-foreground/60"
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
            className="w-8 h-8 text-foreground/60 hover:text-foreground"
            onClick={() => {
              setIsMuted((m) => !m);
              if (!isMuted) window.speechSynthesis?.cancel();
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
                  : "bg-card/8 text-foreground/90 border border-border rounded-tl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.source && (
                <p className="text-xs text-foreground/30 mt-2 border-t border-border pt-2">
                  Source: {msg.source}
                </p>
              )}
              <p className="text-xs text-foreground/25 mt-1">
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
            <div className="bg-card/8 border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground/60">
              {uploadProgress ?? "Searching operational data..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div className="px-6 pb-2">
          <p className="text-xs text-foreground/30 mb-2">Try asking:</p>
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
                className="text-xs bg-muted/30 hover:bg-card/10 border border-border rounded-full px-3 py-1.5 text-foreground/70 hover:text-foreground/80 transition-colors"
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
        <Upload className="w-4 h-4 text-foreground/30 mx-auto mb-1" />
        <p className="text-xs text-foreground/30">Drop a recording here or click to upload · mp3, m4a, webm, wav · max 16MB</p>
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
          onPointerDown={handleMicPointerDown}
          onPointerUp={handleMicPointerUp}
          onPointerLeave={handleMicPointerUp}
          disabled={recordingState === "processing" || !!uploadProgress}
        >
          {recordingState === "processing" ? (
            <Loader2 className="w-8 h-8 text-foreground animate-spin" />
          ) : recordingState === "recording" ? (
            <MicOff className="w-8 h-8 text-foreground" />
          ) : (
            <Mic className="w-8 h-8 text-foreground" />
          )}
        </button>
        <p className="text-xs text-foreground/30">
          {recordingState === "recording"
            ? "Release to send"
            : recordingState === "processing"
            ? "Processing..."
            : recordingState === "speaking"
            ? "Speaking... tap to stop"
            : "Hold to speak"}
        </p>
      </div>
    </div>
  );
}
