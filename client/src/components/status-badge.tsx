import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: boolean | null | undefined;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  if (status === null || status === undefined) {
    return (
      <Badge variant="secondary" className={size === "sm" ? "text-xs" : ""}>
        <Clock className={`mr-1 ${size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
        Pending
      </Badge>
    );
  }

  if (status) {
    return (
      <Badge 
        className={`bg-green-600 dark:bg-green-700 text-white border-green-700 dark:border-green-600 ${size === "sm" ? "text-xs" : ""}`}
      >
        <CheckCircle2 className={`mr-1 ${size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
        Success
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={size === "sm" ? "text-xs" : ""}>
      <XCircle className={`mr-1 ${size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
      Failed
    </Badge>
  );
}
