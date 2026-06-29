import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Search, Workflow, AlertTriangle, Zap, FileText,
  ChevronRight, User, Shield, CheckCircle2, AlertCircle, BookOpen,
  Lightbulb, TrendingUp, TrendingDown, Minus, BarChart2
} from "lucide-react";

// Parse JSON steps string into array
function parseSteps(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return raw.split("\n").filter(Boolean);
  }
  return [];
}

function classifyStep(step: string): "gap" | "lesson" | "policy" | "example" | "future" | "step" {
  const s = step.toUpperCase();
  if (s.startsWith("GAP:")) return "gap";
  if (s.startsWith("LESSON LEARNED") || s.startsWith("LESSON:")) return "lesson";
  if (s.startsWith("POLICY:")) return "policy";
  if (s.startsWith("EXAMPLE") || s.startsWith("EXAMPLE:")) return "example";
  if (s.startsWith("FUTURE:")) return "future";
  return "step";
}

function DocBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  const text = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${text}`}>{pct}%</span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  documented:   "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  partial:      "bg-amber-500/15 text-amber-500 border-amber-500/30",
  undocumented: "bg-destructive/15 text-destructive border-destructive/30",
  needs_update: "bg-orange-500/15 text-orange-500 border-orange-500/30",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Sales & BD":          "bg-sky-500/10 border-sky-500/30",
  "SOW & Contracts":     "bg-violet-500/10 border-violet-500/30",
  "HR & Onboarding":     "bg-teal-500/10 border-teal-500/30",
  "Finance & Invoicing": "bg-amber-500/10 border-amber-500/30",
  "Time Tracking":       "bg-orange-500/10 border-orange-500/30",
  "Client Management":   "bg-pink-500/10 border-pink-500/30",
  "Client Ops":          "bg-pink-500/10 border-pink-500/30",
  "KPI & Performance":   "bg-indigo-500/10 border-indigo-500/30",
  "Ops Brain":           "bg-purple-500/10 border-purple-500/30",
};

type PhaseAnalysisItem = {
  phase: string;
  status: string;
  finding: string;
  evidence: string;
  recommendation: string;
};

type GapAnalysis = {
  overallScore: number;
  summary: string;
  phaseAnalysis: PhaseAnalysisItem[];
  criticalGaps: string[];
  positives: string[];
};

export default function ProcessLibrary() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"sop" | "gap">("sop");

  const { data: processes, isLoading } = trpc.processes.getAll.useQuery();
  const { data: gapData, isLoading: gapLoading } = trpc.processes.gapAnalysis.useQuery(
    { processId: selectedId! },
    { enabled: !!selectedId && activeTab === "gap" }
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set((processes ?? []).map((p) => p.category)));
    return cats.sort();
  }, [processes]);

  const filtered = useMemo(() => {
    return (processes ?? []).filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.owner ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || p.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [processes, search, filterCategory]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const p of filtered) {
      if (!g[p.category]) g[p.category] = [];
      g[p.category].push(p);
    }
    return g;
  }, [filtered]);

  const selected = useMemo(
    () => (selectedId ? (processes ?? []).find((p) => p.id === selectedId) : null),
    [selectedId, processes]
  );

  const undocumented = (processes ?? []).filter((p) => p.documentationPct < 40).length;
  const highAutomation = (processes ?? []).filter((p) => p.automationOpportunity === "high").length;
  const totalProcesses = (processes ?? []).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  // Parse flat steps for selected process (legacy format)
  const allSteps = selected ? parseSteps(selected.steps) : [];
  const regularSteps = allSteps.filter((s) => classifyStep(s) === "step");
  const gaps = allSteps.filter((s) => classifyStep(s) === "gap");
  const lessons = allSteps.filter((s) => classifyStep(s) === "lesson");
  const policies = allSteps.filter((s) => classifyStep(s) === "policy");
  const examples = allSteps.filter((s) => classifyStep(s) === "example");
  const future = allSteps.filter((s) => classifyStep(s) === "future");

  // Detect if steps are structured JSON phases
  let structuredPhases: Array<{ phase: string; owner: string; steps: string[]; automation: string }> | null = null;
  try {
    const parsed = JSON.parse(selected?.steps ?? "[]");
    if (Array.isArray(parsed) && parsed[0]?.phase) structuredPhases = parsed;
  } catch { /* flat format */ }

  return (
    <div className="flex gap-0 h-full" style={{ minHeight: "calc(100vh - 80px)" }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r flex flex-col bg-background overflow-y-auto">
        <div className="p-4 border-b space-y-3">
          <div>
            <h1 className="text-lg font-bold">Process Library</h1>
            <p className="text-xs text-foreground">{totalProcesses} SOPs documented</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted rounded p-2">
              <div className="text-lg font-bold">{totalProcesses}</div>
              <div className="text-[10px] text-foreground">Total</div>
            </div>
            <div className="bg-destructive/10 rounded p-2">
              <div className="text-lg font-bold text-red-600">{undocumented}</div>
              <div className="text-[10px] text-red-500">Gaps</div>
            </div>
            <div className="bg-primary/10 rounded p-2">
              <div className="text-lg font-bold text-blue-600">{highAutomation}</div>
              <div className="text-[10px] text-blue-500">Automate</div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground" />
            <Input
              placeholder="Search processes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterCategory("all")}
              className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${filterCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {Object.entries(grouped).map(([cat, procs]) => (
            <div key={cat}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground px-2 mb-1">{cat}</div>
              <div className="space-y-1">
                {procs.map((proc) => (
                  <button
                    key={proc.id}
                    onClick={() => { setSelectedId(proc.id); setActiveTab("sop"); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedId === proc.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-transparent hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{proc.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    </div>
                    <div className="mt-1.5">
                      <DocBar pct={proc.documentationPct} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${selectedId === proc.id ? "bg-card/20 text-foreground border-border" : (STATUS_STYLES[proc.status] ?? "bg-muted text-foreground")}`}>
                        {proc.status.replace("_", " ")}
                      </span>
                      {proc.automationOpportunity === "high" && (
                        <span className={`text-[10px] ${selectedId === proc.id ? "text-blue-200" : "text-blue-600"}`}>
                          ⚡ automate
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-muted/30">
        {selected ? (
          <div className="max-w-3xl mx-auto p-6 space-y-4">

            {/* Title block */}
            <div className={`rounded-xl border p-5 ${CATEGORY_COLORS[selected.category] ?? "bg-card border-border"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                    {selected.category}
                  </div>
                  <h2 className="text-2xl font-bold leading-tight">{selected.name}</h2>
                  {selected.description && (
                    <p className="mt-2 text-sm text-foreground leading-relaxed">{selected.description}</p>
                  )}
                </div>
                <Badge className={`shrink-0 border ${STATUS_STYLES[selected.status] ?? ""}`}>
                  {selected.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card/70 rounded-lg p-3">
                  <div className="text-[10px] text-foreground uppercase font-semibold mb-1">Documentation</div>
                  <div className={`text-xl font-bold ${selected.documentationPct >= 80 ? "text-emerald-600" : selected.documentationPct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {selected.documentationPct}%
                  </div>
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${selected.documentationPct >= 80 ? "bg-emerald-500" : selected.documentationPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${selected.documentationPct}%` }}
                    />
                  </div>
                </div>
                <div className="bg-card/70 rounded-lg p-3">
                  <div className="text-[10px] text-foreground uppercase font-semibold mb-1">Automation</div>
                  <div className={`text-xl font-bold capitalize ${selected.automationOpportunity === "high" ? "text-blue-600" : selected.automationOpportunity === "medium" ? "text-purple-600" : "text-foreground"}`}>
                    {selected.automationOpportunity}
                  </div>
                  <div className="text-[10px] text-foreground mt-1">opportunity</div>
                </div>
                <div className="bg-card/70 rounded-lg p-3">
                  <div className="text-[10px] text-foreground uppercase font-semibold mb-1">Owner</div>
                  <div className="flex items-center gap-1 mt-1">
                    <User className="w-3.5 h-3.5 text-foreground" />
                    <span className="text-sm font-medium truncate">{selected.owner ?? "Unassigned"}</span>
                  </div>
                </div>
                <div className="bg-card/70 rounded-lg p-3">
                  <div className="text-[10px] text-foreground uppercase font-semibold mb-1">Backup</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3.5 h-3.5 text-foreground" />
                    <span className="text-sm font-medium truncate">{selected.backupOwner ?? "None"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TABS ── */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sop" | "gap")} className="w-full">
              <TabsList>
                <TabsTrigger value="sop" className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> SOP
                </TabsTrigger>
                <TabsTrigger value="gap" className="flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> Gap Analysis
                </TabsTrigger>
              </TabsList>

              {/* ── SOP TAB ── */}
              <TabsContent value="sop" className="space-y-4 mt-4">

                {/* Structured phases (new JSON format) */}
                {structuredPhases && (
                  <div className="space-y-3">
                    {structuredPhases.map((ph, pi) => (
                      <div key={pi} className="bg-card rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{pi + 1}</span>
                            <h4 className="font-semibold text-sm">{ph.phase}</h4>
                          </div>
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-foreground">{ph.owner}</span>
                        </div>
                        <div className="space-y-1 mb-3">
                          {ph.steps.map((step, si) => (
                            <div key={si} className="flex gap-2 text-sm">
                              <span className="shrink-0 text-primary mt-0.5">→</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                        {ph.automation && ph.automation !== "None — manual review" && ph.automation !== "None" && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-500/10 rounded px-2 py-1">
                            <Zap className="w-3 h-3" /> {ph.automation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Flat process steps (legacy format) */}
                {!structuredPhases && regularSteps.length > 0 && (
                  <div className="bg-card rounded-xl border p-5 space-y-1">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-semibold text-sm">Process Steps</h3>
                      <span className="text-xs text-foreground">({regularSteps.length} steps)</span>
                    </div>
                    <div className="space-y-0">
                      {regularSteps.map((step, i) => {
                        const parts = step.split("|").map((s) => s.trim());
                        const isTableFormat = parts.length >= 3 && /^\d+\.\d+$/.test(parts[0]);
                        if (isTableFormat) {
                          const [num, owner, action, ...rest] = parts;
                          return (
                            <div key={i} className={`flex gap-3 py-2.5 px-3 rounded-lg ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
                              <span className="shrink-0 w-8 text-xs font-mono font-semibold text-foreground pt-0.5">{num}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm">{action}</div>
                                {rest.length > 0 && <div className="text-xs text-foreground mt-0.5">{rest.join(" · ")}</div>}
                              </div>
                              {owner && <span className="shrink-0 text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground self-start mt-0.5">{owner}</span>}
                            </div>
                          );
                        }
                        const numMatch = step.match(/^(\d+)\.\s+(.+)/);
                        if (numMatch) {
                          return (
                            <div key={i} className={`flex gap-3 py-2.5 px-3 rounded-lg ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
                              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{numMatch[1]}</span>
                              <span className="text-sm leading-relaxed">{numMatch[2]}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={i} className={`py-2.5 px-3 rounded-lg text-sm ${i % 2 === 0 ? "bg-muted/40" : ""}`}>{step}</div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Policies */}
                {policies.length > 0 && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-semibold text-sm text-indigo-500">Policies</h3>
                    </div>
                    <div className="space-y-2">
                      {policies.map((p, i) => (
                        <div key={i} className="flex gap-2 text-sm text-indigo-900">
                          <span className="shrink-0 text-indigo-400 mt-0.5">▸</span>
                          <span>{p.replace(/^POLICY:\s*/i, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {examples.length > 0 && (
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <h3 className="font-semibold text-sm text-sky-500">Real Examples</h3>
                    </div>
                    <div className="space-y-2">
                      {examples.map((e, i) => (
                        <div key={i} className="flex gap-2 text-sm text-sky-900">
                          <span className="shrink-0 text-sky-400 mt-0.5">▸</span>
                          <span>{e.replace(/^EXAMPLE[^:]*:\s*/i, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future / Automation */}
                {future.length > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-sm text-purple-500">Future / Automation</h3>
                    </div>
                    <div className="space-y-2">
                      {future.map((f, i) => (
                        <div key={i} className="flex gap-2 text-sm text-purple-900">
                          <span className="shrink-0 text-purple-400 mt-0.5">▸</span>
                          <span>{f.replace(/^FUTURE:\s*/i, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lessons Learned */}
                {lessons.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <h3 className="font-semibold text-sm text-amber-600">Lessons Learned</h3>
                    </div>
                    <div className="space-y-2">
                      {lessons.map((l, i) => (
                        <div key={i} className="flex gap-2 text-sm text-amber-900">
                          <span className="shrink-0 text-amber-500 mt-0.5">⚠</span>
                          <span>{l.replace(/^LESSON LEARNED[^:]*:\s*/i, "").replace(/^LESSON:\s*/i, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Known Gaps (from flat steps) */}
                {gaps.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <h3 className="font-semibold text-sm text-destructive">Known Gaps</h3>
                      <span className="text-xs text-red-500">({gaps.length} gaps identified)</span>
                    </div>
                    <div className="space-y-2">
                      {gaps.map((g, i) => (
                        <div key={i} className="flex gap-2 text-sm text-destructive">
                          <span className="shrink-0 text-red-400 mt-0.5">✕</span>
                          <span>{g.replace(/^GAP:\s*/i, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </TabsContent>

              {/* ── GAP ANALYSIS TAB ── */}
              <TabsContent value="gap" className="space-y-4 mt-4">
                {gapLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-foreground">Running AI gap analysis against your operational data…</p>
                    <p className="text-xs text-foreground opacity-60">Comparing process steps against sessions, blockers, and client data</p>
                  </div>
                ) : gapData?.analysis ? (
                  <div className="space-y-4">

                    {/* Score banner */}
                    <div className="bg-card rounded-xl border p-5 flex items-center gap-6">
                      <div className="shrink-0 text-center">
                        <div className={`text-5xl font-black tabular-nums ${
                          (gapData.analysis as GapAnalysis).overallScore >= 70 ? "text-emerald-500" :
                          (gapData.analysis as GapAnalysis).overallScore >= 40 ? "text-amber-500" : "text-red-500"
                        }`}>{(gapData.analysis as GapAnalysis).overallScore}</div>
                        <div className="text-[10px] text-foreground uppercase font-semibold mt-0.5">/ 100</div>
                        <div className="text-[10px] text-foreground mt-0.5">Process Score</div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{(gapData.analysis as GapAnalysis).summary}</p>
                      </div>
                    </div>

                    {/* Phase-by-phase */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" /> Phase-by-Phase Analysis
                      </h3>
                      {((gapData.analysis as GapAnalysis).phaseAnalysis ?? []).map((ph, i) => {
                        const statusConfig = {
                          on_track: { icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, bg: "bg-emerald-500/10 border-emerald-500/30", label: "On Track" },
                          partial:  { icon: <Minus className="w-4 h-4 text-amber-500" />,       bg: "bg-amber-500/10 border-amber-500/30",   label: "Partial"  },
                          gap:      { icon: <TrendingDown className="w-4 h-4 text-red-500" />,   bg: "bg-red-500/10 border-red-500/30",       label: "Gap"      },
                          unknown:  { icon: <AlertCircle className="w-4 h-4 text-foreground" />, bg: "bg-muted border-border",                label: "Unknown"  },
                        };
                        const cfg = statusConfig[ph.status as keyof typeof statusConfig] ?? statusConfig.unknown;
                        return (
                          <div key={i} className={`rounded-xl border p-4 ${cfg.bg}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {cfg.icon}
                                <span className="font-semibold text-sm">{ph.phase}</span>
                              </div>
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-background/60">{cfg.label}</span>
                            </div>
                            <p className="text-sm mb-1">{ph.finding}</p>
                            {ph.evidence && <p className="text-xs text-foreground italic mb-2">"{ph.evidence}"</p>}
                            {ph.recommendation && (
                              <div className="flex items-start gap-1.5 text-xs bg-background/50 rounded px-2 py-1.5">
                                <Lightbulb className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                                <span>{ph.recommendation}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Critical gaps */}
                    {((gapData.analysis as GapAnalysis).criticalGaps ?? []).length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4" /> Critical Gaps
                        </h3>
                        <div className="space-y-1.5">
                          {(gapData.analysis as GapAnalysis).criticalGaps.map((g, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="shrink-0 text-red-400 mt-0.5">✕</span>
                              <span>{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Positives */}
                    {((gapData.analysis as GapAnalysis).positives ?? []).length > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-emerald-600 flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-4 h-4" /> What's Working
                        </h3>
                        <div className="space-y-1.5">
                          {(gapData.analysis as GapAnalysis).positives.map((p, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="shrink-0 text-emerald-500 mt-0.5">✓</span>
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <BarChart2 className="w-12 h-12 opacity-20" />
                    <p className="font-medium">AI Gap Analysis</p>
                    <p className="text-sm text-foreground max-w-xs">
                      Click the <strong>Gap Analysis</strong> tab to run an AI comparison of this process against your real session, client, and blocker data.
                    </p>
                  </div>
                )}
              </TabsContent>

            </Tabs>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center text-foreground">
            <Workflow className="w-14 h-14 mb-4 opacity-20" />
            <p className="font-medium">Select a process to view its SOP</p>
            <p className="text-sm mt-1 opacity-70">Steps, gaps, lessons learned, and automation opportunities</p>
          </div>
        )}
      </div>
    </div>
  );
}
