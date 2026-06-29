import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Workflow, AlertTriangle, CheckCircle, Zap, FileText } from "lucide-react";

function getDocBadge(pct: number) {
  if (pct >= 80) return <Badge className="bg-green-100 text-green-800">{pct}% documented</Badge>;
  if (pct >= 40) return <Badge className="bg-yellow-100 text-yellow-800">{pct}% documented</Badge>;
  return <Badge className="bg-red-100 text-red-800">{pct}% documented</Badge>;
}

function getAutomationBadge(score: number) {
  if (score >= 70) return <Badge className="bg-blue-100 text-blue-800">High automation potential</Badge>;
  if (score >= 40) return <Badge className="bg-purple-100 text-purple-800">Medium potential</Badge>;
  return <Badge className="bg-gray-100 text-gray-800">Low potential</Badge>;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
    needs_update: "bg-red-100 text-red-800",
    archived: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status.replace("_", " ")}</Badge>;
}

export default function ProcessLibrary() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [filterDomain, setFilterDomain] = useState<string>("all");

  const { data: processes, isLoading } = trpc.processes.getAll.useQuery();
  const { data: domains } = trpc.domains.getAll.useQuery();

  const filtered = (processes ?? []).filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDomain = filterDomain === "all" || (p.domainTag ?? "") === filterDomain;
    return matchSearch && matchDomain;
  });

  const selectedProcess = selected ? processes?.find((p) => p.id === selected) : null;

  const undocumented = (processes ?? []).filter((p) => p.documentationPct < 40).length;
  const noOwner = (processes ?? []).filter((p) => !p.owner).length;
  const highAutomation = (processes ?? []).filter((p) => p.automationOpportunity === "high").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Process Library</h1>
        <p className="text-muted-foreground mt-2">
          All SOPs and workflows — track documentation, ownership, and automation readiness.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-700">{undocumented}</div>
              <div className="text-sm text-red-600">Poorly documented (&lt;40%)</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-orange-700">{noOwner}</div>
              <div className="text-sm text-orange-600">No owner assigned</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-700">{highAutomation}</div>
              <div className="text-sm text-blue-600">Ready to automate</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search processes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Domain Filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterDomain("all")}
              className={`text-xs px-2 py-1 rounded border transition-colors ${filterDomain === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              All
            </button>
            {(domains ?? []).map((d) => (
              <button
                key={d.tag}
                onClick={() => setFilterDomain(d.tag)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${filterDomain === d.tag ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {d.tag}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No processes found.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((proc) => (
                <Card
                  key={proc.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${selected === proc.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelected(proc.id)}
                >
                  <div className="font-semibold text-sm truncate">{proc.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getStatusBadge(proc.status)}
                    {proc.domainTag && (
                      <Badge variant="outline" className="text-xs">{proc.domainTag}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {proc.owner ? `Owner: ${proc.owner}` : "No owner"}
                    </span>
                    <span className={`text-xs font-medium ${proc.documentationPct >= 80 ? "text-green-600" : proc.documentationPct >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {proc.documentationPct}% docs
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Process Detail */}
        <div className="lg:col-span-2">
          {selectedProcess ? (
            <Card className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProcess.name}</h2>
                  {selectedProcess.domainTag && (
                    <Badge variant="outline" className="mt-1">{selectedProcess.domainTag}</Badge>
                  )}
                </div>
                {getStatusBadge(selectedProcess.status)}
              </div>

              {/* Documentation & Automation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Documentation</div>
                  <div className={`text-3xl font-bold ${(selectedProcess.documentationPct ?? 0) >= 80 ? "text-green-600" : (selectedProcess.documentationPct ?? 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                    {selectedProcess.documentationPct ?? 0}%
                  </div>
                  <div className="mt-2 bg-background rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${(selectedProcess.documentationPct ?? 0) >= 80 ? "bg-green-500" : (selectedProcess.documentationPct ?? 0) >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${selectedProcess.documentationPct ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Automation Readiness</div>
                  <div className={`text-3xl font-bold ${selectedProcess.automationOpportunity === "high" ? "text-blue-600" : "text-gray-600"}`}>
                    {selectedProcess.automationOpportunity}
                  </div>
                  <div className="mt-2">
                    <Badge className={selectedProcess.automationOpportunity === "high" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                      {selectedProcess.automationOpportunity} potential
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Ownership */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Owner</h3>
                  {selectedProcess.owner ? (
                    <Badge variant="outline">{selectedProcess.owner}</Badge>
                  ) : (
                    <span className="text-sm text-red-600">⚠️ No owner assigned</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Backup</h3>
                  {selectedProcess.backupOwner ? (
                    <Badge variant="outline">{selectedProcess.backupOwner}</Badge>
                  ) : (
                    <span className="text-sm text-orange-600">No backup assigned</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedProcess.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                    {selectedProcess.description}
                  </div>
                </div>
              )}

              {/* Steps */}
              {selectedProcess.steps && (
                <div>
                  <h3 className="font-semibold mb-2">Process Steps</h3>
                  <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                    {selectedProcess.steps}
                  </div>
                </div>
              )}


            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <Workflow className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Select a process to view its details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
