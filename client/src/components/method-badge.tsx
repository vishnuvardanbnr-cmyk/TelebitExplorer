import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { decodeMethod, getMethodBadgeColor, formatMethodName } from "@/lib/method-decoder";

interface MethodBadgeProps {
  input: string | null | undefined;
  className?: string;
  showTooltip?: boolean;
}

export function MethodBadge({ input, className = "", showTooltip = true }: MethodBadgeProps) {
  const decoded = decodeMethod(input);
  const displayName = formatMethodName(decoded.name, 12);
  const colorClass = getMethodBadgeColor(decoded.type);

  const badge = (
    <Badge 
      variant="outline" 
      className={`text-xs h-5 px-1.5 font-mono ${colorClass} ${className}`}
      data-testid={`method-badge-${decoded.selector || 'transfer'}`}
    >
      {displayName}
    </Badge>
  );

  if (!showTooltip || decoded.name === displayName) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-medium">{decoded.name}</div>
          {decoded.selector && (
            <div className="text-muted-foreground font-mono">{decoded.selector}</div>
          )}
          <div className="text-muted-foreground capitalize">{decoded.type}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
