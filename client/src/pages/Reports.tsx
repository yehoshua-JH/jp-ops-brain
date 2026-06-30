import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Loader2, FileText, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type RollupType = "daily" | "weekly" | "monthly";

interface RollupResult {
  type: RollupType;
  report: string;
  sessionCount: number;
  generatedAt: string;
}

export default function Reports() {
  const [activeType, setActiveType] = useState<RollupType | null>(null);
  const [result, setResult] = useState<RollupResult | null>(null);

  const generateMutation = trpc.reports.generateRollup.useMutation({
    onSuccess: (data, variables) => {
      setResult({
        type: variables.type,
        report: data.report,
        sessionCount: data.sessionCount,
        generatedAt: data.generatedAt,
      });
      setActiveType(null);
      toast.success(`${variables.type.charAt(0).toUpperCase() + variables.type.slice(1)} rollup generated`);
    },
    onError: (err) => {
      setActiveType(null);
      toast.error("Failed to generate rollup: " + err.message);
    },
  });

  const handleGenerate = (type: RollupType) => {
    setActiveType(type);
    setResult(null);
    generateMutation.mutate({ type });
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jivepilot-${result.type}-rollup-${new Date(result.generatedAt).toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rollupTypes: { type: RollupType; label: string; description: string }[] = [
    {
      type: "daily",
      label: "Daily Rollup",
      description: "Sessions from today, key decisions, blockers surfaced, action items due, and tomorrow's focus.",
    },
    {
      type: "weekly",
      label: "Weekly Review",
      description: "7-day summary with themes, domain maturity changes, client health, and next week's priorities.",
    },
    {
      type: "monthly",
      label: "Monthly Review",
      description: "30-day achievements, domain assessment, portfolio health, root causes, and strategic recommendations.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Rollups</h1>
        <p className="text-muted-foreground mt-2">
          AI-generated operational reports powered by GPT-4o using your real session data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rollupTypes.map(({ type, label, description }) => (
          <Card key={type} className="p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold mb-1">{label}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button
              onClick={() => handleGenerate(type)}
              disabled={generateMutation.isPending}
              className="w-full mt-auto"
              variant={activeType === type ? "default" : "outline"}
            >
              {activeType === type ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate {label}
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>

      {result && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">
                {result.type.charAt(0).toUpperCase() + result.type.slice(1)} Rollup
              </h3>
              <Badge variant="secondary">{result.sessionCount} sessions</Badge>
              <span className="text-xs text-muted-foreground">
                Generated {new Date(result.generatedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(result.type)}
                disabled={generateMutation.isPending}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download .md
              </Button>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-5 max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{result.report}</pre>
          </div>
        </Card>
      )}
    </div>
  );
}
