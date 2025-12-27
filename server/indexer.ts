import { ethers } from "ethers";
import { storage } from "./storage";
import { log } from "./index";
import type { InsertBlock, InsertTransaction, InsertTransactionLog, InsertAddress, InsertTokenTransfer, InsertToken, InsertInternalTransaction, InsertTokenHolder, InsertNftToken } from "@shared/schema";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

const ERC1155_ABI = [
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
];

const METHOD_SIGNATURES: Record<string, string> = {
  "0xa9059cbb": "transfer",
  "0x23b872dd": "transferFrom",
  "0x095ea7b3": "approve",
  "0x40c10f19": "mint",
  "0x42966c68": "burn",
  "0xa0712d68": "mint",
  "0x38ed1739": "swapExactTokensForTokens",
  "0x7ff36ab5": "swapExactETHForTokens",
  "0x18cbafe5": "swapExactTokensForETH",
  "0x8803dbee": "swapTokensForExactTokens",
  "0xfb3bdb41": "swapETHForExactTokens",
  "0x4a25d94a": "swapTokensForExactETH",
  "0xe8e33700": "addLiquidity",
  "0xf305d719": "addLiquidityETH",
  "0xbaa2abde": "removeLiquidity",
  "0x02751cec": "removeLiquidityETH",
  "0xd0e30db0": "deposit",
  "0x2e1a7d4d": "withdraw",
  "0x3593564c": "execute",
  "0x5ae401dc": "multicall",
};

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ERC721_TRANSFER_TOPIC = ERC20_TRANSFER_TOPIC;
const ERC1155_TRANSFER_SINGLE_TOPIC = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
const ERC1155_TRANSFER_BATCH_TOPIC = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb";

interface IndexerConfig {
  minBatchSize: number;
  maxBatchSize: number;
  parallelBlocks: number;
  reorgDepth: number;
  pollInterval: number;
  errorRetryDelay: number;
  enableTracing: boolean;
  enableNftMetadata: boolean;
  nftMetadataDelay: number;
}

const DEFAULT_CONFIG: IndexerConfig = {
  minBatchSize: 5,
  maxBatchSize: 50,
  parallelBlocks: 5,
  reorgDepth: 12,
  pollInterval: 3000,
  errorRetryDelay: 10000,
  enableTracing: true,
  enableNftMetadata: true,
  nftMetadataDelay: 100,
};

// IPFS gateways for metadata resolution
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

export class BlockchainIndexer {
  private provider: ethers.JsonRpcProvider;
  private rpcUrl: string;
  public isRunning = false;
  private config: IndexerConfig;
  private currentBatchSize: number;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private knownTokens: Set<string> = new Set();
  private tracingSupported: boolean | null = null;
  private nftMetadataQueue: { contractAddress: string; tokenId: string; tokenType: string }[] = [];
  private processingNftQueue = false;
  private rpcDownSince: Date | null = null;
  private maxRetryDelay = 60000;
  
  public currentBlock = 0;
  public targetBlock = 0;

  constructor(rpcUrl: string, config: Partial<IndexerConfig> = {}) {
    this.rpcUrl = rpcUrl;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentBatchSize = this.config.minBatchSize;
  }

