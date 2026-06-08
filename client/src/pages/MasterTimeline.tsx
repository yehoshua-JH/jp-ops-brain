import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MasterTimeline() {
  // TODO: Implement tRPC procedures for rollups and timeline
  const monthlyRollups: any[] = [];
  const timelineEntries: any[] = [];



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Master Timeline</h1>
        <p className="text-muted-foreground mt-2">
          Chronological view of all monthly reviews and operational milestones with auto-generated timestamps.
        </p>
      </div>

      {/* Export Button */}
      <div className="flex gap-2">
        <Button variant="outline">
          Export to PDF
        </Button>
        <Button variant="outline">
          Export to Markdown
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {timelineEntries.length === 0 && monthlyRollups.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <p>No timeline entries yet. Generate monthly reviews to populate the timeline.</p>
          </Card>
        ) : (
          <>
            {/* Monthly Rollups */}
            {monthlyRollups.map((rollup: any, idx: number) => (
              <Card key={idx} className="p-6 border-l-4 border-l-blue-600">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Monthly Review</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(rollup.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge>Monthly</Badge>
                </div>
                <div className="bg-muted p-4 rounded text-sm max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{rollup.content.substring(0, 500)}...</pre>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  View Full Report
                </Button>
              </Card>
            ))}

            {/* Manual Timeline Entries */}
            {timelineEntries.map((entry: any, idx: number) => (
              <Card key={idx} className="p-6 border-l-4 border-l-green-600">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {entry.domainTag && <Badge variant="outline">{entry.domainTag}</Badge>}
                </div>
                {entry.description && (
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                )}
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Add Manual Entry */}
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-4">Add Manual Milestone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create custom timeline entries for important operational milestones.
        </p>
        <Button variant="outline">
          Add Milestone
        </Button>
      </Card>
    </div>
  );
}
