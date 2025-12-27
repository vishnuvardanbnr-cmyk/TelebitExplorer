import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Blocks, ArrowRightLeft, Users, LayoutDashboard, Menu, LogIn, LogOut, Coins, TrendingUp, BookOpen, Gift, Code, Key, CreditCard, ChevronDown } from "lucide-react";
import { ChainSelector } from "./chain-selector";
import { GasTracker } from "./gas-tracker";
import { AddressFormatToggle } from "./address-format-toggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDesign } from "@/contexts/design-context";

interface BrandingSettings {
  site_name?: string;
  site_description?: string;
  site_logo?: string;
  site_favicon?: string;
}

interface NavMenuSettings {
  dashboard?: boolean;
  blocks?: boolean;
  transactions?: boolean;
  tokens?: boolean;
  airdrops?: boolean;
  analytics?: boolean;
  accounts?: boolean;
  docs?: boolean;
}

const allNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/blocks", label: "Blocks", icon: Blocks, key: "blocks" },
  { href: "/txs", label: "Transactions", icon: ArrowRightLeft, key: "transactions" },
  { href: "/tokens", label: "Tokens", icon: Coins, key: "tokens" },
  { href: "/airdrops", label: "Airdrops", icon: Gift, key: "airdrops" },
  { href: "/analytics", label: "Analytics", icon: TrendingUp, key: "analytics" },
  { href: "/accounts", label: "Accounts", icon: Users, key: "accounts" },
  { href: "/api-docs", label: "Docs", icon: BookOpen, key: "docs" },
];

interface User {
  id: number;
  username: string;
  email: string;
}

