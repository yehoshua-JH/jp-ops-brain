import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function SessionLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  const listSessions = trpc.sessions.list.useQuery();

  const filteredSessions = useMemo(() => {
    if (!listSessions.data) return [];

    return listSessions.data.filter((session) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        session.sessionNumber.toString().includes(searchLower) ||
        session.meetingType.toLowerCase().includes(searchLower) ||
        session.date.toString().toLowerCase().includes(searchLower) ||
        session.participants?.some((p: string) => p.toLowerCase().includes(searchLower))
      );
    });
  }, [listSessions.data, searchTerm]);

  if (listSessions.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Session Library</h1>
        <p className="text-muted-foreground mt-2">
          Browse all processed sessions with full search and filtering capabilities.
        </p>
      </div>

      <Card className="p-6">
        <Input
          placeholder="Search by session #, date, type, or participant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6"
        />

        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {listSessions.data?.length === 0
              ? "No sessions yet. Process your first meeting to get started."
              : "No sessions match your search."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Collapsible
                key={session.id}
                open={expandedSession === session.id}
                onOpenChange={(open) => setExpandedSession(open ? session.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full">
                    <Card className="p-4 hover:bg-muted transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Session #{session.sessionNumber}</span>
                            <Badge variant="outline">{session.meetingType}</Badge>
                            <Badge variant="secondary">{session.inputFormat}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {new Date(session.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          {session.participants && session.participants.length > 0 && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {session.participants.join(", ")}
                            </div>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${
                            expandedSession === session.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </Card>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2">
                  <Card className="p-6 bg-muted/30 space-y-4">
                    {session.executiveSummary && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Executive Summary</h4>
                        <p className="text-sm text-muted-foreground">{session.executiveSummary}</p>
                      </div>
                    )}

                    {session.operationalSummary && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Operational Summary</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {session.operationalSummary}
                        </p>
                      </div>
                    )}

                    {session.keyPoints && session.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Key Points</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {session.keyPoints.map((point: any, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                                {point.domain}
                              </span>
                              <span>{point.point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.activeBlockers && session.activeBlockers.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Active Blockers</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {session.activeBlockers.map((blocker: string, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-red-600">•</span>
                              <span>{blocker}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.actionItems && session.actionItems.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Action Items</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {session.actionItems.map((item: any, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-blue-600">→</span>
                              <span>
                                <strong>{item.owner}:</strong> {item.task}
                                {item.deadline && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    Due: {new Date(item.deadline).toLocaleDateString()}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.decisionsMade && session.decisionsMade.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Decisions Made</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {session.decisionsMade.map((decision: string, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-green-600">✓</span>
                              <span>{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </Card>

      {filteredSessions.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredSessions.length} of {listSessions.data?.length} sessions
        </div>
      )}
    </div>
  );
}
