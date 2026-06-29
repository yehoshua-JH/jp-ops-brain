import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import RiskUpdateSheet, { type RiskType } from "@/components/RiskUpdateSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Zap,
  ArrowRight,
  Mic,
  Activity,
} from "lucide-react";

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full bg-card/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = "text-foreground",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-foreground">{sub}</span>}
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [riskSheet, setRiskSheet] = useState<{ id: number; title: string; status: string; riskType: RiskType; subtitle?: string } | null>(null);
  const utils = trpc.useUtils();
  const { data: domains, isLoading: domainsLoading } = trpc.domains.getAll.useQuery();
  const { data: sessions, isLoading: sessionsLoading } = trpc.sessions.getAll.useQuery();
  const { data: openBlockers } = trpc.blockers.getOpen.useQuery();
  const { data: openActions } = trpc.actionItems.getOpen.useQuery();
  const { data: employees } = trpc.employees.getAll.useQuery();
  const { data: clients } = trpc.clients.getAll.useQuery();

  const recentSessions = (sessions ?? []).slice(-5).reverse();
  const criticalBlockers = (openBlockers ?? []).filter((b) => b.timesAppeared >= 3);
  const overdueActions = (openActions ?? []).filter(
    (a) => a.deadline && new Date(a.deadline) < new Date()
  );
  const atRiskClients = (clients ?? []).filter((c) => c.status === "at_risk");
  const criticalEmployees = (employees ?? []).filter((e) => e.criticalityScore >= 8);

  const avgDomainHealth =
    domains && domains.length > 0
      ? Math.round(domains.reduce((sum, d) => sum + (d.currentMaturityScore ?? 0), 0) / domains.length)
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-foreground">Command Center</h1>
          </div>
          <p className="text-sm text-foreground">
            JivePilot Ops Brain · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button
          onClick={() => navigate("/voice")}
          className="bg-indigo-600 hover:bg-indigo-700 !text-white gap-2"
        >
          <Mic className="w-4 h-4" />
          Ask the Brain
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Domain Health"
          value={`${avgDomainHealth}%`}
          sub={`${domains?.length ?? 0} domains tracked`}
          color={avgDomainHealth >= 70 ? "text-emerald-400" : avgDomainHealth >= 40 ? "text-yellow-400" : "text-red-400"}
          icon={Activity}
        />
        <StatCard
          label="Open Blockers"
          value={openBlockers?.length ?? 0}
          sub={`${criticalBlockers.length} chronic (3+ sessions)`}
          color={criticalBlockers.length > 0 ? "text-red-400" : "text-foreground"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Action Items"
          value={openActions?.length ?? 0}
          sub={`${overdueActions.length} overdue`}
          color={overdueActions.length > 0 ? "text-yellow-400" : "text-foreground"}
          icon={CheckCircle2}
        />
        <StatCard
          label="Sessions"
          value={sessions?.length ?? 0}
          sub={`Last: ${recentSessions[0] ? new Date(recentSessions[0].date).toLocaleDateString() : "—"}`}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain Health */}
        <div className="lg:col-span-2 bg-muted/30 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Domain Health</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-foreground hover:text-foreground gap-1 h-7"
              onClick={() => navigate("/domains")}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          {domainsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 bg-muted/30" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {(domains ?? []).map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-36 truncate">{d.name}</span>
                  <div className="flex-1">
                    <HealthBar score={d.currentMaturityScore ?? 0} />
                  </div>
                  <span
                    className={`text-xs font-mono w-8 text-right ${
                      (d.currentMaturityScore ?? 0) >= 70
                        ? "text-emerald-400"
                        : (d.currentMaturityScore ?? 0) >= 40
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {d.currentMaturityScore ?? 0}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs border-0 w-20 justify-center ${
                      d.trend === "improving"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : d.trend === "declining"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-muted/30 text-foreground"
                    }`}
                  >
                    {d.trend === "improving" ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : d.trend === "declining" ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                    {d.trend ?? "stable"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Critical Blockers */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Critical Blockers
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-foreground hover:text-foreground gap-1 h-7"
                onClick={() => navigate("/issues")}
              >
                All <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {criticalBlockers.length === 0 ? (
              <p className="text-xs text-foreground text-center py-3">No chronic blockers</p>
            ) : (
              <div className="space-y-2">
                {criticalBlockers.slice(0, 4).map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground leading-snug truncate">{b.description}</p>
                        <p className="text-xs text-foreground">{b.domainTag} · {b.timesAppeared}x</p>
                      </div>
                    </div>
                    <button
                      className="flex-shrink-0 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                      onClick={() => setRiskSheet({ id: b.id, title: b.description, status: b.status, riskType: "blocker", subtitle: `${b.domainTag ?? ""} · appeared ${b.timesAppeared}x` })}
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* At-Risk Clients */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-yellow-400" />
                At-Risk Clients
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-foreground hover:text-foreground gap-1 h-7"
                onClick={() => navigate("/clients")}
              >
                All <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {atRiskClients.length === 0 ? (
              <p className="text-xs text-foreground text-center py-3">No at-risk clients</p>
            ) : (
              <div className="space-y-2">
                {atRiskClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate">{c.name}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant="outline" className="text-xs border-0 bg-yellow-500/10 text-yellow-400">
                        {c.healthScore}% health
                      </Badge>
                      <button
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                        onClick={() => setRiskSheet({ id: c.id, title: c.name, status: c.status ?? "at_risk", riskType: "client", subtitle: `Health: ${c.healthScore}%` })}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Critical Employees */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                Key People Risk
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-foreground hover:text-foreground gap-1 h-7"
                onClick={() => navigate("/employees")}
              >
                All <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {criticalEmployees.length === 0 ? (
              <p className="text-xs text-foreground text-center py-3">No critical risks</p>
            ) : (
              <div className="space-y-2">
                {criticalEmployees.slice(0, 4).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{e.name}</p>
                      <p className="text-xs text-foreground">{e.role}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 ${
                            e.criticalityScore >= 9
                              ? "bg-red-500/10 text-red-400"
                              : "bg-orange-500/10 text-orange-400"
                          }`}
                        >
                          {e.criticalityScore}/10
                        </Badge>
                        {!e.backupPerson && (
                          <p className="text-xs text-red-400 mt-0.5">No backup</p>
                        )}
                      </div>
                      <button
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                        onClick={() => setRiskSheet({ id: e.id, title: e.name, status: e.status ?? "active", riskType: "employee", subtitle: `${e.role} · Criticality ${e.criticalityScore}/10` })}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="mt-6 bg-muted/30 border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Sessions</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-foreground hover:text-foreground gap-1 h-7"
            onClick={() => navigate("/sessions")}
          >
            All sessions <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        {sessionsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 bg-muted/30" />)}
          </div>
        ) : recentSessions.length === 0 ? (
          <p className="text-xs text-foreground text-center py-4">No sessions yet</p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/sessions/${s.sessionNumber}`)}
              >
                <span className="text-xs text-indigo-400 font-mono w-12">#{s.sessionNumber}</span>
                <span className="text-xs text-foreground w-24">
                  {new Date(s.date).toLocaleDateString()}
                </span>
                <span className="text-xs text-foreground flex-1 truncate">{s.executiveSummary}</span>
                <Badge variant="outline" className="text-xs border-0 bg-muted/30 text-foreground">
                  {s.meetingType}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {riskSheet && (
        <RiskUpdateSheet
          open={!!riskSheet}
          onClose={() => setRiskSheet(null)}
          riskType={riskSheet.riskType}
          id={riskSheet.id}
          title={riskSheet.title}
          subtitle={riskSheet.subtitle}
          currentStatus={riskSheet.status}
          onUpdated={() => {
            if (riskSheet.riskType === "blocker") utils.blockers.getOpen.invalidate();
            else if (riskSheet.riskType === "client") utils.clients.getAll.invalidate();
            else utils.employees.getAll.invalidate();
          }}
        />
      )}

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Voice Assistant", icon: Mic, path: "/voice", color: "text-indigo-400" },
          { label: "Session Library", icon: Clock, path: "/sessions", color: "text-blue-400" },
          { label: "Issues Board", icon: AlertTriangle, path: "/issues", color: "text-red-400" },
          { label: "Process Library", icon: Zap, path: "/processes", color: "text-yellow-400" },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 bg-muted/30 hover:bg-card/8 border border-border rounded-xl px-4 py-3 transition-colors text-left"
          >
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-sm text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