export function Header() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: isAuthLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: brandingData, isLoading: isBrandingLoading } = useQuery<{ settings: { branding?: BrandingSettings } }>({
    queryKey: ["/api/bootstrap"],
    staleTime: 60000,
    select: (data: any) => ({
      settings: {
        branding: {
          site_name: data?.settings?.branding?.site_name,
          site_description: data?.settings?.branding?.site_description,
          site_logo: data?.settings?.branding?.site_logo,
          site_favicon: data?.settings?.branding?.site_favicon,
        }
      }
    }),
  });

  // Fetch navigation menu settings
  const { data: settingsData } = useQuery<{ settings: { navigation?: NavMenuSettings } }>({
    queryKey: ["/api/settings"],
    staleTime: 60000,
    select: (data: any) => ({
      settings: {
        navigation: data?.settings?.navigation
      }
    }),
  });

  // Filter nav items based on settings (all enabled by default)
  const navMenuSettings = settingsData?.settings?.navigation || {};
  const navItems = allNavItems.filter(item => {
    const isEnabled = navMenuSettings[item.key as keyof NavMenuSettings];
    return isEnabled === undefined ? true : isEnabled;
  });

  const branding = brandingData?.settings?.branding;
  const siteName = branding?.site_name;
  const brandingReady = !isBrandingLoading && brandingData !== undefined;
  const siteLogo = branding?.site_logo;
  const siteFavicon = branding?.site_favicon;

  const defaultFaviconRef = useRef<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [siteLogo]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    
    if (!defaultFaviconRef.current && link) {
      defaultFaviconRef.current = link.href;
    }

    if (siteFavicon) {
      if (link) {
        link.href = siteFavicon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = siteFavicon;
        document.head.appendChild(newLink);
      }
    } else if (defaultFaviconRef.current && link) {
      link.href = defaultFaviconRef.current;
    }
  }, [siteFavicon]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      setLocation("/");
    },
  });

  const isLoggedIn = !!user && !isAuthLoading;
  const { isDesign2, isDesign3 } = useDesign();

  if (isDesign2 || isDesign3) {
    const designPrefix = isDesign3 ? "d3" : "d2";
    return (
      <header className="sticky top-0 z-50 w-full p-2 sm:p-3">
        <div className={`${designPrefix}-header px-3 sm:px-4 py-2 sm:py-3`}>
          <div className="flex items-center justify-between gap-2 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0" data-testid="link-home">
              {!brandingReady ? (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted animate-pulse" />
              ) : siteLogo && !logoError ? (
                <img 
                  src={siteLogo} 
                  alt="Logo" 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-lg"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className={`${designPrefix}-icon-box w-9 h-9 sm:w-10 sm:h-10`}>
                  <Blocks className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              )}
              {brandingReady && siteName && (
                <>
                  <span className={`${designPrefix}-heading ${designPrefix}-gradient-text text-base font-semibold md:hidden`}>
                    {siteName.split(' ').slice(0, 2).join(' ')}
                  </span>
                  <span className={`${designPrefix}-heading ${designPrefix}-gradient-text text-lg sm:text-xl hidden md:inline`}>
                    {siteName}
                  </span>
                </>
              )}
            </Link>
            
            <nav className="hidden lg:flex items-center justify-center gap-1 flex-1">
              {navItems.map((item) => {
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`gap-2 ${designPrefix}-pill ${isActive ? "" : "text-muted-foreground"}`}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <ChainSelector className="hidden md:flex" />
              <div className="hidden xl:flex items-center px-3 py-1.5 rounded-full bg-muted/40 border border-border/50">
                <GasTracker />
              </div>
              <AddressFormatToggle />
              
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={`${designPrefix}-pill gap-2 hidden sm:flex`} data-testid="button-developer-menu">
                      <Code className="h-4 w-4" />
                      <span className="hidden sm:inline">Developer</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    <Link href="/developer/api-keys">
                      <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" data-testid="menu-api-keys">
                        <Key className="h-4 w-4" />
                        API Keys
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/developer/plans">
                      <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" data-testid="menu-api-plans">
                        <CreditCard className="h-4 w-4" />
                        API Plans
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="gap-2 cursor-pointer text-destructive rounded-lg"
                      onClick={() => logoutMutation.mutate()}
                      data-testid="menu-logout"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login" className="hidden sm:block">
                  <Button variant="default" size="sm" className={`${designPrefix}-pill gap-2`} data-testid="button-login">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden rounded-full" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] rounded-2xl p-2 mr-2">
                  <div className="flex items-center gap-2 px-2 py-2 mb-2 md:hidden">
                    <ChainSelector className="flex-1" />
                  </div>
                  <DropdownMenuSeparator className="md:hidden mb-2" />
                  {navItems.map((item) => {
                    const isActive = location === item.href ||
                      (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}>
                        <DropdownMenuItem 
                          className={`gap-2 cursor-pointer rounded-lg ${isActive ? "bg-primary/10 text-primary" : ""}`}
                          data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      </Link>
                    );
                  })}
                  {isLoggedIn ? (
                    <>
                      <DropdownMenuSeparator className="my-2 sm:hidden" />
                      <Link href="/developer/api-keys" className="sm:hidden">
                        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" data-testid="mobile-menu-api-keys">
                          <Key className="h-4 w-4" />
                          API Keys
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/developer/plans" className="sm:hidden">
                        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" data-testid="mobile-menu-api-plans">
                          <CreditCard className="h-4 w-4" />
                          API Plans
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem 
                        className="gap-2 cursor-pointer text-destructive rounded-lg sm:hidden"
                        onClick={() => logoutMutation.mutate()}
                        data-testid="mobile-menu-logout"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuSeparator className="my-2 sm:hidden" />
                      <Link href="/login" className="sm:hidden">
                        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" data-testid="mobile-menu-login">
                          <LogIn className="h-4 w-4" />
                          Login
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className={`${designPrefix}-glow-line mt-1 sm:mt-2 mx-2 sm:mx-4`} />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/95">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2" data-testid="link-home">
              {!brandingReady ? (
                <div className="w-8 h-8 rounded-md bg-muted animate-pulse" />
              ) : siteLogo && !logoError ? (
                <img 
                  src={siteLogo} 
                  alt="Logo" 
                  className="w-8 h-8 rounded-md object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-primary">
                  <Blocks className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              {brandingReady && siteName && (
                <span className="font-semibold text-lg">
                  <span className="sm:hidden">{siteName.split(' ')[0]}</span>
                  <span className="hidden sm:inline">{siteName}</span>
                </span>
              )}
            </Link>
            <ChainSelector className="hidden sm:flex" />
            <AddressFormatToggle />
            <div className="hidden lg:flex items-center px-2 py-1 rounded-md bg-muted/50">
              <GasTracker />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {isLoggedIn ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden md:flex gap-2"
                      data-testid="button-developer-menu"
                    >
                      <Code className="h-4 w-4" />
                      Developer
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link href="/developer/api-keys">
                      <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="menu-api-keys">
                        <Key className="h-4 w-4" />
                        API Keys
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/developer/plans">
                      <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="menu-api-plans">
                        <CreditCard className="h-4 w-4" />
                        API Plans
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="gap-2 cursor-pointer text-destructive"
                      onClick={() => logoutMutation.mutate()}
                      data-testid="menu-logout"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => logoutMutation.mutate()}
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="default"
                    size="sm"
                    className="hidden md:flex gap-2"
                    data-testid="button-login"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                </Link>

                <Link href="/login">
                  <Button
                    variant="default"
                    size="icon"
                    className="md:hidden"
                    data-testid="button-login-mobile"
                  >
                    <LogIn className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map((item) => {
                  const isActive = location === item.href ||
                    (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <DropdownMenuItem 
                        className={`gap-2 cursor-pointer ${isActive ? "bg-secondary" : ""}`}
                        data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
                {isLoggedIn && (
                  <>
                    <DropdownMenuSeparator />
                    <Link href="/developer/api-keys">
                      <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="mobile-nav-api-keys">
                        <Key className="h-4 w-4" />
                        API Keys
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/developer/plans">
                      <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="mobile-nav-api-plans">
                        <CreditCard className="h-4 w-4" />
                        API Plans
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
