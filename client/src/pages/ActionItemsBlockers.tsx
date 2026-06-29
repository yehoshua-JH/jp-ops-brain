import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, X } from "lucide-react";
import { Tabs as TabsUI, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ActionItemsBlockers() {
  const [view, setView] = useState<"actions" | "blockers">("actions");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [blockerSearchText, setBlockerSearchText] = useState<string>("");
  const [blockerStatusFilter, setBlockerStatusFilter] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");

  const listActionItems = trpc.actionItems.getAll.useQuery();
  const listBlockers = trpc.blockers.getAll.useQuery();

  if (listActionItems.isLoading || listBlockers.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get unique owners and domains for filter dropdowns
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    listActionItems.data?.forEach((item) => {
      if (item.owner) owners.add(item.owner);
    });
    return Array.from(owners).sort();
  }, [listActionItems.data]);

  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>();
    listActionItems.data?.forEach((item) => {
      if (item.domainTag) domains.add(item.domainTag);
    });
    return Array.from(domains).sort();
  }, [listActionItems.data]);

  // Filter action items based on active filters
  const filteredActionItems = useMemo(() => {
    return (listActionItems.data || []).filter((item) => {
      const matchesOwner = ownerFilter === "all" || item.owner === ownerFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesSearch = searchText === "" || item.task.toLowerCase().includes(searchText.toLowerCase());
      
      // Date range filtering
      let matchesDateRange = true;
      if (item.deadline) {
        const itemDate = new Date(item.deadline);
        if (dateRangeStart) {
          const startDate = new Date(dateRangeStart);
          if (itemDate < startDate) matchesDateRange = false;
        }
        if (dateRangeEnd) {
          const endDate = new Date(dateRangeEnd);
          if (itemDate > endDate) matchesDateRange = false;
        }
      } else if (dateRangeStart || dateRangeEnd) {
        // Items without deadline don't match date range filters
        matchesDateRange = false;
      }
      
      return matchesOwner && matchesStatus && matchesPriority && matchesSearch && matchesDateRange;
    });
  }, [listActionItems.data, ownerFilter, statusFilter, priorityFilter, searchText, dateRangeStart, dateRangeEnd]);

  const openActionItems = filteredActionItems.filter((item) => item.status === "open");
  const completedActionItems = filteredActionItems.filter((item) => item.status === "complete");
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

  // Filter blockers
  const filteredBlockers = useMemo(() => {
    return (listBlockers.data || []).filter((blocker) => {
      const matchesSearch = blockerSearchText === "" || blocker.description.toLowerCase().includes(blockerSearchText.toLowerCase());
      const matchesStatus = blockerStatusFilter === "all" || blocker.status === blockerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [listBlockers.data, blockerSearchText, blockerStatusFilter]);

  const handleToggleStatus = (itemId: number, newStatus: string) => {
    console.log(`Toggle item ${itemId} to ${newStatus}`);
    listActionItems.refetch();
  };

  const hasActiveFilters = searchText || ownerFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all" || dateRangeStart || dateRangeEnd;
  const hasActiveBlockerFilters = blockerSearchText || blockerStatusFilter !== "all";

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
            Action Items ({filteredActionItems.length})
          </TabsTrigger>
          <TabsTrigger value="blockers">
            Blockers ({filteredBlockers.length})
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

          {/* Filters */}
          <Card className="p-4 bg-slate-50">
            <div className="space-y-3">
              <div className="text-sm font-semibold">Filters</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="Search tasks..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="text-sm"
                />
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {uniqueOwners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="MED">MEDIUM</SelectItem>
                    <SelectItem value="LOW">LOW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchText("");
                    setOwnerFilter("all");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setDateRangeStart("");
                    setDateRangeEnd("");
                  }}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              )}
              
              {/* Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
                <div className="text-sm font-semibold col-span-full">Date Range (for deadlines)</div>
                <Input
                  type="date"
                  placeholder="Start date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Open Action Items */}
          {(statusFilter === "all" || statusFilter === "open") && (
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
          )}

          {/* Completed Items */}
          {(statusFilter === "all" || statusFilter === "complete") && completedActionItems.length > 0 && (
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

          {/* Blocker Filters */}
          <Card className="p-4 bg-slate-50">
            <div className="space-y-3">
              <div className="text-sm font-semibold">Filters</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Search blockers..."
                  value={blockerSearchText}
                  onChange={(e) => setBlockerSearchText(e.target.value)}
                  className="text-sm"
                />
                <Select value={blockerStatusFilter} onValueChange={setBlockerStatusFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveBlockerFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBlockerSearchText("");
                    setBlockerStatusFilter("all");
                  }}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-6">
            {filteredBlockers.length > 0 ? (
              <div className="space-y-3">
                {filteredBlockers.map((blocker, idx) => {
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
              <div className="text-center py-8 text-muted-foreground">No blockers match the current filters</div>
            )}
          </Card>
        </TabsContent>
      </TabsUI>
    </div>
  );
}
