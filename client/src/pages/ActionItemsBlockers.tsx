import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ActionItemsBlockers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Action Items & Blockers</h1>
        <p className="text-muted-foreground mt-2">
          Unified task board for tracking action items and blockers across all sessions.
        </p>
      </div>

      <Tabs defaultValue="actions" className="w-full">
        <TabsList>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="blockers">Blockers</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No action items yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="blockers">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blocker</TableHead>
                  <TableHead>First Appeared</TableHead>
                  <TableHead>Times Appeared</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No blockers yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
