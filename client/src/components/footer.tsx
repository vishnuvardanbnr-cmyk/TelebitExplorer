import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Globe, Blocks } from "lucide-react";
import { SiX, SiGithub, SiDiscord, SiTelegram, SiYoutube, SiMedium, SiLinkedin, SiFacebook, SiInstagram, SiReddit, SiTiktok } from "react-icons/si";
import { useAddressFormat } from "@/contexts/address-format-context";
import { useDesign } from "@/contexts/design-context";
import { Link } from "wouter";

interface SocialLink {
  icon: string;
  url: string;
  label: string;
}

interface SettingsData {
  social?: Record<string, string>;
  branding?: Record<string, string>;
  network?: Record<string, string>;
  chain?: {
    chainId: number;
    name: string;
    shortName: string;
    rpcUrl: string;
    nativeCurrency: string;
    nativeSymbol: string;
    nativeDecimals: number;
    chain_id_prefix?: string;
  };
}

const SOCIAL_ICONS: Record<string, any> = {
  website: Globe,
  twitter: SiX,
  github: SiGithub,
  discord: SiDiscord,
  telegram: SiTelegram,
  youtube: SiYoutube,
  medium: SiMedium,
  linkedin: SiLinkedin,
  facebook: SiFacebook,
  instagram: SiInstagram,
  reddit: SiReddit,
  tiktok: SiTiktok,
};

export function Footer() {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const { addressFormat } = useAddressFormat();
  const { isDesign2 } = useDesign();
  
  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
    staleTime: 5000,
  });

  const chain = settings?.chain;
  const chainId = chain?.chainId || 55369;
  const chainName = chain?.name || "Team369";
  const nativeSymbol = chain?.nativeSymbol || "T369";
  const nativeCurrency = chain?.nativeCurrency || "Team369";
  const nativeDecimals = chain?.nativeDecimals || 18;
  const rpcUrl = chain?.rpcUrl || settings?.network?.rpc_url || "https://rpc.t369coin.org";
  
  // Use shortName from chain config for bech32 format, numeric for 0x mode
  const chainPrefix = chain?.shortName || 'chain';
  const displayChainId = addressFormat === "bech32" ? `${chainPrefix}_${chainId}-1` : String(chainId);

  const socialLinks: SocialLink[] = (() => {
    try {
      const linksStr = settings?.social?.social_links;
      if (linksStr) {
        const parsed = JSON.parse(linksStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  })();

  const footerTitle = settings?.branding?.footer_title || settings?.branding?.site_name || "";
  const footerDescription = settings?.branding?.footer_description || 
    settings?.branding?.site_description || "";
  const copyrightText = settings?.branding?.copyright_text || `© ${new Date().getFullYear()} ${chainName}. All rights reserved.`;

  const addToWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const chainConfig = {
        chainId: `0x${chainId.toString(16)}`,
        chainName: chainName,
        nativeCurrency: {
          name: nativeCurrency,
          symbol: nativeSymbol,
          decimals: nativeDecimals,
        },
        rpcUrls: [rpcUrl.startsWith("http") ? rpcUrl : `https://${rpcUrl}`],
        blockExplorerUrls: [window.location.origin],
      };
      await (window as any).ethereum.request({
        method: "wallet_addEthereumChain",
        params: [chainConfig],
      });
      toast({
        title: "Network added",
        description: `${chainName} has been added to your wallet.`,
      });
    } catch (err: any) {
      if (err.code === 4001) {
        toast({
          title: "Request cancelled",
          description: "You cancelled the request to add the network.",
        });
      } else {
        toast({
          title: "Failed to add network",
          description: err.message || "Please add the network manually.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  if (isDesign2) {
    const rpcDisplay = rpcUrl.replace(/^https?:\/\//, '');
    return (
      <footer className="d2-footer mt-16">
        <div className="container mx-auto px-4">
          <div className="d2-glow-line mb-8" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-start gap-3">
              {footerTitle && (
                <>
                  <div className="d2-icon-box flex-shrink-0">
                    <Blocks className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="d2-heading d2-gradient-text text-lg">{footerTitle}</span>
                    {footerDescription && (
                      <p className="text-sm text-muted-foreground max-w-xs mt-1">{footerDescription}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Network</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Chain ID</span>
                  <span className="font-mono font-medium">{chainId}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Symbol</span>
                  <span className="font-mono font-medium">{nativeSymbol}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">RPC</span>
                  <span className="font-mono text-xs truncate max-w-[180px]" title={rpcUrl}>{rpcDisplay}</span>
                </div>
              </div>
              <Button
                onClick={addToWallet}
                disabled={isAdding}
                size="sm"
                className="d2-pill w-full mt-3"
                data-testid="button-add-to-wallet"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {isAdding ? "Adding..." : "Add to Wallet"}
              </Button>
            </div>

            {socialLinks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Connect</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {socialLinks.map((link, index) => {
                    const IconComponent = SOCIAL_ICONS[link.icon] || Globe;
                    return (
                      <Button key={index} variant="outline" size="icon" className="rounded-full" asChild>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          data-testid={`link-social-${link.icon}`}
                          title={link.label}
                        >
                          <IconComponent className="h-4 w-4" />
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-copyright">
              {copyrightText}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">Privacy</Link>
              <Link href="/api-docs" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-api">API</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t mt-12 bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            {footerTitle && (
              <div className="flex items-center gap-2">
                <Blocks className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">{footerTitle}</span>
              </div>
            )}
            {footerDescription && (
              <p className="text-sm text-muted-foreground">
                {footerDescription}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Quick Actions</h3>
            <Button
              onClick={addToWallet}
              disabled={isAdding}
              className="w-full"
              data-testid="button-add-to-wallet"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isAdding ? "Adding..." : `Add ${chainName} to Wallet`}
            </Button>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
              {socialLinks.map((link, index) => {
                const IconComponent = SOCIAL_ICONS[link.icon] || Globe;
                return (
                  <Button key={index} variant="outline" size="icon" asChild>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      data-testid={`link-social-${link.icon}`}
                      title={link.label}
                    >
                      <IconComponent className="h-4 w-4" />
                    </a>
                  </Button>
                );
              })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            {copyrightText}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy</Link>
            <Link href="/api-docs" className="hover:text-foreground transition-colors" data-testid="link-api">API</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
