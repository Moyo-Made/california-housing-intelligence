import type { Provenance } from "@/lib/housing/presets";

/** e.g. "the real 1990 record in row 0 (Berkeley hills)". */
export function describeProvenance(provenance: Provenance): string {
  switch (provenance.kind) {
    case "synthetic":
      return "the synthetic median profile";
    case "record":
      return `the real 1990 record in row ${provenance.row.toLocaleString("en-US")} (${provenance.place})`;
    case "constructed":
      return "your constructed inputs";
  }
}
