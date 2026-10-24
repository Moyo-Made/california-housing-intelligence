import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** An inline message under a field: errors block predictions, notices don't. */
export function FieldMessage({
  id,
  tone,
  children,
}: {
  id?: string;
  tone: "error" | "notice";
  children: React.ReactNode;
}) {
  const Icon = tone === "error" ? CircleAlert : TriangleAlert;
  return (
    <p
      id={id}
      className={cn(
        "flex gap-1.5 text-xs leading-relaxed",
        tone === "error" ? "text-destructive" : "text-notice",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