  private async checkRpcHealth(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  private recreateProvider(): void {
    log("Recreating RPC provider connection...", "indexer");
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.tracingSupported = null;
  }

  private async waitForRpcRecovery(): Promise<void> {
    if (!this.rpcDownSince) {
      this.rpcDownSince = new Date();
      log("RPC endpoint appears to be down. Waiting for recovery...", "indexer");
    }

    let retryDelay = this.config.errorRetryDelay;
    let attempts = 0;

    while (this.isRunning) {
      attempts++;
      const downtime = Math.floor((Date.now() - this.rpcDownSince.getTime()) / 1000);
      log(`RPC health check attempt ${attempts} (down for ${downtime}s)...`, "indexer");

      this.recreateProvider();

      if (await this.checkRpcHealth()) {
        log(`RPC endpoint recovered after ${downtime} seconds!`, "indexer");
        this.rpcDownSince = null;
        this.consecutiveFailures = 0;
        this.currentBatchSize = this.config.minBatchSize;
        return;
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retryDelay = Math.min(retryDelay * 1.5, this.maxRetryDelay);
    }
  }

  // Check if the RPC supports debug_traceTransaction
  private async checkTracingSupport(): Promise<boolean> {
    if (this.tracingSupported !== null) return this.tracingSupported;
    
    try {
      // Test with a simple call to see if tracing is available
      await this.provider.send("debug_traceTransaction", [
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        { tracer: "callTracer" }
      ]);
      this.tracingSupported = true;
    } catch (error: any) {
      // If method not found or not supported, disable tracing
      const msg = error?.message?.toLowerCase() || "";
      if (msg.includes("method not found") || msg.includes("not supported") || msg.includes("unknown method")) {
        this.tracingSupported = false;
        log("Tracing not supported by RPC, internal transactions disabled", "indexer");
      } else {
        // Other errors (like tx not found) mean tracing might be supported
        this.tracingSupported = true;
      }
    }
    return this.tracingSupported;
  }

  // Trace internal transactions for a transaction
  private async traceInternalTransactions(txHash: string, blockNumber: number, timestamp: Date): Promise<void> {
    if (!this.config.enableTracing) return;
    
    const supported = await this.checkTracingSupport();
    if (!supported) return;

    try {
      const trace = await this.provider.send("debug_traceTransaction", [
        txHash,
        { tracer: "callTracer", tracerConfig: { onlyTopCall: false } }
      ]);

      if (trace && trace.calls) {
        await this.processTraceCalls(trace.calls, txHash, blockNumber, timestamp, []);
      }
    } catch (error: any) {
      // Silently skip trace errors - not all txs can be traced
    }
  }

  // Recursively process trace calls
  private async processTraceCalls(
    calls: any[],
    txHash: string,
    blockNumber: number,
    timestamp: Date,
    parentTrace: string[]
  ): Promise<void> {
    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];
      const traceAddress = [...parentTrace, i.toString()];

      // Skip if no value transfer and not a create
      const hasValue = call.value && call.value !== "0x0" && call.value !== "0x";
      const isCreate = call.type === "CREATE" || call.type === "CREATE2";

      if (hasValue || isCreate) {
        const internalTx: InsertInternalTransaction = {
          transactionHash: txHash,
          blockNumber,
          traceAddress,
          type: call.type || "CALL",
          from: call.from?.toLowerCase() || null,
          to: call.to?.toLowerCase() || null,
          value: call.value ? BigInt(call.value).toString() : null,
          gas: call.gas ? parseInt(call.gas, 16) : null,
          gasUsed: call.gasUsed ? parseInt(call.gasUsed, 16) : null,
          input: call.input || null,
          output: call.output || null,
          error: call.error || null,
          callType: call.type?.toLowerCase() || null,
          rewardType: null,
          timestamp,
        };

        await storage.createInternalTransaction(internalTx);
      }

      // Process nested calls
      if (call.calls && call.calls.length > 0) {
        await this.processTraceCalls(call.calls, txHash, blockNumber, timestamp, traceAddress);
      }
    }
  }

  // Update token holder balance from transfer event
  private async updateTokenHolder(
    tokenAddress: string,
    holderAddress: string,
    tokenType: string,
    tokenId: string | null
  ): Promise<void> {
    if (!holderAddress || holderAddress === "0x0000000000000000000000000000000000000000") return;
    
    const normalizedToken = tokenAddress.toLowerCase();
    const normalizedHolder = holderAddress.toLowerCase();

    try {
      let balance = "0";

      if (tokenType === "ERC20") {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
        try {
          const bal = await contract.balanceOf(holderAddress);
          balance = bal.toString();
        } catch {}
      } else if (tokenType === "ERC721") {
        // For ERC721, check if they still own this specific token
        const contract = new ethers.Contract(tokenAddress, ERC721_ABI, this.provider);
        try {
          if (tokenId) {
            const owner = await contract.ownerOf(tokenId);
            balance = owner.toLowerCase() === normalizedHolder ? "1" : "0";
          }
        } catch {}
      } else if (tokenType === "ERC1155") {
        const contract = new ethers.Contract(tokenAddress, ERC1155_ABI, this.provider);
        try {
          if (tokenId) {
            const bal = await contract.balanceOf(holderAddress, tokenId);
            balance = bal.toString();
          }
        } catch {}
      }

      const holder: InsertTokenHolder = {
        tokenAddress: normalizedToken,
        holderAddress: normalizedHolder,
        balance,
        tokenId: tokenId || null,
        tokenType,
        lastUpdated: new Date(),
      };

      await storage.createOrUpdateTokenHolder(holder);

      // Update holder count on token
      const holderCount = await storage.getTokenHolderCount(normalizedToken);
      await storage.updateTokenHolderCount(normalizedToken, holderCount);
    } catch (error: any) {
      // Silently skip holder update errors
    }
  }

