import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startIndexer, stopIndexer, getIndexer } from "./indexer";
import { z } from "zod";
import { cache, CACHE_KEYS, CACHE_TTL } from "./cache";
import { ethers } from "ethers";
import { loginSchema, signupSchema, adminLoginSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ObjectStorageService } from "./objectStorage";
import fs from "fs";
import path from "path";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "telebit2024";

const startTime = Date.now();

// Bootstrap function to seed database with environment variable configuration
async function bootstrapConfiguration() {
  try {
    // Check if settings already exist
    const existingSettings = await storage.getAllSiteSettings();
    if (existingSettings.length > 0) {
      console.log("[bootstrap] Configuration already exists, skipping bootstrap");
      return;
    }

    console.log("[bootstrap] Initializing configuration from environment variables...");

    // Seed site settings from environment variables
    const siteName = process.env.SITE_NAME || process.env.CHAIN_NAME || "Blockchain Explorer";
    const siteDescription = process.env.SITE_DESCRIPTION || `Explore blocks, transactions, and accounts on the ${siteName} network`;
    const chainName = process.env.CHAIN_NAME || "Blockchain";
    const nativeSymbol = process.env.NATIVE_SYMBOL || "ETH";
    const nativeName = process.env.NATIVE_NAME || "Ether";

    const settingsToCreate = [
      { key: "site_name", value: siteName, category: "branding" },
      { key: "site_description", value: siteDescription, category: "branding" },
      { key: "chain_name", value: chainName, category: "chain" },
      { key: "native_symbol", value: nativeSymbol, category: "chain" },
      { key: "native_name", value: nativeName, category: "chain" },
    ];

    for (const setting of settingsToCreate) {
      await storage.upsertSiteSetting(setting.key, setting.value, setting.category);
    }

    console.log(`[bootstrap] Created ${settingsToCreate.length} site settings`);

    // Create default chain configuration if not exists
    const existingChains = await storage.getChains();
    if (existingChains.length === 0) {
      const rpcUrl = process.env.EVM_RPC_URL || "https://rpc.telemeet.space";
      const chainId = parseInt(process.env.CHAIN_ID || "136919", 10);
      const bech32Prefix = process.env.BECH32_PREFIX || "tbt";

      await storage.createChain({
        name: chainName,
        chainId,
        shortName: nativeSymbol.toLowerCase(),
        rpcUrl,
        nativeSymbol,
        nativeCurrency: nativeName,
        nativeDecimals: parseInt(process.env.NATIVE_DECIMALS || "18", 10),
        bech32Prefix,
        iconUrl: null,
        isActive: true,
        isDefault: true,
        blockTime: 5,
      });

      console.log(`[bootstrap] Created default chain: ${chainName} (ID: ${chainId})`);
    }

    console.log("[bootstrap] Configuration bootstrap complete");
  } catch (error) {
    console.error("[bootstrap] Error during configuration bootstrap:", error);
    // Don't throw - allow app to continue even if bootstrap fails
  }
}

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  direction: z.enum(['next', 'prev']).default('next'),
});

function parseTxCursor(cursor: string | undefined): { blockNumber: number; txIndex: number } | null {
  if (!cursor) return null;
  const [blockNum, txIdx] = cursor.split(':').map(Number);
  if (isNaN(blockNum) || isNaN(txIdx)) return null;
  return { blockNumber: blockNum, txIndex: txIdx };
}

const blockIdSchema = z.string().refine(
  (val) => /^\d+$/.test(val) || /^0x[a-fA-F0-9]{64}$/.test(val),
  { message: "Block ID must be a number or valid 66-character hex hash" }
);

const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
  message: "Transaction hash must be a valid 66-character hex hash",
});

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
  message: "Address must be a valid 42-character hex address",
});

const verifyContractSchema = z.object({
  name: z.string().min(1).max(255),
  sourceCode: z.string().min(1),
  compilerVersion: z.string().min(1),
  evmVersion: z.string().optional(),
  optimization: z.boolean().default(false),
  runs: z.number().int().min(1).max(10000).default(200),
  constructorArgs: z.string().optional(),
  abi: z.array(z.any()),
  license: z.string().optional(),
});

const readContractSchema = z.object({
  functionName: z.string().min(1),
  args: z.array(z.any()).default([]),
});

