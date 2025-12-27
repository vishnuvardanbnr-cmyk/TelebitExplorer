import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Key,
  Activity,
  Database,
  Clock,
  Play,
  Square,
  RefreshCw,
  LogOut,
  Coins,
  Gift,
  Settings,
  Globe,
  Save,
  Plus,
  Trash2,
  FileText,
  Pencil,
  Calendar,
  ExternalLink,
  Palette,
  Menu,
  LayoutDashboard,
  Blocks,
  ArrowRightLeft,
  TrendingUp,
  BookOpen,
  Upload,
} from "lucide-react";
import { SiX, SiGithub, SiDiscord, SiTelegram, SiYoutube, SiMedium, SiLinkedin, SiFacebook, SiInstagram, SiReddit, SiTiktok } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAddressFormat } from "@/contexts/address-format-context";
import { formatDistanceToNow } from "date-fns";

interface AdminStats {
  network: {
    latestBlock: number;
    totalTransactions: number;
    totalAddresses: number;
    avgBlockTime: string;
    avgGasPrice: string;
  } | null;
  indexer: {
    isRunning: boolean;
    currentBlock: number;
    targetBlock: number;
    syncProgress: number;
  };
  uptime: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AdminApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  label: string | null;
  status: string;
  dailyQuota: number;
  usageToday: number;
  lastUsedAt: string | null;
  createdAt: string;
  username?: string;
}

interface Chain {
  id: string;
  chainId: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  nativeCurrency: string;
  nativeSymbol: string;
  nativeDecimals: number;
  isActive: boolean;
  isDefault: boolean;
  bech32Prefix: string | null;
  addressDisplayFormat: string;
}

interface ClaimStats {
  totalClaims: number;
  uniqueClaimers: number;
  totalValue: string;
}

interface SiteSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
}

interface SocialLink {
  icon: string;
  url: string;
  label: string;
}

interface Airdrop {
  id: string;
  name: string;
  description: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  totalAmount: string | null;
  claimedAmount: string | null;
  totalParticipants: number | null;
  claimedCount: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  claimUrl: string | null;
  imageUrl: string | null;
  eligibilityCriteria: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

const SOCIAL_ICONS: Record<string, { icon: any; label: string }> = {
  website: { icon: Globe, label: "Website" },
  twitter: { icon: SiX, label: "Twitter/X" },
  github: { icon: SiGithub, label: "GitHub" },
  discord: { icon: SiDiscord, label: "Discord" },
  telegram: { icon: SiTelegram, label: "Telegram" },
  youtube: { icon: SiYoutube, label: "YouTube" },
  medium: { icon: SiMedium, label: "Medium" },
  linkedin: { icon: SiLinkedin, label: "LinkedIn" },
  facebook: { icon: SiFacebook, label: "Facebook" },
  instagram: { icon: SiInstagram, label: "Instagram" },
  reddit: { icon: SiReddit, label: "Reddit" },
  tiktok: { icon: SiTiktok, label: "TikTok" },
};

export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { chainConfig } = useAddressFormat();
  const displayNativeSymbol = chainConfig.native_symbol || "ETH";

