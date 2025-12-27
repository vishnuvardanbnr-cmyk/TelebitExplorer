import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { HashLink } from "@/components/hash-link";
import { AddressLink } from "@/components/address-link";
import { formatNumber, formatTBT, formatShortTimestamp, getMethodColor } from "@/lib/formatters";
import { ArrowRightLeft, MoveRight } from "lucide-react";
import { useAddressFormat } from "@/contexts/address-format-context";
import type { Transaction } from "@shared/schema";

const PAGE_SIZE = 25;

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data, isLoading } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ["/api/transactions", page],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?page=${page}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const transactions = data?.transactions || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <ArrowRightLeft className="h-6 w-6" />
          Transactions
        </h1>
        <p className="text-muted-foreground mt-1">
          {data?.total ? `${formatNumber(data.total)} transactions found` : "Loading transactions..."}
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
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div
                  key={tx.hash}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  data-testid={`row-tx-${tx.hash.slice(0, 10)}`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted flex-shrink-0">
                    {tx.status === true ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" title="Success" />
                    ) : tx.status === false ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" title="Failed" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" title="Pending" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <HashLink hash={tx.hash} type="tx" showCopy={false} className="text-sm" />
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatShortTimestamp(tx.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs overflow-hidden">
                      <span className="truncate">
                        <AddressLink address={tx.from} showCopy={false} className="text-xs" />
                      </span>
                      <MoveRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        <AddressLink 
                          address={tx.to || tx.contractAddress} 
                          isContract={!!tx.contractAddress && !tx.to}
                          showCopy={false} 
                          className="text-xs" 
                        />
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {tx.methodName ? (
                          <Badge variant={getMethodColor(tx.methodName) as any} className="text-xs h-5 px-1.5">
                            {tx.methodName.length > 10 ? tx.methodName.slice(0, 10) + ".." : tx.methodName}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">Transfer</Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono font-medium">
                        {formatTBT(tx.value)} {nativeSymbol}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
