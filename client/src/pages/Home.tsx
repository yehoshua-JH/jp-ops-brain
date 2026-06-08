import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, LogOut, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const DOMAIN_COLORS: Record<string, string> = {
  "TIME-TRACKING": "bg-teal-100 text-teal-800 hover:bg-teal-200",
  INVOICING: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  "TALENT-OPS": "bg-purple-100 text-purple-800 hover:bg-purple-200",
  "TECH-PLATFORM": "bg-gray-100 text-gray-800 hover:bg-gray-200",
  "CLIENT-OPS": "bg-amber-100 text-amber-800 hover:bg-amber-200",
  "CLIENT-PORTAL": "bg-green-100 text-green-800 hover:bg-green-200",
  FINANCE: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  "TEAM-MGMT": "bg-pink-100 text-pink-800 hover:bg-pink-200",
  "SALES-BD": "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  "AI-SYSTEMS": "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
};

const MATURITY_LEVELS = ["Not started", "Early", "Developing", "Functional with gaps", "Solid", "World-class"];

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize domains on first load
  const seedDomains = trpc.domains.seedDomains.useMutation();
  const listDomains = trpc.domains.list.useQuery();
  const listSessions = trpc.sessions.list.useQuery();
  const listActionItems = trpc.actionItems.list.useQuery();

  useEffect(() => {
    if (isAuthenticated && listDomains.data?.length === 0) {
      setIsInitializing(true);
      seedDomains.mutate(undefined, {
        onSuccess: () => {
          listDomains.refetch();
          setIsInitializing(false);
        },
        onError: () => {
          setIsInitializing(false);
        },
      });
    }
  }, [isAuthenticated, listDomains.data]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-4xl font-bold">Ops Brain</h1>
          <p className="text-lg text-slate-300">
            Your personal operations intelligence hub. Transform meeting transcripts into structured operational insights.
          </p>
          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sign In with Manus
          </Button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing your Ops Brain...</p>
        </div>
      </div>
    );
  }

  const openActionItems = listActionItems.data?.filter((item) => item.status === "open") || [];
  const highPriorityItems = openActionItems.filter((item) => item.priority === "HIGH");
  const overdueItems = openActionItems.filter((item) => item.deadline && new Date(item.deadline) < new Date());

  // Get the latest maturity level for each domain from sessions
  const getDomainMaturity = (domainTag: string): string => {
    if (!listSessions.data || listSessions.data.length === 0) return "Not started";
    
    // Find the most recent session with maturity info for this domain
    for (const session of listSessions.data) {
      const maturityNote = session.systemMaturityNotes?.find(
        (note: any) => note.domain === domainTag
      );
      if (maturityNote) {
        return maturityNote.maturity || "Not started";
      }
    }
    return "Not started";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold">Welcome back, {user?.name || "Reef"}</h1>
          <p className="text-muted-foreground mt-2">
            Your operations intelligence dashboard. All systems ready.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout()}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Sessions</div>
          <div className="text-3xl font-bold mt-2">{listSessions.data?.length || 0}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Open Action Items</div>
          <div className="text-3xl font-bold mt-2">{openActionItems.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">HIGH Priority</div>
          <div className="text-3xl font-bold mt-2 text-red-600">{highPriorityItems.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Overdue</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">{overdueItems.length}</div>
        </Card>
      </div>

      {/* Alerts */}
      {(highPriorityItems.length > 0 || overdueItems.length > 0) && (
        <div className="space-y-3">
          {highPriorityItems.length > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="text-sm font-semibold text-red-900">
                ⚠️ {highPriorityItems.length} HIGH priority item{highPriorityItems.length !== 1 ? "s" : ""} need attention
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

      {/* Domain Maturity Summary */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Domain Maturity</h2>
        <Card className="p-6">
          <div className="flex flex-wrap gap-3">
            {listDomains.data?.map((domain) => {
              const maturity = getDomainMaturity(domain.tag);
              return (
                <button
                  key={domain.tag}
                  onClick={() => navigate(`/domains?domain=${domain.tag}`)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors cursor-pointer ${DOMAIN_COLORS[domain.tag] || "bg-gray-100"}`}
                  title={`${domain.name}: ${maturity}`}
                >
                  <div className="text-sm font-semibold">{domain.tag}</div>
                  <div className="text-xs opacity-75">{maturity}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Sessions</h2>
        <Card className="p-6">
          {listSessions.data && listSessions.data.length > 0 ? (
            <div className="space-y-3">
              {listSessions.data.slice(0, 5).map((session) => (
                <div key={session.id} className="flex justify-between items-start pb-3 border-b last:border-b-0">
                  <div>
                    <div className="font-semibold">Session #{session.sessionNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(session.date).toLocaleDateString()} • {session.meetingType}
                    </div>
                  </div>
                  <Badge variant="outline">{session.inputFormat}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sessions yet. Start by processing your first meeting.
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="h-12 justify-between"
            onClick={() => navigate("/process")}
          >
            Process Meeting
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            className="h-12 justify-between"
            variant="outline"
            onClick={() => navigate("/library")}
          >
            View All Sessions
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            className="h-12 justify-between"
            variant="outline"
            onClick={() => navigate("/brain")}
          >
            Ask Ops Brain
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
