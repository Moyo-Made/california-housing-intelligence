import type { Provenance } from "@/lib/housing/presets";

const COPY = {
  synthetic: {
    title: "Synthetic profile",
    detail: () => "The median of each feature, not a real block group.",
  },
  record: {
    title: "Real 1990 record",
    detail: (p: Extract<Provenance, { kind: "record" }>) =>
      `Dataset row ${p.row.toLocaleString("en-US")}, ${p.place}.`,
  },
  constructed: {
    title: "Constructed inputs",
    detail: () => "Your own combination, not a recorded block group.",
  },
};

/** Says where the current inputs come from, so made-up inputs are never mistaken for real data. */
export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const title = COPY[provenance.kind].title;
  const detail =
    provenance.kind === "record"
      ? COPY.record.detail(provenance)
      : COPY[provenance.kind].detail();

  return (
    <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
      <span className="font-medium">{title}.</span>{" "}
      <span className="text-muted-foreground">{detail}</span>
    </p>
  );
}
