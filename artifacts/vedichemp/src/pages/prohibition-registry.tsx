import { useGetProhibitionStatus } from "@workspace/api-client-react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const PROHIBITION_LABELS: Record<string, string> = {
  A1: "No medical cannabis product may be advertised or promoted, by anyone, ever",
  A2: "No batch becomes sellable without an approved, batch-matched CoA",
  A3: "Safety, adverse-event, dispensing, recall and audit records cannot be deleted or altered",
  A4: "Health data: Pharmacist/Compliance only, logged reason, buyer notified",
  A5: "No retroactive fee increase (30 days' notice, DB-enforced)",
  A6: "No single admin moves money (maker \u2260 checker, both human)",
};

export default function ProhibitionRegistry() {
  const { data, isLoading, isError } = useGetProhibitionStatus();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-primary" data-testid="text-brand">
            Vedic Hemp
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight" data-testid="text-title">
            Prohibition Registry
          </h1>
          <p className="mt-3 text-muted-foreground">
            Six prohibitions (A1&ndash;A6) are enforced directly in the database with
            constraints and triggers, so no application bug can produce an unlawful
            outcome. Status below is read live from the{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              prohibition_status
            </code>{" "}
            view.
          </p>
        </header>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground" data-testid="status-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking enforcement status&hellip;
          </div>
        )}

        {isError && (
          <Card data-testid="status-error">
            <CardContent className="flex items-center gap-3 py-6 text-destructive">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              Unable to read prohibition status from the database.
            </CardContent>
          </Card>
        )}

        {data && (
          <ul className="space-y-3">
            {data.map((p) => (
              <li key={p.code}>
                <Card data-testid={`card-prohibition-${p.code}`}>
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4">
                      {p.enforced ? (
                        <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
                      ) : (
                        <ShieldAlert className="h-6 w-6 shrink-0 text-destructive" />
                      )}
                      <div>
                        <p className="font-mono text-sm font-semibold">{p.code}</p>
                        <p className="text-sm text-muted-foreground">
                          {PROHIBITION_LABELS[p.code] ?? "Database-enforced prohibition"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={p.enforced ? "default" : "destructive"}
                      data-testid={`badge-status-${p.code}`}
                    >
                      {p.enforced ? "Enforced" : "Not enforced"}
                    </Badge>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