  const { data: adminAuth, isLoading: isAuthLoading } = useQuery<{ isAdmin: boolean; username: string }>({
    queryKey: ["/api/admin/me"],
    retry: false,
  });

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!adminAuth?.isAdmin,
    refetchInterval: 10000,
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["/api/admin/users"],
    enabled: !!adminAuth?.isAdmin,
  });

  const { data: apiKeysData, isLoading: isKeysLoading } = useQuery<{ apiKeys: AdminApiKey[]; total: number }>({
    queryKey: ["/api/admin/api-keys"],
    enabled: !!adminAuth?.isAdmin,
  });

  const { data: chainsData, isLoading: isChainsLoading } = useQuery<{ chains: Chain[] }>({
    queryKey: ["/api/admin/chains"],
    enabled: !!adminAuth?.isAdmin,
  });

  const { data: claimStats, isLoading: isClaimStatsLoading } = useQuery<ClaimStats>({
    queryKey: ["/api/airdrops/stats"],
    enabled: !!adminAuth?.isAdmin,
  });

  const { data: airdropsData, isLoading: isAirdropsLoading } = useQuery<{ airdrops: Airdrop[]; total: number }>({
    queryKey: ["/api/admin/airdrops"],
    enabled: !!adminAuth?.isAdmin,
  });

  const { data: settingsData, isLoading: isSettingsLoading } = useQuery<{ settings: SiteSetting[] }>({
    queryKey: ["/api/admin/settings"],
    enabled: !!adminAuth?.isAdmin,
  });

  // Settings state
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [newSocialIcon, setNewSocialIcon] = useState("twitter");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [chainIdPrefix, setChainIdPrefix] = useState("");
  const [designVariant, setDesignVariant] = useState<"design1" | "design2" | "design3">("design1");
  
  // Navigation menu visibility settings
  const [navMenuItems, setNavMenuItems] = useState<Record<string, boolean>>({
    dashboard: true,
    blocks: true,
    transactions: true,
    tokens: true,
    airdrops: true,
    analytics: true,
    accounts: true,
    docs: true,
  });
  const [siteDescription, setSiteDescription] = useState("");
  const [siteLogo, setSiteLogo] = useState("");
  const [siteFavicon, setSiteFavicon] = useState("");
  const [footerTitle, setFooterTitle] = useState("");
  const [footerDescription, setFooterDescription] = useState("");
  const [copyrightText, setCopyrightText] = useState("");
  const [rpcUrl, setRpcUrl] = useState("https://rpc.telemeet.space");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [apiDocsContent, setApiDocsContent] = useState("");
  
  // Chain configuration settings (stored in site_settings)
  const [chainName, setChainName] = useState("Team369");
  const [chainId, setChainId] = useState("55369");
  const [globalRateLimit, setGlobalRateLimit] = useState("1000");
  const [authRateLimit, setAuthRateLimit] = useState("50");
  const [apiRateLimit, setApiRateLimit] = useState("100");
  const [nativeSymbol, setNativeSymbol] = useState("T369");
  const [nativeName, setNativeName] = useState("Team369");
  const [chainRpcUrl, setChainRpcUrl] = useState("https://rpc.t369coin.org/");
  const [addressFormat, setAddressFormat] = useState("0x");
  const [bech32Prefix, setBech32Prefix] = useState("");

  // Airdrop form state
  const [showAirdropForm, setShowAirdropForm] = useState(false);
  const [editingAirdrop, setEditingAirdrop] = useState<Airdrop | null>(null);
  const [airdropForm, setAirdropForm] = useState({
    name: "",
    description: "",
    contractAddress: "",
    tokenAddress: "",
    tokenSymbol: "TBT",
    totalAmount: "",
    totalParticipants: "",
    status: "upcoming" as "upcoming" | "active" | "ended" | "cancelled",
    startDate: "",
    endDate: "",
    claimUrl: "",
    imageUrl: "",
    eligibilityCriteria: "",
    isActive: true,
    isFeatured: false,
  });

  const resetAirdropForm = () => {
    setAirdropForm({
      name: "",
      description: "",
      contractAddress: "",
      tokenAddress: "",
      tokenSymbol: "TBT",
      totalAmount: "",
      totalParticipants: "",
      status: "upcoming",
      startDate: "",
      endDate: "",
      claimUrl: "",
      imageUrl: "",
      eligibilityCriteria: "",
      isActive: true,
      isFeatured: false,
    });
    setEditingAirdrop(null);
    setShowAirdropForm(false);
  };

  const createAirdropMutation = useMutation({
    mutationFn: async (data: typeof airdropForm) => {
      return apiRequest("POST", "/api/admin/airdrops", {
        ...data,
        totalParticipants: data.totalParticipants ? parseInt(data.totalParticipants) : null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        contractAddress: data.contractAddress || null,
        tokenAddress: data.tokenAddress || null,
        claimUrl: data.claimUrl || null,
        imageUrl: data.imageUrl || null,
        eligibilityCriteria: data.eligibilityCriteria || null,
        description: data.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/airdrops"] });
      toast({ title: "Airdrop created successfully" });
      resetAirdropForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create airdrop", description: error.message, variant: "destructive" });
    },
  });

  const updateAirdropMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof airdropForm }) => {
      return apiRequest("PUT", `/api/admin/airdrops/${id}`, {
        ...data,
        totalParticipants: data.totalParticipants ? parseInt(data.totalParticipants) : null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        contractAddress: data.contractAddress || null,
        tokenAddress: data.tokenAddress || null,
        claimUrl: data.claimUrl || null,
        imageUrl: data.imageUrl || null,
        eligibilityCriteria: data.eligibilityCriteria || null,
        description: data.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/airdrops"] });
      toast({ title: "Airdrop updated successfully" });
      resetAirdropForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update airdrop", description: error.message, variant: "destructive" });
    },
  });

  const deleteAirdropMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/airdrops/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/airdrops"] });
      toast({ title: "Airdrop deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete airdrop", description: error.message, variant: "destructive" });
    },
  });

  const handleEditAirdrop = (airdrop: Airdrop) => {
    setEditingAirdrop(airdrop);
    setAirdropForm({
      name: airdrop.name,
      description: airdrop.description || "",
      contractAddress: airdrop.contractAddress || "",
      tokenAddress: airdrop.tokenAddress || "",
      tokenSymbol: airdrop.tokenSymbol || "TBT",
      totalAmount: airdrop.totalAmount || "",
      totalParticipants: airdrop.totalParticipants?.toString() || "",
      status: airdrop.status as "upcoming" | "active" | "ended" | "cancelled",
      startDate: airdrop.startDate ? new Date(airdrop.startDate).toISOString().slice(0, 16) : "",
      endDate: airdrop.endDate ? new Date(airdrop.endDate).toISOString().slice(0, 16) : "",
      claimUrl: airdrop.claimUrl || "",
      imageUrl: airdrop.imageUrl || "",
      eligibilityCriteria: airdrop.eligibilityCriteria || "",
      isActive: airdrop.isActive,
      isFeatured: airdrop.isFeatured,
    });
    setShowAirdropForm(true);
  };

  // Chain editing state
  const [editingChain, setEditingChain] = useState<Chain | null>(null);
  const [chainForm, setChainForm] = useState({
    chainId: 55369,
    name: "",
    shortName: "",
    rpcUrl: "",
    nativeCurrency: "",
    nativeSymbol: "",
    nativeDecimals: 18,
    isActive: true,
    isDefault: false,
    bech32Prefix: "",
    addressDisplayFormat: "0x" as "0x" | "bech32",
  });

  const resetChainForm = () => {
    setChainForm({
      chainId: 55369,
      name: "",
      shortName: "",
      rpcUrl: "",
      nativeCurrency: "",
      nativeSymbol: "",
      nativeDecimals: 18,
      isActive: true,
      isDefault: false,
      bech32Prefix: "",
      addressDisplayFormat: "0x",
    });
    setEditingChain(null);
  };

  const handleEditChain = (chain: Chain) => {
    setEditingChain(chain);
    setChainForm({
      chainId: chain.chainId,
      name: chain.name,
      shortName: chain.shortName,
      rpcUrl: chain.rpcUrl,
      nativeCurrency: chain.nativeCurrency,
      nativeSymbol: chain.nativeSymbol || chain.shortName,
      nativeDecimals: chain.nativeDecimals || 18,
      isActive: chain.isActive,
      isDefault: chain.isDefault,
      bech32Prefix: chain.bech32Prefix || "",
      addressDisplayFormat: (chain.addressDisplayFormat || "0x") as "0x" | "bech32",
    });
  };

  const updateChainMutation = useMutation({
    mutationFn: async ({ chainId, data }: { chainId: number; data: typeof chainForm }) => {
      return apiRequest("PATCH", `/api/chains/${chainId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Chain updated successfully" });
      resetChainForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update chain", description: error.message, variant: "destructive" });
    },
  });

  // Load settings into state when data changes
  const loadSettingsToState = () => {
    if (!settingsData?.settings) return;
    
    const settings = settingsData.settings;
    const socialLinksData = settings.find(s => s.key === "social_links");
    if (socialLinksData) {
      try {
        setSocialLinks(JSON.parse(socialLinksData.value));
      } catch { setSocialLinks([]); }
    }
    
    const name = settings.find(s => s.key === "site_name");
    if (name) setSiteName(name.value);
    
    const design = settings.find(s => s.key === "design_variant");
    if (design && (design.value === "design1" || design.value === "design2" || design.value === "design3")) {
      setDesignVariant(design.value as "design1" | "design2" | "design3");
    }
    
    const desc = settings.find(s => s.key === "site_description");
    if (desc) setSiteDescription(desc.value);
    
    const logo = settings.find(s => s.key === "site_logo");
    if (logo) setSiteLogo(logo.value);
    
    const favicon = settings.find(s => s.key === "site_favicon");
    if (favicon) setSiteFavicon(favicon.value);
    
    const fTitle = settings.find(s => s.key === "footer_title");
    if (fTitle) setFooterTitle(fTitle.value);
    
    const fDesc = settings.find(s => s.key === "footer_description");
    if (fDesc) setFooterDescription(fDesc.value);
    
    const copyright = settings.find(s => s.key === "copyright_text");
    if (copyright) setCopyrightText(copyright.value);
    
    const rpc = settings.find(s => s.key === "rpc_url");
    if (rpc) setRpcUrl(rpc.value);
    
    const terms = settings.find(s => s.key === "terms_content");
    if (terms) setTermsContent(terms.value);
    
    const privacy = settings.find(s => s.key === "privacy_content");
    if (privacy) setPrivacyContent(privacy.value);
    
    const apiDocs = settings.find(s => s.key === "api_docs_content");
    if (apiDocs) setApiDocsContent(apiDocs.value);
    
    // Load chain configuration settings
    const chainNameSetting = settings.find(s => s.key === "chain_name" && s.category === "chain");
    if (chainNameSetting) setChainName(chainNameSetting.value);
    
    const chainIdSetting = settings.find(s => s.key === "chain_id" && s.category === "chain");
    if (chainIdSetting) setChainId(chainIdSetting.value);
    
    const chainIdPrefixSetting = settings.find(s => s.key === "chain_id_prefix" && s.category === "chain");
    if (chainIdPrefixSetting) setChainIdPrefix(chainIdPrefixSetting.value);
    
    const globalRateLimitSetting = settings.find(s => s.key === "global_rate_limit" && s.category === "security");
    if (globalRateLimitSetting) setGlobalRateLimit(globalRateLimitSetting.value);
    
    const authRateLimitSetting = settings.find(s => s.key === "auth_rate_limit" && s.category === "security");
    if (authRateLimitSetting) setAuthRateLimit(authRateLimitSetting.value);
    
    const apiRateLimitSetting = settings.find(s => s.key === "api_rate_limit" && s.category === "security");
    if (apiRateLimitSetting) setApiRateLimit(apiRateLimitSetting.value);
    
    const nativeSymbolSetting = settings.find(s => s.key === "native_symbol" && s.category === "chain");
    if (nativeSymbolSetting) setNativeSymbol(nativeSymbolSetting.value);
    
    const nativeNameSetting = settings.find(s => s.key === "native_name" && s.category === "chain");
    if (nativeNameSetting) setNativeName(nativeNameSetting.value);
    
    const chainRpcSetting = settings.find(s => s.key === "rpc_url" && s.category === "chain");
    if (chainRpcSetting) setChainRpcUrl(chainRpcSetting.value);
    
    const addressFormatSetting = settings.find(s => s.key === "address_format" && s.category === "chain");
    if (addressFormatSetting) setAddressFormat(addressFormatSetting.value);
    
    const bech32PrefixSetting = settings.find(s => s.key === "bech32_prefix" && s.category === "chain");
    if (bech32PrefixSetting) setBech32Prefix(bech32PrefixSetting.value);
    
    // Load navigation menu visibility settings
    const navMenuSetting = settings.find(s => s.key === "nav_menu_items" && s.category === "navigation");
    if (navMenuSetting) {
      try {
        const parsed = JSON.parse(navMenuSetting.value);
        setNavMenuItems(parsed);
      } catch {
        // Keep defaults if parsing fails
      }
    }
  };

  // Load settings when data is available
  if (settingsData && !isSettingsLoading) {
    const settings = settingsData.settings;
    const socialLinksData = settings.find(s => s.key === "social_links");
    const currentLinks = socialLinksData ? JSON.parse(socialLinksData.value || "[]") : [];
    if (JSON.stringify(currentLinks) !== JSON.stringify(socialLinks) && socialLinks.length === 0 && currentLinks.length > 0) {
      loadSettingsToState();
    }
  }

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value, category }: { key: string; value: string; category: string }) => {
      const res = await apiRequest("PUT", "/api/admin/settings", { key, value, category });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Setting saved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save setting", description: error.message, variant: "destructive" });
    },
  });

  const addSocialLink = () => {
    if (!newSocialUrl.trim()) return;
    const iconInfo = SOCIAL_ICONS[newSocialIcon];
    const newLink: SocialLink = {
      icon: newSocialIcon,
      url: newSocialUrl,
      label: iconInfo?.label || newSocialIcon,
    };
    const updated = [...socialLinks, newLink];
    setSocialLinks(updated);
    setNewSocialUrl("");
    saveSettingMutation.mutate({ key: "social_links", value: JSON.stringify(updated), category: "social" });
  };

  const removeSocialLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    setSocialLinks(updated);
    saveSettingMutation.mutate({ key: "social_links", value: JSON.stringify(updated), category: "social" });
  };

  const saveBranding = () => {
    saveSettingMutation.mutate({ key: "site_name", value: siteName, category: "branding" });
    saveSettingMutation.mutate({ key: "site_description", value: siteDescription, category: "branding" });
    saveSettingMutation.mutate({ key: "site_logo", value: siteLogo, category: "branding" });
    saveSettingMutation.mutate({ key: "site_favicon", value: siteFavicon, category: "branding" });
    saveSettingMutation.mutate({ key: "footer_title", value: footerTitle, category: "branding" });
    saveSettingMutation.mutate({ key: "footer_description", value: footerDescription, category: "branding" });
    saveSettingMutation.mutate({ key: "copyright_text", value: copyrightText, category: "branding" });
  };

  const saveRpcConfig = () => {
    saveSettingMutation.mutate({ key: "rpc_url", value: rpcUrl, category: "network" });
  };

  const saveLegalPage = (type: "terms" | "privacy" | "api_docs") => {
    const content = type === "terms" ? termsContent : type === "privacy" ? privacyContent : apiDocsContent;
    saveSettingMutation.mutate({ key: `${type}_content`, value: content, category: "legal" });
  };

  const toggleNavMenuItem = (key: string) => {
    const updated = { ...navMenuItems, [key]: !navMenuItems[key] };
    setNavMenuItems(updated);
    saveSettingMutation.mutate({ 
      key: "nav_menu_items", 
      value: JSON.stringify(updated), 
      category: "navigation" 
    });
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      toast({ title: "Logged out" });
      setLocation("/admin");
    },
  });

  const startIndexerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/indexer/start");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Indexer started" });
      refetchStats();
    },
    onError: (error: any) => {
      toast({ title: "Failed to start indexer", description: error.message, variant: "destructive" });
    },
  });

  const stopIndexerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/indexer/stop");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Indexer stopped" });
      refetchStats();
    },
    onError: (error: any) => {
      toast({ title: "Failed to stop indexer", description: error.message, variant: "destructive" });
    },
  });

  if (isAuthLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!adminAuth?.isAdmin) {
    setLocation("/admin");
    return null;
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {adminAuth.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchStats()} data-testid="button-refresh-stats">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={() => logoutMutation.mutate()} data-testid="button-admin-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {isUsersLoading ? <Skeleton className="h-8 w-16" /> : usersData?.total || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-api-keys">
              {isKeysLoading ? <Skeleton className="h-8 w-16" /> : apiKeysData?.total || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Block</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-latest-block">
              {isStatsLoading ? <Skeleton className="h-8 w-20" /> : stats?.network?.latestBlock?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-uptime">
              {isStatsLoading ? <Skeleton className="h-8 w-16" /> : formatUptime(stats?.uptime || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              API Users
            </TabsTrigger>
            <TabsTrigger value="keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="chains" className="gap-2">
              <Activity className="h-4 w-4" />
              Chain Status
            </TabsTrigger>
            <TabsTrigger value="airdrops" className="gap-2">
              <Gift className="h-4 w-4" />
              Airdrops
            </TabsTrigger>
            <TabsTrigger value="indexer" className="gap-2">
              <Database className="h-4 w-4" />
              Indexer
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Registered API Users</CardTitle>
              <CardDescription>Users who have signed up for API access</CardDescription>
            </CardHeader>
            <CardContent>
              {isUsersLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : usersData?.users && usersData.users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.users.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No registered users yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle>All API Keys</CardTitle>
              <CardDescription>API keys created by all users with usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {isKeysLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : apiKeysData?.apiKeys && apiKeysData.apiKeys.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Usage Today</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeysData.apiKeys.map((key) => (
                        <TableRow key={key.id} data-testid={`api-key-row-${key.id}`}>
                          <TableCell>
                            <div className="font-medium">{key.label || "Unnamed"}</div>
                            <div className="text-xs text-muted-foreground font-mono">{key.keyPrefix}...</div>
                          </TableCell>
                          <TableCell>{key.username || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge variant={key.status === "active" ? "default" : "secondary"}>
                              {key.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={key.usageToday >= key.dailyQuota ? "text-destructive" : ""}>
                              {key.usageToday.toLocaleString()} / {key.dailyQuota.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            {key.lastUsedAt ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true }) : "Never"}
                          </TableCell>
                          <TableCell>{formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chains">
          <div className="space-y-6">
            {editingChain && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Chain: {editingChain.name}</CardTitle>
                  <CardDescription>Update chain configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chain-id">Chain ID</Label>
                      <Input
                        id="chain-id"
                        type="number"
                        value={chainForm.chainId}
                        onChange={(e) => setChainForm({...chainForm, chainId: parseInt(e.target.value) || 55369})}
                        placeholder="55369"
                        data-testid="input-chain-id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-name">Chain Name</Label>
                      <Input
                        id="chain-name"
                        value={chainForm.name}
                        onChange={(e) => setChainForm({...chainForm, name: e.target.value})}
                        placeholder="Team369 Mainnet"
                        data-testid="input-chain-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-short-name">Short Name</Label>
                      <Input
                        id="chain-short-name"
                        value={chainForm.shortName}
                        onChange={(e) => setChainForm({...chainForm, shortName: e.target.value})}
                        placeholder="t369"
                        data-testid="input-chain-short-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-rpc">RPC URL</Label>
                      <Input
                        id="chain-rpc"
                        value={chainForm.rpcUrl}
                        onChange={(e) => setChainForm({...chainForm, rpcUrl: e.target.value})}
                        placeholder="https://rpc.t369coin.org"
                        data-testid="input-chain-rpc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-symbol">Native Symbol</Label>
                      <Input
                        id="chain-symbol"
                        value={chainForm.nativeSymbol}
                        onChange={(e) => setChainForm({...chainForm, nativeSymbol: e.target.value})}
                        placeholder="T369"
                        data-testid="input-chain-symbol"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-currency">Native Currency Name</Label>
                      <Input
                        id="chain-currency"
                        value={chainForm.nativeCurrency}
                        onChange={(e) => setChainForm({...chainForm, nativeCurrency: e.target.value})}
                        placeholder="Team369"
                        data-testid="input-chain-currency"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-decimals">Decimals</Label>
                      <Input
                        id="chain-decimals"
                        type="number"
                        value={chainForm.nativeDecimals}
                        onChange={(e) => setChainForm({...chainForm, nativeDecimals: parseInt(e.target.value) || 18})}
                        placeholder="18"
                        data-testid="input-chain-decimals"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chain-address-format">Address Display Format</Label>
                      <Select
                        value={chainForm.addressDisplayFormat}
                        onValueChange={(value) => setChainForm({...chainForm, addressDisplayFormat: value as "0x" | "bech32"})}
                      >
                        <SelectTrigger id="chain-address-format" data-testid="select-address-format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0x">0x Hex Format (e.g., 0x1234...)</SelectItem>
                          <SelectItem value="bech32">Custom Bech32 Prefix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {chainForm.addressDisplayFormat === "bech32" && (
                      <div className="space-y-2">
                        <Label htmlFor="chain-bech32-prefix">Bech32 Address Prefix</Label>
                        <Input
                          id="chain-bech32-prefix"
                          value={chainForm.bech32Prefix}
                          onChange={(e) => setChainForm({...chainForm, bech32Prefix: e.target.value.toLowerCase()})}
                          placeholder="t369"
                          data-testid="input-bech32-prefix"
                        />
                        <p className="text-xs text-muted-foreground">
                          Addresses will display as: {chainForm.bech32Prefix || "t369"}1abc...xyz
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Button
                      onClick={() => {
                        updateChainMutation.mutate({
                          chainId: editingChain.chainId,
                          data: chainForm,
                        });
                      }}
                      disabled={updateChainMutation.isPending}
                      data-testid="button-save-chain"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateChainMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={resetChainForm} data-testid="button-cancel-chain">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Chain Configuration</CardTitle>
                <CardDescription>Configured blockchain networks</CardDescription>
              </CardHeader>
              <CardContent>
                {isChainsLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : chainsData?.chains && chainsData.chains.length > 0 ? (
                  <div className="space-y-4">
                    {chainsData.chains.map((chain) => (
                      <div key={chain.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`chain-${chain.chainId}`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{chain.name}</span>
                            <Badge variant="outline">{chain.nativeSymbol || chain.shortName}</Badge>
                            {chain.isDefault && <Badge>Default</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Chain ID: {chain.chainId} | RPC: {chain.rpcUrl}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Native: {chain.nativeCurrency} ({chain.nativeSymbol || chain.shortName})
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditChain(chain)}
                            data-testid={`button-edit-chain-${chain.chainId}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Badge variant={chain.isActive ? "default" : "secondary"}>
                            {chain.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chains configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="airdrops">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Claim Statistics</CardTitle>
                <CardDescription>Overview of blockchain airdrop claim activity</CardDescription>
              </CardHeader>
              <CardContent>
                {isClaimStatsLoading ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Gift className="h-4 w-4" />
                        <span className="text-sm">Total Claims</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="text-total-claims">
                        {claimStats?.totalClaims?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Unique Claimers</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="text-unique-claimers">
                        {claimStats?.uniqueClaimers?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Coins className="h-4 w-4" />
                        <span className="text-sm">Total Value</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="text-total-value">
                        {claimStats?.totalValue || "0"} {displayNativeSymbol}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Airdrop Campaigns</CardTitle>
                  <CardDescription>Create and manage airdrop events</CardDescription>
                </div>
                <Button 
                  onClick={() => { resetAirdropForm(); setShowAirdropForm(true); }}
                  className="gap-2"
                  data-testid="button-create-airdrop"
                >
                  <Plus className="h-4 w-4" />
                  Create Airdrop
                </Button>
              </CardHeader>
              <CardContent>
                {showAirdropForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingAirdrop ? "Edit Airdrop" : "Create New Airdrop"}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={airdropForm.name}
                          onChange={(e) => setAirdropForm({ ...airdropForm, name: e.target.value })}
                          placeholder="TBT Community Airdrop"
                          data-testid="input-airdrop-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={airdropForm.status}
                          onValueChange={(v) => setAirdropForm({ ...airdropForm, status: v as any })}
                        >
                          <SelectTrigger data-testid="select-airdrop-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="ended">Ended</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={airdropForm.description}
                          onChange={(e) => setAirdropForm({ ...airdropForm, description: e.target.value })}
                          placeholder="Describe the airdrop..."
                          rows={3}
                          data-testid="input-airdrop-description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Token Symbol</Label>
                        <Input
                          value={airdropForm.tokenSymbol}
                          onChange={(e) => setAirdropForm({ ...airdropForm, tokenSymbol: e.target.value })}
                          placeholder="TBT"
                          data-testid="input-airdrop-token"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Amount</Label>
                        <Input
                          value={airdropForm.totalAmount}
                          onChange={(e) => setAirdropForm({ ...airdropForm, totalAmount: e.target.value })}
                          placeholder="1000000"
                          data-testid="input-airdrop-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="datetime-local"
                          value={airdropForm.startDate}
                          onChange={(e) => setAirdropForm({ ...airdropForm, startDate: e.target.value })}
                          data-testid="input-airdrop-start"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="datetime-local"
                          value={airdropForm.endDate}
                          onChange={(e) => setAirdropForm({ ...airdropForm, endDate: e.target.value })}
                          data-testid="input-airdrop-end"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contract Address</Label>
                        <Input
                          value={airdropForm.contractAddress}
                          onChange={(e) => setAirdropForm({ ...airdropForm, contractAddress: e.target.value })}
                          placeholder="0x..."
                          data-testid="input-airdrop-contract"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Claim URL</Label>
                        <Input
                          value={airdropForm.claimUrl}
                          onChange={(e) => setAirdropForm({ ...airdropForm, claimUrl: e.target.value })}
                          placeholder="https://..."
                          data-testid="input-airdrop-url"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Eligibility Criteria</Label>
                        <Textarea
                          value={airdropForm.eligibilityCriteria}
                          onChange={(e) => setAirdropForm({ ...airdropForm, eligibilityCriteria: e.target.value })}
                          placeholder="Who is eligible for this airdrop..."
                          rows={2}
                          data-testid="input-airdrop-eligibility"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={airdropForm.isActive}
                            onChange={(e) => setAirdropForm({ ...airdropForm, isActive: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={airdropForm.isFeatured}
                            onChange={(e) => setAirdropForm({ ...airdropForm, isFeatured: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Featured</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => {
                          if (editingAirdrop) {
                            updateAirdropMutation.mutate({ id: editingAirdrop.id, data: airdropForm });
                          } else {
                            createAirdropMutation.mutate(airdropForm);
                          }
                        }}
                        disabled={!airdropForm.name || createAirdropMutation.isPending || updateAirdropMutation.isPending}
                        className="gap-2"
                        data-testid="button-save-airdrop"
                      >
                        <Save className="h-4 w-4" />
                        {editingAirdrop ? "Update" : "Create"}
                      </Button>
                      <Button variant="outline" onClick={resetAirdropForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {isAirdropsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : airdropsData?.airdrops && airdropsData.airdrops.length > 0 ? (
                  <div className="space-y-3">
                    {airdropsData.airdrops.map((airdrop) => (
                      <div
                        key={airdrop.id}
                        className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                        data-testid={`airdrop-item-${airdrop.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{airdrop.name}</span>
                            <Badge variant={
                              airdrop.status === "active" ? "default" :
                              airdrop.status === "upcoming" ? "secondary" :
                              airdrop.status === "ended" ? "outline" : "destructive"
                            }>
                              {airdrop.status}
                            </Badge>
                            {airdrop.isFeatured && <Badge variant="outline">Featured</Badge>}
                            {!airdrop.isActive && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          {airdrop.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{airdrop.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            {airdrop.tokenSymbol && (
                              <span className="flex items-center gap-1">
                                <Coins className="h-3 w-3" />
                                {airdrop.totalAmount ? `${airdrop.totalAmount} ${airdrop.tokenSymbol}` : airdrop.tokenSymbol}
                              </span>
                            )}
                            {airdrop.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(airdrop.startDate).toLocaleDateString()}
                              </span>
                            )}
                            {airdrop.claimUrl && (
                              <a 
                                href={airdrop.claimUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Claim
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditAirdrop(airdrop)}
                            data-testid={`button-edit-airdrop-${airdrop.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this airdrop?")) {
                                deleteAirdropMutation.mutate(airdrop.id);
                              }
                            }}
                            disabled={deleteAirdropMutation.isPending}
                            data-testid={`button-delete-airdrop-${airdrop.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No airdrop campaigns created yet</p>
                    <p className="text-sm">Click "Create Airdrop" to add your first campaign</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indexer">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Indexer</CardTitle>
              <CardDescription>Control and monitor the blockchain indexer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Indexer Status</span>
                    <Badge variant={stats?.indexer?.isRunning ? "default" : "secondary"}>
                      {stats?.indexer?.isRunning ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Block</span>
                      <span className="font-mono">{stats?.indexer?.currentBlock?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Block</span>
                      <span className="font-mono">{stats?.indexer?.targetBlock?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sync Progress</span>
                      <span>{stats?.indexer?.syncProgress || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <span className="text-sm font-medium">Indexer Controls</span>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => startIndexerMutation.mutate()}
                      disabled={stats?.indexer?.isRunning || startIndexerMutation.isPending}
                      className="gap-2"
                      data-testid="button-start-indexer"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={!stats?.indexer?.isRunning || stopIndexerMutation.isPending}
                          className="gap-2"
                          data-testid="button-stop-indexer"
                        >
                          <Square className="h-4 w-4" />
                          Stop
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Stop Blockchain Indexer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will stop the blockchain indexer. New blocks and transactions will not be indexed until you start it again. Are you sure you want to continue?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-stop">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => stopIndexerMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-stop"
                          >
                            Yes, Stop Indexer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <span className="text-sm font-medium">Network Statistics</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Transactions</div>
                    <div className="font-bold">{stats?.network?.totalTransactions?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Addresses</div>
                    <div className="font-bold">{stats?.network?.totalAddresses?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Block Time</div>
                    <div className="font-bold">{stats?.network?.avgBlockTime || "0"}s</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Gas Price</div>
                    <div className="font-bold">{stats?.network?.avgGasPrice || "0"} Gwei</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Social Media Links
                </CardTitle>
                <CardDescription>Configure social media links displayed in the footer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {socialLinks.map((link, index) => {
                    const IconComponent = SOCIAL_ICONS[link.icon]?.icon || Globe;
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-lg" data-testid={`social-link-${index}`}>
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{link.url}</span>
                        <Badge variant="outline">{link.label}</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeSocialLink(index)}
                          data-testid={`button-remove-social-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1 w-32">
                    <Label>Platform</Label>
                    <Select value={newSocialIcon} onValueChange={setNewSocialIcon}>
                      <SelectTrigger data-testid="select-social-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SOCIAL_ICONS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label>URL</Label>
                    <Input
                      value={newSocialUrl}
                      onChange={(e) => setNewSocialUrl(e.target.value)}
                      placeholder="https://twitter.com/yourhandle"
                      data-testid="input-social-url"
                    />
                  </div>
                  <Button onClick={addSocialLink} disabled={!newSocialUrl.trim()} data-testid="button-add-social">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Menu className="h-5 w-5" />
                  Navigation Menu
                </CardTitle>
                <CardDescription>Enable or disable navigation menu items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                    { key: "blocks", label: "Blocks", icon: Blocks },
                    { key: "transactions", label: "Transactions", icon: ArrowRightLeft },
                    { key: "tokens", label: "Tokens", icon: Coins },
                    { key: "airdrops", label: "Airdrops", icon: Gift },
                    { key: "analytics", label: "Analytics", icon: TrendingUp },
                    { key: "accounts", label: "Accounts", icon: Users },
                    { key: "docs", label: "Docs", icon: BookOpen },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div 
                        key={item.key} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`nav-item-${item.key}`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <Switch
                          checked={navMenuItems[item.key] ?? true}
                          onCheckedChange={() => toggleNavMenuItem(item.key)}
                          data-testid={`switch-nav-${item.key}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Design Theme
                </CardTitle>
                <CardDescription>Choose between classic, premium, and ocean design styles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div 
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${designVariant === "design1" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                    onClick={() => setDesignVariant("design1")}
                    data-testid="design-option-1"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-20 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">Classic Blue</span>
                      </div>
                      <div className="text-center">
                        <h4 className="font-medium">Design 1 - Classic</h4>
                        <p className="text-xs text-muted-foreground">Clean, professional blue theme</p>
                      </div>
                    </div>
                    {designVariant === "design1" && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div 
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${designVariant === "design2" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                    onClick={() => setDesignVariant("design2")}
                    data-testid="design-option-2"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-20 rounded-md bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">Premium Teal</span>
                      </div>
                      <div className="text-center">
                        <h4 className="font-medium">Design 2 - Premium</h4>
                        <p className="text-xs text-muted-foreground">Modern sapphire/teal with glass effects</p>
                      </div>
                    </div>
                    {designVariant === "design2" && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div 
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${designVariant === "design3" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                    onClick={() => setDesignVariant("design3")}
                    data-testid="design-option-3"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-20 rounded-md bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">Ocean Theme</span>
                      </div>
                      <div className="text-center">
                        <h4 className="font-medium">Design 3 - Ocean</h4>
                        <p className="text-xs text-muted-foreground">Deep ocean blues and aqua greens</p>
                      </div>
                    </div>
                    {designVariant === "design3" && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    saveSettingMutation.mutate({ key: "design_variant", value: designVariant, category: "branding" }, {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
                        document.documentElement.classList.remove("design1", "design2", "design3");
                        document.documentElement.classList.add(designVariant);
                        const designNames: Record<string, string> = { design1: "Classic", design2: "Premium", design3: "Ocean" };
                        toast({ title: "Design theme saved", description: `Switched to ${designNames[designVariant]} design` });
                      }
                    });
                  }} 
                  disabled={saveSettingMutation.isPending} 
                  data-testid="button-save-design"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Apply Design Theme
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Branding
                </CardTitle>
                <CardDescription>Configure site name, logo, and favicon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name (Header Title)</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Team369 Explorer"
                    data-testid="input-site-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Input
                    id="siteDescription"
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="Blockchain Explorer for Team369"
                    data-testid="input-site-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteLogo">Logo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="siteLogo"
                      value={siteLogo}
                      onChange={(e) => setSiteLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      data-testid="input-site-logo"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => document.getElementById('logoUpload')?.click()}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input
                      id="logoUpload"
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast({ title: "Error", description: "File too large. Max 2MB.", variant: "destructive" });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            const base64 = reader.result as string;
                            const res = await apiRequest("POST", "/api/admin/upload", {
                              type: "logo",
                              data: base64,
                              filename: file.name,
                            });
                            const data = await res.json();
                            setSiteLogo(data.url);
                            toast({ title: "Success", description: "Logo uploaded successfully!" });
                          } catch (err: any) {
                            toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a URL or upload an image (recommended: 32x32 or 40x40 pixels)
                  </p>
                  {siteLogo && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Preview:</span>
                      <img src={siteLogo} alt="Logo preview" className="w-8 h-8 rounded-md object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteFavicon">Favicon</Label>
                  <div className="flex gap-2">
                    <Input
                      id="siteFavicon"
                      value={siteFavicon}
                      onChange={(e) => setSiteFavicon(e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                      data-testid="input-site-favicon"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => document.getElementById('faviconUpload')?.click()}
                      data-testid="button-upload-favicon"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input
                      id="faviconUpload"
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/svg+xml,image/x-icon,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast({ title: "Error", description: "File too large. Max 2MB.", variant: "destructive" });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            const base64 = reader.result as string;
                            const res = await apiRequest("POST", "/api/admin/upload", {
                              type: "favicon",
                              data: base64,
                              filename: file.name,
                            });
                            const data = await res.json();
                            setSiteFavicon(data.url);
                            toast({ title: "Success", description: "Favicon uploaded successfully!" });
                          } catch (err: any) {
                            toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a URL or upload an image (recommended: .ico, .png, or .svg format)
                  </p>
                  {siteFavicon && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Preview:</span>
                      <img src={siteFavicon} alt="Favicon preview" className="w-4 h-4 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                  )}
                </div>
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Footer Branding</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="footerTitle">Footer Title</Label>
                      <Input
                        id="footerTitle"
                        value={footerTitle}
                        onChange={(e) => setFooterTitle(e.target.value)}
                        placeholder="e.g., Team369 Explorer"
                        data-testid="input-footer-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footerDescription">Footer Description</Label>
                      <Textarea
                        id="footerDescription"
                        value={footerDescription}
                        onChange={(e) => setFooterDescription(e.target.value)}
                        placeholder="e.g., Blockchain Explorer for Team369. Track transactions, explore blocks, and interact with smart contracts."
                        data-testid="input-footer-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="copyrightText">Copyright Text</Label>
                      <Input
                        id="copyrightText"
                        value={copyrightText}
                        onChange={(e) => setCopyrightText(e.target.value)}
                        placeholder="e.g., © 2025 Team369. All rights reserved."
                        data-testid="input-copyright-text"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use default: © [Year] [Chain Name]. All rights reserved.
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={saveBranding} disabled={saveSettingMutation.isPending} data-testid="button-save-branding">
                  <Save className="h-4 w-4 mr-2" />
                  Save Branding
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Chain Configuration
                </CardTitle>
                <CardDescription>Configure blockchain network settings, chain ID, and address format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chainName">Chain Name</Label>
                    <Input
                      id="chainName"
                      value={chainName}
                      onChange={(e) => setChainName(e.target.value)}
                      placeholder="Team369"
                      data-testid="input-chain-name-settings"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chainId">Chain ID</Label>
                    <Input
                      id="chainId"
                      value={chainId}
                      onChange={(e) => setChainId(e.target.value)}
                      placeholder="55369"
                      data-testid="input-chain-id-settings"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nativeSymbol">Native Token Symbol</Label>
                    <Input
                      id="nativeSymbol"
                      value={nativeSymbol}
                      onChange={(e) => setNativeSymbol(e.target.value)}
                      placeholder="T369"
                      data-testid="input-native-symbol-settings"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nativeName">Native Token Name</Label>
                    <Input
                      id="nativeName"
                      value={nativeName}
                      onChange={(e) => setNativeName(e.target.value)}
                      placeholder="Team369"
                      data-testid="input-native-name-settings"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chainRpcUrl">RPC URL</Label>
                    <Input
                      id="chainRpcUrl"
                      value={chainRpcUrl}
                      onChange={(e) => setChainRpcUrl(e.target.value)}
                      placeholder="https://rpc.t369coin.org/"
                      data-testid="input-chain-rpc-settings"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressFormat">Address Display Format</Label>
                    <Select value={addressFormat} onValueChange={setAddressFormat}>
                      <SelectTrigger id="addressFormat" data-testid="select-address-format-settings">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0x">0x Hex Format (0x1234...)</SelectItem>
                        <SelectItem value="bech32">Custom Bech32 Prefix</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {addressFormat === "bech32" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bech32Prefix">Bech32 Address Prefix</Label>
                        <Input
                          id="bech32Prefix"
                          value={bech32Prefix}
                          onChange={(e) => setBech32Prefix(e.target.value.toLowerCase())}
                          placeholder="t369"
                          data-testid="input-bech32-prefix-settings"
                        />
                        <p className="text-xs text-muted-foreground">
                          Addresses will display as: {bech32Prefix || "t369"}1abc...xyz
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="chainIdPrefix">Chain ID Prefix (for footer)</Label>
                        <Input
                          id="chainIdPrefix"
                          value={chainIdPrefix}
                          onChange={(e) => setChainIdPrefix(e.target.value.toLowerCase())}
                          placeholder="ogx"
                          data-testid="input-chain-id-prefix-settings"
                        />
                        <p className="text-xs text-muted-foreground">
                          Chain ID will display as: {chainIdPrefix || bech32Prefix || "chain"}_{chainId || "13601"}-1
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button 
                  onClick={() => {
                    saveSettingMutation.mutate({ key: "chain_name", value: chainName, category: "chain" });
                    saveSettingMutation.mutate({ key: "chain_id", value: chainId, category: "chain" });
                    saveSettingMutation.mutate({ key: "chain_id_prefix", value: chainIdPrefix, category: "chain" });
                    saveSettingMutation.mutate({ key: "native_symbol", value: nativeSymbol, category: "chain" });
                    saveSettingMutation.mutate({ key: "native_name", value: nativeName, category: "chain" });
                    saveSettingMutation.mutate({ key: "rpc_url", value: chainRpcUrl, category: "chain" });
                    saveSettingMutation.mutate({ key: "address_format", value: addressFormat, category: "chain" });
                    saveSettingMutation.mutate({ key: "bech32_prefix", value: bech32Prefix, category: "chain" });
                    toast({ title: "Chain configuration saved" });
                  }} 
                  disabled={saveSettingMutation.isPending} 
                  data-testid="button-save-chain-config"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Chain Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Network Configuration
                </CardTitle>
                <CardDescription>Configure RPC endpoint and network settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rpcUrl">RPC URL</Label>
                  <Input
                    id="rpcUrl"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    placeholder="https://rpc.telemeet.space"
                    data-testid="input-rpc-url"
                  />
                </div>
                <Button onClick={saveRpcConfig} disabled={saveSettingMutation.isPending} data-testid="button-save-rpc">
                  <Save className="h-4 w-4 mr-2" />
                  Save Network Config
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rate Limit Configuration
                </CardTitle>
                <CardDescription>Configure API rate limiting to protect your server from abuse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="globalRateLimit">Global Rate Limit</Label>
                    <Input
                      id="globalRateLimit"
                      type="number"
                      value={globalRateLimit}
                      onChange={(e) => setGlobalRateLimit(e.target.value)}
                      placeholder="1000"
                      data-testid="input-global-rate-limit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max requests per 15 minutes (all endpoints)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authRateLimit">Auth Rate Limit</Label>
                    <Input
                      id="authRateLimit"
                      type="number"
                      value={authRateLimit}
                      onChange={(e) => setAuthRateLimit(e.target.value)}
                      placeholder="50"
                      data-testid="input-auth-rate-limit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max login attempts per 15 minutes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiRateLimit">API Rate Limit</Label>
                    <Input
                      id="apiRateLimit"
                      type="number"
                      value={apiRateLimit}
                      onChange={(e) => setApiRateLimit(e.target.value)}
                      placeholder="100"
                      data-testid="input-api-rate-limit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max API requests per minute
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                  Note: Rate limit changes require a server restart to take effect.
                </div>
                <Button 
                  onClick={() => {
                    saveSettingMutation.mutate({ key: "global_rate_limit", value: globalRateLimit, category: "security" });
                    saveSettingMutation.mutate({ key: "auth_rate_limit", value: authRateLimit, category: "security" });
                    saveSettingMutation.mutate({ key: "api_rate_limit", value: apiRateLimit, category: "security" });
                    toast({ title: "Rate limit settings saved. Restart server to apply." });
                  }} 
                  disabled={saveSettingMutation.isPending} 
                  data-testid="button-save-rate-limits"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Rate Limits
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Legal Pages
                </CardTitle>
                <CardDescription>Edit Terms of Service, Privacy Policy, and API Documentation content</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="terms" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="terms">Terms of Service</TabsTrigger>
                    <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
                    <TabsTrigger value="api_docs">API Docs</TabsTrigger>
                  </TabsList>
                  <TabsContent value="terms" className="space-y-4">
                    <Textarea
                      value={termsContent}
                      onChange={(e) => setTermsContent(e.target.value)}
                      placeholder="Enter Terms of Service content (Markdown supported)..."
                      className="min-h-[200px]"
                      data-testid="textarea-terms"
                    />
                    <Button onClick={() => saveLegalPage("terms")} disabled={saveSettingMutation.isPending} data-testid="button-save-terms">
                      <Save className="h-4 w-4 mr-2" />
                      Save Terms
                    </Button>
                  </TabsContent>
                  <TabsContent value="privacy" className="space-y-4">
                    <Textarea
                      value={privacyContent}
                      onChange={(e) => setPrivacyContent(e.target.value)}
                      placeholder="Enter Privacy Policy content (Markdown supported)..."
                      className="min-h-[200px]"
                      data-testid="textarea-privacy"
                    />
                    <Button onClick={() => saveLegalPage("privacy")} disabled={saveSettingMutation.isPending} data-testid="button-save-privacy">
                      <Save className="h-4 w-4 mr-2" />
                      Save Privacy Policy
                    </Button>
                  </TabsContent>
                  <TabsContent value="api_docs" className="space-y-4">
                    <Textarea
                      value={apiDocsContent}
                      onChange={(e) => setApiDocsContent(e.target.value)}
                      placeholder="Enter additional API documentation content (Markdown supported)..."
                      className="min-h-[200px]"
                      data-testid="textarea-api-docs"
                    />
                    <Button onClick={() => saveLegalPage("api_docs")} disabled={saveSettingMutation.isPending} data-testid="button-save-api-docs">
                      <Save className="h-4 w-4 mr-2" />
                      Save API Docs
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
