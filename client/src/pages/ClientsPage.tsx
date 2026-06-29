import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertTriangle, TrendingUp, Users, DollarSign, Building2, Zap } from "lucide-react";
import RiskUpdateSheet from "@/components/RiskUpdateSheet";

function getHealthColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getHealthBg(score: number) {
  if (score >= 70) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 40) return "bg-yellow-50 border-yellow-200";
  return "bg-destructive/10 border-destructive/30";
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-emerald-600",
    at_risk: "bg-red-100 text-destructive",
    churned: "bg-muted text-foreground",
    prospect: "bg-blue-100 text-primary",
  };
  return <Badge className={map[status] ?? "bg-muted text-foreground"}>{status.replace("_", " ")}</Badge>;
}

function tryParse(str: string | null | undefined): string[] {
  try { return JSON.parse(str ?? "[]") ?? []; } catch { return []; }
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [riskSheet, setRiskSheet] = useState<{ id: number; name: string; status: string; healthScore: number } | null>(null);

  const { data: clients, isLoading } = trpc.clients.getAll.useQuery();

  const filtered = (clients ?? []).filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = selected ? clients?.find((c) => c.id === selected) : null;

  const atRiskCount = (clients ?? []).filter((c) => c.status === "at_risk").length;
  const activeCount = (clients ?? []).filter((c) => c.status === "active").length;
  const avgHealth = clients && clients.length > 0
    ? Math.round(clients.reduce((sum, c) => sum + c.healthScore, 0) / clients.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Intelligence</h1>
        <p className="text-foreground mt-2">
          Monitor client health, risk flags, and team assignments across all engagements.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-sm text-foreground">Active clients</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-destructive/30 bg-destructive/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-destructive">{atRiskCount}</div>
              <div className="text-sm text-red-600">At-risk clients</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <div className={`text-2xl font-bold ${getHealthColor(avgHealth)}`}>{avgHealth}%</div>
              <div className="text-sm text-foreground">Avg health score</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="p-6 text-center text-foreground">
              No clients found.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((client) => (
                <Card
                  key={client.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${selected === client.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelected(client.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{client.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(client.status)}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className={`text-xl font-bold ${getHealthColor(client.healthScore)}`}>
                        {client.healthScore}
                      </div>
                      <div className="text-xs text-foreground">health</div>
                    </div>
                  </div>
                  {tryParse(client.riskFlags).length > 0 && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {tryParse(client.riskFlags).length} risk flag(s)
                    </div>
                  )}
                  {(client.status === "at_risk" || client.healthScore < 60) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full h-7 text-xs gap-1.5 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 bg-transparent"
                      onClick={(e) => { e.stopPropagation(); setRiskSheet({ id: client.id, name: client.name, status: client.status, healthScore: client.healthScore }); }}
                    >
                      <Zap className="w-3 h-3" />
                      Update Risk
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Client Detail */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <Card className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                  {selectedClient.startDate && (
                    <p className="text-sm text-foreground">
                      Client since {new Date(selectedClient.startDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {getStatusBadge(selectedClient.status)}
              </div>

              {/* Health & Revenue */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 border ${getHealthBg(selectedClient.healthScore)}`}>
                  <div className="text-sm text-foreground mb-1">Health Score</div>
                  <div className={`text-3xl font-bold ${getHealthColor(selectedClient.healthScore)}`}>
                    {selectedClient.healthScore}/100
                  </div>
                  <div className="text-xs text-foreground mt-1">
                    {selectedClient.healthScore >= 70 ? "Healthy relationship" :
                     selectedClient.healthScore >= 40 ? "Needs attention" :
                     "Critical — immediate action required"}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-foreground mb-1">Monthly Revenue</div>
                  <div className="text-3xl font-bold">
                    {selectedClient.monthlyRevenue
                      ? `$${Number(selectedClient.monthlyRevenue).toLocaleString()}`
                      : "—"}
                  </div>
                  <div className="text-xs text-foreground mt-1">
                    Team size: {selectedClient.teamSize} FTE
                  </div>
                </div>
              </div>

              {/* Risk Flags */}
              {tryParse(selectedClient.riskFlags).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" /> Risk Flags
                  </h3>
                  <div className="space-y-2">
                    {tryParse(selectedClient.riskFlags).map((flag: string, i: number) => (
                      <div key={i} className="bg-destructive/10 border border-destructive/30 rounded p-3 text-sm text-destructive">
                        {flag}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Team */}
              {tryParse(selectedClient.assignedTeam).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Assigned Team
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tryParse(selectedClient.assignedTeam).map((member: string, i: number) => (
                      <Badge key={i} variant="outline">{member}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedClient.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                    {selectedClient.notes}
                  </div>
                </div>
              )}
              <Button
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setRiskSheet({ id: selectedClient.id, name: selectedClient.name, status: selectedClient.status, healthScore: selectedClient.healthScore })}
              >
                <Zap className="w-4 h-4" />
                Update Risk Status
              </Button>
            </Card>
          ) : (
            <Card className="p-12 text-center text-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Select a client to view their intelligence profile</p>
            </Card>
          )}
        </div>
      </div>
      {riskSheet && (
        <RiskUpdateSheet
          open={!!riskSheet}
          onClose={() => setRiskSheet(null)}
          riskType="client"
          id={riskSheet.id}
          title={riskSheet.name}
          subtitle={`Health: ${riskSheet.healthScore}%`}
          currentStatus={riskSheet.status}
        />
      )}
    </div>
  );
}
