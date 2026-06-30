import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Pencil, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import EditDrawer, { EditField } from "@/components/EditDrawer";
import { toast } from "sonner";

const MATURITY_LEVELS = ["Not started", "Early", "Developing", "Functional with gaps", "Solid", "World-class"] as const;
type MaturityLevel = typeof MATURITY_LEVELS[number];

const MATURITY_COLORS: Record<string, string> = {
  "Not started": "bg-red-100 text-destructive",
  Early: "bg-orange-100 text-orange-600",
  Developing: "bg-yellow-100 text-yellow-800",
  "Functional with gaps": "bg-blue-100 text-primary",
  Solid: "bg-green-100 text-emerald-600",
  "World-class": "bg-emerald-100 text-emerald-800",
};

export default function DomainTracker() {
  const [location] = useLocation();
  const queryIndex = location.indexOf("?");
  const params = new URLSearchParams(queryIndex >= 0 ? location.substring(queryIndex + 1) : "");
  const selectedDomain = params.get("domain");
  const [activeDomain, setActiveDomain] = useState(selectedDomain || null);
  const [editEndState, setEditEndState] = useState(false);
  const [overrideMaturity, setOverrideMaturity] = useState(false);

  const listDomains = trpc.domains.getAll.useQuery();
  const listSessions = trpc.sessions.getAll.useQuery();
  const utils = trpc.useUtils();

  const updateIdealEndState = trpc.domains.updateIdealEndState.useMutation({
    onSuccess: () => { utils.domains.getAll.invalidate(); toast.success("Ideal end state updated."); },
  });
  const overrideMaturityMutation = trpc.domains.overrideMaturity.useMutation({
    onSuccess: () => { utils.domains.getAll.invalidate(); utils.sessions.getAll.invalidate(); toast.success("Maturity level overridden."); },
  });

  if (listDomains.isLoading || listSessions.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  const domain = activeDomain
    ? listDomains.data?.find((d) => d.tag === activeDomain)
    : listDomains.data?.[0];

  if (!domain) {
    return <div className="text-center py-12 text-foreground">No domains found</div>;
  }

  function tryParse(str: string | null | undefined): any[] {
    try { return JSON.parse(str ?? "[]") ?? []; } catch { return []; }
  }

  const maturityHistory = (listSessions.data ?? [])
    .flatMap((session) =>
      tryParse(session.systemMaturityNotes)
        .filter((note: any) => note.domain === domain!.tag)
        .map((note: any) => ({ sessionNumber: session.sessionNumber, date: session.date, maturity: note.maturity, change: note.change }))
    )
    .sort((a, b) => a.sessionNumber - b.sessionNumber);

  const keyPoints = (listSessions.data ?? [])
    .flatMap((session) =>
      tryParse(session.keyPoints)
        .filter((point: any) => point.domain === domain!.tag)
        .map((point: any) => ({ sessionNumber: session.sessionNumber, point: point.point }))
    );

  const blockers = (listSessions.data ?? [])
    .flatMap((session) =>
      tryParse(session.activeBlockers)
        .filter((blocker: string) => blocker.toLowerCase().includes(domain!.tag.toLowerCase()))
        .map((blocker: string) => ({ sessionNumber: session.sessionNumber, blocker }))
    );

  const currentMaturity = (domain as any).currentMaturityLevel ?? maturityHistory[maturityHistory.length - 1]?.maturity ?? "Not started";

  // Edit fields
  const endStateFields: EditField[] = [
    {
      key: "idealEndState",
      label: "Ideal End State",
      type: "textarea",
      value: domain.idealEndState,
      placeholder: "Describe the target state for this domain...",
    },
  ];

  const maturityOverrideFields: EditField[] = [
    {
      key: "maturityLevel",
      label: "New Maturity Level",
      type: "select",
      value: currentMaturity,
      options: MATURITY_LEVELS.map((l) => ({ value: l, label: l })),
    },
    {
      key: "explanation",
      label: "Reason for Override",
      type: "textarea",
      value: "",
      placeholder: "Why is this the correct maturity level? Use voice or type...",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Domain Tracker</h1>
        <p className="text-foreground mt-2">
          Track maturity progression per domain. Click Edit to correct any data using voice or text.
        </p>
      </div>

      {/* Domain Selector */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Select Domain</h3>
        <div className="flex flex-wrap gap-2">
          {listDomains.data?.map((d) => (
            <Button
              key={d.tag}
              variant={activeDomain === d.tag || (!activeDomain && d.tag === listDomains.data?.[0]?.tag) ? "default" : "outline"}
              onClick={() => setActiveDomain(d.tag)}
              className="text-sm"
            >
              {d.tag}
            </Button>
          ))}
        </div>
      </Card>

      {/* Domain Details */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header with current maturity */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{domain.name}</h2>
              <p className="text-foreground mt-1 text-sm">Domain: {domain.tag} · Tier: {domain.tier}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`text-sm px-3 py-1 ${MATURITY_COLORS[currentMaturity] || ""}`}>
                {currentMaturity}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => setOverrideMaturity(true)}
              >
                <TrendingUp className="w-3 h-3" />
                Override Maturity
              </Button>
            </div>
          </div>

          {/* Ideal End State */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Ideal End State</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => setEditEndState(true)}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Button>
            </div>
            <div className="bg-muted p-4 rounded text-sm whitespace-pre-wrap">
              {domain.idealEndState}
            </div>
          </div>

          {/* Maturity Timeline */}
          {maturityHistory.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Maturity Timeline</h3>
              <div className="space-y-3">
                {maturityHistory.map((entry, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-24">
                      <Badge variant="outline">Session #{entry.sessionNumber}</Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={MATURITY_COLORS[entry.maturity] || ""}>{entry.maturity}</Badge>
                        <span className="text-sm text-foreground">{entry.change}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Key Points ({keyPoints.length})</h3>
              <ul className="space-y-2">
                {keyPoints.map((kp, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="text-blue-600 flex-shrink-0">•</span>
                    <span>
                      <strong className="text-xs bg-muted px-2 py-1 rounded">Session #{kp.sessionNumber}</strong>
                      <p className="mt-1">{kp.point}</p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blockers */}
          {blockers.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Active Blockers</h3>
              <ul className="space-y-2">
                {blockers.map((b, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="text-red-600 flex-shrink-0">⚠️</span>
                    <span>
                      <strong className="text-xs bg-muted px-2 py-1 rounded">Session #{b.sessionNumber}</strong>
                      <p className="mt-1">{b.blocker}</p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {maturityHistory.length === 0 && keyPoints.length === 0 && blockers.length === 0 && (
            <div className="text-center py-8 text-foreground">
              No data yet for this domain. Process meetings to populate domain tracking.
            </div>
          )}
        </div>
      </Card>

      {/* Edit Ideal End State */}
      <EditDrawer
        open={editEndState}
        onClose={() => setEditEndState(false)}
        title={`Edit Ideal End State — ${domain.name}`}
        subtitle="Use voice or text to update the target state for this domain"
        fields={endStateFields}
        onSave={async (values) => {
          await updateIdealEndState.mutateAsync({ domainId: domain.id, idealEndState: values.idealEndState });
        }}
        onUpdated={() => setEditEndState(false)}
      />

      {/* Override Maturity */}
      <EditDrawer
        open={overrideMaturity}
        onClose={() => setOverrideMaturity(false)}
        title={`Override Maturity — ${domain.name}`}
        subtitle="Manually set the current maturity level if the AI assessment is incorrect"
        fields={maturityOverrideFields}
        onSave={async (values) => {
          await overrideMaturityMutation.mutateAsync({
            domainId: domain.id,
            maturityLevel: values.maturityLevel as MaturityLevel,
            explanation: values.explanation || undefined,
          });
        }}
        onUpdated={() => setOverrideMaturity(false)}
      />
    </div>
  );
}
