import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isBech32Address, bech32ToHex, formatAddress as formatAddressType } from "@/lib/address-utils";
import { useAddressFormat } from "@/contexts/address-format-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { HashLink } from "@/components/hash-link";
import { AddressLink } from "@/components/address-link";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Search, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  formatNumber,
  formatTBT,
  formatTimestamp,
  formatFullTimestamp,
  getMethodColor,
} from "@/lib/formatters";
import { User, FileCode, Wallet, ArrowRightIcon, Clock, Send, Download, Info, ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronRight, Loader2, AlertCircle, BookOpen, Pencil, Upload, Star } from "lucide-react";
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import type { Address, Transaction, VerifiedContract, TokenTransfer, Token, TokenHolder, TransactionLog } from "@shared/schema";

const PAGE_SIZE = 25;

interface AddressData {
  address: Address;
  transactions: Transaction[];
  totalTransactions: number;
}

interface ContractMethod {
  name: string;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
  stateMutability: string;
}

interface ContractMethods {
  readMethods: ContractMethod[];
  writeMethods: ContractMethod[];
}

const COMPILER_VERSIONS = [
  "0.8.28", "0.8.27", "0.8.26", "0.8.25", "0.8.24", "0.8.23", "0.8.22", "0.8.21",
  "0.8.20", "0.8.19", "0.8.18", "0.8.17", "0.8.16", "0.8.15", "0.8.14", "0.8.13",
  "0.8.12", "0.8.11", "0.8.10", "0.8.9", "0.8.7", "0.8.6", "0.8.4", "0.8.0",
  "0.7.6", "0.7.5", "0.7.4", "0.7.0", "0.6.12", "0.6.11", "0.6.0", "0.5.17", "0.5.16",
];

const EVM_VERSIONS = ["cancun", "shanghai", "paris", "london", "berlin", "istanbul", "constantinople", "byzantium"];

interface TokenTransferData {
  transfers: TokenTransfer[];
  total: number;
  page: number;
  totalPages: number;
}

interface TokenHoldersData {
  holders: TokenHolder[];
  total: number;
}

interface EventsData {
  logs: TransactionLog[];
  total: number;
}

