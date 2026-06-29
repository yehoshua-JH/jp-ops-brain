import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { Tabs as TabsUI, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ActionItemsBlockers() {
  // ── All hooks MUST be declared before any early returns ──────────────────
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

  // All useMemo hooks declared here — BEFORE any conditional returns
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    (listActionItems.data || []).forEach((item) => {
      if (item.owner) owners.add(item.owner);
    });
    return Array.from(owners).sort();
  }, [listActionItems.data]);

  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>();
    (listActionItems.data || []).forEach((item) => {
      if (item.domainTag) domains.add(item.domainTag);
    });
    return Array.from(domains).sort();
  }, [listActionItems.data]);

  const filteredActionItems = useMemo(() => {
    return (listActionItems.data || []).filter((item) => {
      const matchesOwner = ownerFilter === "all" || item.owner === ownerFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesSearch = searchText === "" || item.task.toLowerCase().includes(searchText.toLowerCase());
      let matchesDateRange = true;
      if (item.deadline) {
        const itemDate = new Date(item.deadline);
        if (dateRangeStart && itemDate < new Date(dateRangeStart)) matchesDateRange = false;
        if (dateRangeEnd && itemDate > new Date(dateRangeEnd)) matchesDateRange = false;
      } else if (dateRangeStart || dateRangeEnd) {
        matchesDateRange = false;
      }
      return matchesOwner && matchesStatus && matchesPriority && matchesSearch && matchesDateRange;
    });
  }, [listActionItems.data, ownerFilter, statusFilter, priorityFilter, searchText, dateRangeStart, dateRangeEnd]);

  const filteredBlockers = useMemo(() => {
    return (listBlockers.data || []).filter((blocker) => {
      const matchesSearch = blockerSearchText === "" || blocker.description.toLowerCase().includes(blockerSearchText.toLowerCase());
      const matchesStatus = blockerStatusFilter === "all" || blocker.status === blockerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [listBlockers.data, blockerSearchText, blockerStatusFilter]);

  // ── Derived values (safe to compute after hooks) ──────────────────────────
  const openActionItems = filteredActionItems.filter((item) => item.status === "open");
  const completedActionItems = filteredActionItems.filter((item) => item.status === "complete");
  const highPriorityItems = openActionItems.filter((item) => item.priority === "HIGH");
  const overdueItems = openActionItems.filter((item) => item.deadline && new Date(item.deadline) < new Date());

  const blockerCounts = new Map<string, number>();
  (listBlockers.data || []).forEach((blocker) => {
    const count = (blockerCounts.get(blocker.description) || 0) + 1;
    blockerCounts.set(blocker.description, count);
  });
  const chronicBlockers = Array.from(blockerCounts.entries())
    .filter(([_, count]) => count >= 3)
    .map(([description]) => description);

  const hasActiveFilters = searchText || ownerFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all" || dateRangeStart || dateRangeEnd;
  const hasActiveBlockerFilters = blockerSearchText || blockerStatusFilter !== "all";

  // ── Conditional renders AFTER all hooks ──────────────────────────────────
  if (listActionItems.isLoading || listBlockers.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (listActionItems.error || listBlockers.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <AlertTriangle className="w-12 h-12 text-orange-500" />
        <div>
          <h3 className="font-semibold text-lg">Unable to load data</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {listActionItems.error?.message || listBlockers.error?.message || "Please make sure you are logged in."}
          </p>
        </div>
        <Button variant="outline" onClick={() => { listActionItems.refetch(); listBlockers.refetch(); }}>
          Retry
        </Button>
      </div>
    );
  }

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

        {/* ── Action Items View ─────────────────────────────────────────── */}
        <TabsContent value="actions" className="space-y-4">
          {(highPriorityItems.length > 0 || overdueItems.length > 0) && (
            <div className="space-y-2">
              {highPriorityItems.length > 0 && (
                <Card className="p-4 border-destructive/30 bg-destructive/10">
                  <div className="text-sm font-semibold text-red-900">
                    🔴 {highPriorityItems.length} HIGH priority item{highPriorityItems.length !== 1 ? "s" : ""}
                  </div>
                </Card>
              )}
              {overdueItems.length > 0 && (
                <Card className="p-4 border-orange-500/30 bg-orange-500/10">
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
                      <SelectItem key={owner} value={owner}>{owner}</SelectItem>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
                <div className="text-sm font-semibold col-span-full">Date Range (for deadlines)</div>
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="date"
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
                <div className="text-center py-8 text-muted-foreground">
                  {listActionItems.data?.length === 0
                    ? "No action items yet. Process a session recording to populate this board."
                    : "No open action items matching your filters."}
                </div>
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
                        <div key={item.id} className={`p-4 border rounded-lg ${isOverdue ? "bg-destructive/10 border-destructive/30" : ""}`}>
                          <div className="flex items-start gap-4">
                            <Checkbox checked={false} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-semibold">{item.task}</span>
                                {item.priority === "HIGH" && <Badge className="bg-red-600">HIGH</Badge>}
                                {item.priority === "MED" && <Badge className="bg-yellow-600">MED</Badge>}
                                {isOverdue && <Badge className="bg-orange-600">OVERDUE</Badge>}
                                {item.domainTag && <Badge variant="outline" className="text-xs">{item.domainTag}</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong>Owner:</strong> {item.owner}</p>
                                {item.deadline && (
                                  <p><strong>Due:</strong> {new Date(item.deadline).toLocaleDateString()}</p>
                                )}
                                <p><strong>Session:</strong> #{item.sourceSession}</p>
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

        {/* ── Blockers View ─────────────────────────────────────────────── */}
        <TabsContent value="blockers" className="space-y-4">
          {chronicBlockers.length > 0 && (
            <Card className="p-4 border-destructive/30 bg-destructive/10">
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
                  onClick={() => { setBlockerSearchText(""); setBlockerStatusFilter("all"); }}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>

          {/* Blocker List */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Blockers ({filteredBlockers.length})</h3>
            {filteredBlockers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {listBlockers.data?.length === 0
                  ? "No blockers recorded yet. Process a session recording to populate this board."
                  : "No blockers matching your filters."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBlockers.map((blocker) => {
                  const isChronic = chronicBlockers.includes(blocker.description);
                  return (
                    <div
                      key={blocker.id}
                      className={`p-4 border rounded-lg ${isChronic ? "border-red-300 bg-destructive/10" : blocker.status === "resolved" ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold">{blocker.description}</span>
                            {isChronic && <Badge className="bg-red-600 text-xs">CHRONIC</Badge>}
                            <Badge variant={blocker.status === "resolved" ? "secondary" : "destructive"} className="text-xs">
                              {blocker.status}
                            </Badge>
                            {blocker.domainTag && <Badge variant="outline" className="text-xs">{blocker.domainTag}</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>First seen:</strong> Session #{blocker.firstAppearedSession}</p>
                            <p><strong>Times appeared:</strong> {blocker.timesAppeared}</p>
                            {blocker.resolutionNote && (
                              <p><strong>Resolution:</strong> {blocker.resolutionNote}</p>
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
        </TabsContent>
      </TabsUI>
    </div>
  );
}
