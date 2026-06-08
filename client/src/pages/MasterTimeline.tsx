import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MasterTimeline() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Master Timeline</h1>
        <p className="text-muted-foreground mt-2">
          Chronological record of JivePilot's operational growth and maturity progression.
        </p>
      </div>

      <div className="flex gap-4">
        <Button variant="outline">Add Milestone</Button>
        <Button variant="outline">Export Timeline</Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Timeline will appear here as monthly reviews are generated
        </div>
      </Card>
    </div>
  );
}