export default function AddressPage() {
  const { address: addressParam } = useParams<{ address: string }>();
  const { addressFormat, bech32Prefix, chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";
  
  // Convert bech32 addresses to hex for API calls (backend uses hex)
  const normalizedAddress = useMemo(() => {
    if (!addressParam) return "";
    if (isBech32Address(addressParam)) {
      return bech32ToHex(addressParam);
    }
    return addressParam;
  }, [addressParam]);
  
  // Format address for display based on user preference
  const displayAddress = useMemo(() => {
    if (!normalizedAddress) return "";
    return formatAddressType(normalizedAddress, addressFormat, bech32Prefix);
  }, [normalizedAddress, addressFormat, bech32Prefix]);
  
  const [page, setPage] = useState(1);
  const [tokenPage, setTokenPage] = useState(1);
  const [holderPage, setHolderPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const { toast } = useToast();
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    name: "",
    sourceCode: "",
    compilerVersion: "0.8.20",
    evmVersion: "paris",
    optimization: false,
    runs: 200,
    constructorArgs: "",
    abi: "",
    license: "MIT",
  });
  const [methodInputs, setMethodInputs] = useState<Record<string, Record<string, string>>>({});
  const [methodResults, setMethodResults] = useState<Record<string, { result: any; loading: boolean; error: string | null }>>({});
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [writeResults, setWriteResults] = useState<Record<string, { txHash?: string; loading: boolean; error: string | null }>>({});
  const [tokenHoldingsOpen, setTokenHoldingsOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(() => normalizedAddress ? isInWatchlist(normalizedAddress) : false);

  // Update watchlist status when address changes
  useEffect(() => {
    if (normalizedAddress) {
      setInWatchlist(isInWatchlist(normalizedAddress));
    }
  }, [normalizedAddress]);

  const TELEBIT_CHAIN_ID = "0x21707"; // 136919 in hex - Telebit chain ID

  const checkAndSwitchNetwork = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !(window as any).ethereum) return false;

    try {
      const chainId = await (window as any).ethereum.request({ method: "eth_chainId" });
      if (chainId === TELEBIT_CHAIN_ID) {
        return true;
      }
      
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: TELEBIT_CHAIN_ID }],
        });
        return true;
      } catch (switchError: any) {
        if (switchError.code === 4001) {
          return false;
        }
        if (switchError.code === 4902) {
          toast({
            title: "Network Not Found",
            description: "Please add Telebit network using the button in the footer, or add manually: Chain ID 136919, RPC: https://rpc.telemeet.space",
          });
        } else {
          toast({
            title: "Wrong Network",
            description: "Please switch to Telebit network (Chain ID: 136919) in your wallet.",
          });
        }
        return false;
      }
    } catch {
      return false;
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet to interact with contracts.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        toast({
          title: "Wallet connected",
          description: `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
        await checkAndSwitchNetwork();
      }
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWriteResults({});
    toast({
      title: "Wallet disconnected",
    });
  };

  const callWriteMethod = async (methodName: string, method: ContractMethod) => {
    if (!walletAddress || !normalizedAddress) return;
    
    if (writeResults[methodName]?.loading) return;

    setExpandedMethods(prev => {
      const newSet = new Set(prev);
      newSet.add(`write_${methodName}`);
      return newSet;
    });

    setWriteResults(prev => ({
      ...prev,
      [methodName]: { loading: true, error: null, txHash: undefined }
    }));

    const networkOk = await checkAndSwitchNetwork();
    if (!networkOk) {
      setWriteResults(prev => ({
        ...prev,
        [methodName]: { loading: false, error: "Please switch to Telebit network (Chain ID: 136919) to continue", txHash: undefined }
      }));
      return;
    }

    const inputs = methodInputs[`write_${methodName}`] || {};
    const args = method.inputs.map(input => inputs[input.name] || "");
    const value = method.stateMutability === "payable" ? inputs["_value"] || "0" : "0";

    try {
      const prepareRes = await apiRequest("POST", `/api/contracts/${normalizedAddress}/write/prepare`, {
        methodName,
        args,
        value,
        from: walletAddress,
      });
      
      if (!prepareRes.ok) {
        const errorData = await prepareRes.json();
        throw new Error(errorData.error || "Failed to prepare transaction");
      }
      
      const txData = await prepareRes.json();

      const txHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: normalizedAddress,
          data: txData.data,
          value: txData.value || "0x0",
          gas: txData.gas || "0x5208",
        }],
      });

      setWriteResults(prev => ({
        ...prev,
        [methodName]: { txHash, loading: false, error: null }
      }));

      toast({
        title: "Transaction sent",
        description: `Transaction hash: ${txHash.slice(0, 10)}...`,
      });
    } catch (err: any) {
      const errorMessage = err.message || "Transaction failed";
      setWriteResults(prev => ({
        ...prev,
        [methodName]: { loading: false, error: errorMessage, txHash: undefined }
      }));
      toast({
        title: "Transaction failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const { data, isLoading, error } = useQuery<AddressData>({
    queryKey: ["/api/addresses", normalizedAddress, page],
    queryFn: async () => {
      const res = await fetch(`/api/addresses/${normalizedAddress}?page=${page}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch address");
      return res.json();
    },
    enabled: !!normalizedAddress,
  });

  const { data: contractData, isLoading: isLoadingContract } = useQuery<VerifiedContract & { isVerified: boolean }>({
    queryKey: ["/api/contracts", normalizedAddress],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${normalizedAddress}`);
      if (res.status === 404) return { isVerified: false };
      if (!res.ok) throw new Error("Failed to fetch contract");
      return res.json();
    },
    enabled: !!normalizedAddress && data?.address?.isContract,
  });

  const { data: methodsData } = useQuery<ContractMethods>({
    queryKey: ["/api/contracts", normalizedAddress, "methods"],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${normalizedAddress}/methods`);
      if (!res.ok) throw new Error("Failed to fetch methods");
      return res.json();
    },
    enabled: !!normalizedAddress && !!contractData?.isVerified,
  });

  const { data: tokenTransfersData, isLoading: isLoadingTokens } = useQuery<TokenTransferData>({
    queryKey: ["/api/token-transfers", normalizedAddress, tokenPage],
    queryFn: async () => {
      const res = await fetch(`/api/token-transfers/${normalizedAddress}?page=${tokenPage}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch token transfers");
      return res.json();
    },
    enabled: !!normalizedAddress,
  });

  interface TokenBalance {
    address: string;
    tokenAddress: string;
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    balance: string;
    formattedBalance: string;
  }

  const { data: tokenBalances, isLoading: isLoadingBalances } = useQuery<TokenBalance[]>({
    queryKey: ["/api/address", normalizedAddress, "token-balances"],
    queryFn: async () => {
      const res = await fetch(`/api/address/${normalizedAddress}/token-balances`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!normalizedAddress,
  });

  // Check if this address is a token contract
  const { data: tokenInfo } = useQuery<Token>({
    queryKey: ["/api/tokens", normalizedAddress],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${normalizedAddress}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!normalizedAddress && data?.address?.isContract,
  });

  // Fetch token holders if this is a token contract
  const { data: holdersData, isLoading: isLoadingHolders } = useQuery<TokenHoldersData>({
    queryKey: ["/api/tokens", normalizedAddress, "holders", holderPage],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${normalizedAddress}/holders?page=${holderPage}&limit=${PAGE_SIZE}`);
      if (!res.ok) return { holders: [], total: 0 };
      return res.json();
    },
    enabled: !!normalizedAddress && !!tokenInfo,
  });

  // Fetch contract events (logs)
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery<EventsData>({
    queryKey: ["/api/addresses", normalizedAddress, "events", eventsPage],
    queryFn: async () => {
      const res = await fetch(`/api/addresses/${normalizedAddress}/events?page=${eventsPage}&limit=${PAGE_SIZE}`);
      if (!res.ok) return { logs: [], total: 0 };
      return res.json();
    },
    enabled: !!normalizedAddress,
  });

  const isToken = !!tokenInfo;

  const verifyMutation = useMutation({
    mutationFn: async (formData: typeof verifyForm) => {
      let parsedAbi;
      try {
        parsedAbi = JSON.parse(formData.abi);
      } catch {
        throw new Error("Invalid ABI JSON format");
      }
      
      const res = await apiRequest("POST", `/api/contracts/${normalizedAddress}/verify`, {
        name: formData.name,
        sourceCode: formData.sourceCode,
        compilerVersion: formData.compilerVersion,
        evmVersion: formData.evmVersion,
        optimization: formData.optimization,
        runs: formData.runs,
        constructorArgs: formData.constructorArgs || undefined,
        abi: parsedAbi,
        license: formData.license || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contract verified successfully" });
      setShowVerifyForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", normalizedAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", normalizedAddress, "methods"] });
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const callReadMethod = async (methodName: string) => {
    if (!normalizedAddress) return;
    
    const inputs = methodInputs[methodName] || {};
    const args = methodsData?.readMethods
      .find(m => m.name === methodName)?.inputs
      .map(input => inputs[input.name] || "") || [];
    
    setMethodResults(prev => ({
      ...prev,
      [methodName]: { result: null, loading: true, error: null }
    }));

    try {
      const res = await apiRequest("POST", `/api/contracts/${normalizedAddress}/read`, {
        functionName: methodName,
        args,
      });
      const data = await res.json();
      setMethodResults(prev => ({
        ...prev,
        [methodName]: { result: data.result, loading: false, error: null }
      }));
    } catch (err: any) {
      setMethodResults(prev => ({
        ...prev,
        [methodName]: { result: null, loading: false, error: err.message }
      }));
    }
  };

  const toggleMethodExpand = (name: string) => {
    setExpandedMethods(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const address = data?.address;
  const transactions = data?.transactions || [];
  const totalPages = Math.ceil((data?.totalTransactions || 0) / PAGE_SIZE);

  const outgoingTxs = transactions.filter(tx => tx.from.toLowerCase() === normalizedAddress?.toLowerCase());
  const incomingTxs = transactions.filter(tx => tx.to?.toLowerCase() === normalizedAddress?.toLowerCase());

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !address) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Address Not Found</h2>
            <p className="text-muted-foreground mt-2">
              This address hasn't been seen on the network yet or is invalid.
            </p>
            <Link href="/accounts">
              <Button variant="outline" className="mt-4">
                View All Accounts
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = address.isContract ? FileCode : User;
  const verifiedContractName = contractData?.isVerified ? contractData.name : null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 overflow-hidden">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-6 w-6 flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-page-title">
            {address.isContract ? "Contract" : "Address"}
          </h1>
          {contractData?.isVerified && (
            <Badge variant="default" className="bg-green-600" data-testid="badge-verified">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
        {verifiedContractName && (
          <div className="mt-2">
            <h2 className="text-lg font-bold text-foreground" data-testid="text-contract-name">
              {verifiedContractName}
            </h2>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <code className="font-mono text-xs sm:text-sm break-all" data-testid="text-address">{displayAddress}</code>
          <CopyButton text={displayAddress} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (inWatchlist) {
                removeFromWatchlist(normalizedAddress);
                setInWatchlist(false);
                toast({ title: "Removed from watchlist" });
              } else {
                addToWatchlist({ address: normalizedAddress, label: verifiedContractName || "" });
                setInWatchlist(true);
                toast({ title: "Added to watchlist" });
              }
            }}
            data-testid="button-watchlist"
          >
            <Star className={`h-4 w-4 ${inWatchlist ? "fill-yellow-500 text-yellow-500" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {nativeSymbol} Balance
              </p>
              <p className="text-xl font-bold mt-1 font-mono flex items-center gap-2" data-testid="text-balance">
                <span className="text-primary">*</span>
                {formatTBT(address.balance)} {nativeSymbol}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {nativeSymbol} Value
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                -
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Token Holdings
              </p>
              <Popover open={tokenHoldingsOpen} onOpenChange={setTokenHoldingsOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-auto py-2 px-3"
                    data-testid="button-token-holdings-dropdown"
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {isLoadingBalances ? (
                          "Loading..."
                        ) : tokenBalances && tokenBalances.length > 0 ? (
                          `${tokenBalances.length} Token${tokenBalances.length > 1 ? "s" : ""}`
                        ) : (
                          "No Tokens"
                        )}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tokenHoldingsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start" data-testid="token-holdings-dropdown">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for Token Name"
                        value={tokenSearch}
                        onChange={(e) => setTokenSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                        data-testid="input-token-search"
                      />
                    </div>
                  </div>
                  
                  <div className="px-3 py-2 border-b bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">
                      {nativeSymbol} Tokens ({tokenBalances?.length || 0})
                    </p>
                  </div>

                  <ScrollArea className="max-h-64">
                    {isLoadingBalances ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading tokens...
                      </div>
                    ) : tokenBalances && tokenBalances.length > 0 ? (
                      <div className="py-1">
                        {tokenBalances
                          .filter(token => 
                            !tokenSearch || 
                            token.symbol?.toLowerCase().includes(tokenSearch.toLowerCase()) ||
                            token.name?.toLowerCase().includes(tokenSearch.toLowerCase())
                          )
                          .map((token) => (
                            <div 
                              key={token.tokenAddress} 
                              className="flex items-center justify-between px-3 py-2 hover-elevate cursor-pointer"
                              data-testid={`token-holding-${token.tokenAddress}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                                  {token.symbol?.charAt(0) || "?"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {token.name || "Unknown"} ({token.symbol || "?"})
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono truncate">
                                    {formatNumber(parseFloat(token.formattedBalance))} {token.symbol}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        {tokenBalances.filter(token => 
                          !tokenSearch || 
                          token.symbol?.toLowerCase().includes(tokenSearch.toLowerCase()) ||
                          token.name?.toLowerCase().includes(tokenSearch.toLowerCase())
                        ).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No tokens match your search</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No token holdings</p>
                    )}
                  </ScrollArea>

                  {tokenBalances && tokenBalances.length > 0 && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => {
                          setTokenHoldingsOpen(false);
                          setTokenModalOpen(true);
                        }}
                        data-testid="button-view-all-holdings"
                      >
                        <Coins className="h-3.5 w-3.5 mr-1.5" />
                        VIEW ALL HOLDINGS
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Dialog open={tokenModalOpen} onOpenChange={setTokenModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="token-holdings-modal">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-primary" />
                      Token Holdings
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Token</TableHead>
                          <TableHead className="w-[200px]">Contract</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tokenBalances && tokenBalances.length > 0 ? (
                          tokenBalances.map((token) => (
                            <TableRow key={token.tokenAddress} data-testid={`modal-token-row-${token.tokenAddress}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                                    {token.symbol?.charAt(0) || "?"}
                                  </div>
                                  <div>
                                    <p className="font-medium">{token.name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{token.symbol}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono text-primary">
                                    {token.tokenAddress.slice(0, 10)}...{token.tokenAddress.slice(-8)}
                                  </code>
                                  <CopyButton text={token.tokenAddress} />
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(parseFloat(token.formattedBalance))}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No token holdings found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {tokenBalances?.length || 0} token{(tokenBalances?.length || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              More Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-hidden">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Transactions Sent
              </p>
              <div className="text-sm mt-1 space-y-0.5">
                {address.firstSeen ? (
                  <>
                    <p className="truncate">
                      Latest: <span className="text-primary">{address.lastSeen ? formatTimestamp(address.lastSeen) : "-"}</span>
                    </p>
                    <p className="truncate">
                      First: <span className="text-primary">{formatTimestamp(address.firstSeen)}</span>
                    </p>
                  </>
                ) : (
                  <span className="text-muted-foreground">No transactions</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                First Seen
              </p>
              <p className="text-sm mt-1 truncate">
                {address.firstSeen ? formatFullTimestamp(address.firstSeen) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Last Seen
              </p>
              <p className="text-sm mt-1 truncate">
                {address.lastSeen ? formatFullTimestamp(address.lastSeen) : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Outgoing Txns</span>
              </div>
              <Badge variant="secondary" className="font-mono">{outgoingTxs.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-green-500" />
                <span className="text-sm">Incoming Txns</span>
              </div>
              <Badge variant="secondary" className="font-mono">{incomingTxs.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Type</span>
              </div>
              <Badge variant={address.isContract ? "default" : "outline"}>
                {address.isContract ? "Contract" : "EOA"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Txns</span>
              </div>
              <Badge variant="secondary" className="font-mono">{formatNumber(data?.totalTransactions || 0)}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">
            Events
          </TabsTrigger>
          <TabsTrigger value="tokens" data-testid="tab-tokens">
            Token Transfers
          </TabsTrigger>
          {isToken && (
            <TabsTrigger value="holders" data-testid="tab-holders">
              Holders
            </TabsTrigger>
          )}
          {address.isContract && (
            <TabsTrigger value="code" data-testid="tab-code">
              Contract
            </TabsTrigger>
          )}
          {address.isContract && contractData?.isVerified && (
            <>
              <TabsTrigger value="read" data-testid="tab-read">
                Read Contract
              </TabsTrigger>
              <TabsTrigger value="write" data-testid="tab-write">
                Write Contract
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="transactions" className="mt-4 min-w-0 overflow-hidden">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap px-4 py-3">
              <CardTitle className="text-base sm:text-lg">
                Latest {Math.min(transactions.length, PAGE_SIZE)} from {formatNumber(data?.totalTransactions || 0)} txns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              {transactions.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <div className="divide-y overflow-hidden">
                  {transactions.map((tx) => {
                    const isOutgoing = tx.from.toLowerCase() === normalizedAddress?.toLowerCase();
                    const isIncoming = tx.to?.toLowerCase() === normalizedAddress?.toLowerCase();
                    const isSelf = isOutgoing && isIncoming;
                    
                    return (
                      <div 
                        key={tx.hash} 
                        className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors overflow-hidden"
                        data-testid={`row-tx-${tx.hash.slice(0, 10)}`}
                      >
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted flex-shrink-0">
                          {tx.status === true ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" title="Success" />
                          ) : tx.status === false ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" title="Failed" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" title="Pending" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 truncate">
                              <HashLink hash={tx.hash} type="tx" showCopy={false} className="text-sm" />
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimestamp(tx.timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs overflow-hidden min-w-0">
                            <span className="truncate min-w-0">
                              <AddressLink address={tx.from} showCopy={false} className="text-xs" />
                            </span>
                            <ArrowRightIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate min-w-0">
                              <AddressLink 
                                address={tx.to || tx.contractAddress} 
                                isContract={!!tx.contractAddress && !tx.to}
                                showCopy={false} 
                                className="text-xs" 
                              />
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isSelf ? (
                                <Badge variant="outline" className="text-xs h-5 px-1.5 bg-muted">SELF</Badge>
                              ) : isOutgoing ? (
                                <Badge variant="outline" className="text-xs h-5 px-1.5 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950">OUT</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs h-5 px-1.5 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950">IN</Badge>
                              )}
                              {tx.methodName && (
                                <Badge variant={getMethodColor(tx.methodName) as any} className="text-xs h-5 px-1.5">
                                  {tx.methodName.length > 8 ? tx.methodName.slice(0, 8) + ".." : tx.methodName}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs font-mono font-medium text-right flex-shrink-0">
                              {formatTBT(tx.value)} {nativeSymbol}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg">
                Contract Events
                {eventsData && eventsData.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {formatNumber(eventsData.total)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingEvents ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !eventsData || eventsData.logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 space-y-2">
                  <Info className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No events found for this address.</p>
                  <p className="text-sm">Events are emitted by smart contracts during execution.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {eventsData.logs.map((log, index) => {
                      const eventSignature = log.topic0 || "";
                      const truncatedSig = eventSignature.slice(0, 10) + "..." + eventSignature.slice(-6);
                      
                      return (
                        <div
                          key={`${log.transactionHash}-${log.logIndex}`}
                          className="flex flex-col p-3 rounded-md bg-muted/50 space-y-2"
                          data-testid={`event-${index}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                Log #{log.logIndex}
                              </Badge>
                              <Link href={`/tx/${log.transactionHash}`}>
                                <span className="text-xs font-mono text-blue-500 hover:underline cursor-pointer">
                                  {log.transactionHash.slice(0, 10)}...{log.transactionHash.slice(-8)}
                                </span>
                              </Link>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Block #{formatNumber(log.blockNumber)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground min-w-[60px]">Topic 0:</span>
                              <span className="font-mono text-muted-foreground break-all">
                                {eventSignature || "N/A"}
                              </span>
                            </div>
                            {log.topics && log.topics.length > 1 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[60px]">Topics:</span>
                                <span className="font-mono text-muted-foreground">
                                  +{log.topics.length - 1} more
                                </span>
                              </div>
                            )}
                            {log.data && log.data !== "0x" && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[60px]">Data:</span>
                                <span className="font-mono text-muted-foreground truncate max-w-[400px]">
                                  {log.data.slice(0, 66)}...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {eventsData.total > PAGE_SIZE && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={eventsPage}
                        totalPages={Math.ceil(eventsData.total / PAGE_SIZE)}
                        onPageChange={setEventsPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg">
                Token Transfers
                {tokenTransfersData && tokenTransfersData.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {formatNumber(tokenTransfersData.total)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTokens ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !tokenTransfersData || tokenTransfersData.transfers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No token transfers found for this address
                </div>
              ) : (
                <div className="space-y-2">
                  {tokenTransfersData.transfers.map((transfer, index) => (
                    <div
                      key={`${transfer.transactionHash}-${transfer.logIndex}`}
                      className="flex flex-col p-3 rounded-md bg-muted/50 space-y-2"
                      data-testid={`token-transfer-${index}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={transfer.tokenType === "ERC20" ? "default" : transfer.tokenType === "ERC721" ? "secondary" : "outline"} className="text-xs">
                            {transfer.tokenType === "ERC20" ? nativeSymbol : transfer.tokenType}
                          </Badge>
                          <Link href={`/tx/${transfer.transactionHash}`}>
                            <span className="text-xs font-mono text-blue-500 hover:underline cursor-pointer">
                              {transfer.transactionHash.slice(0, 10)}...{transfer.transactionHash.slice(-8)}
                            </span>
                          </Link>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Block #{formatNumber(transfer.blockNumber)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-muted-foreground">From</span>
                        <AddressLink address={transfer.from} className="text-xs" />
                        <ArrowRightIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">To</span>
                        <AddressLink address={transfer.to} className="text-xs" />
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <AddressLink address={transfer.tokenAddress} className="text-xs" />
                        </div>
                        <span className="text-sm font-mono font-medium">
                          {transfer.tokenType === "ERC721" ? (
                            <span>Token ID: {transfer.tokenId}</span>
                          ) : (
                            <span>{transfer.value ? formatTBT(transfer.value) : "0"}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tokenTransfersData && tokenTransfersData.totalPages > 1 && (
                <Pagination
                  currentPage={tokenPage}
                  totalPages={tokenTransfersData.totalPages}
                  onPageChange={setTokenPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isToken && (
          <TabsContent value="holders" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg">
                  Token Holders
                  {holdersData && holdersData.total > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {formatNumber(holdersData.total)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHolders ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : holdersData && holdersData.holders.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {holdersData.holders.map((holder, idx) => {
                            const rank = (holderPage - 1) * PAGE_SIZE + idx + 1;
                            const totalSupply = tokenInfo?.totalSupply ? BigInt(tokenInfo.totalSupply) : BigInt(0);
                            const holderBalance = BigInt(holder.balance || "0");
                            const percentage = totalSupply > BigInt(0) 
                              ? Number((holderBalance * BigInt(10000)) / totalSupply) / 100 
                              : 0;
                            const decimals = tokenInfo?.decimals || 18;
                            const divisor = BigInt(10 ** decimals);
                            const formattedBalance = Number(holderBalance / divisor).toLocaleString();
                            
                            return (
                              <TableRow key={holder.id} data-testid={`row-holder-${idx}`}>
                                <TableCell className="font-medium">
                                  #{rank}
                                </TableCell>
                                <TableCell>
                                  <AddressLink address={holder.holderAddress} />
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formattedBalance} {tokenInfo?.symbol}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {percentage.toFixed(2)}%
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {holdersData.total > PAGE_SIZE && (
                      <div className="mt-4">
                        <Pagination
                          currentPage={holderPage}
                          totalPages={Math.ceil(holdersData.total / PAGE_SIZE)}
                          onPageChange={setHolderPage}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No holders found for this token.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {address.isContract && (
          <TabsContent value="code" className="mt-4 space-y-4">
            {contractData?.isVerified ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Verified Contract: {contractData.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">v{contractData.compilerVersion}</Badge>
                    {contractData.optimization && (
                      <Badge variant="secondary">Optimized ({contractData.runs} runs)</Badge>
                    )}
                    {contractData.license && (
                      <Badge variant="outline">{contractData.license}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-md p-4 overflow-x-auto max-h-96">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {contractData.sourceCode}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Contract Not Verified</CardTitle>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowVerifyForm(!showVerifyForm)}
                    data-testid="button-verify-contract"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {showVerifyForm ? "Cancel" : "Verify Contract"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {showVerifyForm ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractName">Contract Name</Label>
                          <Input
                            id="contractName"
                            placeholder="e.g., MyToken"
                            value={verifyForm.name}
                            onChange={(e) => setVerifyForm({ ...verifyForm, name: e.target.value })}
                            data-testid="input-contract-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="compilerVersion">Compiler Version</Label>
                          <Select
                            value={verifyForm.compilerVersion}
                            onValueChange={(v) => setVerifyForm({ ...verifyForm, compilerVersion: v })}
                          >
                            <SelectTrigger data-testid="select-compiler-version">
                              <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPILER_VERSIONS.map(v => (
                                <SelectItem key={v} value={v}>v{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="evmVersion">EVM Version</Label>
                          <Select
                            value={verifyForm.evmVersion}
                            onValueChange={(v) => setVerifyForm({ ...verifyForm, evmVersion: v })}
                          >
                            <SelectTrigger data-testid="select-evm-version">
                              <SelectValue placeholder="Select EVM version" />
                            </SelectTrigger>
                            <SelectContent>
                              {EVM_VERSIONS.map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="license">License</Label>
                          <Input
                            id="license"
                            placeholder="e.g., MIT"
                            value={verifyForm.license}
                            onChange={(e) => setVerifyForm({ ...verifyForm, license: e.target.value })}
                            data-testid="input-license"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="optimization"
                            checked={verifyForm.optimization}
                            onCheckedChange={(v) => setVerifyForm({ ...verifyForm, optimization: v })}
                            data-testid="switch-optimization"
                          />
                          <Label htmlFor="optimization">Optimization</Label>
                        </div>
                        {verifyForm.optimization && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor="runs">Runs:</Label>
                            <Input
                              id="runs"
                              type="number"
                              className="w-24"
                              value={verifyForm.runs}
                              onChange={(e) => setVerifyForm({ ...verifyForm, runs: parseInt(e.target.value) || 200 })}
                              data-testid="input-runs"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sourceCode">Source Code (Solidity)</Label>
                        <Textarea
                          id="sourceCode"
                          placeholder="// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract MyContract { ... }"
                          rows={12}
                          className="font-mono text-xs"
                          value={verifyForm.sourceCode}
                          onChange={(e) => setVerifyForm({ ...verifyForm, sourceCode: e.target.value })}
                          data-testid="textarea-source-code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="abi">Contract ABI (JSON)</Label>
                        <Textarea
                          id="abi"
                          placeholder='[{"inputs":[],"name":"myFunction",...}]'
                          rows={6}
                          className="font-mono text-xs"
                          value={verifyForm.abi}
                          onChange={(e) => setVerifyForm({ ...verifyForm, abi: e.target.value })}
                          data-testid="textarea-abi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="constructorArgs">Constructor Arguments (hex, optional)</Label>
                        <Input
                          id="constructorArgs"
                          placeholder="0x..."
                          value={verifyForm.constructorArgs}
                          onChange={(e) => setVerifyForm({ ...verifyForm, constructorArgs: e.target.value })}
                          data-testid="input-constructor-args"
                        />
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => verifyMutation.mutate(verifyForm)}
                        disabled={verifyMutation.isPending || !verifyForm.name || !verifyForm.sourceCode || !verifyForm.abi}
                        data-testid="button-submit-verify"
                      >
                        {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Verify and Publish
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-md p-4 overflow-x-auto">
                      <code className="text-xs font-mono break-all whitespace-pre-wrap">
                        {address.contractCode}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {address.isContract && contractData?.isVerified && (
          <TabsContent value="read" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <CardTitle className="text-lg">Read Contract</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {!methodsData?.readMethods?.length ? (
                  <div className="text-center text-muted-foreground py-8">
                    No read methods available
                  </div>
                ) : (
                  methodsData.readMethods.map((method, idx) => (
                    <Collapsible 
                      key={method.name}
                      open={expandedMethods.has(method.name)}
                      onOpenChange={() => toggleMethodExpand(method.name)}
                    >
                      <div className="border rounded-md">
                        <CollapsibleTrigger asChild>
                          <button 
                            className="w-full flex items-center justify-between p-3 text-left hover-elevate"
                            data-testid={`button-expand-${method.name}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">{idx + 1}.</span>
                              <span className="font-mono text-sm">{method.name}</span>
                              {method.inputs.length === 0 && (
                                <Badge variant="secondary" className="text-xs">No inputs</Badge>
                              )}
                            </div>
                            {expandedMethods.has(method.name) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 space-y-3 border-t pt-3">
                            {method.inputs.length > 0 && (
                              <div className="space-y-2">
                                {method.inputs.map((input) => (
                                  <div key={input.name} className="space-y-1">
                                    <Label className="text-xs">
                                      {input.name || "_"} <span className="text-muted-foreground">({input.type})</span>
                                    </Label>
                                    <Input
                                      placeholder={`Enter ${input.type}`}
                                      className="font-mono text-sm"
                                      value={methodInputs[method.name]?.[input.name] || ""}
                                      onChange={(e) => setMethodInputs(prev => ({
                                        ...prev,
                                        [method.name]: {
                                          ...prev[method.name],
                                          [input.name]: e.target.value
                                        }
                                      }))}
                                      data-testid={`input-${method.name}-${input.name}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button
                              size="sm"
                              onClick={() => callReadMethod(method.name)}
                              disabled={methodResults[method.name]?.loading}
                              data-testid={`button-query-${method.name}`}
                            >
                              {methodResults[method.name]?.loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Query
                            </Button>
                            {methodResults[method.name] && (
                              <div className="bg-muted rounded-md p-3">
                                {methodResults[method.name].error ? (
                                  <div className="flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {methodResults[method.name].error}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span>Returns:</span>
                                      {method.outputs.map((o, i) => (
                                        <span key={i} className="font-mono">{o.type}</span>
                                      ))}
                                    </div>
                                    <div className="font-mono text-sm break-all" data-testid={`result-${method.name}`}>
                                      {JSON.stringify(methodResults[method.name].result)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {address.isContract && contractData?.isVerified && (
          <TabsContent value="write" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-5 w-5" />
                    <CardTitle className="text-lg">Write Contract</CardTitle>
                  </div>
                  {walletAddress ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs" data-testid="text-wallet-address">
                        <Wallet className="h-3 w-3 mr-1" />
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={disconnectWallet}
                        data-testid="button-disconnect-wallet"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={connectWallet}
                      disabled={isConnecting}
                      data-testid="button-connect-wallet"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wallet className="h-4 w-4 mr-2" />
                      )}
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!walletAddress && (
                  <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Connect your wallet to interact</p>
                      <p className="text-muted-foreground">
                        Write methods require a connected wallet to sign transactions. 
                        Use MetaMask or another Web3 wallet to interact with this contract.
                      </p>
                    </div>
                  </div>
                )}
                {!methodsData?.writeMethods?.length ? (
                  <div className="text-center text-muted-foreground py-8">
                    No write methods available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {methodsData.writeMethods.map((method, idx) => {
                      const methodState = writeResults[method.name] ?? { loading: false, error: null, txHash: undefined };
                      return (
                        <Collapsible 
                          key={method.name}
                          open={expandedMethods.has(`write_${method.name}`)}
                          onOpenChange={() => toggleMethodExpand(`write_${method.name}`)}
                        >
                          <div className="border rounded-md">
                            <CollapsibleTrigger asChild>
                              <button 
                                className="w-full flex items-center justify-between p-3 text-left hover-elevate"
                                data-testid={`button-expand-write-${method.name}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">{idx + 1}.</span>
                                  <span className="font-mono text-sm">{method.name}</span>
                                  {method.stateMutability === "payable" && (
                                    <Badge variant="default" className="text-xs">Payable</Badge>
                                  )}
                                </div>
                                {expandedMethods.has(`write_${method.name}`) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-3 pb-3 space-y-3 border-t pt-3">
                                {method.inputs.length > 0 && (
                                  <div className="space-y-2">
                                    {method.inputs.map((input) => (
                                      <div key={input.name} className="space-y-1">
                                        <Label className="text-xs">
                                          {input.name || "_"} <span className="text-muted-foreground">({input.type})</span>
                                        </Label>
                                        <Input
                                          placeholder={`Enter ${input.type}`}
                                          className="font-mono text-sm"
                                          value={methodInputs[`write_${method.name}`]?.[input.name] || ""}
                                          onChange={(e) => setMethodInputs(prev => ({
                                            ...prev,
                                            [`write_${method.name}`]: {
                                              ...prev[`write_${method.name}`],
                                              [input.name]: e.target.value
                                            }
                                          }))}
                                          data-testid={`input-write-${method.name}-${input.name}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {method.stateMutability === "payable" && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      Value <span className="text-muted-foreground">({nativeSymbol})</span>
                                    </Label>
                                    <Input
                                      placeholder="0.0"
                                      className="font-mono text-sm"
                                      value={methodInputs[`write_${method.name}`]?.["_value"] || ""}
                                      onChange={(e) => setMethodInputs(prev => ({
                                        ...prev,
                                        [`write_${method.name}`]: {
                                          ...prev[`write_${method.name}`],
                                          ["_value"]: e.target.value
                                        }
                                      }))}
                                      data-testid={`input-write-${method.name}-value`}
                                    />
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => callWriteMethod(method.name, method)}
                                  disabled={!walletAddress || methodState.loading}
                                  data-testid={`button-write-${method.name}`}
                                >
                                  {methodState.loading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : null}
                                  {walletAddress ? "Write" : "Connect Wallet First"}
                                </Button>
                                <div className="bg-muted rounded-md p-3 min-h-[2.5rem]" data-testid={`status-write-${method.name}`}>
                                  {methodState.loading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Preparing transaction...
                                    </div>
                                  ) : methodState.error ? (
                                    <div className="flex items-center gap-2 text-destructive text-sm" data-testid={`error-write-${method.name}`}>
                                      <AlertCircle className="h-4 w-4" />
                                      {methodState.error}
                                    </div>
                                  ) : methodState.txHash ? (
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground">Transaction Hash:</div>
                                      <div className="font-mono text-sm break-all flex items-center gap-2" data-testid={`result-write-${method.name}`}>
                                        <Link href={`/tx/${methodState.txHash}`} className="text-primary hover:underline">
                                          {methodState.txHash}
                                        </Link>
                                        <CopyButton text={methodState.txHash || ""} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground text-sm" data-testid={`ready-write-${method.name}`}>
                                      Ready to execute
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
