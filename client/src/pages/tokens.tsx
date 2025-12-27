import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AddressLink } from "@/components/address-link";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Search, Users, ArrowRightLeft, ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import { useAddressFormat } from "@/contexts/address-format-context";
import type { Token } from "@shared/schema";

const PAGE_SIZE = 25;

interface TokensData {
  tokens: Token[];
  total: number;
}

export default function TokensPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data, isLoading, error } = useQuery<TokensData>({
    queryKey: [`/api/tokens?page=${page}&limit=${PAGE_SIZE}`],
  });

  const filteredTokens = data?.tokens.filter(token => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      token.name?.toLowerCase().includes(query) ||
      token.symbol?.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  }) || [];

  const formatSupply = (supply: string | null, decimals: number | null) => {
    if (!supply) return "N/A";
    try {
      const bigValue = BigInt(supply);
      const div = BigInt(10 ** (decimals || 18));
      const intPart = bigValue / div;
      return formatNumber(Number(intPart));
    } catch {
      return supply;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-tokens-title">
            <Coins className="w-6 h-6" />
            Tokens
          </h1>
          <p className="text-muted-foreground mt-1">
            All {nativeSymbol}, ERC-721, and ERC-1155 tokens
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tokens"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {data?.total ? `${formatNumber(data.total)} Tokens` : "Tokens"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load tokens. Please try again.
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{search ? "No tokens match your search." : "No tokens indexed yet."}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead className="text-right">Total Supply</TableHead>
                      <TableHead className="text-right">Holders</TableHead>
                      <TableHead className="text-right">Transfers</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokens.map((token, idx) => (
                      <TableRow key={token.id} data-testid={`row-token-${idx}`}>
                        <TableCell className="font-medium text-muted-foreground">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Coins className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {token.name || "Unknown"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {token.symbol || "???"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={token.tokenType === "ERC20" ? "default" : token.tokenType === "ERC721" ? "secondary" : "outline"}>
                            {token.tokenType === "ERC20" ? nativeSymbol : token.tokenType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AddressLink address={token.address} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatSupply(token.totalSupply?.toString() || null, token.decimals)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            {formatNumber(token.holderCount || 0)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                            {formatNumber(token.transferCount || 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/token/${token.address}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-view-token-${idx}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {!search && (
                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil((data?.total || 0) / PAGE_SIZE)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
