import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressLink } from "@/components/address-link";
import { HashLink } from "@/components/hash-link";
import { Pagination } from "@/components/pagination";
import { formatTBT, formatTimestamp, formatNumber } from "@/lib/formatters";
import { useAddressFormat } from "@/contexts/address-format-context";
import { Gift, Users, Coins, Clock, CheckCircle2, XCircle, ArrowRight, Sparkles, TrendingUp, Calendar, ExternalLink } from "lucide-react";
import type { Transaction } from "@shared/schema";

interface ClaimStatsResponse {
  totalClaims: number;
  uniqueClaimers: number;
  totalValue: string;
}

interface ClaimTransactionsResponse {
  transactions: Transaction[];
  total: number;
  totalPages: number;
}

interface Airdrop {
  id: string;
  name: string;
  description: string | null;
  tokenSymbol: string | null;
  totalAmount: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  claimUrl: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
}

interface AirdropsListResponse {
  airdrops: Airdrop[];
  total: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "upcoming":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "ended":
      return "bg-gray-500/10 text-gray-600 border-gray-200";
    case "cancelled":
      return "bg-red-500/10 text-red-600 border-red-200";
    default:
      return "";
  }
}

export default function AirdropsPage() {
  const [activeTab, setActiveTab] = useState("claims");
  const [page, setPage] = useState(1);
  const limit = 25;
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data: statsData, isLoading: statsLoading } = useQuery<ClaimStatsResponse>({
    queryKey: ["/api/airdrops/stats"],
    queryFn: async () => {
      const res = await fetch("/api/airdrops/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: claimsData, isLoading: claimsLoading } = useQuery<ClaimTransactionsResponse>({
    queryKey: ["/api/airdrops/claims", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/airdrops/claims?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: airdropsData, isLoading: airdropsLoading, error: airdropsError } = useQuery<AirdropsListResponse>({
    queryKey: ["/api/airdrops"],
    queryFn: async () => {
      const res = await fetch("/api/airdrops");
      if (!res.ok) throw new Error("Failed to fetch airdrops");
      return res.json();
    },
    staleTime: 30000,
  });

  const stats = {
    totalEvents: statsData?.totalClaims || 0,
    totalClaims: statsData?.totalClaims || 0,
    totalValue: statsData?.totalValue || "0",
    uniqueClaimers: statsData?.uniqueClaimers || 0,
  };

  const claims = claimsData?.transactions || [];
  const totalPages = claimsData?.totalPages || 1;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Airdrop Events</h1>
          <p className="text-muted-foreground text-sm">
            Track token airdrops and claim events on Telebit
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold" data-testid="text-total-events">
                  {formatNumber(stats.totalEvents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Claims</p>
                <p className="text-2xl font-bold" data-testid="text-total-claims">
                  {formatNumber(stats.totalClaims)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Claimers</p>
                <p className="text-2xl font-bold" data-testid="text-unique-claimers">
                  {formatNumber(stats.uniqueClaimers)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Network Status</p>
                <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-600 border-green-200">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5" />
            Claim Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="claims" data-testid="tab-claims">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Claims
              </TabsTrigger>
              <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                <Calendar className="h-4 w-4 mr-1" />
                Upcoming
              </TabsTrigger>
            </TabsList>

            <TabsContent value="claims">
              {claimsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : claims.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Claim Events Found</h3>
                  <p className="text-muted-foreground text-sm">
                    No airdrop claim transactions have been detected yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {claims.map((tx) => (
                    <div
                      key={tx.hash}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`row-claim-${tx.hash.slice(0, 10)}`}
                    >
                      <div className="p-2 rounded-full bg-green-500/10">
                        <Gift className="h-5 w-5 text-green-500" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <HashLink hash={tx.hash} type="tx" showCopy={false} />
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                            Claim
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>From:</span>
                          <AddressLink address={tx.from} showCopy={false} className="text-xs" />
                          {tx.to && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              <AddressLink address={tx.to} showCopy={false} className="text-xs" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-medium">{formatTBT(tx.value)} {nativeSymbol}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(tx.timestamp)}
                        </p>
                      </div>

                      <Badge 
                        variant="outline" 
                        className={tx.status === true 
                          ? "bg-green-500/10 text-green-600 border-green-200" 
                          : "bg-red-500/10 text-red-600 border-red-200"
                        }
                      >
                        {tx.status === true ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Success</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {claims.length > 0 && totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming">
              {airdropsError ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Failed to Load Airdrops</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Unable to fetch airdrop data. Please try again later.
                  </p>
                </div>
              ) : airdropsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : airdropsData?.airdrops && airdropsData.airdrops.length > 0 ? (
                <div className="space-y-3">
                  {airdropsData.airdrops.map((airdrop) => (
                    <div
                      key={airdrop.id}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`airdrop-card-${airdrop.id}`}
                    >
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Gift className="h-6 w-6 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{airdrop.name}</span>
                          <Badge variant="outline" className={getStatusColor(airdrop.status)}>
                            {airdrop.status.charAt(0).toUpperCase() + airdrop.status.slice(1)}
                          </Badge>
                          {airdrop.isFeatured && (
                            <Badge variant="secondary" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        {airdrop.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {airdrop.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          {airdrop.tokenSymbol && airdrop.totalAmount && (
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              {formatNumber(parseFloat(airdrop.totalAmount))} {airdrop.tokenSymbol}
                            </span>
                          )}
                          {airdrop.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(airdrop.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {airdrop.claimUrl && airdrop.status === "active" && (
                          <a href={airdrop.claimUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Claim
                            </Button>
                          </a>
                        )}
                        <Link href={`/airdrop/${airdrop.id}`}>
                          <Button size="sm" variant="ghost" data-testid={`button-view-${airdrop.id}`}>
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Airdrops Available</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    There are no active or upcoming airdrops at the moment.
                    Check back later for new opportunities.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            How Airdrops Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Eligibility</h4>
                <p className="text-sm text-muted-foreground">
                  Projects announce eligibility criteria based on wallet activity, holdings, or participation.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Claim Period</h4>
                <p className="text-sm text-muted-foreground">
                  Eligible users can claim their tokens during the specified claim window.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Distribution</h4>
                <p className="text-sm text-muted-foreground">
                  Tokens are transferred to claimers' wallets after successful claim transactions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
