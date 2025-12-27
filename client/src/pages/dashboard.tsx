import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { StatsCard } from "@/components/stats-card";
import { BlocksTable } from "@/components/blocks-table";
import { TransactionsTable } from "@/components/transactions-table";
import { SearchBar } from "@/components/search-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Blocks, ArrowRightLeft, Users, Fuel } from "lucide-react";
import { formatNumber, formatCompactNumber, formatGwei } from "@/lib/formatters";
import { useDesign } from "@/contexts/design-context";
import type { Block, Transaction, NetworkStats } from "@shared/schema";

interface BootstrapData {
  stats: NetworkStats;
  blocks: Block[];
  transactions: Transaction[];
  settings: {
    branding?: {
      site_name?: string;
      site_description?: string;
    };
  };
}

export default function Dashboard() {
  const [showStickySearch, setShowStickySearch] = useState(false);
  const searchCardRef = useRef<HTMLDivElement>(null);
  const { isDesign2 } = useDesign();

  // Single API call for all initial data
  const { data: bootstrap, isLoading } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap"],
    staleTime: 3000,
    refetchInterval: 15000,
  });

  const stats = bootstrap?.stats;
  const blocksData = bootstrap?.blocks;
  const txsData = bootstrap?.transactions;
  const settings = bootstrap?.settings;

  const siteName = settings?.branding?.site_name || "Telebit Blockchain Explorer";
  const siteDescription = settings?.branding?.site_description || "Explore blocks, transactions, and accounts on the Telebit network";

  useEffect(() => {
    const handleScroll = () => {
      if (searchCardRef.current) {
        const rect = searchCardRef.current.getBoundingClientRect();
        const headerHeight = 56;
        setShowStickySearch(rect.bottom < headerHeight);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDesign2) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="d2-hero text-white relative">
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="d2-heading text-3xl lg:text-4xl font-bold" data-testid="text-page-title">
                  {siteName}
                </h1>
                <p className="text-white/80 mt-2 max-w-xl text-lg">
                  {siteDescription}
                </p>
              </div>
              <div ref={searchCardRef} className="w-full lg:w-[420px]">
                <div className="bg-white rounded-2xl p-3 shadow-lg">
                  <SearchBar inputClassName="text-gray-900 placeholder:text-gray-500" iconOnly />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2">
                  <Blocks className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 flex-shrink-0" />
                  <span className="text-white/70 text-xs sm:text-sm font-medium truncate">Latest Block</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 font-mono" data-testid="stat-latest-block">
                  {stats?.latestBlock ? formatCompactNumber(stats.latestBlock) : "0"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 flex-shrink-0" />
                  <span className="text-white/70 text-xs sm:text-sm font-medium truncate">Transactions</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 font-mono" data-testid="stat-total-transactions">
                  {stats?.totalTransactions ? formatCompactNumber(stats.totalTransactions) : "0"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 flex-shrink-0" />
                  <span className="text-white/70 text-xs sm:text-sm font-medium truncate">Addresses</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 font-mono" data-testid="stat-total-addresses">
                  {stats?.totalAddresses ? formatCompactNumber(stats.totalAddresses) : "0"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 flex-shrink-0" />
                  <span className="text-white/70 text-xs sm:text-sm font-medium truncate">Gas Price</span>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 font-mono" data-testid="stat-avg-gas-price">
                  {stats?.avgGasPrice ? `${formatGwei(stats.avgGasPrice)}` : "0"} <span className="text-sm sm:text-base lg:text-lg font-normal">Gwei</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {showStickySearch && (
          <div className="fixed top-[58px] sm:top-[72px] left-0 right-0 z-[60] bg-background/95 backdrop-blur-xl border-b shadow-sm lg:hidden animate-in slide-in-from-top duration-200">
            <div className="px-3 sm:px-4 py-2">
              <SearchBar />
            </div>
          </div>
        )}

        <div className="d2-mosaic">
          <div className="d2-card p-0 overflow-hidden">
            <BlocksTable
              blocks={blocksData || []}
              isLoading={isLoading}
              showViewAll
              limit={8}
            />
          </div>
          <div className="d2-card p-0 overflow-hidden">
            <TransactionsTable
              transactions={txsData || []}
              isLoading={isLoading}
              showViewAll
              limit={8}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            {siteName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {siteDescription}
          </p>
        </div>
        <div ref={searchCardRef} className="lg:flex-1 lg:max-w-2xl">
          <Card>
            <CardContent className="p-3">
              <SearchBar />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {showStickySearch && (
        <div 
          className="fixed top-[55px] left-0 right-0 z-40 bg-background border-b lg:hidden animate-in slide-in-from-top duration-200"
        >
          <div className="px-4 py-1.5">
            <SearchBar />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Latest Block"
          value={stats?.latestBlock ? formatNumber(stats.latestBlock) : "0"}
          icon={Blocks}
          isLoading={isLoading}
        />
        <StatsCard
          title="Total Transactions"
          value={stats?.totalTransactions ? formatNumber(stats.totalTransactions) : "0"}
          icon={ArrowRightLeft}
          isLoading={isLoading}
        />
        <StatsCard
          title="Total Addresses"
          value={stats?.totalAddresses ? formatNumber(stats.totalAddresses) : "0"}
          icon={Users}
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg Gas Price"
          value={stats?.avgGasPrice ? `${formatGwei(stats.avgGasPrice)} Gwei` : "0 Gwei"}
          icon={Fuel}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BlocksTable
          blocks={blocksData || []}
          isLoading={isLoading}
          showViewAll
          limit={8}
        />
        <TransactionsTable
          transactions={txsData || []}
          isLoading={isLoading}
          showViewAll
          limit={8}
        />
      </div>
    </div>
  );
}
