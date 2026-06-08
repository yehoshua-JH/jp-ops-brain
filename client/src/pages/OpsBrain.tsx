import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OpsBrain() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;

    const userMessage = query;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setQuery("");
    setIsLoading(true);

    try {
      // TODO: Integrate with Claude API
      // For now, show a placeholder response
      const placeholderResponse = `
I'm analyzing your operational data across all sessions...

Based on the context from your sessions, here's what I found:

**Key Insights:**
- Your operations are tracking across 10 domains
- Recent sessions show focus on time-tracking and invoicing improvements
- Several blockers have been identified and are being tracked

**Next Steps:**
Once you integrate Claude API, I'll be able to:
1. Perform cross-session analysis
2. Identify patterns and trends
3. Answer specific operational questions
4. Provide strategic recommendations

Feel free to ask me anything about your operations!
      `.trim();

      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: placeholderResponse }]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast.error("Failed to process query");
      setIsLoading(false);
    }
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
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="font-semibold mb-2">Ask me anything about your operations...</p>
              <p className="text-sm">Examples:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>"What are our top blockers?"</li>
                <li>"Which domains need the most work?"</li>
                <li>"What decisions were made last week?"</li>
              </ul>
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
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-left">
              <div className="inline-block p-3 rounded-lg bg-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Input
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAsk()}
            disabled={isLoading}
          />
          <Button onClick={handleAsk} disabled={!query.trim() || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
