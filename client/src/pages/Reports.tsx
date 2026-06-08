import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate daily, weekly, and monthly rollup reports automatically.
        </p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">Daily Rollup</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Review</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Review</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Daily Rollup</h2>
            <p className="text-muted-foreground">
              Aggregates all sessions from today using the Daily Batch prompt.
            </p>
            <Button>Generate Daily Rollup</Button>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Weekly Review</h2>
            <p className="text-muted-foreground">
              Aggregates all daily rollups from the current week.
            </p>
            <Button>Generate Weekly Review</Button>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Monthly Review</h2>
            <p className="text-muted-foreground">
              Aggregates all weekly reviews from the current month and auto-generates timeline stamp.
            </p>
            <Button>Generate Monthly Review</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
