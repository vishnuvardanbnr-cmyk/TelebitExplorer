import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { HashLink } from "@/components/hash-link";
import { AddressLink } from "@/components/address-link";
import { formatNumber, formatTimestamp } from "@/lib/formatters";
import { Search, Blocks, ArrowRightLeft, User, AlertCircle } from "lucide-react";
import type { Block, Transaction, Address } from "@shared/schema";

interface SearchResult {
  type: "block" | "transaction" | "address";
  block?: Block;
  transaction?: Transaction;
  address?: Address;
}

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const query = searchParams.get("q") || "";

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    enabled: !!query,
  });

  useEffect(() => {
    if (data) {
      if (data.type === "block" && data.block) {
        setLocation(`/block/${data.block.number}`);
      } else if (data.type === "transaction" && data.transaction) {
        setLocation(`/tx/${data.transaction.hash}`);
      } else if (data.type === "address" && data.address) {
        setLocation(`/address/${data.address.address}`);
      }
    }
  }, [data, setLocation]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <Search className="h-6 w-6" />
          Search Results
        </h1>
        {query && (
          <p className="text-muted-foreground mt-1">
            Results for: <code className="font-mono bg-muted px-2 py-1 rounded">{query}</code>
          </p>
        )}
      </div>

      <SearchBar placeholder="Search by Address / Txn Hash / Block" />

      {!query ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Enter a Search Query</h2>
            <p className="text-muted-foreground mt-2">
              Search by block number, transaction hash, or address
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      ) : error || !data ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">No Results Found</h2>
            <p className="text-muted-foreground mt-2">
              We couldn't find any blocks, transactions, or addresses matching your search.
            </p>
            <div className="mt-6 flex justify-center gap-4 flex-wrap">
              <Link href="/blocks">
                <Button variant="outline" className="gap-2">
                  <Blocks className="h-4 w-4" />
                  Browse Blocks
                </Button>
              </Link>
              <Link href="/txs">
                <Button variant="outline" className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Browse Transactions
                </Button>
              </Link>
              <Link href="/accounts">
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  Browse Accounts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {data.type === "block" && <Blocks className="h-5 w-5" />}
              {data.type === "transaction" && <ArrowRightLeft className="h-5 w-5" />}
              {data.type === "address" && <User className="h-5 w-5" />}
              Found {data.type === "block" ? "Block" : data.type === "transaction" ? "Transaction" : "Address"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.type === "block" && data.block && (
              <div className="space-y-2">
                <p>
                  Block{" "}
                  <Link href={`/block/${data.block.number}`} className="text-primary hover:underline font-mono">
                    #{formatNumber(data.block.number)}
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTimestamp(data.block.timestamp)} - {data.block.transactionCount} transactions
                </p>
              </div>
            )}
            {data.type === "transaction" && data.transaction && (
              <div className="space-y-2">
                <HashLink hash={data.transaction.hash} type="tx" showFull />
                <p className="text-sm text-muted-foreground">
                  Block {data.transaction.blockNumber} - {formatTimestamp(data.transaction.timestamp)}
                </p>
              </div>
            )}
            {data.type === "address" && data.address && (
              <div className="space-y-2">
                <AddressLink address={data.address.address} showFull />
                <p className="text-sm text-muted-foreground">
                  {data.address.transactionCount} transactions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