const prepareWriteSchema = z.object({
  functionName: z.string().min(1),
  args: z.array(z.any()).default([]),
  value: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Bootstrap configuration from environment variables on startup
  await bootstrapConfiguration();
  
  setTimeout(() => {
    startIndexer().catch(console.error);
  }, 3000);

  // Dedicated endpoint for deployment tarball
  app.get("/api/download/source.tar.gz", (_req, res) => {
    const tarballPath = path.resolve(process.cwd(), "public-objects", "source-minimal.tar.gz");
    if (fs.existsSync(tarballPath)) {
      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("Content-Disposition", "attachment; filename=source-minimal.tar.gz");
      return res.sendFile(tarballPath);
    }
    return res.status(404).send("Tarball not found");
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    
    // Check local public-objects directory first
    const localPath = path.resolve(process.cwd(), "public-objects", filePath);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    
    // Fall back to cloud object storage
    try {
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      await objectStorageService.downloadObject(file, res);
    } catch (error: any) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const cached = cache.get(CACHE_KEYS.STATS);
      if (cached) {
        return res.json(cached);
      }

      const stats = await storage.getNetworkStats();
      if (!stats) {
        return res.json({
          latestBlock: 0,
          totalTransactions: 0,
          totalAddresses: 0,
          avgBlockTime: "0",
          avgGasPrice: "0",
        });
      }
      
      cache.set(CACHE_KEYS.STATS, stats, CACHE_TTL.STATS);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bootstrap endpoint - combines initial page data into single request
  app.get("/api/bootstrap", async (_req, res) => {
    try {
      // Set cache headers - 3 seconds for dynamic data
      res.set('Cache-Control', 'public, max-age=3');
      
      // Fetch stats, blocks, and transactions in parallel
      const [stats, blocksResult, txsResult, allSettings] = await Promise.all([
        storage.getNetworkStats(),
        storage.getBlocks(1, 10),
        storage.getTransactions(1, 10),
        storage.getAllSiteSettings(),
      ]);

      // Convert settings to map format
      const settingsMap: Record<string, Record<string, string>> = {};
      for (const setting of allSettings) {
        if (!settingsMap[setting.category]) {
          settingsMap[setting.category] = {};
        }
        settingsMap[setting.category][setting.key] = setting.value;
      }

      res.json({
        stats: stats || {
          latestBlock: 0,
          totalTransactions: 0,
          totalAddresses: 0,
          avgBlockTime: "0",
          avgGasPrice: "0",
        },
        blocks: blocksResult.blocks,
        transactions: txsResult.transactions,
        settings: settingsMap,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Gas Tracker - Calculate low/average/high gas prices from recent transactions
  app.get("/api/gas", async (_req, res) => {
    try {
      const cached = cache.get("gas_prices");
      if (cached) {
        return res.json(cached);
      }

      // Get recent transactions to calculate gas prices
      const { transactions } = await storage.getTransactions(1, 100);
      
      if (transactions.length === 0) {
        const defaultGas = {
          low: "1",
          average: "1", 
          high: "1",
          lastBlock: 0,
          baseFee: "0",
          timestamp: Date.now()
        };
        return res.json(defaultGas);
      }

      // Extract gas prices and sort them
      const gasPrices = transactions
        .map(tx => BigInt(tx.gasPrice || "0"))
        .filter(price => price > 0n)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

      if (gasPrices.length === 0) {
        const defaultGas = {
          low: "1000000000",
          average: "1000000000",
          high: "1000000000", 
          lastBlock: transactions[0]?.blockNumber || 0,
          baseFee: "0",
          timestamp: Date.now()
        };
        return res.json(defaultGas);
      }

      // Calculate percentiles
      const lowIndex = Math.floor(gasPrices.length * 0.1);
      const avgIndex = Math.floor(gasPrices.length * 0.5);
      const highIndex = Math.floor(gasPrices.length * 0.9);

      const gasData = {
        low: gasPrices[lowIndex].toString(),
        average: gasPrices[avgIndex].toString(),
        high: gasPrices[Math.min(highIndex, gasPrices.length - 1)].toString(),
        lastBlock: transactions[0]?.blockNumber || 0,
        baseFee: transactions[0]?.maxFeePerGas || "0",
        timestamp: Date.now()
      };

      cache.set("gas_prices", gasData, 10000); // Cache for 10 seconds
      res.json(gasData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blocks", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      
      if (page === 1 && limit === 25) {
        const cached = cache.get(CACHE_KEYS.LATEST_BLOCKS);
        if (cached) {
          return res.json(cached);
        }
      }
      
      const result = await storage.getBlocks(page, limit);
      
      if (page === 1 && limit === 25) {
        cache.set(CACHE_KEYS.LATEST_BLOCKS, result, CACHE_TTL.LATEST_BLOCKS);
      }
      
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blocks/cursor", async (req, res) => {
    try {
      const { cursor, limit, direction } = cursorPaginationSchema.parse(req.query);
      const cursorNum = cursor ? parseInt(cursor, 10) : null;
      
      if (cursor && isNaN(cursorNum!)) {
        return res.status(400).json({ message: "Invalid cursor format" });
      }
      
      const result = await storage.getBlocksByCursor(cursorNum, limit, direction);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blocks/:id", async (req, res) => {
    try {
      const id = blockIdSchema.parse(req.params.id);
      let block;
      
      if (/^\d+$/.test(id)) {
        block = await storage.getBlockByNumber(parseInt(id, 10));
      } else {
        block = await storage.getBlockByHash(id);
      }

      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }

      const transactions = await storage.getTransactionsByBlockNumber(block.number);
      res.json({ block, transactions });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      
      if (page === 1 && limit === 25) {
        const cached = cache.get(CACHE_KEYS.LATEST_TXS);
        if (cached) {
          return res.json(cached);
        }
      }
      
      const result = await storage.getTransactions(page, limit);
      
      if (page === 1 && limit === 25) {
        cache.set(CACHE_KEYS.LATEST_TXS, result, CACHE_TTL.LATEST_TXS);
      }
      
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/transactions/cursor", async (req, res) => {
    try {
      const { cursor, limit, direction } = cursorPaginationSchema.parse(req.query);
      const parsedCursor = parseTxCursor(cursor);
      
      if (cursor && !parsedCursor) {
        return res.status(400).json({ message: "Invalid cursor format. Expected: blockNumber:txIndex" });
      }
      
      const result = await storage.getTransactionsByCursor(parsedCursor, limit, direction);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/transactions/:hash", async (req, res) => {
    try {
      const hash = txHashSchema.parse(req.params.hash);
      const transaction = await storage.getTransactionByHash(hash);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const [logs, tokenTransfers] = await Promise.all([
        storage.getTransactionLogs(hash),
        storage.getTokenTransfersByTxHash(hash),
      ]);
      res.json({ transaction, logs, tokenTransfers });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/addresses", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await storage.getAddresses(page, limit);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/addresses/:address", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const { page, limit } = paginationSchema.parse(req.query);

      let address = await storage.getAddressByAddress(addressParam);
      
      if (!address) {
        try {
          const indexer = getIndexer();
          const provider = await indexer.getProvider();
          const [balance, code] = await Promise.all([
            provider.getBalance(addressParam),
            provider.getCode(addressParam),
          ]);
          
          address = {
            id: "",
            address: addressParam,
            balance: balance.toString(),
            transactionCount: 0,
            sentCount: 0,
            receivedCount: 0,
            isContract: code !== "0x",
            contractCode: code !== "0x" ? code : null,
            contractName: null,
            lastSeen: null,
            firstSeen: null,
          };
        } catch {
          address = {
            id: "",
            address: addressParam,
            balance: "0",
            transactionCount: 0,
            sentCount: 0,
            receivedCount: 0,
            isContract: false,
            contractCode: null,
            contractName: null,
            lastSeen: null,
            firstSeen: null,
          };
        }
      }

      const txResult = await storage.getTransactionsByAddress(addressParam, page, limit);
      
      res.json({
        address,
        transactions: txResult.transactions,
        totalTransactions: txResult.total,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/addresses/:address/transactions/cursor", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const { cursor, limit, direction } = cursorPaginationSchema.parse(req.query);
      const parsedCursor = parseTxCursor(cursor);
      
      if (cursor && !parsedCursor) {
        return res.status(400).json({ message: "Invalid cursor format. Expected: blockNumber:txIndex" });
      }
      
      const result = await storage.getTransactionsByAddressCursor(addressParam, parsedCursor, limit, direction);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/token-transfers/:address", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await storage.getTokenTransfersByAddress(addressParam, page, limit);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/address/:address/token-balances", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const indexer = getIndexer();
      if (!indexer) {
        return res.status(500).json({ message: "Indexer not available" });
      }
      
      const balances = await indexer.getTokenBalances(addressParam);
      res.json(balances);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tokens", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await storage.getTokens(page, limit);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tokens/:address", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const token = await storage.getTokenByAddress(addressParam);
      if (!token) {
        return res.status(404).json({ message: "Token not found" });
      }
      res.json(token);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tokens/backfill", async (_req, res) => {
    try {
      const indexer = getIndexer();
      if (!indexer) {
        return res.status(500).json({ message: "Indexer not available" });
      }
      
      const result = await indexer.backfillTokenMetadata();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stats/daily", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const stats = await storage.getDailyStatsRange(startDate, endDate);
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stats/daily/backfill", async (_req, res) => {
    try {
      const result = await storage.backfillDailyStats();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const result = await storage.search(query);
      if (!result) {
        return res.status(404).json({ message: "No results found" });
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/indexer/status", async (_req, res) => {
    try {
      const state = await storage.getIndexerState();
      res.json(state || { lastIndexedBlock: 0, isRunning: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Airdrop claims endpoint - returns claim transactions with stats
  const CLAIM_SELECTORS = [
    "0x0d58e9ad", // claim
    "0x4e71d92d", // claim
    "0x2e7ba6ef", // claim (merkle)
    "0x3ccfd60b", // withdraw
    "0x379607f5", // claim (other)
  ];

  app.get("/api/airdrops/claims", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const claims = await storage.getClaimTransactions(CLAIM_SELECTORS, page, limit);
      res.json(claims);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/airdrops/stats", async (_req, res) => {
    try {
      const stats = await storage.getClaimStats(CLAIM_SELECTORS);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Airdrop Campaign Management
  const airdropCreateSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional().nullable(),
    contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
    tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
    tokenSymbol: z.string().max(20).optional().nullable(),
    tokenDecimals: z.number().int().min(0).max(18).optional().nullable(),
    totalAmount: z.string().optional().nullable(),
    totalParticipants: z.number().int().min(0).optional().nullable(),
    status: z.enum(["upcoming", "active", "ended", "cancelled"]).default("upcoming"),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    claimUrl: z.string().url().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    eligibilityCriteria: z.string().optional().nullable(),
    methodSelectors: z.array(z.string()).optional().nullable(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  });

  const airdropUpdateSchema = airdropCreateSchema.partial();

  app.get("/api/airdrops", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await storage.getAirdrops(page, limit);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/airdrops/active", async (_req, res) => {
    try {
      const activeAirdrops = await storage.getActiveAirdrops();
      res.json({ airdrops: activeAirdrops });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/airdrops/featured", async (_req, res) => {
    try {
      const featuredAirdrops = await storage.getFeaturedAirdrops();
      res.json({ airdrops: featuredAirdrops });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/airdrops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const airdrop = await storage.getAirdropById(id);
      if (!airdrop) {
        return res.status(404).json({ message: "Airdrop not found" });
      }
      res.json(airdrop);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/indexer/stop", async (_req, res) => {
    try {
      await stopIndexer();
      res.json({ success: true, message: "Indexer stopped" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/indexer/start", async (_req, res) => {
    try {
      startIndexer().catch(console.error);
      res.json({ success: true, message: "Indexer started" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Chain Management Endpoints
  const chainCreateSchema = z.object({
    chainId: z.number().int().positive(),
    name: z.string().min(1).max(100),
    shortName: z.string().min(1).max(20),
    rpcUrl: z.string().url(),
    explorerUrl: z.string().url().optional().nullable(),
    nativeCurrency: z.string().min(1).max(20).default("ETH"),
    nativeDecimals: z.number().int().min(0).max(18).default(18),
    nativeSymbol: z.string().min(1).max(10).default("ETH"),
    iconUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    blockTime: z.number().int().positive().optional(),
    bech32Prefix: z.string().max(20).optional().nullable(),
    addressDisplayFormat: z.enum(["0x", "bech32"]).default("0x"),
  });

  const chainUpdateSchema = chainCreateSchema.partial();

  app.get("/api/chains", async (_req, res) => {
    try {
      const chainList = await storage.getChains();
      res.json({ chains: chainList });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chains/active", async (_req, res) => {
    try {
      const chainList = await storage.getActiveChains();
      res.json({ chains: chainList });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chains/default", async (_req, res) => {
    try {
      const chain = await storage.getDefaultChain();
      if (!chain) {
        return res.status(404).json({ message: "No default chain configured" });
      }
      res.json(chain);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chains/:chainId", async (req, res) => {
    try {
      const chainId = parseInt(req.params.chainId);
      if (isNaN(chainId)) {
        return res.status(400).json({ message: "Invalid chain ID" });
      }
      const chain = await storage.getChainById(chainId);
      if (!chain) {
        return res.status(404).json({ message: "Chain not found" });
      }
      res.json(chain);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chains", async (req, res) => {
    try {
      const validated = chainCreateSchema.parse(req.body);
      if (validated.isDefault) {
        await storage.clearDefaultChains();
      }
      const chain = await storage.createChain(validated);
      res.status(201).json(chain);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/chains/:chainId", async (req, res) => {
    try {
      const chainId = parseInt(req.params.chainId);
      if (isNaN(chainId)) {
        return res.status(400).json({ message: "Invalid chain ID" });
      }
      const validated = chainUpdateSchema.parse(req.body);
      if (validated.isDefault === true) {
        await storage.clearDefaultChains();
      }
      const chain = await storage.updateChain(chainId, validated);
      if (!chain) {
        return res.status(404).json({ message: "Chain not found" });
      }
      res.json(chain);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chains/:chainId/default", async (req, res) => {
    try {
      const chainId = parseInt(req.params.chainId);
      if (isNaN(chainId)) {
        return res.status(400).json({ message: "Invalid chain ID" });
      }
      const existingChain = await storage.getChainById(chainId);
      if (!existingChain) {
        return res.status(404).json({ message: "Chain not found" });
      }
      const chain = await storage.setDefaultChain(chainId);
      res.json(chain);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/chains/:chainId", async (req, res) => {
    try {
      const chainId = parseInt(req.params.chainId);
      if (isNaN(chainId)) {
        return res.status(400).json({ message: "Invalid chain ID" });
      }
      const chain = await storage.getChainById(chainId);
      if (!chain) {
        return res.status(404).json({ message: "Chain not found" });
      }
      if (chain.isDefault) {
        return res.status(400).json({ message: "Cannot delete default chain. Set another chain as default first." });
      }
      await storage.deleteChain(chainId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contracts", async (req, res) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await storage.getVerifiedContracts(page, limit);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contracts/:address", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const contract = await storage.getVerifiedContract(addressParam);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not verified", isVerified: false });
      }

      res.json({ ...contract, isVerified: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contracts/:address/abi", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const contract = await storage.getVerifiedContract(addressParam);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not verified" });
      }

      res.json({ abi: contract.abi });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts/:address/verify", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const verifyData = verifyContractSchema.parse(req.body);
      
      const indexer = getIndexer();
      const provider = await indexer.getProvider();
      const code = await provider.getCode(addressParam);
      
      if (code === "0x") {
        return res.status(400).json({ message: "Address is not a contract" });
      }
      
      const bytecodeHash = ethers.keccak256(code);
      
      const contract = await storage.createVerifiedContract({
        address: addressParam.toLowerCase(),
        name: verifyData.name,
        compilerVersion: verifyData.compilerVersion,
        evmVersion: verifyData.evmVersion || null,
        optimization: verifyData.optimization,
        runs: verifyData.runs,
        constructorArgs: verifyData.constructorArgs || null,
        sourceCode: verifyData.sourceCode,
        abi: verifyData.abi,
        bytecodeHash,
        verificationStatus: "verified",
        license: verifyData.license || null,
      });

      res.json({ success: true, contract });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts/:address/read", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const { functionName, args } = readContractSchema.parse(req.body);
      
      const verifiedContract = await storage.getVerifiedContract(addressParam);
      if (!verifiedContract) {
        return res.status(404).json({ message: "Contract not verified" });
      }

      const indexer = getIndexer();
      const provider = await indexer.getProvider();
      
      const contract = new ethers.Contract(
        addressParam, 
        verifiedContract.abi as ethers.InterfaceAbi, 
        provider
      );
      
      const func = contract.getFunction(functionName);
      if (!func) {
        return res.status(400).json({ message: `Function ${functionName} not found` });
      }
      
      const result = await contract[functionName](...args);
      
      let formattedResult: any;
      if (typeof result === 'bigint') {
        formattedResult = result.toString();
      } else if (Array.isArray(result)) {
        formattedResult = result.map((item: any) => 
          typeof item === 'bigint' ? item.toString() : item
        );
      } else if (typeof result === 'object' && result !== null) {
        formattedResult = {};
        for (const key of Object.keys(result)) {
          const val = result[key];
          formattedResult[key] = typeof val === 'bigint' ? val.toString() : val;
        }
      } else {
        formattedResult = result;
      }

      res.json({ result: formattedResult });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message || "Failed to call contract" });
    }
  });

  app.post("/api/contracts/:address/write/prepare", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const { functionName, args, value } = prepareWriteSchema.parse(req.body);
      
      const verifiedContract = await storage.getVerifiedContract(addressParam);
      if (!verifiedContract) {
        return res.status(404).json({ message: "Contract not verified" });
      }

      const iface = new ethers.Interface(verifiedContract.abi as ethers.InterfaceAbi);
      const data = iface.encodeFunctionData(functionName, args);

      res.json({
        to: addressParam,
        data,
        value: value || "0",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/contracts/:address/methods", async (req, res) => {
    try {
      const addressParam = addressSchema.parse(req.params.address);
      const verifiedContract = await storage.getVerifiedContract(addressParam);
      
      if (!verifiedContract) {
        return res.status(404).json({ message: "Contract not verified" });
      }

      const abi = verifiedContract.abi as any[];
      const readMethods: any[] = [];
      const writeMethods: any[] = [];

      for (const item of abi) {
        if (item.type === 'function') {
          const method = {
            name: item.name,
            inputs: item.inputs || [],
            outputs: item.outputs || [],
            stateMutability: item.stateMutability,
          };

          if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
            readMethods.push(method);
          } else {
            writeMethods.push(method);
          }
        }
      }

      res.json({ readMethods, writeMethods });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Health check endpoint
  app.get("/health", async (_req, res) => {
    try {
      const indexer = getIndexer();
      const stats = await storage.getNetworkStats();
      const indexerState = await storage.getIndexerState();
      
      res.json({
        status: "healthy",
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          indexer: indexer ? "running" : "stopped",
          latestBlock: stats?.latestBlock || 0,
          indexedBlock: indexerState?.lastIndexedBlock || 0,
        }
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        error: "Service unavailable"
      });
    }
  });

  // Metrics endpoint for monitoring
  app.get("/metrics", async (_req, res) => {
    try {
      const stats = await storage.getNetworkStats();
      const indexerState = await storage.getIndexerState();
      
      const metrics = [
        `# HELP telebit_uptime_seconds Server uptime in seconds`,
        `# TYPE telebit_uptime_seconds gauge`,
        `telebit_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}`,
        `# HELP telebit_latest_block Latest indexed block number`,
        `# TYPE telebit_latest_block gauge`,
        `telebit_latest_block ${stats?.latestBlock || 0}`,
        `# HELP telebit_total_transactions Total number of indexed transactions`,
        `# TYPE telebit_total_transactions counter`,
        `telebit_total_transactions ${stats?.totalTransactions || 0}`,
        `# HELP telebit_total_addresses Total number of indexed addresses`,
        `# TYPE telebit_total_addresses counter`,
        `telebit_total_addresses ${stats?.totalAddresses || 0}`,
        `# HELP telebit_indexer_running Whether the indexer is running`,
        `# TYPE telebit_indexer_running gauge`,
        `telebit_indexer_running ${indexerState?.isRunning ? 1 : 0}`,
      ];
      
      res.set('Content-Type', 'text/plain');
      res.send(metrics.join('\n'));
    } catch (error) {
      res.status(500).send('# Error collecting metrics');
    }
  });

  // Auth Routes with bcrypt
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, email, password } = signupSchema.parse(req.body);

      // Check if user already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password with bcrypt (10 rounds)
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message || "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password with bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message || "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  });

  // Admin Authentication Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      (req.session as any).isAdmin = true;
      
      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json({ message: "Admin login successful", isAdmin: true });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message || "Failed to login" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    (req.session as any).isAdmin = false;
    res.json({ message: "Admin logged out" });
  });

  app.get("/api/admin/me", (req, res) => {
    const isAdmin = (req.session as any)?.isAdmin === true;
    if (!isAdmin) {
      return res.status(401).json({ message: "Not authenticated as admin" });
    }
    res.json({ isAdmin: true, username: ADMIN_USERNAME });
  });

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if ((req.session as any)?.isAdmin !== true) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Admin Dashboard Routes
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getNetworkStats();
      const indexer = getIndexer();
      const indexerStatus = indexer ? {
        isRunning: indexer.isRunning,
        currentBlock: indexer.currentBlock || 0,
        targetBlock: indexer.targetBlock || 0,
        syncProgress: indexer.targetBlock ? Math.round((indexer.currentBlock || 0) / indexer.targetBlock * 100) : 0,
      } : { isRunning: false, currentBlock: 0, targetBlock: 0, syncProgress: 0 };

      res.json({
        network: stats,
        indexer: indexerStatus,
        uptime: Math.round((Date.now() - startTime) / 1000),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getAllUsers(page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/api-keys", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getAllApiKeys(page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/chains", requireAdmin, async (_req, res) => {
    try {
      const chains = await storage.getActiveChains();
      res.json({ chains });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/indexer/start", requireAdmin, async (_req, res) => {
    try {
      await startIndexer();
      res.json({ message: "Indexer started" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/indexer/stop", requireAdmin, async (_req, res) => {
    try {
      await stopIndexer();
      res.json({ message: "Indexer stopped" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Airdrop Campaign Management
  app.get("/api/admin/airdrops", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getAirdrops(page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/airdrops", requireAdmin, async (req, res) => {
    try {
      const data = airdropCreateSchema.parse(req.body);
      const airdropData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy: null,
      };
      const airdrop = await storage.createAirdrop(airdropData);
      res.status(201).json(airdrop);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/airdrops/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = airdropUpdateSchema.parse(req.body);
      const updateData: any = { ...data };
      if (data.startDate !== undefined) {
        updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      }
      if (data.endDate !== undefined) {
        updateData.endDate = data.endDate ? new Date(data.endDate) : null;
      }
      const airdrop = await storage.updateAirdrop(id, updateData);
      if (!airdrop) {
        return res.status(404).json({ message: "Airdrop not found" });
      }
      res.json(airdrop);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/airdrops/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAirdrop(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Site Settings API (Admin only for write, public for read)
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      const settingsMap: Record<string, Record<string, any>> = {};
      for (const setting of settings) {
        if (!settingsMap[setting.category]) {
          settingsMap[setting.category] = {};
        }
        // Parse JSON values for certain keys
        if (setting.key === "nav_menu_items" || setting.key === "social_links") {
          try {
            settingsMap[setting.category][setting.key] = JSON.parse(setting.value);
          } catch {
            settingsMap[setting.category][setting.key] = setting.value;
          }
        } else {
          settingsMap[setting.category][setting.key] = setting.value;
        }
      }
      
      // Flatten navigation settings for easier access
      if (settingsMap.navigation?.nav_menu_items) {
        settingsMap.navigation = {
          ...settingsMap.navigation,
          ...settingsMap.navigation.nav_menu_items
        };
        delete settingsMap.navigation.nav_menu_items;
      }
      
      const defaultChain = await storage.getDefaultChain();
      const chainData = defaultChain ? {
        chainId: defaultChain.chainId,
        name: defaultChain.name,
        shortName: defaultChain.shortName,
        rpcUrl: defaultChain.rpcUrl,
        nativeCurrency: defaultChain.nativeCurrency,
        nativeSymbol: defaultChain.nativeSymbol,
        nativeDecimals: defaultChain.nativeDecimals,
        bech32Prefix: defaultChain.bech32Prefix,
      } : null;
      
      // Merge site_settings chain category with chains table data
      const chainSettings = settingsMap.chain || {};
      const mergedChain = chainData ? { ...chainData, ...chainSettings } : chainSettings;
      
      res.json({ ...settingsMap, chain: mergedChain });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/settings/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const settings = await storage.getSiteSettingsByCategory(category);
      const settingsMap: Record<string, string> = {};
      for (const setting of settings) {
        settingsMap[setting.key] = setting.value;
      }
      res.json(settingsMap);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json({ settings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value, category } = req.body;
      if (!key || value === undefined || !category) {
        return res.status(400).json({ message: "key, value, and category are required" });
      }
      const setting = await storage.upsertSiteSetting(key, value, category);
      
      // Refresh cached settings for server-side meta tag injection (branding category)
      if (category === 'branding') {
        try {
          const { updateCachedSettings } = await import("./static");
          await updateCachedSettings();
        } catch {}
      }
      
      res.json({ setting });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/settings/:key", requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      await storage.deleteSiteSetting(key);
      res.json({ message: "Setting deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin file upload for logo/favicon (base64 upload)
  app.post("/api/admin/upload", requireAdmin, async (req, res) => {
    try {
      const { type, data, filename } = req.body;
      
      if (!type || !data || !filename) {
        return res.status(400).json({ message: "type, data, and filename are required" });
      }
      
      if (!["logo", "favicon"].includes(type)) {
        return res.status(400).json({ message: "type must be 'logo' or 'favicon'" });
      }
      
      // Extract base64 data (remove data:image/xxx;base64, prefix if present)
      const base64Match = data.match(/^data:([^;]+);base64,(.+)$/);
      let contentType = "image/png";
      let base64Data = data;
      
      if (base64Match) {
        contentType = base64Match[1];
        base64Data = base64Match[2];
      }
      
      // Validate content type
      const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/x-icon", "image/webp"];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({ message: "Invalid image type. Allowed: png, jpeg, gif, svg, ico, webp" });
      }
      
      const buffer = Buffer.from(base64Data, "base64");
      
      // Max size 2MB
      if (buffer.length > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum 2MB allowed." });
      }
      
      // Generate unique filename
      const ext = contentType.split("/")[1].replace("x-icon", "ico").replace("svg+xml", "svg");
      const uniqueFilename = `${type}-${Date.now()}.${ext}`;
      
      // Check if object storage is available (Replit environment)
      const hasObjectStorage = !!process.env.PUBLIC_OBJECT_SEARCH_PATHS;
      
      if (hasObjectStorage) {
        // Use Replit object storage
        const objectStorage = new ObjectStorageService();
        const publicPaths = objectStorage.getPublicObjectSearchPaths();
        const uploadPath = `${publicPaths[0]}/branding/${uniqueFilename}`;
        await objectStorage.uploadBuffer(uploadPath, buffer, contentType);
        const publicUrl = `/public-objects/branding/${uniqueFilename}`;
        res.json({ url: publicUrl, filename: uniqueFilename });
      } else {
        // VPS fallback: save to local uploads directory
        const uploadsDir = path.join(process.cwd(), "dist", "public", "uploads", "branding");
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const localPath = path.join(uploadsDir, uniqueFilename);
        await fs.promises.writeFile(localPath, buffer);
        const publicUrl = `/uploads/branding/${uniqueFilename}`;
        res.json({ url: publicUrl, filename: uniqueFilename });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Internal Transactions / Traces API
  app.get("/api/internal-transactions/:txHash", async (req, res) => {
    try {
      const { txHash } = req.params;
      const traces = await storage.getInternalTransactionsByTxHash(txHash);
      res.json({ traces });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/addresses/:address/internal-transactions", async (req, res) => {
    try {
      const { address } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getInternalTransactionsByAddress(address, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Contract Events (Logs) API
  app.get("/api/addresses/:address/events", async (req, res) => {
    try {
      const { address } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getLogsByAddress(address, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Token Holders API
  app.get("/api/tokens/:address/holders", async (req, res) => {
    try {
      const { address } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getTokenHolders(address, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tokens/:address/transfers", async (req, res) => {
    try {
      const { address } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getTokenTransfersByTokenAddress(address, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/addresses/:address/token-holdings", async (req, res) => {
    try {
      const { address } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getHolderTokens(address, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Backfill token holders from token transfers
  app.post("/api/tokens/:address/holders/backfill", async (req, res) => {
    try {
      const { address } = req.params;
      const tokenAddress = address.toLowerCase();
      
      // Get all transfers for this token
      const transfers = await storage.getAllTokenTransfersForToken(tokenAddress);
      
      // Calculate balances for each holder
      const balances: Record<string, bigint> = {};
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
      
      for (const transfer of transfers) {
        const from = transfer.from.toLowerCase();
        const to = transfer.to.toLowerCase();
        const value = BigInt(transfer.value?.toString() || "0");
        
        // Subtract from sender (if not zero address - mint)
        if (from !== ZERO_ADDRESS) {
          balances[from] = (balances[from] || BigInt(0)) - value;
        }
        
        // Add to receiver (if not zero address - burn)
        if (to !== ZERO_ADDRESS) {
          balances[to] = (balances[to] || BigInt(0)) + value;
        }
      }
      
      // Get token info
      const token = await storage.getTokenByAddress(tokenAddress);
      const tokenType = token?.tokenType || "ERC20";
      
      // Update holders with positive balances
      let holdersUpdated = 0;
      for (const [holderAddress, balance] of Object.entries(balances)) {
        if (balance > BigInt(0)) {
          await storage.createOrUpdateTokenHolder({
            tokenAddress,
            holderAddress,
            balance: balance.toString(),
            tokenType,
          });
          holdersUpdated++;
        }
      }
      
      // Update holder count on token
      await storage.updateTokenHolderCount(tokenAddress, holdersUpdated);
      
      res.json({ 
        message: "Token holders backfilled successfully",
        transfersProcessed: transfers.length,
        holdersUpdated
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // NFT Tokens API
  app.get("/api/nfts/:contractAddress/:tokenId", async (req, res) => {
    try {
      const { contractAddress, tokenId } = req.params;
      const nft = await storage.getNftToken(contractAddress, tokenId);
      if (!nft) {
        return res.status(404).json({ message: "NFT not found" });
      }
      res.json(nft);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/addresses/:address/nfts", async (req, res) => {
    try {
      const { address } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getNftsByOwner(address, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/nfts/:contractAddress", async (req, res) => {
    try {
      const { contractAddress } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const result = await storage.getNftsByContract(contractAddress, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // API Keys Management (requires authentication)
  const requireAuth = (req: Request, res: Response, next: Function) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    (req as any).userId = userId;
    next();
  };

  app.get("/api/user/api-keys", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const keys = await storage.getApiKeysByUser(userId);
      res.json({ keys: keys.map(k => ({ ...k, key: k.key.slice(0, 8) + '...' })) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user/api-keys", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { label } = req.body;
      
      const key = crypto.randomBytes(32).toString('hex');
      const apiKey = await storage.createApiKey({
        userId,
        key,
        label: label || 'API Key',
        scopes: [],
        status: 'active',
        rateLimit: 100,
        dailyQuota: 10000,
        usageToday: 0,
      });
      
      res.json({ ...apiKey, key });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/user/api-keys/:keyId", requireAuth, async (req, res) => {
    try {
      const { keyId } = req.params;
      await storage.deleteApiKey(keyId);
      res.json({ message: "API key deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Address Labels API
  app.get("/api/addresses/:address/labels", async (req, res) => {
    try {
      const { address } = req.params;
      const labels = await storage.getAddressLabels(address);
      res.json({ labels });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/addresses/:address/labels", requireAuth, async (req, res) => {
    try {
      const { address } = req.params;
      const userId = (req as any).userId;
      const { label, type, isPublic } = req.body;
      
      if (!label || label.length < 1 || label.length > 100) {
        return res.status(400).json({ message: "Label must be 1-100 characters" });
      }
      
      const addressLabel = await storage.createAddressLabel({
        address,
        label,
        source: 'user',
        type: type || 'custom',
        userId,
        isPublic: isPublic || false,
      });
      
      res.json(addressLabel);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/labels/:labelId", requireAuth, async (req, res) => {
    try {
      const { labelId } = req.params;
      await storage.deleteAddressLabel(labelId);
      res.json({ message: "Label deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // API Key Rate Limiting Middleware (for external API access)
  const apiKeyAuth = async (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return next();
    }
    
    const key = await storage.getApiKeyByKey(apiKey);
    if (!key) {
      return res.status(401).json({ message: "Invalid API key" });
    }
    
    if (key.status !== 'active') {
      return res.status(403).json({ message: "API key is not active" });
    }
    
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return res.status(403).json({ message: "API key has expired" });
    }
    
    if (key.usageToday >= key.dailyQuota) {
      return res.status(429).json({ message: "Daily API quota exceeded" });
    }
    
    await storage.updateApiKeyUsage(key.id);
    (req as any).apiKey = key;
    next();
  };

  // Export endpoints (CSV/JSON)
  app.get("/api/export/transactions", async (req, res) => {
    try {
      const address = req.query.address as string;
      const format = (req.query.format as string) || 'json';
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      
      let result;
      if (address) {
        result = await storage.getTransactionsByAddress(address, page, limit);
      } else {
        result = await storage.getTransactions(page, limit);
      }
      
      if (format === 'csv') {
        const headers = ['hash', 'blockNumber', 'from', 'to', 'value', 'gasUsed', 'gasPrice', 'status', 'timestamp'];
        const csv = [
          headers.join(','),
          ...result.transactions.map(tx => 
            headers.map(h => {
              const val = (tx as any)[h];
              return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            }).join(',')
          )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
        return res.send(csv);
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/token-transfers", async (req, res) => {
    try {
      const address = req.query.address as string;
      const format = (req.query.format as string) || 'json';
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      
      if (!address) {
        return res.status(400).json({ message: "Address required" });
      }
      
      const result = await storage.getTokenTransfersByAddress(address, page, limit);
      
      if (format === 'csv') {
        const headers = ['transactionHash', 'blockNumber', 'from', 'to', 'value', 'tokenAddress', 'tokenType', 'timestamp'];
        const csv = [
          headers.join(','),
          ...result.transfers.map(tx => 
            headers.map(h => {
              const val = (tx as any)[h];
              return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            }).join(',')
          )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=token_transfers.csv');
        return res.send(csv);
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // ETHERSCAN-COMPATIBLE API
  // ============================================
  // This endpoint mirrors Etherscan's API format for compatibility with
  // tools like Hardhat, Foundry, Remix, and other development frameworks
  
  const etherscanResponse = (status: string, message: string, result: any) => ({
    status,
    message,
    result,
  });

  app.get("/api", async (req, res) => {
    const module = (req.query.module as string)?.toLowerCase();
    const action = (req.query.action as string)?.toLowerCase();

    try {
      // Contract Module
      if (module === "contract") {
        // Get ABI for verified contract
        if (action === "getabi") {
          const address = req.query.address as string;
          if (!address) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing address parameter"));
          }
          
          const contract = await storage.getVerifiedContract(address);
          if (!contract) {
            return res.json(etherscanResponse("0", "NOTOK", "Contract source code not verified"));
          }
          
          return res.json(etherscanResponse("1", "OK", JSON.stringify(contract.abi)));
        }

        // Get source code for verified contract
        if (action === "getsourcecode") {
          const address = req.query.address as string;
          if (!address) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing address parameter"));
          }
          
          const contract = await storage.getVerifiedContract(address);
          if (!contract) {
            return res.json(etherscanResponse("0", "NOTOK", "Contract source code not verified"));
          }
          
          return res.json(etherscanResponse("1", "OK", [{
            SourceCode: contract.sourceCode,
            ABI: JSON.stringify(contract.abi),
            ContractName: contract.name,
            CompilerVersion: `v${contract.compilerVersion}`,
            OptimizationUsed: contract.optimization ? "1" : "0",
            Runs: String(contract.runs || 200),
            ConstructorArguments: contract.constructorArgs || "",
            EVMVersion: contract.evmVersion || "default",
            Library: "",
            LicenseType: contract.license || "",
            Proxy: "0",
            Implementation: "",
            SwarmSource: "",
          }]));
        }

        // Check verification status (for async verification)
        if (action === "checkverifystatus") {
          const guid = req.query.guid as string;
          if (!guid) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing guid parameter"));
          }
          
          // For now, verification is synchronous, so we check if contract exists
          // The guid format is "address-timestamp"
          const address = guid.split("-")[0];
          const contract = await storage.getVerifiedContract(address);
          
          if (contract) {
            return res.json(etherscanResponse("1", "OK", "Pass - Verified"));
          } else {
            return res.json(etherscanResponse("0", "NOTOK", "Pending in queue"));
          }
        }
      }

      // Account Module
      if (module === "account") {
        // Get balance
        if (action === "balance") {
          const address = req.query.address as string;
          if (!address) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing address parameter"));
          }
          
          const addressData = await storage.getAddressByAddress(address);
          return res.json(etherscanResponse("1", "OK", addressData?.balance || "0"));
        }

        // Get transaction list
        if (action === "txlist") {
          const address = req.query.address as string;
          const page = parseInt(req.query.page as string) || 1;
          const offset = parseInt(req.query.offset as string) || 10;
          const sort = (req.query.sort as string) || "desc";
          
          if (!address) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing address parameter"));
          }
          
          const result = await storage.getTransactionsByAddress(address, page, offset);
          const txs = result.transactions.map(tx => ({
            blockNumber: String(tx.blockNumber),
            timeStamp: tx.timestamp ? String(Math.floor(new Date(tx.timestamp).getTime() / 1000)) : "",
            hash: tx.hash,
            nonce: String(tx.nonce || 0),
            blockHash: tx.blockHash,
            transactionIndex: String(tx.transactionIndex || 0),
            from: tx.from,
            to: tx.to || "",
            value: tx.value,
            gas: String(tx.gas),
            gasPrice: tx.gasPrice,
            isError: tx.status ? "0" : "1",
            txreceipt_status: tx.status ? "1" : "0",
            input: tx.input,
            contractAddress: tx.contractAddress || "",
            cumulativeGasUsed: String(tx.cumulativeGasUsed || 0),
            gasUsed: String(tx.gasUsed || 0),
            confirmations: "",
            methodId: tx.methodId || "",
            functionName: tx.methodName || "",
          }));
          
          if (sort === "asc") {
            txs.reverse();
          }
          
          return res.json(etherscanResponse("1", "OK", txs));
        }

        // Get token transfers
        if (action === "tokentx") {
          const address = req.query.address as string;
          const page = parseInt(req.query.page as string) || 1;
          const offset = parseInt(req.query.offset as string) || 10;
          
          if (!address) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing address parameter"));
          }
          
          const result = await storage.getTokenTransfersByAddress(address, page, offset);
          const transfers = result.transfers.map(t => ({
            blockNumber: String(t.blockNumber),
            timeStamp: t.timestamp ? String(Math.floor(new Date(t.timestamp).getTime() / 1000)) : "",
            hash: t.transactionHash,
            from: t.from,
            to: t.to,
            value: t.value,
            tokenName: "",
            tokenSymbol: "",
            tokenDecimal: "18",
            contractAddress: t.tokenAddress,
          }));
          
          return res.json(etherscanResponse("1", "OK", transfers));
        }
      }

      // Block Module
      if (module === "block") {
        // Get block reward (not applicable for PoA, return 0)
        if (action === "getblockreward") {
          const blockno = req.query.blockno as string;
          if (!blockno) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing blockno parameter"));
          }
          
          const block = await storage.getBlockByNumber(parseInt(blockno, 10));
          if (!block) {
            return res.json(etherscanResponse("0", "NOTOK", "Block not found"));
          }
          
          return res.json(etherscanResponse("1", "OK", {
            blockNumber: String(block.number),
            timeStamp: block.timestamp ? String(Math.floor(new Date(block.timestamp).getTime() / 1000)) : "",
            blockMiner: block.miner,
            blockReward: "0",
            uncleInclusionReward: "0",
          }));
        }

        // Get block countdown (blocks until target)
        if (action === "getblockcountdown") {
          const blockno = parseInt(req.query.blockno as string);
          if (!blockno) {
            return res.json(etherscanResponse("0", "NOTOK", "Missing blockno parameter"));
          }
          
          const stats = await storage.getNetworkStats();
          const currentBlock = stats?.latestBlock || 0;
          const remainingBlocks = Math.max(0, blockno - currentBlock);
          const estimatedTime = remainingBlocks * 3; // 3 second block time
          
          return res.json(etherscanResponse("1", "OK", {
            CurrentBlock: String(currentBlock),
            CountdownBlock: String(blockno),
            RemainingBlock: String(remainingBlocks),
            EstimateTimeInSec: String(estimatedTime),
          }));
        }
      }

      // Stats Module
      if (module === "stats") {
        // Get TBT supply (placeholder - would need total supply tracking)
        if (action === "ethsupply" || action === "tbtsupply") {
          return res.json(etherscanResponse("1", "OK", "0"));
        }

        // Get TBT price (not applicable)
        if (action === "ethprice" || action === "tbtprice") {
          return res.json(etherscanResponse("1", "OK", {
            ethbtc: "0",
            ethbtc_timestamp: String(Math.floor(Date.now() / 1000)),
            ethusd: "0",
            ethusd_timestamp: String(Math.floor(Date.now() / 1000)),
          }));
        }
      }

      // Proxy Module (JSON-RPC passthrough)
      if (module === "proxy") {
        const RPC_URL = process.env.EVM_RPC_URL || "https://rpc.telemeet.space";
        
        if (action === "eth_blocknumber") {
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
          });
          const data = await response.json();
          return res.json(etherscanResponse("1", "OK", data.result));
        }

        if (action === "eth_getblockbynumber") {
          const tag = req.query.tag as string;
          const boolean = req.query.boolean === "true";
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBlockByNumber", params: [tag, boolean], id: 1 }),
          });
          const data = await response.json();
          return res.json(etherscanResponse("1", "OK", data.result));
        }

        if (action === "eth_gettransactionbyhash") {
          const txhash = req.query.txhash as string;
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [txhash], id: 1 }),
          });
          const data = await response.json();
          return res.json(etherscanResponse("1", "OK", data.result));
        }

        if (action === "eth_gettransactionreceipt") {
          const txhash = req.query.txhash as string;
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txhash], id: 1 }),
          });
          const data = await response.json();
          return res.json(etherscanResponse("1", "OK", data.result));
        }

        if (action === "eth_getcode") {
          const address = req.query.address as string;
          const tag = req.query.tag as string || "latest";
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getCode", params: [address, tag], id: 1 }),
          });
          const data = await response.json();
          return res.json(etherscanResponse("1", "OK", data.result));
        }

        if (action === "eth_call") {
          const to = req.query.to as string;
          const data = req.query.data as string;
          const tag = req.query.tag as string || "latest";
          const response = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to, data }, tag], id: 1 }),
          });
          const result = await response.json();
          return res.json(etherscanResponse("1", "OK", result.result));
        }
      }

      // Unknown module/action
      return res.json(etherscanResponse("0", "NOTOK", `Unknown action: ${module}/${action}`));
      
    } catch (error: any) {
      return res.json(etherscanResponse("0", "NOTOK", error.message));
    }
  });

  // POST endpoint for contract verification (Etherscan-compatible)
  app.post("/api", async (req, res) => {
    const module = (req.query.module as string || req.body.module)?.toLowerCase();
    const action = (req.query.action as string || req.body.action)?.toLowerCase();

    try {
      if (module === "contract" && action === "verifysourcecode") {
        const {
          contractaddress,
          sourceCode,
          codeformat,
          contractname,
          compilerversion,
          optimizationUsed,
          runs,
          constructorArguements,
          evmversion,
          licenseType,
        } = req.body;

        if (!contractaddress || !sourceCode || !contractname || !compilerversion) {
          return res.json(etherscanResponse("0", "NOTOK", "Missing required parameters"));
        }

        // Parse ABI from source code if standard input JSON format
        let abi: any[] = [];
        let parsedSourceCode = sourceCode;
        
        if (codeformat === "solidity-standard-json-input") {
          try {
            const jsonInput = JSON.parse(sourceCode);
            parsedSourceCode = JSON.stringify(jsonInput);
          } catch {
            // Not JSON, use as-is
          }
        }

        // For now, we accept the verification without actual compilation
        // In production, you'd integrate with solc or Sourcify
        const guid = `${contractaddress}-${Date.now()}`;

        // Store verification request (would normally queue for async processing)
        try {
          await storage.createVerifiedContract({
            contractAddress: contractaddress,
            name: contractname.split(":").pop() || contractname,
            sourceCode: parsedSourceCode,
            compilerVersion: compilerversion.replace("v", "").split("+")[0],
            evmVersion: evmversion || "paris",
            optimization: optimizationUsed === "1",
            runs: parseInt(runs) || 200,
            constructorArgs: constructorArguements || "",
            abi: abi,
            license: licenseType || "",
          });
        } catch (err: any) {
          return res.json(etherscanResponse("0", "NOTOK", `Verification failed: ${err.message}`));
        }

        return res.json(etherscanResponse("1", "OK", guid));
      }

      return res.json(etherscanResponse("0", "NOTOK", `Unknown action: ${module}/${action}`));
      
    } catch (error: any) {
      return res.json(etherscanResponse("0", "NOTOK", error.message));
    }
  });

  return httpServer;
}
