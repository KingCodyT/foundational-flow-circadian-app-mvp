export type TimelineEntry = {
  id: string;
  title: string;
  at: string | null;
  provenance: string;
  timeZone?: string | null;
  details?: string;
} & (
  | { kind: "RECORDED"; status: "completed" | "skipped" | "status"; recordedAt?: string | null; updatedAt?: string | null }
  | { kind: "CONTEXT"; status: "saved" | "unavailable" }
  | { kind: "PLANNED"; status: "planned" }
  | { kind: "RECOMMENDED"; status: "delivered" }
);
