import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TransactionsTable } from "@/components/transactions-table";
import { AddressLink } from "@/components/address-link";
import { HashLink } from "@/components/hash-link";
import { CopyButton } from "@/components/copy-button";
import { formatNumber, formatFullTimestamp, formatTimestamp, formatGasPercentage, formatBytes, formatGwei } from "@/lib/formatters";
import { formatBlockHash } from "@/lib/address-utils";
import { useAddressFormat } from "@/contexts/address-format-context";
import { Blocks, ChevronLeft, ChevronRight, Clock, Fuel, Hash, Database } from "lucide-react";
import type { Block, Transaction } from "@shared/schema";

interface BlockDetailData {
  block: Block;
  transactions: Transaction[];
}

export default function BlockDetail() {
  const { id } = useParams<{ id: string }>();
  const { addressFormat, bech32Prefix } = useAddressFormat();
  
  const { data, isLoading, error } = useQuery<BlockDetailData>({
    queryKey: ["/api/blocks", id],
    queryFn: async () => {
      const res = await fetch(`/api/blocks/${id}`);
      if (!res.ok) throw new Error("Block not found");
      return res.json();
    },
    enabled: !!id,
  });

  const block = data?.block;
  const transactions = data?.transactions || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !block) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Blocks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Block Not Found</h2>
            <p className="text-muted-foreground mt-2">
              The block you're looking for doesn't exist or hasn't been indexed yet.
            </p>
            <Link href="/blocks">
              <Button variant="outline" className="mt-4">
                View All Blocks
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gasPercent = formatGasPercentage(block.gasUsed, block.gasLimit);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Blocks className="h-6 w-6" />
            Block #{formatNumber(block.number)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {formatTimestamp(block.timestamp)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/block/${block.number - 1}`}>
            <Button variant="outline" size="icon" disabled={block.number <= 0} data-testid="button-prev-block">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/block/${block.number + 1}`}>
            <Button variant="outline" size="icon" data-testid="button-next-block">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Block Height" icon={Blocks}>
            <span className="font-mono">{formatNumber(block.number)}</span>
          </InfoRow>
          
          <InfoRow label="Timestamp" icon={Clock}>
            <span>{formatFullTimestamp(block.timestamp)}</span>
            <span className="text-muted-foreground ml-2">({formatTimestamp(block.timestamp)})</span>
          </InfoRow>

          <Separator />

          <InfoRow label="Transactions">
            <span className="font-mono">{block.transactionCount} transactions</span>
            <span className="text-muted-foreground ml-2">in this block</span>
          </InfoRow>

          <InfoRow label="Miner / Validator">
            <div className="overflow-hidden">
              <AddressLink address={block.miner} />
            </div>
          </InfoRow>

          <Separator />

          <InfoRow label="Gas Used" icon={Fuel}>
            <span className="font-mono">{formatNumber(block.gasUsed)}</span>
            <span className="text-muted-foreground ml-2">({gasPercent}%)</span>
          </InfoRow>

          <InfoRow label="Gas Limit">
            <span className="font-mono">{formatNumber(block.gasLimit)}</span>
          </InfoRow>

          {block.baseFeePerGas && (
            <InfoRow label="Base Fee Per Gas">
              <span className="font-mono">{formatGwei(block.baseFeePerGas)} Gwei</span>
            </InfoRow>
          )}

          <Separator />

          <InfoRow label="Block Hash" icon={Hash}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs sm:text-sm truncate">
                {formatBlockHash(block.hash, addressFormat, bech32Prefix)}
              </span>
              <CopyButton text={formatBlockHash(block.hash, addressFormat, bech32Prefix)} />
            </div>
            {addressFormat === "bech32" && (
              <p className="text-xs text-muted-foreground font-mono mt-1">{block.hash}</p>
            )}
          </InfoRow>

          <InfoRow label="Parent Hash">
            <div className="flex items-center gap-2">
              <Link
                href={`/block/${block.number - 1}`}
                className="font-mono text-xs sm:text-sm text-primary hover:underline truncate"
              >
                {formatBlockHash(block.parentHash, addressFormat, bech32Prefix)}
              </Link>
              <CopyButton text={formatBlockHash(block.parentHash, addressFormat, bech32Prefix)} />
            </div>
            {addressFormat === "bech32" && (
              <p className="text-xs text-muted-foreground font-mono mt-1">{block.parentHash}</p>
            )}
          </InfoRow>

          {block.size && (
            <InfoRow label="Size" icon={Database}>
              <span className="font-mono">{formatBytes(block.size)}</span>
            </InfoRow>
          )}

          {block.extraData && (
            <InfoRow label="Extra Data">
              <span className="font-mono text-sm text-muted-foreground break-all">
                {block.extraData}
              </span>
            </InfoRow>
          )}
        </CardContent>
      </Card>

      {transactions.length > 0 && (
        <TransactionsTable
          transactions={transactions}
          title={`Block Transactions (${transactions.length})`}
          showBlock={false}
        />
      )}
    </div>
  );
}

function InfoRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
      <div className="flex items-center gap-2 sm:w-44 flex-shrink-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}:</span>
      </div>
      <div className="flex-1 text-sm min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}
