import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Code, Zap, Database, FileCode, Users, Coins, Blocks, ArrowRightLeft, Key } from "lucide-react";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  params?: { name: string; type: string; description: string; required?: boolean }[];
  response?: string;
}

const coreEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/stats",
    description: "Get network statistics including latest block, total transactions, addresses, and gas prices",
    response: `{ latestBlock, totalTransactions, totalAddresses, avgBlockTime, avgGasPrice }`
  },
  {
    method: "GET",
    path: "/api/gas",
    description: "Get current gas price estimates (low/average/high) based on recent transactions",
    response: `{ low, average, high, lastBlock, baseFee, timestamp }`
  },
  {
    method: "GET",
    path: "/api/blocks",
    description: "List blocks with pagination",
    params: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "limit", type: "number", description: "Items per page (default: 25, max: 100)" }
    ],
    response: `{ blocks: [...], total, page, limit }`
  },
  {
    method: "GET",
    path: "/api/blocks/:id",
    description: "Get block details by number or hash",
    params: [
      { name: "id", type: "string", description: "Block number or hash", required: true }
    ],
    response: `{ block: {...}, transactions: [...] }`
  },
  {
    method: "GET",
    path: "/api/transactions",
    description: "List transactions with pagination",
    params: [
      { name: "page", type: "number", description: "Page number" },
      { name: "limit", type: "number", description: "Items per page" }
    ],
    response: `{ transactions: [...], total, page, limit }`
  },
  {
    method: "GET",
    path: "/api/transactions/:hash",
    description: "Get transaction details by hash",
    params: [
      { name: "hash", type: "string", description: "Transaction hash (0x...)", required: true }
    ],
    response: `{ ...transaction, logs: [...] }`
  },
  {
    method: "GET",
    path: "/api/addresses/:address",
    description: "Get address details including balance and transaction counts",
    params: [
      { name: "address", type: "string", description: "Address (0x...)", required: true }
    ],
    response: `{ address, balance, transactionCount, sentCount, receivedCount }`
  },
];

const tokenEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/tokens",
    description: "List all indexed tokens",
    params: [
      { name: "page", type: "number", description: "Page number" },
      { name: "limit", type: "number", description: "Items per page" }
    ],
    response: `{ tokens: [...], total }`
  },
  {
    method: "GET",
    path: "/api/tokens/:address",
    description: "Get token metadata",
    params: [
      { name: "address", type: "string", description: "Token contract address", required: true }
    ],
    response: `{ address, name, symbol, decimals, totalSupply, tokenType }`
  },
  {
    method: "GET",
    path: "/api/tokens/:address/holders",
    description: "Get token holder list with balances",
    params: [
      { name: "address", type: "string", description: "Token contract address", required: true },
      { name: "page", type: "number", description: "Page number" },
      { name: "limit", type: "number", description: "Items per page" }
    ],
    response: `{ holders: [...], total }`
  },
  {
    method: "GET",
    path: "/api/token-transfers/:address",
    description: "Get token transfers for an address",
    params: [
      { name: "address", type: "string", description: "Wallet or contract address", required: true },
      { name: "page", type: "number", description: "Page number" },
      { name: "limit", type: "number", description: "Items per page" }
    ],
    response: `{ transfers: [...], total }`
  },
];

const etherscanEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api?module=account&action=balance&address=...",
    description: "Get account balance (Etherscan-compatible)",
    params: [
      { name: "address", type: "string", description: "Account address", required: true },
      { name: "tag", type: "string", description: "Block tag (latest)" }
    ],
    response: `{ status: "1", message: "OK", result: "balance_in_wei" }`
  },
  {
    method: "GET",
    path: "/api?module=account&action=txlist&address=...",
    description: "Get transaction list for address (Etherscan-compatible)",
    params: [
      { name: "address", type: "string", description: "Account address", required: true },
      { name: "startblock", type: "number", description: "Start block" },
      { name: "endblock", type: "number", description: "End block" },
      { name: "page", type: "number", description: "Page number" },
      { name: "offset", type: "number", description: "Items per page" },
      { name: "sort", type: "string", description: "asc or desc" }
    ],
    response: `{ status: "1", message: "OK", result: [...transactions] }`
  },
  {
    method: "GET",
    path: "/api?module=account&action=tokentx&address=...",
    description: "Get TBT token transfers (Etherscan-compatible)",
    params: [
      { name: "address", type: "string", description: "Account address", required: true },
      { name: "contractaddress", type: "string", description: "Filter by token contract" }
    ],
    response: `{ status: "1", message: "OK", result: [...transfers] }`
  },
  {
    method: "GET",
    path: "/api?module=proxy&action=eth_blockNumber",
    description: "Get latest block number (Etherscan-compatible)",
    response: `{ status: "1", message: "OK", result: "0x..." }`
  },
  {
    method: "GET",
    path: "/api?module=proxy&action=eth_gasPrice",
    description: "Get current gas price (Etherscan-compatible)",
    response: `{ status: "1", message: "OK", result: "0x..." }`
  },
  {
    method: "GET",
    path: "/api?module=proxy&action=eth_getBlockByNumber&tag=...",
    description: "Get block by number (Etherscan-compatible)",
    params: [
      { name: "tag", type: "string", description: "Block number (hex) or 'latest'", required: true },
      { name: "boolean", type: "boolean", description: "Include transactions" }
    ],
    response: `{ status: "1", message: "OK", result: {...block} }`
  },
  {
    method: "POST",
    path: "/api?module=contract&action=verifysourcecode",
    description: "Verify contract source code (Etherscan-compatible)",
    params: [
      { name: "contractaddress", type: "string", description: "Contract address", required: true },
      { name: "sourceCode", type: "string", description: "Solidity source code", required: true },
      { name: "contractname", type: "string", description: "Contract name", required: true },
      { name: "compilerversion", type: "string", description: "Compiler version", required: true }
    ],
    response: `{ status: "1", message: "OK", result: "guid" }`
  },
];

const chainEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/chains",
    description: "List all configured chains",
    response: `[{ chainId, name, rpcUrl, nativeCurrency, isActive, isDefault }]`
  },
  {
    method: "GET",
    path: "/api/chains/active",
    description: "List active chains only",
    response: `[...active chains]`
  },
  {
    method: "GET",
    path: "/api/chains/default",
    description: "Get the default chain configuration",
    response: `{ chainId, name, rpcUrl, ... }`
  },
  {
    method: "POST",
    path: "/api/chains",
    description: "Create a new chain configuration",
    params: [
      { name: "chainId", type: "number", description: "Chain ID", required: true },
      { name: "name", type: "string", description: "Chain name", required: true },
      { name: "rpcUrl", type: "string", description: "RPC endpoint URL", required: true }
    ],
    response: `{ ...created chain }`
  },
];

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={endpoint.method === "GET" ? "secondary" : "default"} className="font-mono">
          {endpoint.method}
        </Badge>
        <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all">{endpoint.path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
      {endpoint.params && endpoint.params.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Parameters:</p>
          <div className="grid gap-1">
            {endpoint.params.map(param => (
              <div key={param.name} className="text-xs flex gap-2 items-start">
                <code className="bg-muted px-1 py-0.5 rounded">{param.name}</code>
                <span className="text-muted-foreground">({param.type})</span>
                {param.required && <Badge variant="outline" className="h-4 text-[10px]">required</Badge>}
                <span className="text-muted-foreground">- {param.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {endpoint.response && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Response:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">{endpoint.response}</code>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-api-docs-title">
          <BookOpen className="w-6 h-6" />
          API Documentation
        </h1>
        <p className="text-muted-foreground mt-1">
          REST API endpoints for integrating with Telebit Explorer
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Start
          </CardTitle>
          <CardDescription>Base URL and authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Base URL</p>
            <code className="text-sm bg-muted px-3 py-2 rounded block">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api
            </code>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Rate Limits</p>
            <p className="text-sm text-muted-foreground">
              100 requests per minute for API endpoints. Higher limits available with API keys.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Example Request</p>
            <code className="text-sm bg-muted px-3 py-2 rounded block overflow-x-auto">
              curl "{typeof window !== 'undefined' ? window.location.origin : ''}/api/stats"
            </code>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="core" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
          <TabsList className="inline-flex w-max gap-1">
            <TabsTrigger value="core" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-core-api">
              <Database className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              Core
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-tokens-api">
              <Coins className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="etherscan" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-etherscan-api">
              <Code className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              Etherscan
            </TabsTrigger>
            <TabsTrigger value="chains" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-chains-api">
              <Blocks className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              Chains
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="core" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Endpoints</CardTitle>
              <CardDescription>Basic blockchain data access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coreEndpoints.map((endpoint, i) => (
                <EndpointCard key={i} endpoint={endpoint} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Endpoints</CardTitle>
              <CardDescription>TBT/ERC721/ERC1155 token data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tokenEndpoints.map((endpoint, i) => (
                <EndpointCard key={i} endpoint={endpoint} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="etherscan" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Etherscan-Compatible API</CardTitle>
              <CardDescription>
                Drop-in replacement for Etherscan API. Compatible with wallets and dApps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {etherscanEndpoints.map((endpoint, i) => (
                <EndpointCard key={i} endpoint={endpoint} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chains" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chain Management</CardTitle>
              <CardDescription>Multi-chain configuration endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {chainEndpoints.map((endpoint, i) => (
                <EndpointCard key={i} endpoint={endpoint} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
