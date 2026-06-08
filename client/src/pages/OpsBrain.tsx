import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function OpsBrain() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);

  const handleAsk = () => {
    if (!query.trim()) return;
    setMessages([...messages, { role: "user", content: query }]);
    setQuery("");
    // TODO: Send to Claude with session context
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ops Brain</h1>
        <p className="text-muted-foreground mt-2">
          Ask natural language questions about your operational data and cross-session patterns.
        </p>
      </div>

      <Card className="p-6 h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Ask me anything about your operations...
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`${msg.role === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block p-3 rounded-lg max-w-xs ${
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
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <Button onClick={handleAsk} disabled={!query.trim()}>
            Ask
          </Button>
        </div>
      </Card>
    </div>
  );
}
