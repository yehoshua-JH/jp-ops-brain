import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertTriangle, Shield, User, TrendingUp, UserCheck } from "lucide-react";
import { toast } from "sonner";

function getCriticalityColor(score: number) {
  if (score >= 8) return "bg-red-100 text-destructive border-destructive/30";
  if (score >= 6) return "bg-orange-100 text-orange-600 border-orange-500/30";
  if (score >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-green-100 text-emerald-600 border-emerald-500/30";
}

function getReadinessColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getStatusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-100 text-emerald-600">Active</Badge>;
  if (status === "at_risk") return <Badge className="bg-red-100 text-destructive">At Risk</Badge>;
  return <Badge className="bg-muted text-foreground">Inactive</Badge>;
}

export default function EmployeeIntelligence() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const { data: employees, isLoading } = trpc.employees.getAll.useQuery();
  const upsertEmployee = trpc.employees.upsert.useMutation({
    onSuccess: () => toast.success("Employee updated"),
  });

  const filtered = (employees ?? []).filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEmployee = selected ? employees?.find((e) => e.id === selected) : null;

  function tryParse(str: string | null | undefined): string[] {
    try { return JSON.parse(str ?? "[]") ?? []; } catch { return []; }
  }

  const criticalCount = (employees ?? []).filter((e) => e.criticalityScore >= 8).length;
  const noBackupCount = (employees ?? []).filter((e) => !e.backupPerson).length;
  const lowReadinessCount = (employees ?? []).filter((e) => e.replacementReadiness < 40).length;

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
        <h1 className="text-3xl font-bold">Employee Intelligence</h1>
        <p className="text-muted-foreground mt-2">
          Track criticality, redundancy gaps, and replacement readiness for every team member.
        </p>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-destructive/30 bg-destructive/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
              <div className="text-sm text-red-600">Critical employees (score 8+)</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-orange-500/30 bg-orange-500/10">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{noBackupCount}</div>
              <div className="text-sm text-orange-600">No backup person assigned</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-700">{lowReadinessCount}</div>
              <div className="text-sm text-yellow-600">Low replacement readiness (&lt;40%)</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No employees found. Add employees to track their intelligence.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((emp) => (
                <Card
                  key={emp.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${selected === emp.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelected(emp.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{emp.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{emp.role}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(emp.status)}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getCriticalityColor(emp.criticalityScore)}`}>
                          Risk: {emp.criticalityScore}/10
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className={`text-lg font-bold ${getReadinessColor(emp.replacementReadiness)}`}>
                        {emp.replacementReadiness}%
                      </div>
                      <div className="text-xs text-muted-foreground">ready</div>
                    </div>
                  </div>
                  {!emp.backupPerson && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      No backup assigned
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Employee Detail */}
        <div className="lg:col-span-2">
          {selectedEmployee ? (
            <Card className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                  <p className="text-muted-foreground">{selectedEmployee.role}</p>
                  {selectedEmployee.department && (
                    <p className="text-sm text-muted-foreground">{selectedEmployee.department}</p>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(selectedEmployee.status)}
                </div>
              </div>

              {/* Criticality & Readiness */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Criticality Score</div>
                  <div className={`text-3xl font-bold ${selectedEmployee.criticalityScore >= 8 ? "text-red-600" : selectedEmployee.criticalityScore >= 6 ? "text-orange-600" : "text-green-600"}`}>
                    {selectedEmployee.criticalityScore}/10
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedEmployee.criticalityScore >= 8 ? "Critical — high risk if they leave" :
                     selectedEmployee.criticalityScore >= 6 ? "Important — moderate risk" :
                     "Manageable risk level"}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Replacement Readiness</div>
                  <div className={`text-3xl font-bold ${getReadinessColor(selectedEmployee.replacementReadiness)}`}>
                    {selectedEmployee.replacementReadiness}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedEmployee.replacementReadiness >= 70 ? "Well covered" :
                     selectedEmployee.replacementReadiness >= 40 ? "Partially covered" :
                     "Urgent: needs cross-training"}
                  </div>
                </div>
              </div>

              {/* Backup Person */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Backup Coverage
                </h3>
                {selectedEmployee.backupPerson ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-sm">
                    <span className="text-emerald-600 font-medium">Backup: </span>
                    <span className="text-emerald-600">{selectedEmployee.backupPerson}</span>
                  </div>
                ) : (
                  <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-sm text-destructive">
                    ⚠️ No backup person assigned. This is a single point of failure.
                  </div>
                )}
              </div>

              {/* Processes Owned */}
              {tryParse(selectedEmployee.processesOwned).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Processes Owned</h3>
                  <div className="flex flex-wrap gap-2">
                    {tryParse(selectedEmployee.processesOwned).map((p: string, i: number) => (
                      <Badge key={i} variant="outline">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {tryParse(selectedEmployee.skills).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {tryParse(selectedEmployee.skills).map((s: string, i: number) => (
                      <Badge key={i} className="bg-blue-100 text-primary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEmployee.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                    {selectedEmployee.notes}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Select an employee to view their intelligence profile</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