  // Queue NFT for metadata fetching
  private queueNftMetadata(contractAddress: string, tokenId: string, tokenType: string): void {
    if (!this.config.enableNftMetadata) return;
    
    this.nftMetadataQueue.push({ contractAddress, tokenId, tokenType });
    
    if (!this.processingNftQueue) {
      this.processNftMetadataQueue();
    }
  }

  // Process NFT metadata queue in background
  private async processNftMetadataQueue(): Promise<void> {
    if (this.processingNftQueue) return;
    this.processingNftQueue = true;

    while (this.nftMetadataQueue.length > 0) {
      const item = this.nftMetadataQueue.shift();
      if (!item) continue;

      try {
        await this.fetchNftMetadata(item.contractAddress, item.tokenId, item.tokenType);
      } catch (error: any) {
        // Silently skip metadata fetch errors
      }

      // Rate limit metadata fetching
      await new Promise(resolve => setTimeout(resolve, this.config.nftMetadataDelay));
    }

    this.processingNftQueue = false;
  }

  // Fetch and store NFT metadata
  private async fetchNftMetadata(contractAddress: string, tokenId: string, tokenType: string): Promise<void> {
    const normalizedContract = contractAddress.toLowerCase();

    // Check if already fetched
    const existing = await storage.getNftToken(normalizedContract, tokenId);
    if (existing && existing.name) return;

    try {
      let metadataUri: string | null = null;
      let owner: string | null = null;

      if (tokenType === "ERC721") {
        const contract = new ethers.Contract(contractAddress, ERC721_ABI, this.provider);
        try {
          metadataUri = await contract.tokenURI(tokenId);
        } catch {}
        try {
          owner = await contract.ownerOf(tokenId);
        } catch {}
      } else if (tokenType === "ERC1155") {
        const contract = new ethers.Contract(contractAddress, ERC1155_ABI, this.provider);
        try {
          metadataUri = await contract.uri(tokenId);
          // ERC1155 URIs often have {id} placeholder
          if (metadataUri && metadataUri.includes("{id}")) {
            metadataUri = metadataUri.replace("{id}", BigInt(tokenId).toString(16).padStart(64, "0"));
          }
        } catch {}
      }

      let name: string | null = null;
      let description: string | null = null;
      let image: string | null = null;
      let imageGateway: string | null = null;
      let attributes: any = null;

      if (metadataUri) {
        const metadata = await this.fetchMetadataFromUri(metadataUri);
        if (metadata) {
          name = metadata.name || null;
          description = metadata.description || null;
          image = metadata.image || null;
          imageGateway = image ? this.resolveIpfsUrl(image) : null;
          attributes = metadata.attributes || null;
        }
      }

      const nft: InsertNftToken = {
        contractAddress: normalizedContract,
        tokenId,
        owner: owner?.toLowerCase() || null,
        name,
        description,
        image,
        imageGateway,
        metadataUri,
        attributes,
        tokenType,
        lastUpdated: new Date(),
      };

      await storage.createOrUpdateNftToken(nft);
      log(`Indexed NFT: ${normalizedContract}#${tokenId}`, "indexer");
    } catch (error: any) {
      // Create basic record even if metadata fetch fails
      const nft: InsertNftToken = {
        contractAddress: normalizedContract,
        tokenId,
        owner: null,
        name: null,
        description: null,
        image: null,
        imageGateway: null,
        metadataUri: null,
        attributes: null,
        tokenType,
        lastUpdated: new Date(),
      };
      await storage.createOrUpdateNftToken(nft);
    }
  }

