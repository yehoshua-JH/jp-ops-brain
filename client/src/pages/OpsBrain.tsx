import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Loader2, Brain, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function OpsBrain() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.brain.ask.useMutation({
    onSuccess: (data) => {
      const answer = typeof data.answer === "string" ? data.answer : String(data.answer ?? "");
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    },
    onError: (err) => {
      toast.error("Brain error: " + err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble processing that. Please try again." },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending]);

  const handleAsk = () => {
    const q = query.trim();
    if (!q || askMutation.isPending) return;

    const userMsg: Message = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");

    askMutation.mutate({
      question: q,
      conversationHistory: messages,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ops Brain</h1>
        <p className="text-muted-foreground mt-2">
          Ask natural language questions about your operational data and cross-session patterns.
        </p>
      </div>

      <Card className="p-6 flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold mb-2">Ask me anything about your operations</p>
              <p className="text-sm mb-3">Powered by GPT-4o with full access to your session data</p>
              <div className="text-sm space-y-1 text-left inline-block">
                <p className="text-muted-foreground/70">"What are our top open blockers?"</p>
                <p className="text-muted-foreground/70">"Which domains need the most work?"</p>
                <p className="text-muted-foreground/70">"What decisions were made last week?"</p>
                <p className="text-muted-foreground/70">"Summarize the Visio situation"</p>
                <p className="text-muted-foreground/70">"What's the status of the Langsam pitch?"</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {askMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Input
            placeholder="Ask a question about your operations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !askMutation.isPending && handleAsk()}
            disabled={askMutation.isPending}
          />
          <Button onClick={handleAsk} disabled={!query.trim() || askMutation.isPending}>
            {askMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
