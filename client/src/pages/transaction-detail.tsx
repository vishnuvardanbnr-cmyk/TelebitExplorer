import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddressLink } from "@/components/address-link";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";
import {
  formatNumber,
  formatFullTimestamp,
  formatTimestamp,
  formatTBT,
  formatGwei,
  getMethodColor,
} from "@/lib/formatters";
import { formatTxHash } from "@/lib/address-utils";
import { useAddressFormat } from "@/contexts/address-format-context";
import {
  ArrowRightLeft,
  Clock,
  Fuel,
  Hash,
  ArrowRight,
  FileCode,
  Blocks,
  Flame,
  Settings,
  Code,
  ScrollText,
  Database,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { Transaction, TransactionLog, TokenTransfer } from "@shared/schema";

interface TxDetailData {
  transaction: Transaction;
  logs: TransactionLog[];
  tokenTransfers: TokenTransfer[];
}

function decodeInputData(input: string): { methodId: string; params: string[] } {
  if (!input || input === "0x" || input.length < 10) {
    return { methodId: "", params: [] };
  }
  
  const methodId = input.slice(0, 10);
  const data = input.slice(10);
  const params: string[] = [];
  
  for (let i = 0; i < data.length; i += 64) {
    const param = data.slice(i, i + 64);
    if (param.length === 64) {
      params.push("0x" + param);
    }
  }
  
  return { methodId, params };
}

function hexToUtf8(hex: string): string {
  try {
    if (!hex || hex === "0x") return "";
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    let str = "";
    for (let i = 0; i < cleanHex.length; i += 2) {
      const charCode = parseInt(cleanHex.slice(i, i + 2), 16);
      if (charCode >= 32 && charCode <= 126) {
        str += String.fromCharCode(charCode);
      } else if (charCode === 0) {
        continue;
      } else {
        str += ".";
      }
    }
    return str;
  } catch {
    return "";
  }
}

const EVENT_SIGNATURES: Record<string, string> = {
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer(address,address,uint256)",
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval(address,address,uint256)",
  "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822": "Swap(address,uint256,uint256,uint256,uint256,address)",
  "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1": "Sync(uint112,uint112)",
  "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f": "Mint(address,uint256,uint256)",
  "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496": "Burn(address,uint256,uint256,address)",
};

const METHOD_SIGNATURES: Record<string, string> = {
  "0xa9059cbb": "transfer(address to, uint256 amount)",
  "0x23b872dd": "transferFrom(address from, address to, uint256 amount)",
  "0x095ea7b3": "approve(address spender, uint256 amount)",
  "0x70a08231": "balanceOf(address account)",
  "0x18160ddd": "totalSupply()",
  "0xdd62ed3e": "allowance(address owner, address spender)",
  "0x313ce567": "decimals()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0xf1215d25": "deposit(uint256 amount, string destinationAddress)",
  "0x2e1a7d4d": "withdraw(uint256 amount)",
  "0xd0e30db0": "deposit()",
  "0x3ccfd60b": "withdraw()",
  "0x7ff36ab5": "swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)",
  "0x38ed1739": "swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
  "0x18cbafe5": "swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
  "0xfb3bdb41": "swapETHForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline)",
  "0xe8e33700": "addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline)",
  "0xf305d719": "addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline)",
  "0xbaa2abde": "removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline)",
  "0x02751cec": "removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline)",
  "0xa22cb465": "setApprovalForAll(address operator, bool approved)",
  "0x42842e0e": "safeTransferFrom(address from, address to, uint256 tokenId)",
  "0xb88d4fde": "safeTransferFrom(address from, address to, uint256 tokenId, bytes data)",
  "0x6352211e": "ownerOf(uint256 tokenId)",
  "0xe985e9c5": "isApprovedForAll(address owner, address operator)",
  "0x081812fc": "getApproved(uint256 tokenId)",
  "0x1249c58b": "mint()",
  "0x40c10f19": "mint(address to, uint256 amount)",
  "0x42966c68": "burn(uint256 amount)",
  "0x79cc6790": "burnFrom(address account, uint256 amount)",
  "0x8456cb59": "pause()",
  "0x3f4ba83a": "unpause()",
  "0x715018a6": "renounceOwnership()",
  "0xf2fde38b": "transferOwnership(address newOwner)",
  "0x5c975abb": "paused()",
  "0x8da5cb5b": "owner()",
};

export default function TransactionDetail() {
  const { hash } = useParams<{ hash: string }>();
  const [inputViewMode, setInputViewMode] = useState<"default" | "utf8" | "original">("default");
  const { addressFormat, bech32Prefix, chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data, isLoading, error } = useQuery<TxDetailData>({
    queryKey: ["/api/transactions", hash],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${hash}`);
      if (!res.ok) throw new Error("Transaction not found");
      return res.json();
    },
    enabled: !!hash,
  });

  const tx = data?.transaction;
  const logs = data?.logs || [];
  const tokenTransfers = data?.tokenTransfers || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-12 text-center">
            <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Transaction Not Found</h2>
            <p className="text-muted-foreground mt-2">
              The transaction you're looking for doesn't exist or hasn't been indexed yet.
            </p>
            <Link href="/txs">
              <Button variant="outline" className="mt-4">
                View All Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const txFee =
    tx.gasUsed && tx.effectiveGasPrice
      ? (BigInt(tx.gasUsed) * BigInt(tx.effectiveGasPrice)).toString()
      : undefined;

  const gasUsagePercent = tx.gasUsed && tx.gas ? Math.round((tx.gasUsed / tx.gas) * 100 * 100) / 100 : 0;

  const decodedInput = tx.input ? decodeInputData(tx.input) : { methodId: "", params: [] };

  const getEventName = (topic0: string): string => {
    return EVENT_SIGNATURES[topic0] || "Unknown Event";
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <ArrowRightLeft className="h-6 w-6" />
          Transaction Details
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={tx.status} />
          {tx.methodName && (
            <Badge variant={getMethodColor(tx.methodName) as any}>
              {tx.methodName}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            Logs ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="state" data-testid="tab-state">
            State
          </TabsTrigger>
          {tx.input && tx.input !== "0x" && (
            <TabsTrigger value="input" data-testid="tab-input">
              Input Data
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Transaction Hash" icon={Hash}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm truncate">
                    {formatTxHash(tx.hash, addressFormat, bech32Prefix)}
                  </span>
                  <CopyButton text={formatTxHash(tx.hash, addressFormat, bech32Prefix)} />
                </div>
                {addressFormat === "bech32" && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">{tx.hash}</p>
                )}
              </InfoRow>

              <InfoRow label="Status">
                <StatusBadge status={tx.status} />
              </InfoRow>

              <InfoRow label="Block" icon={Blocks}>
                <Link
                  href={`/block/${tx.blockNumber}`}
                  className="font-mono text-primary hover:underline"
                >
                  {formatNumber(tx.blockNumber)}
                </Link>
              </InfoRow>

              <InfoRow label="Timestamp" icon={Clock}>
                <span>{formatFullTimestamp(tx.timestamp)}</span>
                <span className="text-muted-foreground ml-2">
                  ({formatTimestamp(tx.timestamp)})
                </span>
              </InfoRow>

              <Separator />

              <InfoRow label="From">
                <div className="overflow-hidden">
                  <AddressLink address={tx.from} />
                </div>
              </InfoRow>

              <InfoRow label="To">
                {tx.to ? (
                  <div className="overflow-hidden">
                    <AddressLink address={tx.to} />
                  </div>
                ) : tx.contractAddress ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground text-xs sm:text-sm">Contract Creation</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="overflow-hidden">
                      <AddressLink address={tx.contractAddress} isContract />
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </InfoRow>

              <Separator />

              <InfoRow label="Value">
                <span className="font-mono font-medium">{formatTBT(tx.value)} {nativeSymbol}</span>
              </InfoRow>

              {tokenTransfers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[100px] sm:min-w-[140px]">Token Transfers:</span>
                  </div>
                  <div className="space-y-2 pl-0 sm:pl-[140px]">
                    {tokenTransfers.map((transfer, index) => (
                      <div
                        key={`${transfer.transactionHash}-${transfer.logIndex}`}
                        className="flex flex-col p-3 rounded-md bg-muted/50 space-y-2"
                        data-testid={`token-transfer-${index}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={transfer.tokenType === "ERC20" ? "default" : transfer.tokenType === "ERC721" ? "secondary" : "outline"} className="text-xs">
                            {transfer.tokenType === "ERC20" ? nativeSymbol : transfer.tokenType}
                          </Badge>
                          <span className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                            {transfer.tokenType === "ERC721" ? (
                              <>Token ID: {transfer.tokenId}</>
                            ) : (
                              <>{formatTBT(transfer.value || "0")}</>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-muted-foreground text-xs">From</span>
                          <div className="overflow-hidden">
                            <AddressLink address={transfer.from} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-muted-foreground text-xs">To</span>
                          <div className="overflow-hidden">
                            <AddressLink address={transfer.to} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-muted-foreground text-xs">Token</span>
                          <div className="overflow-hidden">
                            <AddressLink address={transfer.tokenAddress} isContract />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <InfoRow label="Transaction Fee" icon={Fuel}>
                <span className="font-mono">{txFee ? formatTBT(txFee) : "0"} {nativeSymbol}</span>
              </InfoRow>

              <InfoRow label="Gas Price">
                <span className="font-mono">
                  {tx.effectiveGasPrice
                    ? formatGwei(tx.effectiveGasPrice)
                    : tx.gasPrice
                    ? formatGwei(tx.gasPrice)
                    : "0"}{" "}
                  Gwei
                </span>
              </InfoRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Gas & Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Gas Limit & Usage by Txn" icon={Fuel}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{formatNumber(tx.gas)}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-mono">{tx.gasUsed ? formatNumber(tx.gasUsed) : "-"}</span>
                  <Badge variant="secondary" className="font-mono">
                    {gasUsagePercent}%
                  </Badge>
                </div>
              </InfoRow>

              {tx.type === 2 && tx.maxFeePerGas && (
                <>
                  <InfoRow label="Max Fee Per Gas">
                    <span className="font-mono">{formatGwei(tx.maxFeePerGas)} Gwei</span>
                  </InfoRow>
                  
                  <InfoRow label="Max Priority Fee">
                    <span className="font-mono">
                      {tx.maxPriorityFeePerGas ? formatGwei(tx.maxPriorityFeePerGas) : "0"} Gwei
                    </span>
                  </InfoRow>
                </>
              )}

              <InfoRow label="Burnt Fees" icon={Flame}>
                <span className="font-mono text-orange-500 dark:text-orange-400">
                  {txFee ? formatTBT(txFee) : "0"} {nativeSymbol}
                </span>
              </InfoRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Other Attributes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Nonce:</span>
                  <Badge variant="outline" className="font-mono">{tx.nonce}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Position In Block:</span>
                  <Badge variant="outline" className="font-mono">{tx.transactionIndex}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Transaction Type:</span>
                  <Badge variant="outline" className="font-mono">
                    {tx.type === 0 ? "Legacy" : tx.type === 1 ? "Access List" : tx.type === 2 ? "EIP-1559" : tx.type}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Transaction Receipt Event Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No event logs emitted by this transaction</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {logs.map((log, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`log-${index}`}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                          <Badge variant="outline" className="font-mono flex-shrink-0">{index}</Badge>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                              <span className="font-mono text-xs sm:text-sm text-primary truncate">
                                {log.topics && log.topics[0] ? getEventName(log.topics[0]) : "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                              <FileCode className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="font-mono text-xs sm:text-sm truncate text-muted-foreground">
                                {log.address ? `${log.address.slice(0, 10)}...${log.address.slice(-8)}` : "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <div className="space-y-3">
                          <div className="min-w-0">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                              Address
                            </span>
                            <div className="overflow-hidden">
                              <AddressLink address={log.address} isContract />
                            </div>
                          </div>
                          
                          {log.topics && log.topics.length > 0 && (
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                                Topics
                              </span>
                              <div className="space-y-2 bg-muted/50 rounded-md p-3">
                                {log.topics.map((topic, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <Badge variant="secondary" className="text-xs font-mono flex-shrink-0">
                                      {i}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      {i === 0 && (
                                        <span className="text-xs text-muted-foreground block mb-1">
                                          {getEventName(topic)}
                                        </span>
                                      )}
                                      <code className="text-xs font-mono break-all block">{topic}</code>
                                    </div>
                                    <CopyButton text={topic} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {log.data && log.data !== "0x" && (
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                                Data
                              </span>
                              <div className="bg-muted/50 rounded-md p-3">
                                <code className="text-xs font-mono break-all block">
                                  {log.data}
                                </code>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="state" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                State Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tx.value && tx.value !== "0" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Badge variant="outline">Balance Change</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 min-w-0">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">From</span>
                        <div className="overflow-hidden">
                          <AddressLink address={tx.from} />
                        </div>
                        <Badge variant="destructive" className="font-mono text-xs">
                          -{formatTBT(tx.value)} {nativeSymbol}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 min-w-0">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">To</span>
                        <div className="overflow-hidden">
                          <AddressLink address={tx.to || tx.contractAddress} />
                        </div>
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 font-mono text-xs">
                          +{formatTBT(tx.value)} {nativeSymbol}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {txFee && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge variant="outline">Gas Fee Deduction</Badge>
                      </div>
                      
                      <div className="space-y-2 min-w-0">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">From (Sender)</span>
                        <div className="overflow-hidden">
                          <AddressLink address={tx.from} />
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          -{formatTBT(txFee)} {nativeSymbol} (gas)
                        </Badge>
                      </div>
                    </div>
                  )}

                  {tx.nonce === 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge variant="outline">Nonce Update</Badge>
                      </div>
                      
                      <div className="space-y-2 min-w-0">
                        <div className="overflow-hidden">
                          <AddressLink address={tx.from} />
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-mono text-muted-foreground">nonce:</span>
                          <Badge variant="secondary" className="font-mono">0</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Badge className="font-mono">1</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No significant state changes detected</p>
                  <p className="text-sm mt-2">This transaction may only involve contract execution without value transfer</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {tx.input && tx.input !== "0x" && (
          <TabsContent value="input" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Input Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground min-w-20">Function:</span>
                    <code className="font-mono text-sm font-medium break-all">
                      {METHOD_SIGNATURES[decodedInput.methodId] || (tx.methodName ? `${tx.methodName}(...)` : "Unknown")}
                    </code>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground min-w-20">MethodID:</span>
                    <code className="font-mono text-sm">
                      {decodedInput.methodId}
                    </code>
                  </div>

                  {decodedInput.params.length > 0 && decodedInput.params.map((param, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-sm text-muted-foreground font-mono min-w-20">
                        [{idx}]:
                      </span>
                      <code className="text-sm font-mono break-all">
                        {param.startsWith("0x") ? param.slice(2) : param}
                      </code>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={inputViewMode} onValueChange={(v) => setInputViewMode(v as any)}>
                    <SelectTrigger className="w-[140px]" data-testid="select-input-view">
                      <SelectValue placeholder="View Input As" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default View</SelectItem>
                      <SelectItem value="utf8">UTF-8</SelectItem>
                      <SelectItem value="original">Original</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" disabled>
                    <Code className="h-4 w-4 mr-1" />
                    Decode Input Data
                  </Button>

                  <Button variant="outline" size="sm" disabled>
                    <ScrollText className="h-4 w-4 mr-1" />
                    View In Decoder
                  </Button>

                  {tx.to && (
                    <Link href={`/address/${tx.to}#contract`}>
                      <Button variant="outline" size="sm">
                        <FileCode className="h-4 w-4 mr-1" />
                        View Contract
                      </Button>
                    </Link>
                  )}
                </div>

                {inputViewMode === "utf8" && (
                  <div className="bg-muted rounded-md p-4 overflow-x-auto">
                    <span className="text-xs text-muted-foreground block mb-2">UTF-8 Decoded:</span>
                    <code className="text-xs font-mono break-all whitespace-pre-wrap">
                      {hexToUtf8(tx.input) || "(No readable UTF-8 content)"}
                    </code>
                  </div>
                )}

                {inputViewMode === "original" && (
                  <div className="bg-muted rounded-md p-4 overflow-x-auto">
                    <span className="text-xs text-muted-foreground block mb-2">Original Hex:</span>
                    <code className="text-xs font-mono break-all whitespace-pre-wrap">
                      {tx.input}
                    </code>
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

function InfoRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
      <div className="flex items-center gap-2 sm:w-44 flex-shrink-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}:</span>
      </div>
      <div className="flex-1 text-sm min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}
