import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp, Brain, Search, Calendar, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function SessionLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: sessions, isLoading } = trpc.sessions.getAll.useQuery();

  const sorted = useMemo(() => {
    if (!sessions) return [];
    const q = searchTerm.toLowerCase();
    const filtered = q
      ? sessions.filter((s) =>
          s.sessionNumber.toString().includes(q) ||
          (s.meetingType ?? "").toLowerCase().includes(q) ||
          (s.executiveSummary ?? "").toLowerCase().includes(q) ||
          (s.participants ?? "").toLowerCase().includes(q)
        )
      : sessions;
    return [...filtered].sort((a, b) => b.sessionNumber - a.sessionNumber);
  }, [sessions, searchTerm]);

  function parseJson(str: string | null | undefined): string[] {
    try {
      const parsed = JSON.parse(str ?? "[]") ?? [];
      if (!Array.isArray(parsed)) return typeof parsed === "string" ? [parsed] : [];
      return parsed.map((item: unknown): string => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          if (obj.domain && obj.point) return `[${obj.domain}] ${String(obj.point)}`;
          if (obj.task) return `${obj.task}${obj.owner ? ` (${obj.owner})` : ""}`;
          if (obj.text) return String(obj.text);
          if (obj.description) return String(obj.description);
          return Object.values(obj).filter(v => typeof v === "string").join(" — ") || JSON.stringify(obj);
        }
        return String(item);
      });
    } catch { return []; }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Session Library</h1>
          <p className="text-sm text-foreground">{sessions?.length ?? 0} sessions · All operational intelligence</p>
        </div>
        <Button onClick={() => navigate("/voice")} className="bg-indigo-600 hover:bg-indigo-700 !text-white gap-2 text-sm">
          <Brain className="w-4 h-4" />Ask about sessions
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
        <Input
          placeholder="Search sessions, decisions, participants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-muted/30 border-border text-foreground placeholder:text-foreground focus:border-indigo-500"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 bg-muted/30 rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-foreground">
          {searchTerm ? "No sessions match your search." : "No sessions yet. Drop a recording to get started."}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((s) => {
            const isOpen = expandedId === s.id;
            const decisions = parseJson(s.decisionsMade);
            const actions = parseJson(s.actionItems as string);
            const blockers = parseJson(s.activeBlockers);
            const keyPoints = parseJson(s.keyPoints);
            const participants = parseJson(s.participants);
            return (
              <div key={s.id} className="bg-muted/30 border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                >
                  <span className="text-indigo-400 font-mono text-sm w-10 flex-shrink-0">#{s.sessionNumber}</span>
                  <div className="flex items-center gap-2 text-foreground text-xs w-28 flex-shrink-0">
                    <Calendar className="w-3 h-3" />{new Date(s.date).toLocaleDateString()}
                  </div>
                  <p className="text-sm text-foreground flex-1 truncate">{s.executiveSummary}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs border-0 bg-muted/30 text-foreground">{s.meetingType}</Badge>
                    {decisions.length > 0 && <Badge variant="outline" className="text-xs border-0 bg-indigo-500/10 text-indigo-400">{decisions.length} decisions</Badge>}
                    {blockers.length > 0 && <Badge variant="outline" className="text-xs border-0 bg-red-500/10 text-red-400">{blockers.length} blockers</Badge>}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-foreground" /> : <ChevronDown className="w-4 h-4 text-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {participants.length > 0 && (
                      <div className="flex items-center gap-2 col-span-full">
                        <Users className="w-3 h-3 text-foreground" />
                        <span className="text-xs text-foreground">{participants.join(", ")}</span>
                      </div>
                    )}
                    {keyPoints.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Key Points</p>
                        <ul className="space-y-1">{keyPoints.map((kp, i) => <li key={i} className="text-xs text-foreground flex gap-2"><span className="text-indigo-400">·</span>{kp}</li>)}</ul>
                      </div>
                    )}
                    {decisions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Decisions</p>
                        <ul className="space-y-1">{decisions.map((d, i) => <li key={i} className="text-xs text-foreground flex gap-2"><span className="text-emerald-400">✓</span>{d}</li>)}</ul>
                      </div>
                    )}
                    {blockers.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Blockers</p>
                        <ul className="space-y-1">{blockers.map((b, i) => <li key={i} className="text-xs text-foreground flex gap-2"><span className="text-red-400">!</span>{b}</li>)}</ul>
                      </div>
                    )}
                    {actions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Action Items</p>
                        <ul className="space-y-1">{(actions as Array<string | { task?: string }>).map((a, i) => <li key={i} className="text-xs text-foreground flex gap-2"><span className="text-yellow-400">→</span>{typeof a === "string" ? a : (a.task ?? JSON.stringify(a))}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
