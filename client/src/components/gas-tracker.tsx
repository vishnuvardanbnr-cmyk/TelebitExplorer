import { useQuery } from "@tanstack/react-query";
import { Fuel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GasData {
  low: string;
  average: string;
  high: string;
  lastBlock: number;
  baseFee: string;
  timestamp: number;
}

function formatGwei(wei: string): string {
  const gwei = BigInt(wei) / BigInt(1e9);
  return gwei.toString();
}

export function GasTracker() {
  const { data: gasData, isLoading } = useQuery<GasData>({
    queryKey: ["/api/gas"],
    refetchInterval: 15000,
  });

  if (isLoading || !gasData) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Fuel className="h-3.5 w-3.5" />
        <span>--</span>
      </div>
    );
  }

  const lowGwei = formatGwei(gasData.low);
  const avgGwei = formatGwei(gasData.average);
  const highGwei = formatGwei(gasData.high);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="flex items-center gap-1.5 cursor-help"
          data-testid="gas-tracker"
        >
          <Fuel className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-medium">{avgGwei} Gwei</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="p-3">
        <div className="space-y-2">
          <div className="font-medium text-sm mb-2">Gas Prices</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Badge variant="secondary" className="mb-1 text-green-600 dark:text-green-400">
                Low
              </Badge>
              <div className="text-sm font-mono">{lowGwei}</div>
              <div className="text-xs text-muted-foreground">Gwei</div>
            </div>
            <div>
              <Badge variant="secondary" className="mb-1 text-yellow-600 dark:text-yellow-400">
                Avg
              </Badge>
              <div className="text-sm font-mono">{avgGwei}</div>
              <div className="text-xs text-muted-foreground">Gwei</div>
            </div>
            <div>
              <Badge variant="secondary" className="mb-1 text-red-600 dark:text-red-400">
                High
              </Badge>
              <div className="text-sm font-mono">{highGwei}</div>
              <div className="text-xs text-muted-foreground">Gwei</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center pt-1 border-t">
            Based on last 100 transactions
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
