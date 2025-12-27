import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { useDesign } from "@/contexts/design-context";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  isLoading = false,
}: StatsCardProps) {
  const { isDesign2 } = useDesign();
  
  if (isDesign2) {
    return (
      <div className="d2-stat">
        <div className="d2-icon-box flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-20 mt-0.5 rounded-full" />
          ) : (
            <p className="text-xl font-bold d2-gradient-text truncate d2-mono" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
          )}
        </div>
        {subtitle && (
          <span className="d2-badge flex-shrink-0 hidden sm:inline-block">{subtitle}</span>
        )}
      </div>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1 truncate" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {value}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 rounded-md flex-shrink-0 bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
