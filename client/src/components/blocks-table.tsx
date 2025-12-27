import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressLink } from "./address-link";
import { formatNumber, formatShortTimestamp, formatGasPercentage } from "@/lib/formatters";
import { Blocks, ArrowRight, Cpu } from "lucide-react";
import { useDesign } from "@/contexts/design-context";
import type { Block } from "@shared/schema";

interface BlocksTableProps {
  blocks: Block[];
  isLoading?: boolean;
  showViewAll?: boolean;
  limit?: number;
}

export function BlocksTable({
  blocks,
  isLoading = false,
  showViewAll = false,
  limit = 10,
}: BlocksTableProps) {
  const displayBlocks = limit ? blocks.slice(0, limit) : blocks;
  const { isDesign2 } = useDesign();

  return (
    <Card className={isDesign2 ? "border-0 shadow-none bg-transparent" : ""}>
      <CardHeader className={`flex flex-row items-center justify-between gap-2 py-3 px-4 ${isDesign2 ? "border-b border-border/50" : ""}`}>
        <CardTitle className={`flex items-center gap-2 text-base font-semibold ${isDesign2 ? "d2-gradient-text" : ""}`}>
          {isDesign2 ? (
            <div className="d2-icon-box w-7 h-7">
              <Blocks className="h-3.5 w-3.5" />
            </div>
          ) : (
            <Blocks className="h-4 w-4" />
          )}
          Latest Blocks
        </CardTitle>
        {showViewAll && (
          <Link href="/blocks">
            <Button variant={isDesign2 ? "outline" : "ghost"} size="sm" className={`gap-1 text-xs h-7 ${isDesign2 ? "d2-pill" : ""}`} data-testid="button-view-all-blocks">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-3">
        <div className="divide-y">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : displayBlocks.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No blocks found
            </div>
          ) : (
            displayBlocks.map((block) => {
              const gasPercent = formatGasPercentage(block.gasUsed, block.gasLimit);
              return (
                <div
                  key={block.number}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  data-testid={`row-block-${block.number}`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted flex-shrink-0">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/block/${block.number}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                        data-testid={`link-block-${block.number}`}
                      >
                        {formatNumber(block.number)}
                      </Link>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatShortTimestamp(block.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs overflow-hidden">
                      <span className="text-muted-foreground flex-shrink-0">Miner</span>
                      <span className="truncate">
                        <AddressLink address={block.miner} showCopy={false} className="text-xs" />
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs font-mono h-5 px-1.5">
                        {block.transactionCount} txn{block.transactionCount !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {gasPercent}% gas
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
