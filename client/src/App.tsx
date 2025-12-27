import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddressFormatProvider } from "@/contexts/address-format-context";
import { DesignProvider } from "@/contexts/design-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";

interface BootstrapSettings {
  settings?: {
    branding?: {
      site_name?: string;
      site_description?: string;
      site_favicon?: string;
    };
  };
}

function MetaUpdater() {
  const { data } = useQuery<BootstrapSettings>({
    queryKey: ["/api/bootstrap"],
    staleTime: 60000,
  });

  useEffect(() => {
    if (!data?.settings?.branding) return;
    
    const { site_name, site_description, site_favicon } = data.settings.branding;
    
    if (site_name) {
      document.title = site_name;
      localStorage.setItem('explorer_site_name', site_name);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (ogTitle) ogTitle.setAttribute("content", site_name);
      if (twitterTitle) twitterTitle.setAttribute("content", site_name);
    }
    
    if (site_description) {
      const desc = document.querySelector('meta[name="description"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (desc) desc.setAttribute("content", site_description);
      if (ogDesc) ogDesc.setAttribute("content", site_description);
      if (twitterDesc) twitterDesc.setAttribute("content", site_description);
    }
    
    if (site_favicon) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) favicon.href = site_favicon;
    }
  }, [data]);

  return null;
}

import Dashboard from "@/pages/dashboard";
import BlocksPage from "@/pages/blocks";
import BlockDetail from "@/pages/block-detail";
import TransactionsPage from "@/pages/transactions";
import TransactionDetail from "@/pages/transaction-detail";
import AddressPage from "@/pages/address";
import NotFound from "@/pages/not-found";

const AccountsPage = lazy(() => import("@/pages/accounts"));
const SearchPage = lazy(() => import("@/pages/search"));
const LoginPage = lazy(() => import("@/pages/login"));
const TokensPage = lazy(() => import("@/pages/tokens"));
const TokenPage = lazy(() => import("@/pages/token"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const ApiDocsPage = lazy(() => import("@/pages/api-docs"));
const WatchlistPage = lazy(() => import("@/pages/watchlist"));
const AirdropsPage = lazy(() => import("@/pages/airdrops"));
const AirdropDetailPage = lazy(() => import("@/pages/airdrop-detail"));
const ApiKeysPage = lazy(() => import("@/pages/developer/api-keys"));
const ApiPlansPage = lazy(() => import("@/pages/developer/plans"));
const AdminLoginPage = lazy(() => import("@/pages/admin/login"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/dashboard"));
const TermsPage = lazy(() => import("@/pages/terms"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));

function PageLoader() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/blocks" component={BlocksPage} />
      <Route path="/block/:id" component={BlockDetail} />
      <Route path="/txs" component={TransactionsPage} />
      <Route path="/tx/:hash" component={TransactionDetail} />
      <Route path="/address/:address" component={AddressPage} />
      <Route path="/accounts" component={AccountsPage} />
      <Route path="/tokens" component={TokensPage} />
      <Route path="/token/:address" component={TokenPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/api-docs" component={ApiDocsPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/airdrops" component={AirdropsPage} />
      <Route path="/airdrop/:id" component={AirdropDetailPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/developer/api-keys" component={ApiKeysPage} />
      <Route path="/developer/plans" component={ApiPlansPage} />
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DesignProvider>
        <AddressFormatProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <MetaUpdater />
              <ScrollToTop />
              <Header />
              <main>
                <Suspense fallback={<PageLoader />}>
                  <Router />
                </Suspense>
              </main>
              <Footer />
            </div>
            <Toaster />
          </TooltipProvider>
        </AddressFormatProvider>
      </DesignProvider>
    </QueryClientProvider>
  );
}

export default App;
