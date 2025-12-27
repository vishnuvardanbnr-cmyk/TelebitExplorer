import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { AddressLink } from "@/components/address-link";
import { HashLink } from "@/components/hash-link";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Coins, Users, ArrowRightLeft, Clock, ExternalLink, TrendingUp, Layers } from "lucide-react";
import { formatNumber, formatTimestamp, formatTBT } from "@/lib/formatters";
import { useAddressFormat } from "@/contexts/address-format-context";
import type { Token, TokenTransfer, TokenHolder } from "@shared/schema";

const PAGE_SIZE = 25;

interface TokenTransfersData {
  transfers: TokenTransfer[];
  total: number;
}

interface TokenHoldersData {
  holders: TokenHolder[];
  total: number;
}

export default function TokenPage() {
  const { address } = useParams<{ address: string }>();
  const [transferPage, setTransferPage] = useState(1);
  const [holderPage, setHolderPage] = useState(1);
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery<Token>({
    queryKey: [`/api/tokens/${address}`],
    enabled: !!address,
  });

  const { data: transfersData, isLoading: transfersLoading } = useQuery<TokenTransfersData>({
    queryKey: [`/api/tokens/${address}/transfers?page=${transferPage}&limit=${PAGE_SIZE}`],
    enabled: !!address,
  });

  const { data: holdersData, isLoading: holdersLoading } = useQuery<TokenHoldersData>({
    queryKey: [`/api/tokens/${address}/holders?page=${holderPage}&limit=${PAGE_SIZE}`],
    enabled: !!address,
  });

  if (tokenLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Coins className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Token Not Found</h2>
            <p className="text-muted-foreground">
              The token at address {address} was not found or hasn't been indexed yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const token = tokenData;
  const totalSupply = token.totalSupply ? BigInt(token.totalSupply) : BigInt(0);
  const decimals = token.decimals || 18;

  const formatTokenAmount = (value: string | null) => {
    if (!value) return "0";
    try {
      const bigValue = BigInt(value);
      const divisor = BigInt(10 ** decimals);
      const intPart = bigValue / divisor;
      const fracPart = bigValue % divisor;
      const fracStr = fracPart.toString().padStart(decimals, "0").slice(0, 4);
      return `${formatNumber(Number(intPart))}.${fracStr}`;
    } catch {
      return value;
    }
  };

  const getHolderPercentage = (balance: string) => {
    if (!balance || !totalSupply || totalSupply === BigInt(0)) return 0;
    try {
      const holderBalance = BigInt(balance);
      return Number((holderBalance * BigInt(10000)) / totalSupply) / 100;
    } catch {
      return 0;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-token-name">
              {token.name || "Unknown Token"}
              {token.symbol && (
                <Badge variant="secondary" data-testid="badge-token-symbol">
                  {token.symbol}
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
              <CopyButton text={address || ""} />
            </div>
          </div>
        </div>
        <Badge variant={token.tokenType === "ERC20" ? "default" : "secondary"}>
          {token.tokenType === "ERC20" ? nativeSymbol : token.tokenType}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Layers className="w-4 h-4" />
              Total Supply
            </div>
            <div className="text-lg font-semibold" data-testid="text-total-supply">
              {formatTokenAmount(token.totalSupply || "0")} {token.symbol}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              Holders
            </div>
            <div className="text-lg font-semibold" data-testid="text-holder-count">
              {formatNumber(token.holderCount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowRightLeft className="w-4 h-4" />
              Transfers
            </div>
            <div className="text-lg font-semibold" data-testid="text-transfer-count">
              {formatNumber(token.transferCount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              Decimals
            </div>
            <div className="text-lg font-semibold" data-testid="text-decimals">
              {token.decimals ?? 18}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="transfers" className="gap-2" data-testid="tab-transfers">
            <ArrowRightLeft className="w-4 h-4" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="holders" className="gap-2" data-testid="tab-holders">
            <Users className="w-4 h-4" />
            Holders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Token Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              {transfersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : transfersData?.transfers.length ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Txn Hash</TableHead>
                          <TableHead>Block</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead></TableHead>
                          <TableHead>To</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfersData.transfers.map((transfer, idx) => (
                          <TableRow key={`${transfer.transactionHash}-${transfer.logIndex}`} data-testid={`row-transfer-${idx}`}>
                            <TableCell>
                              <HashLink hash={transfer.transactionHash} type="tx" />
                            </TableCell>
                            <TableCell>
                              <Link href={`/blocks/${transfer.blockNumber}`}>
                                <span className="font-mono text-primary hover:underline cursor-pointer">
                                  {formatNumber(transfer.blockNumber)}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <AddressLink address={transfer.from} />
                            </TableCell>
                            <TableCell>
                              <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell>
                              <AddressLink address={transfer.to} />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatTokenAmount(transfer.value?.toString() || "0")}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {transfer.timestamp && formatTimestamp(new Date(transfer.timestamp))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4">
                    <Pagination
                      currentPage={transferPage}
                      totalPages={Math.ceil((transfersData.total || 0) / PAGE_SIZE)}
                      onPageChange={setTransferPage}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transfers found for this token.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Token Holders</CardTitle>
            </CardHeader>
            <CardContent>
              {holdersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : holdersData?.holders.length ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                          <TableHead className="w-32">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holdersData.holders.map((holder, idx) => {
                          const rank = (holderPage - 1) * PAGE_SIZE + idx + 1;
                          const percentage = getHolderPercentage(holder.balance);
                          return (
                            <TableRow key={holder.id} data-testid={`row-holder-${idx}`}>
                              <TableCell className="font-medium">
                                #{rank}
                              </TableCell>
                              <TableCell>
                                <AddressLink address={holder.holderAddress} />
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatTokenAmount(holder.balance)} {token.symbol}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {percentage.toFixed(2)}%
                              </TableCell>
                              <TableCell>
                                <Progress value={percentage} className="h-2" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4">
                    <Pagination
                      currentPage={holderPage}
                      totalPages={Math.ceil((holdersData.total || 0) / PAGE_SIZE)}
                      onPageChange={setHolderPage}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No holders found for this token.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Token Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Contract Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{address?.slice(0, 16)}...{address?.slice(-8)}</span>
                  <CopyButton text={address || ""} />
                </div>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Token Name</span>
                <span className="font-medium">{token.name || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Symbol</span>
                <span className="font-medium">{token.symbol || "N/A"}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Token Type</span>
                <Badge variant="outline">{token.tokenType}</Badge>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Decimals</span>
                <span className="font-medium">{token.decimals ?? 18}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {token.createdAt ? formatTimestamp(new Date(token.createdAt)) : "N/A"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Link href={`/address/${address}`}>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Contract
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
