import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { HashLink } from "./hash-link";
import { AddressLink } from "./address-link";
import { MethodBadge } from "./method-badge";
import { formatTBT, formatShortTimestamp } from "@/lib/formatters";
import { ArrowRightLeft, ArrowRight, FileText, MoveRight } from "lucide-react";
import { useAddressFormat } from "@/contexts/address-format-context";
import { useDesign } from "@/contexts/design-context";
import type { Transaction } from "@shared/schema";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
  showViewAll?: boolean;
  limit?: number;
  showBlock?: boolean;
  title?: string;
}

export function TransactionsTable({
  transactions,
  isLoading = false,
  showViewAll = false,
  limit = 10,
  showBlock = true,
  title = "Latest Transactions",
}: TransactionsTableProps) {
  const { chainConfig } = useAddressFormat();
  const { isDesign2 } = useDesign();
  const nativeSymbol = chainConfig.native_symbol || "ETH";
  const displayTxs = limit ? transactions.slice(0, limit) : transactions;

  return (
    <Card className={isDesign2 ? "border-0 shadow-none bg-transparent" : ""}>
      <CardHeader className={`flex flex-row items-center justify-between gap-2 py-3 px-4 ${isDesign2 ? "border-b border-border/50" : ""}`}>
        <CardTitle className={`flex items-center gap-2 text-base font-semibold ${isDesign2 ? "d2-gradient-text" : ""}`}>
          {isDesign2 ? (
            <div className="d2-icon-box w-7 h-7">
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </div>
          ) : (
            <ArrowRightLeft className="h-4 w-4" />
          )}
          {title}
        </CardTitle>
        {showViewAll && (
          <Link href="/txs">
            <Button variant={isDesign2 ? "outline" : "ghost"} size="sm" className={`gap-1 text-xs h-7 ${isDesign2 ? "d2-pill" : ""}`} data-testid="button-view-all-txs">
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
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))
          ) : displayTxs.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No transactions found
            </div>
          ) : (
            displayTxs.map((tx) => (
              <div
                key={tx.hash}
                className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                data-testid={`row-tx-${tx.hash.slice(0, 10)}`}
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted flex-shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <HashLink hash={tx.hash} type="tx" showCopy={false} />
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
                    <MethodBadge input={tx.input} />
                    <span className="text-xs font-mono font-medium">
                      {formatTBT(tx.value)} {nativeSymbol}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
