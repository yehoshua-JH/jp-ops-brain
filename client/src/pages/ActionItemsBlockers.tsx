import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Tabs as TabsUI, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ActionItemsBlockers() {
  const [view, setView] = useState<"actions" | "blockers">("actions");
  const listActionItems = trpc.actionItems.list.useQuery();
  const listBlockers = trpc.blockers.list.useQuery();
  // TODO: Implement update mutation for action items

  if (listActionItems.isLoading || listBlockers.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openActionItems = listActionItems.data?.filter((item) => item.status === "open") || [];
  const completedActionItems = listActionItems.data?.filter((item) => item.status === "complete") || [];
  const highPriorityItems = openActionItems.filter((item) => item.priority === "HIGH");
  const overdueItems = openActionItems.filter((item) => item.deadline && new Date(item.deadline) < new Date());

  // Count blocker appearances
  const blockerCounts = new Map<string, number>();
  listBlockers.data?.forEach((blocker) => {
    const count = (blockerCounts.get(blocker.description) || 0) + 1;
    blockerCounts.set(blocker.description, count);
  });

  const chronicBlockers = Array.from(blockerCounts.entries())
    .filter(([_, count]) => count >= 3)
    .map(([description]) => description);

  const handleToggleStatus = (itemId: number, newStatus: string) => {
    // TODO: Implement action item status update via tRPC
    console.log(`Toggle item ${itemId} to ${newStatus}`);
    listActionItems.refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Action Items & Blockers</h1>
        <p className="text-muted-foreground mt-2">
          Unified task board for tracking action items and blockers across all sessions.
        </p>
      </div>

      <TabsUI value={view} onValueChange={(v) => setView(v as "actions" | "blockers")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions">
            Action Items ({openActionItems.length})
          </TabsTrigger>
          <TabsTrigger value="blockers">
            Blockers ({listBlockers.data?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Action Items View */}
        <TabsContent value="actions" className="space-y-4">
          {/* Alerts */}
          {(highPriorityItems.length > 0 || overdueItems.length > 0) && (
            <div className="space-y-2">
              {highPriorityItems.length > 0 && (
                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="text-sm font-semibold text-red-900">
                    🔴 {highPriorityItems.length} HIGH priority item{highPriorityItems.length !== 1 ? "s" : ""}
                  </div>
                </Card>
              )}
              {overdueItems.length > 0 && (
                <Card className="p-4 border-orange-200 bg-orange-50">
                  <div className="text-sm font-semibold text-orange-900">
                    ⏰ {overdueItems.length} overdue item{overdueItems.length !== 1 ? "s" : ""}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Open Action Items */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Open Items ({openActionItems.length})</h3>
            {openActionItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No open action items</div>
            ) : (
              <div className="space-y-3">
                {openActionItems
                  .sort((a, b) => {
                    if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
                    if (a.priority !== "HIGH" && b.priority === "HIGH") return 1;
                    return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
                  })
                  .map((item) => {
                    const isOverdue = item.deadline && new Date(item.deadline) < new Date();
                    return (
                      <div key={item.id} className={`p-4 border rounded-lg ${isOverdue ? "bg-red-50 border-red-200" : ""}`}>
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => handleToggleStatus(item.id, "complete")}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{item.task}</span>
                              {item.priority === "HIGH" && <Badge className="bg-red-600">HIGH</Badge>}
                              {isOverdue && <Badge className="bg-orange-600">OVERDUE</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <strong>Owner:</strong> {item.owner}
                              </p>
                              {item.deadline && (
                                <p>
                                  <strong>Due:</strong> {new Date(item.deadline).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>

          {/* Completed Items */}
          {completedActionItems.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Completed ({completedActionItems.length})</h3>
              <div className="space-y-2">
                {completedActionItems.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg opacity-60">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={true} disabled />
                      <span className="line-through text-muted-foreground">{item.task}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Blockers View */}
        <TabsContent value="blockers" className="space-y-4">
          {chronicBlockers.length > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="text-sm font-semibold text-red-900">
                🚨 {chronicBlockers.length} chronic blocker{chronicBlockers.length !== 1 ? "s" : ""} (appeared 3+ times)
              </div>
            </Card>
          )}

          <Card className="p-6">
            {listBlockers.data && listBlockers.data.length > 0 ? (
              <div className="space-y-3">
                {listBlockers.data.map((blocker, idx) => {
                  const count = blockerCounts.get(blocker.description) || 0;
                  const isChronicBlocker = count >= 3;
                  return (
                    <div
                      key={idx}
                      className={`p-4 border rounded-lg ${isChronicBlocker ? "bg-red-50 border-red-200" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{blocker.description}</span>
                            {isChronicBlocker && <Badge className="bg-red-600">CHRONIC</Badge>}
                            <Badge variant="outline">{count}x</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            First appeared: Session #{blocker.firstAppearedSession}
                          </div>
                          {blocker.resolutionNote && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                              <strong>Resolution:</strong> {blocker.resolutionNote}
                            </div>
                          )}
                        </div>
                        {blocker.status === "open" && (
                          <Button size="sm" variant="outline">
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No blockers tracked yet</div>
            )}
          </Card>
        </TabsContent>
      </TabsUI>
    </div>
  );
}
