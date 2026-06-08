import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DomainTracker() {
  const domains = [
    "TIME-TRACKING",
    "INVOICING",
    "TALENT-OPS",
    "TECH-PLATFORM",
    "CLIENT-OPS",
    "CLIENT-PORTAL",
    "FINANCE",
    "TEAM-MGMT",
    "SALES-BD",
    "AI-SYSTEMS",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Domain Tracker</h1>
        <p className="text-muted-foreground mt-2">
          Track maturity progression across all 10 operational domains.
        </p>
      </div>

      <Tabs defaultValue={domains[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          {domains.map((domain) => (
            <TabsTrigger key={domain} value={domain} className="text-xs">
              {domain.split("-")[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {domains.map((domain) => (
          <TabsContent key={domain} value={domain}>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">{domain}</h2>
              <div className="text-center py-12 text-muted-foreground">
                Domain details will appear here
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
