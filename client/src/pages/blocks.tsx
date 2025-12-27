import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { AddressLink } from "@/components/address-link";
import { formatNumber, formatTimestamp, formatGasPercentage, formatBytes, formatShortTimestamp } from "@/lib/formatters";
import { Blocks, Cpu } from "lucide-react";
import { Link } from "wouter";
import type { Block } from "@shared/schema";

const PAGE_SIZE = 25;

export default function BlocksPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ blocks: Block[]; total: number }>({
    queryKey: ["/api/blocks", page],
    queryFn: async () => {
      const res = await fetch(`/api/blocks?page=${page}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch blocks");
      return res.json();
    },
  });

  const blocks = data?.blocks || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <Blocks className="h-6 w-6" />
          Blocks
        </h1>
        <p className="text-muted-foreground mt-1">
          {data?.total ? `${formatNumber(data.total)} blocks found` : "Loading blocks..."}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-4">
                  <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No blocks found
            </div>
          ) : (
            <div className="divide-y">
              {blocks.map((block) => {
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

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs font-mono h-5 px-1.5">
                            {block.transactionCount} txn{block.transactionCount !== 1 ? 's' : ''}
                          </Badge>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {formatNumber(block.gasUsed)} gas
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{gasPercent}%</span>
                          <span className="hidden sm:inline">{formatBytes(block.size || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