  // Fetch metadata from URI (IPFS, HTTP, data URI)
  private async fetchMetadataFromUri(uri: string): Promise<any> {
    try {
      let resolvedUri = uri;

      // Handle IPFS URIs
      if (uri.startsWith("ipfs://")) {
        resolvedUri = IPFS_GATEWAYS[0] + uri.slice(7);
      }

      // Handle data URIs
      if (uri.startsWith("data:application/json")) {
        const base64 = uri.split(",")[1];
        if (base64) {
          return JSON.parse(Buffer.from(base64, "base64").toString());
        }
        return null;
      }

      // Fetch HTTP/HTTPS URIs
      if (resolvedUri.startsWith("http")) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(resolvedUri, {
            signal: controller.signal,
            headers: { "Accept": "application/json" },
          });
          clearTimeout(timeout);

          if (response.ok) {
            return await response.json();
          }
        } catch (e) {
          clearTimeout(timeout);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Resolve IPFS URL to HTTP gateway URL
  private resolveIpfsUrl(url: string): string | null {
    if (!url) return null;

    if (url.startsWith("ipfs://")) {
      return IPFS_GATEWAYS[0] + url.slice(7);
    }

    if (url.startsWith("http")) {
      return url;
    }

    // Handle raw CID
    if (url.match(/^Qm[a-zA-Z0-9]+/) || url.match(/^bafy[a-zA-Z0-9]+/)) {
      return IPFS_GATEWAYS[0] + url;
    }

    return url;
  }

  private async fetchAndStoreTokenMetadata(tokenAddress: string, tokenType: string): Promise<void> {
    const normalizedAddress = tokenAddress.toLowerCase();
    
    if (this.knownTokens.has(normalizedAddress)) {
      await storage.incrementTokenTransferCount(normalizedAddress);
      return;
    }

    const existingToken = await storage.getTokenByAddress(normalizedAddress);
    if (existingToken) {
      this.knownTokens.add(normalizedAddress);
      await storage.incrementTokenTransferCount(normalizedAddress);
      return;
    }

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      
      let name: string | null = null;
      let symbol: string | null = null;
      let decimals: number | null = null;
      let totalSupply: string | null = null;

      try {
        name = await contract.name();
      } catch {}
      
      try {
        symbol = await contract.symbol();
      } catch {}
      
      try {
        decimals = await contract.decimals();
      } catch {}
      
      try {
        const supply = await contract.totalSupply();
        totalSupply = supply.toString();
      } catch {}

      const token: InsertToken = {
        address: normalizedAddress,
        name,
        symbol,
        decimals,
        totalSupply,
        tokenType,
        holderCount: 0,
        transferCount: 1,
      };

      await storage.createOrUpdateToken(token);
      this.knownTokens.add(normalizedAddress);
      log(`Indexed token: ${symbol || name || tokenAddress} (${tokenType})`, "indexer");
    } catch (error: any) {
      const token: InsertToken = {
        address: normalizedAddress,
        name: null,
        symbol: null,
        decimals: null,
        totalSupply: null,
        tokenType,
        holderCount: 0,
        transferCount: 1,
      };
      await storage.createOrUpdateToken(token);
      this.knownTokens.add(normalizedAddress);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      log("Indexer already running", "indexer");
      return;
    }

    this.isRunning = true;
    log("Starting blockchain indexer with parallel fetching...", "indexer");
    log(`Connecting to RPC: ${this.rpcUrl}`, "indexer");

    if (!(await this.checkRpcHealth())) {
      log("RPC endpoint not responding. Waiting for connection...", "indexer");
      await storage.updateIndexerState(0, true, "Waiting for RPC connection");
      await this.waitForRpcRecovery();
    }

    if (!this.isRunning) {
      log("Indexer stopped before sync started", "indexer");
      return;
    }

    log("RPC connection established. Starting block sync...", "indexer");
    await storage.updateIndexerState(0, true);

    try {
      await this.syncBlocks();
    } catch (error: any) {
      log(`Indexer error: ${error.message}`, "indexer");
      await storage.updateIndexerState(0, false, error.message);
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await storage.updateIndexerState(0, false);
    log("Indexer stopped", "indexer");
  }

  private adaptBatchSize(success: boolean): void {
    if (success) {
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
      if (this.consecutiveSuccesses >= 3 && this.currentBatchSize < this.config.maxBatchSize) {
        this.currentBatchSize = Math.min(this.currentBatchSize + 5, this.config.maxBatchSize);
        this.consecutiveSuccesses = 0;
      }
    } else {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
      if (this.consecutiveFailures >= 2) {
        this.currentBatchSize = Math.max(Math.floor(this.currentBatchSize / 2), this.config.minBatchSize);
        this.consecutiveFailures = 0;
      }
    }
  }

  private async checkForReorg(lastIndexedBlock: number): Promise<number | null> {
    const depth = Math.min(this.config.reorgDepth, lastIndexedBlock);
    
    for (let i = 0; i < depth; i++) {
      const blockNum = lastIndexedBlock - i;
      const [dbBlock, chainBlock] = await Promise.all([
        storage.getBlockByNumber(blockNum),
        this.provider.getBlock(blockNum),
      ]);

      if (!dbBlock || !chainBlock) continue;

      if (dbBlock.hash !== chainBlock.hash) {
        log(`Reorg detected at block ${blockNum}! DB hash: ${dbBlock.hash}, Chain hash: ${chainBlock.hash}`, "indexer");
        return blockNum - 1;
      }
    }
    return null;
  }

  private async syncBlocks(): Promise<void> {
    const latestChainBlock = await this.provider.getBlockNumber();
    
    const { blocks: dbBlocks } = await storage.getBlocks(1, 1);
    const highestDbBlock = dbBlocks.length > 0 ? dbBlocks[0].number : 0;
    
    let lastIndexed = Math.max(highestDbBlock, latestChainBlock - 100);
    
    this.currentBlock = lastIndexed;
    this.targetBlock = latestChainBlock;
    
    log(`Starting sync from block ${lastIndexed + 1} (chain at ${latestChainBlock}, db has up to ${highestDbBlock})`, "indexer");
    await storage.updateIndexerState(lastIndexed, true);

    while (this.isRunning) {
      try {
        const latestBlock = await this.provider.getBlockNumber();
        this.targetBlock = latestBlock;
        
        if (lastIndexed >= latestBlock) {
          if (lastIndexed > 0) {
            const reorgPoint = await this.checkForReorg(lastIndexed);
            if (reorgPoint !== null) {
              const deleteFromBlock = reorgPoint + 1;
              log(`Rolling back to block ${reorgPoint} due to reorg - deleting blocks >= ${deleteFromBlock}`, "indexer");
              const deleted = await storage.deleteBlocksFromHeight(deleteFromBlock);
              log(`Reorg rollback complete: ${deleted.blocks} blocks, ${deleted.transactions} txs, ${deleted.logs} logs, ${deleted.transfers} transfers deleted`, "indexer");
              lastIndexed = reorgPoint;
              continue;
            }
          }
          
          await this.updateNetworkStats(latestBlock);
          await new Promise((resolve) => setTimeout(resolve, this.config.pollInterval));
          continue;
        }

        const endBlock = Math.min(lastIndexed + this.currentBatchSize, latestBlock);
        const blockNumbers = Array.from(
          { length: endBlock - lastIndexed },
          (_, i) => lastIndexed + 1 + i
        );

        log(`Syncing blocks ${lastIndexed + 1} to ${endBlock} (batch: ${this.currentBatchSize}, parallel: ${this.config.parallelBlocks})...`, "indexer");

        const chunks = [];
        for (let i = 0; i < blockNumbers.length; i += this.config.parallelBlocks) {
          chunks.push(blockNumbers.slice(i, i + this.config.parallelBlocks));
        }

        for (const chunk of chunks) {
          await Promise.all(chunk.map(blockNum => this.indexBlock(blockNum)));
        }

        lastIndexed = endBlock;
        this.currentBlock = lastIndexed;
        this.targetBlock = latestBlock;
        await storage.updateIndexerState(lastIndexed, true);
        await this.updateNetworkStats(latestBlock);
        this.adaptBatchSize(true);

      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isRpcDown = errorMsg.includes("fetch") || 
                          errorMsg.includes("network") || 
                          errorMsg.includes("econnrefused") ||
                          errorMsg.includes("enotfound") ||
                          errorMsg.includes("etimedout") ||
                          errorMsg.includes("socket") ||
                          errorMsg.includes("connection") ||
                          errorMsg.includes("unavailable");

        if (isRpcDown) {
          log(`RPC connection error detected: ${error.message}`, "indexer");
          await storage.updateIndexerState(lastIndexed, true, "RPC endpoint unreachable - waiting for recovery");
          await this.waitForRpcRecovery();
          
          if (this.isRunning) {
            log("RPC recovered. Resuming block sync...", "indexer");
            const reorgPoint = await this.checkForReorg(lastIndexed);
            if (reorgPoint !== null && reorgPoint < lastIndexed) {
              const deleteFromBlock = reorgPoint + 1;
              log(`Post-recovery reorg check: rolling back to block ${reorgPoint}`, "indexer");
              await storage.deleteBlocksFromHeight(deleteFromBlock);
              lastIndexed = reorgPoint;
            }
          }
        } else {
          log(`Block sync error: ${error.message}`, "indexer");
          await storage.updateIndexerState(lastIndexed, true, error.message);
          this.adaptBatchSize(false);
          this.consecutiveFailures++;
          
          if (this.consecutiveFailures >= 5 && !(await this.checkRpcHealth())) {
            await this.waitForRpcRecovery();
          } else {
            await new Promise((resolve) => setTimeout(resolve, this.config.errorRetryDelay));
          }
        }
      }
    }
  }

  private async indexBlock(blockNumber: number): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) {
        log(`Block ${blockNumber} not found`, "indexer");
        return;
      }

      const insertBlock: InsertBlock = {
        number: block.number,
        hash: block.hash!,
        parentHash: block.parentHash,
        timestamp: new Date(block.timestamp * 1000),
        miner: block.miner,
        gasUsed: Number(block.gasUsed),
        gasLimit: Number(block.gasLimit),
        baseFeePerGas: block.baseFeePerGas?.toString() || null,
        transactionCount: block.transactions.length,
        size: null,
        extraData: block.extraData || null,
        nonce: block.nonce || null,
        difficulty: null,
        totalDifficulty: null,
        sha3Uncles: null,
        stateRoot: null,
        receiptsRoot: null,
        transactionsRoot: null,
        logsBloom: null,
      };

      await storage.createBlock(insertBlock);

      const addressesToUpdate = new Set<string>();
      addressesToUpdate.add(block.miner.toLowerCase());

      const txPromises = block.transactions.map(async (txHash) => {
        const hash = typeof txHash === 'string' ? txHash : (txHash as any).hash;
        return this.indexTransaction(hash, block.timestamp, addressesToUpdate);
      });

      await Promise.all(txPromises);

      const addrUpdatePromises = Array.from(addressesToUpdate).map(addr => 
        this.updateAddress(addr)
      );
      await Promise.all(addrUpdatePromises);

    } catch (error: any) {
      log(`Error indexing block ${blockNumber}: ${error.message}`, "indexer");
      throw error;
    }
  }

  private async indexTransaction(txHash: string, blockTimestamp: number, addressesToUpdate: Set<string>): Promise<void> {
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      if (!tx || !receipt) return;

      const methodId = tx.data && tx.data.length >= 10 ? tx.data.slice(0, 10) : null;
      const methodName = methodId ? METHOD_SIGNATURES[methodId] || null : null;

      const insertTx: InsertTransaction = {
        hash: tx.hash,
        blockNumber: tx.blockNumber!,
        blockHash: tx.blockHash!,
        transactionIndex: tx.index!,
        from: tx.from,
        to: tx.to || null,
        value: tx.value.toString(),
        gas: Number(tx.gasLimit),
        gasPrice: tx.gasPrice?.toString() || null,
        maxFeePerGas: tx.maxFeePerGas?.toString() || null,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString() || null,
        input: tx.data || null,
        nonce: tx.nonce,
        type: tx.type || 0,
        status: receipt.status === 1,
        gasUsed: Number(receipt.gasUsed),
        effectiveGasPrice: receipt.gasPrice?.toString() || null,
        cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
        contractAddress: receipt.contractAddress || null,
        timestamp: new Date(blockTimestamp * 1000),
        methodId,
        methodName,
      };

      await storage.createTransaction(insertTx);

      addressesToUpdate.add(tx.from.toLowerCase());
      if (tx.to) addressesToUpdate.add(tx.to.toLowerCase());
      if (receipt.contractAddress) addressesToUpdate.add(receipt.contractAddress.toLowerCase());

      const logPromises = receipt.logs.map(async (logEntry, index) => {
        const insertLog: InsertTransactionLog = {
          transactionHash: tx.hash,
          logIndex: logEntry.index,
          address: logEntry.address,
          topics: logEntry.topics as string[],
          data: logEntry.data,
          blockNumber: tx.blockNumber!,
          blockHash: tx.blockHash!,
          removed: logEntry.removed || false,
          topic0: logEntry.topics[0] || null,
        };
        await storage.createTransactionLog(insertLog);
        addressesToUpdate.add(logEntry.address.toLowerCase());

        await this.extractTokenTransfer(logEntry, tx.hash, tx.blockNumber!, new Date(blockTimestamp * 1000));
      });

      await Promise.all(logPromises);

      // Trace internal transactions (if supported by RPC)
      await this.traceInternalTransactions(tx.hash, tx.blockNumber!, new Date(blockTimestamp * 1000));

    } catch (error: any) {
      log(`Error indexing transaction ${txHash}: ${error.message}`, "indexer");
    }
  }

  private async extractTokenTransfer(
    logEntry: ethers.Log,
    txHash: string,
    blockNumber: number,
    timestamp: Date
  ): Promise<void> {
    try {
      const topic0 = logEntry.topics[0];
      
      if (topic0 === ERC20_TRANSFER_TOPIC && logEntry.topics.length === 3) {
        const from = "0x" + logEntry.topics[1].slice(26);
        const to = "0x" + logEntry.topics[2].slice(26);
        const value = logEntry.data !== "0x" ? BigInt(logEntry.data).toString() : "0";
        
        const transfer: InsertTokenTransfer = {
          transactionHash: txHash,
          logIndex: logEntry.index,
          blockNumber,
          timestamp,
          tokenAddress: logEntry.address,
          from,
          to,
          value,
          tokenId: null,
          tokenType: "ERC20",
        };
        await storage.createTokenTransfer(transfer);
        await this.fetchAndStoreTokenMetadata(logEntry.address, "ERC20");
        
        // Update token holder balances
        await this.updateTokenHolder(logEntry.address, from, "ERC20", null);
        await this.updateTokenHolder(logEntry.address, to, "ERC20", null);
      }
      else if (topic0 === ERC721_TRANSFER_TOPIC && logEntry.topics.length === 4) {
        const from = "0x" + logEntry.topics[1].slice(26);
        const to = "0x" + logEntry.topics[2].slice(26);
        const tokenId = BigInt(logEntry.topics[3]).toString();
        
        const transfer: InsertTokenTransfer = {
          transactionHash: txHash,
          logIndex: logEntry.index,
          blockNumber,
          timestamp,
          tokenAddress: logEntry.address,
          from,
          to,
          value: null,
          tokenId,
          tokenType: "ERC721",
        };
        await storage.createTokenTransfer(transfer);
        await this.fetchAndStoreTokenMetadata(logEntry.address, "ERC721");
        
        // Update token holder balances
        await this.updateTokenHolder(logEntry.address, from, "ERC721", tokenId);
        await this.updateTokenHolder(logEntry.address, to, "ERC721", tokenId);
        
        // Queue NFT metadata fetch
        this.queueNftMetadata(logEntry.address, tokenId, "ERC721");
      }
      else if (topic0 === ERC1155_TRANSFER_SINGLE_TOPIC && logEntry.topics.length === 4) {
        const from = "0x" + logEntry.topics[2].slice(26);
        const to = "0x" + logEntry.topics[3].slice(26);
        
        const abiCoder = new ethers.AbiCoder();
        const decoded = abiCoder.decode(["uint256", "uint256"], logEntry.data);
        const tokenId = decoded[0].toString();
        const value = decoded[1].toString();
        
        const transfer: InsertTokenTransfer = {
          transactionHash: txHash,
          logIndex: logEntry.index,
          blockNumber,
          timestamp,
          tokenAddress: logEntry.address,
          from,
          to,
          value,
          tokenId,
          tokenType: "ERC1155",
        };
        await storage.createTokenTransfer(transfer);
        await this.fetchAndStoreTokenMetadata(logEntry.address, "ERC1155");
        
        // Update token holder balances
        await this.updateTokenHolder(logEntry.address, from, "ERC1155", tokenId);
        await this.updateTokenHolder(logEntry.address, to, "ERC1155", tokenId);
        
        // Queue NFT metadata fetch
        this.queueNftMetadata(logEntry.address, tokenId, "ERC1155");
      }
    } catch (error: any) {
    }
  }

  private async updateAddress(address: string): Promise<void> {
    try {
      const [balance, code, txCounts, existing] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getCode(address),
        storage.getAddressTransactionCounts(address),
        storage.getAddressByAddress(address),
      ]);

      const isContract = code !== "0x";

      const insertAddr: InsertAddress = {
        address: address,
        balance: balance.toString(),
        transactionCount: txCounts.total,
        sentCount: txCounts.sent,
        receivedCount: txCounts.received,
        isContract,
        contractCode: isContract ? code : null,
        contractName: null,
        lastSeen: new Date(),
        firstSeen: existing?.firstSeen || new Date(),
      };

      await storage.createOrUpdateAddress(insertAddr);
    } catch (error: any) {
      log(`Error updating address ${address}: ${error.message}`, "indexer");
    }
  }

  private async updateNetworkStats(latestBlock: number): Promise<void> {
    try {
      let avgGasPrice = "0";
      try {
        const feeData = await this.provider.getFeeData();
        avgGasPrice = feeData.gasPrice?.toString() || "0";
      } catch {}

      const [txResult, addrResult, tokenTransferCount] = await Promise.all([
        storage.getTransactions(1, 1),
        storage.getAddresses(1, 1),
        storage.getTokenTransferCount(),
      ]);

      await storage.updateNetworkStats({
        latestBlock: latestBlock,
        totalTransactions: txResult.total,
        totalAddresses: addrResult.total,
        avgBlockTime: "3.00",
        avgGasPrice,
        totalTokenTransfers: tokenTransferCount,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      log(`Error updating network stats: ${error.message}`, "indexer");
    }
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    return this.provider;
  }

  async backfillTokenMetadata(): Promise<{ success: boolean; tokensIndexed: number; errors: number }> {
    log("Starting token metadata backfill...", "indexer");
    let tokensIndexed = 0;
    let errors = 0;

    try {
      const uniqueTokenAddresses = await storage.getUniqueTokenAddresses();
      log(`Found ${uniqueTokenAddresses.length} unique token addresses to backfill`, "indexer");

      for (const { tokenAddress, tokenType } of uniqueTokenAddresses) {
        try {
          const existingToken = await storage.getTokenByAddress(tokenAddress);
          if (existingToken && existingToken.name) {
            this.knownTokens.add(tokenAddress.toLowerCase());
            continue;
          }

          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
          
          let name: string | null = null;
          let symbol: string | null = null;
          let decimals: number | null = null;
          let totalSupply: string | null = null;

          try { name = await contract.name(); } catch {}
          try { symbol = await contract.symbol(); } catch {}
          try { decimals = await contract.decimals(); } catch {}
          try { 
            const supply = await contract.totalSupply();
            totalSupply = supply.toString();
          } catch {}

          const transferCount = await storage.getTokenTransferCountByAddress(tokenAddress);

          const token: InsertToken = {
            address: tokenAddress.toLowerCase(),
            name,
            symbol,
            decimals,
            totalSupply,
            tokenType,
            holderCount: 0,
            transferCount,
          };

          await storage.createOrUpdateToken(token);
          this.knownTokens.add(tokenAddress.toLowerCase());
          tokensIndexed++;
          log(`Backfilled token: ${symbol || name || tokenAddress}`, "indexer");
        } catch (error: any) {
          errors++;
          log(`Error backfilling token ${tokenAddress}: ${error.message}`, "indexer");
        }
      }

      log(`Token backfill complete: ${tokensIndexed} indexed, ${errors} errors`, "indexer");
      return { success: true, tokensIndexed, errors };
    } catch (error: any) {
      log(`Token backfill failed: ${error.message}`, "indexer");
      return { success: false, tokensIndexed, errors };
    }
  }

  async getTokenBalances(walletAddress: string): Promise<{
    address: string;
    tokenAddress: string;
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    balance: string;
    formattedBalance: string;
  }[]> {
    const balances: {
      address: string;
      tokenAddress: string;
      name: string | null;
      symbol: string | null;
      decimals: number | null;
      balance: string;
      formattedBalance: string;
    }[] = [];

    try {
      const tokensResult = await storage.getTokens(1, 100);
      const tokens = tokensResult.tokens;

      const balanceOfAbi = ["function balanceOf(address) view returns (uint256)"];

      for (const token of tokens) {
        try {
          const contract = new ethers.Contract(token.address, balanceOfAbi, this.provider);
          const balance = await contract.balanceOf(walletAddress);
          
          if (balance > BigInt(0)) {
            const decimals = token.decimals || 18;
            const formatted = ethers.formatUnits(balance, decimals);
            
            balances.push({
              address: walletAddress.toLowerCase(),
              tokenAddress: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              balance: balance.toString(),
              formattedBalance: formatted,
            });
          }
        } catch (error: any) {
          // Skip tokens that fail (might not have balanceOf or revert)
        }
      }
    } catch (error: any) {
      log(`Error fetching token balances for ${walletAddress}: ${error.message}`, "indexer");
    }

    return balances;
  }
}

let indexerInstance: BlockchainIndexer | null = null;

export function getIndexer(): BlockchainIndexer {
  if (!indexerInstance) {
    const rpcUrl = process.env.EVM_RPC_URL || "https://rpc.telemeet.space";
    indexerInstance = new BlockchainIndexer(rpcUrl, {
      parallelBlocks: 5,
      minBatchSize: 5,
      maxBatchSize: 30,
      reorgDepth: 12,
    });
  }
  return indexerInstance;
}

export async function startIndexer(): Promise<void> {
  const indexer = getIndexer();
  await indexer.start();
}

export async function stopIndexer(): Promise<void> {
  const indexer = getIndexer();
  await indexer.stop();
}
