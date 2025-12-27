import {
  blocks,
  transactions,
  addresses,
  transactionLogs,
  tokenTransfers,
  tokens,
  dailyStats,
  networkStats,
  indexerState,
  users,
  verifiedContracts,
  internalTransactions,
  tokenHolders,
  nftTokens,
  apiKeys,
  apiKeyUsage,
  addressLabels,
  chains,
  siteSettings,
  airdrops,
  type Block,
  type Transaction,
  type Address,
  type TransactionLog,
  type TokenTransfer,
  type Token,
  type DailyStats,
  type NetworkStats,
  type IndexerState,
  type User,
  type VerifiedContract,
  type InternalTransaction,
  type TokenHolder,
  type NftToken,
  type ApiKey,
  type AddressLabel,
  type Chain,
  type SiteSetting,
  type Airdrop,
  type InsertBlock,
  type InsertTransaction,
  type InsertAddress,
  type InsertTransactionLog,
  type InsertTokenTransfer,
  type InsertToken,
  type InsertDailyStats,
  type InsertNetworkStats,
  type InsertUser,
  type InsertVerifiedContract,
  type InsertInternalTransaction,
  type InsertTokenHolder,
  type InsertNftToken,
  type InsertApiKey,
  type InsertAddressLabel,
  type InsertChain,
  type InsertSiteSetting,
  type InsertAirdrop,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, sql, and, gte, lte, count } from "drizzle-orm";
import { bech32 } from "bech32";

// Bech32 prefix for Telebit chain
const BECH32_PREFIX = "tbt";

// Convert bech32 address to hex
function bech32ToHex(bech32Address: string): string | null {
  try {
    const decoded = bech32.decode(bech32Address);
    const bytes = bech32.fromWords(decoded.words);
    const hex = Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
    return "0x" + hex;
  } catch {
    return null;
  }
}

// Check if address is bech32 format
function isBech32Address(address: string): boolean {
  try {
    const decoded = bech32.decode(address);
    return decoded.prefix === BECH32_PREFIX;
  } catch {
    return false;
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getBlocks(page: number, limit: number): Promise<{ blocks: Block[]; total: number }>;
  getBlocksByCursor(cursor: number | null, limit: number, direction?: 'next' | 'prev'): Promise<{ blocks: Block[]; nextCursor: number | null; prevCursor: number | null; hasMore: boolean }>;
  getBlockByNumber(number: number): Promise<Block | undefined>;
  getBlockByHash(hash: string): Promise<Block | undefined>;
  createBlock(block: InsertBlock): Promise<Block>;
  getLatestBlock(): Promise<Block | undefined>;

  getTransactions(page: number, limit: number): Promise<{ transactions: Transaction[]; total: number }>;
  getTransactionsByCursor(cursor: { blockNumber: number; txIndex: number } | null, limit: number, direction?: 'next' | 'prev'): Promise<{ transactions: Transaction[]; nextCursor: string | null; prevCursor: string | null; hasMore: boolean }>;
  getTransactionByHash(hash: string): Promise<Transaction | undefined>;
  getTransactionsByBlockNumber(blockNumber: number): Promise<Transaction[]>;
  getTransactionsByAddress(address: string, page: number, limit: number): Promise<{ transactions: Transaction[]; total: number }>;
  getTransactionsByAddressCursor(address: string, cursor: { blockNumber: number; txIndex: number } | null, limit: number, direction?: 'next' | 'prev'): Promise<{ transactions: Transaction[]; nextCursor: string | null; prevCursor: string | null; hasMore: boolean }>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;

  getTransactionLogs(txHash: string): Promise<TransactionLog[]>;
  getLogsByAddress(address: string, page: number, limit: number): Promise<{ logs: TransactionLog[]; total: number }>;
  createTransactionLog(log: InsertTransactionLog): Promise<TransactionLog>;

  createTokenTransfer(transfer: InsertTokenTransfer): Promise<TokenTransfer | null>;
  getTokenTransferCount(): Promise<number>;
  getTokenTransfersByAddress(address: string, page: number, limit: number): Promise<{ transfers: TokenTransfer[]; total: number }>;
  getTokenTransfersByTokenAddress(tokenAddress: string, page: number, limit: number): Promise<{ transfers: TokenTransfer[]; total: number }>;
  getTokenTransfersByTxHash(txHash: string): Promise<TokenTransfer[]>;
  getAllTokenTransfersForToken(tokenAddress: string): Promise<TokenTransfer[]>;

  getTokenByAddress(address: string): Promise<Token | undefined>;
  createOrUpdateToken(token: InsertToken): Promise<Token>;
  getTokens(page: number, limit: number): Promise<{ tokens: Token[]; total: number }>;
  incrementTokenTransferCount(address: string): Promise<void>;
  getUniqueTokenAddresses(): Promise<{ tokenAddress: string; tokenType: string }[]>;
  getTokenTransferCountByAddress(address: string): Promise<number>;

  getAddresses(page: number, limit: number): Promise<{ addresses: Address[]; total: number }>;
  getAddressByAddress(address: string): Promise<Address | undefined>;
  getAddressTransactionCounts(address: string): Promise<{ total: number; sent: number; received: number }>;
  createOrUpdateAddress(address: InsertAddress): Promise<Address>;

  getNetworkStats(): Promise<NetworkStats | undefined>;
  updateNetworkStats(stats: InsertNetworkStats): Promise<NetworkStats>;

  getDailyStats(date: Date): Promise<DailyStats | undefined>;
  updateDailyStats(date: Date, blockCount: number, txCount: number, gasUsed: string, totalValue: string): Promise<void>;
  getDailyStatsRange(startDate: Date, endDate: Date): Promise<DailyStats[]>;
  backfillDailyStats(): Promise<{ success: boolean; daysProcessed: number }>;

  getIndexerState(): Promise<IndexerState | undefined>;
  updateIndexerState(lastBlock: number, isRunning: boolean, error?: string): Promise<void>;

  deleteBlocksFromHeight(height: number): Promise<{ blocks: number; transactions: number; logs: number; transfers: number }>;

  search(query: string): Promise<{ type: string; block?: Block; transaction?: Transaction; address?: Address } | null>;

  getVerifiedContract(address: string): Promise<VerifiedContract | undefined>;
  createVerifiedContract(contract: InsertVerifiedContract): Promise<VerifiedContract>;
  getVerifiedContracts(page: number, limit: number): Promise<{ contracts: VerifiedContract[]; total: number }>;

  // Internal Transactions
  getInternalTransactionsByTxHash(txHash: string): Promise<InternalTransaction[]>;
  getInternalTransactionsByAddress(address: string, page: number, limit: number): Promise<{ traces: InternalTransaction[]; total: number }>;
  createInternalTransaction(trace: InsertInternalTransaction): Promise<InternalTransaction>;

  // Token Holders
  getTokenHolders(tokenAddress: string, page: number, limit: number): Promise<{ holders: TokenHolder[]; total: number }>;
  updateTokenHolder(tokenAddress: string, holderAddress: string, balance: string, tokenType: string, tokenId?: string): Promise<TokenHolder>;
  createOrUpdateTokenHolder(holder: InsertTokenHolder): Promise<TokenHolder>;
  getHolderTokens(holderAddress: string, page: number, limit: number): Promise<{ tokens: TokenHolder[]; total: number }>;
  getTokenHolderCount(tokenAddress: string): Promise<number>;
  updateTokenHolderCount(tokenAddress: string, count: number): Promise<void>;

  // NFT Tokens
  getNftToken(contractAddress: string, tokenId: string): Promise<NftToken | undefined>;
  getNftsByOwner(owner: string, page: number, limit: number): Promise<{ nfts: NftToken[]; total: number }>;
  getNftsByContract(contractAddress: string, page: number, limit: number): Promise<{ nfts: NftToken[]; total: number }>;
  createOrUpdateNft(nft: InsertNftToken): Promise<NftToken>;
  createOrUpdateNftToken(nft: InsertNftToken): Promise<NftToken>;

  // API Keys
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getApiKeysByUser(userId: string): Promise<ApiKey[]>;
  updateApiKeyUsage(keyId: string): Promise<void>;
  deleteApiKey(keyId: string): Promise<void>;
  getAllApiKeys(page: number, limit: number): Promise<{ apiKeys: (Omit<ApiKey, 'key'> & { keyPrefix: string; username?: string })[]; total: number }>;

  // Admin
  getAllUsers(page: number, limit: number): Promise<{ users: Omit<User, 'password'>[]; total: number }>;

  // Address Labels
  getAddressLabel(address: string): Promise<AddressLabel | undefined>;
  getAddressLabels(address: string): Promise<AddressLabel[]>;
  createAddressLabel(label: InsertAddressLabel): Promise<AddressLabel>;
  deleteAddressLabel(id: string): Promise<void>;

  // Chain Management
  getChains(): Promise<Chain[]>;
  getActiveChains(): Promise<Chain[]>;
  getChainById(chainId: number): Promise<Chain | undefined>;
  getDefaultChain(): Promise<Chain | undefined>;
  createChain(chain: InsertChain): Promise<Chain>;
  updateChain(chainId: number, updates: Partial<InsertChain>): Promise<Chain | undefined>;
  setDefaultChain(chainId: number): Promise<Chain | undefined>;
  clearDefaultChains(): Promise<void>;
  deleteChain(chainId: number): Promise<void>;

  // Airdrop Claims
  getClaimTransactions(selectors: string[], page: number, limit: number): Promise<{ transactions: Transaction[]; total: number; totalPages: number }>;
  getClaimStats(selectors: string[]): Promise<{ totalClaims: number; uniqueClaimers: number; totalValue: string }>;

  // Site Settings
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  getSiteSettingsByCategory(category: string): Promise<SiteSetting[]>;
  getAllSiteSettings(): Promise<SiteSetting[]>;
  upsertSiteSetting(key: string, value: string, category: string): Promise<SiteSetting>;
  deleteSiteSetting(key: string): Promise<void>;

  getAirdrops(page: number, limit: number): Promise<{ airdrops: Airdrop[]; total: number }>;
  getAirdropById(id: string): Promise<Airdrop | undefined>;
  getActiveAirdrops(): Promise<Airdrop[]>;
  getFeaturedAirdrops(): Promise<Airdrop[]>;
  createAirdrop(airdrop: InsertAirdrop): Promise<Airdrop>;
  updateAirdrop(id: string, airdrop: Partial<InsertAirdrop>): Promise<Airdrop | undefined>;
  deleteAirdrop(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getBlocks(page: number, limit: number): Promise<{ blocks: Block[]; total: number }> {
    const offset = (page - 1) * limit;
    const [blockList, totalResult] = await Promise.all([
      db.select().from(blocks).orderBy(desc(blocks.number)).limit(limit).offset(offset),
      db.select({ count: count() }).from(blocks),
    ]);
    return { blocks: blockList, total: totalResult[0]?.count || 0 };
  }

  async getBlocksByCursor(cursor: number | null, limit: number, direction: 'next' | 'prev' = 'next'): Promise<{ blocks: Block[]; nextCursor: number | null; prevCursor: number | null; hasMore: boolean }> {
    let blockList: Block[];
    
    if (direction === 'next') {
      if (cursor !== null) {
        blockList = await db.select().from(blocks)
          .where(sql`${blocks.number} < ${cursor}`)
          .orderBy(desc(blocks.number))
          .limit(limit + 1);
      } else {
        blockList = await db.select().from(blocks)
          .orderBy(desc(blocks.number))
          .limit(limit + 1);
      }
    } else {
      if (cursor !== null) {
        blockList = await db.select().from(blocks)
          .where(sql`${blocks.number} > ${cursor}`)
          .orderBy(blocks.number)
          .limit(limit + 1);
        blockList.reverse();
      } else {
        blockList = await db.select().from(blocks)
          .orderBy(desc(blocks.number))
          .limit(limit + 1);
      }
    }

    const hasMore = blockList.length > limit;
    if (hasMore) blockList.pop();

    const nextCursor = blockList.length > 0 ? blockList[blockList.length - 1].number : null;
    const prevCursor = blockList.length > 0 ? blockList[0].number : null;

    return { blocks: blockList, nextCursor, prevCursor, hasMore };
  }

  async getBlockByNumber(number: number): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).where(eq(blocks.number, number));
    return block || undefined;
  }

  async getBlockByHash(hash: string): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).where(eq(blocks.hash, hash));
    return block || undefined;
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const [created] = await db
      .insert(blocks)
      .values(block)
      .onConflictDoUpdate({
        target: blocks.number,
        set: block,
      })
      .returning();
    return created;
  }

  async getLatestBlock(): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).orderBy(desc(blocks.number)).limit(1);
    return block || undefined;
  }

  async getTransactions(page: number, limit: number): Promise<{ transactions: Transaction[]; total: number }> {
    const offset = (page - 1) * limit;
    const [txList, totalResult] = await Promise.all([
      db.select().from(transactions).orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex)).limit(limit).offset(offset),
      db.select({ count: count() }).from(transactions),
    ]);
    return { transactions: txList, total: totalResult[0]?.count || 0 };
  }

  async getTransactionsByCursor(
    cursor: { blockNumber: number; txIndex: number } | null,
    limit: number,
    direction: 'next' | 'prev' = 'next'
  ): Promise<{ transactions: Transaction[]; nextCursor: string | null; prevCursor: string | null; hasMore: boolean }> {
    let txList: Transaction[];
    
    if (direction === 'next') {
      if (cursor !== null) {
        txList = await db.select().from(transactions)
          .where(sql`(${transactions.blockNumber}, ${transactions.transactionIndex}) < (${cursor.blockNumber}, ${cursor.txIndex})`)
          .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
          .limit(limit + 1);
      } else {
        txList = await db.select().from(transactions)
          .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
          .limit(limit + 1);
      }
    } else {
      if (cursor !== null) {
        txList = await db.select().from(transactions)
          .where(sql`(${transactions.blockNumber}, ${transactions.transactionIndex}) > (${cursor.blockNumber}, ${cursor.txIndex})`)
          .orderBy(transactions.blockNumber, transactions.transactionIndex)
          .limit(limit + 1);
        txList.reverse();
      } else {
        txList = await db.select().from(transactions)
          .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
          .limit(limit + 1);
      }
    }

    const hasMore = txList.length > limit;
    if (hasMore) txList.pop();

    const encodeCursor = (tx: Transaction) => `${tx.blockNumber}:${tx.transactionIndex}`;
    const nextCursor = txList.length > 0 ? encodeCursor(txList[txList.length - 1]) : null;
    const prevCursor = txList.length > 0 ? encodeCursor(txList[0]) : null;

    return { transactions: txList, nextCursor, prevCursor, hasMore };
  }

  async getTransactionByHash(hash: string): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.hash, hash));
    return tx || undefined;
  }

  async getTransactionsByBlockNumber(blockNumber: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.blockNumber, blockNumber)).orderBy(transactions.transactionIndex);
  }

  async getTransactionsByAddress(address: string, page: number, limit: number): Promise<{ transactions: Transaction[]; total: number }> {
    const offset = (page - 1) * limit;
    const normalizedAddress = address.toLowerCase();
    const [txList, totalResult] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(or(
          sql`LOWER(${transactions.from}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.to}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.contractAddress}) = ${normalizedAddress}`
        ))
        .orderBy(desc(transactions.blockNumber))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(transactions)
        .where(or(
          sql`LOWER(${transactions.from}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.to}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.contractAddress}) = ${normalizedAddress}`
        )),
    ]);
    return { transactions: txList, total: totalResult[0]?.count || 0 };
  }

  async getTransactionsByAddressCursor(
    address: string,
    cursor: { blockNumber: number; txIndex: number } | null,
    limit: number,
    direction: 'next' | 'prev' = 'next'
  ): Promise<{ transactions: Transaction[]; nextCursor: string | null; prevCursor: string | null; hasMore: boolean }> {
    const normalizedAddress = address.toLowerCase();
    const addressCondition = or(
      sql`LOWER(${transactions.from}) = ${normalizedAddress}`,
      sql`LOWER(${transactions.to}) = ${normalizedAddress}`,
      sql`LOWER(${transactions.contractAddress}) = ${normalizedAddress}`
    );
    
    let txList: Transaction[];
    
    if (direction === 'next') {
      if (cursor !== null) {
        txList = await db.select().from(transactions)
          .where(and(
            addressCondition,
            sql`(${transactions.blockNumber}, ${transactions.transactionIndex}) < (${cursor.blockNumber}, ${cursor.txIndex})`
          ))
          .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
          .limit(limit + 1);
      } else {
        txList = await db.select().from(transactions)
          .where(addressCondition)
          .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
          .limit(limit + 1);
      }
    } else {
      if (cursor !== null) {
        txList = await db.select().from(transactions)
          .where(and(
            addressCondition,
            sql`(${transactions.blockNumber}, ${transactions.transactionIndex}) > (${cursor.blockNumber}, ${cursor.txIndex})`
          ))
          .orderBy(transactions.blockNumber, transactions.transactionIndex)
          .limit(limit + 1);
        txList.reverse();
      } else {
        txList = await db.select().from(transactions)
          .where(addressCondition)
          .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
          .limit(limit + 1);
      }
    }

    const hasMore = txList.length > limit;
    if (hasMore) txList.pop();

    const encodeCursor = (tx: Transaction) => `${tx.blockNumber}:${tx.transactionIndex}`;
    const nextCursor = txList.length > 0 ? encodeCursor(txList[txList.length - 1]) : null;
    const prevCursor = txList.length > 0 ? encodeCursor(txList[0]) : null;

    return { transactions: txList, nextCursor, prevCursor, hasMore };
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db
      .insert(transactions)
      .values(tx)
      .onConflictDoUpdate({
        target: transactions.hash,
        set: tx,
      })
      .returning();
    return created;
  }

  async getTransactionLogs(txHash: string): Promise<TransactionLog[]> {
    return db.select().from(transactionLogs).where(eq(transactionLogs.transactionHash, txHash)).orderBy(transactionLogs.logIndex);
  }

  async getLogsByAddress(address: string, page: number, limit: number): Promise<{ logs: TransactionLog[]; total: number }> {
    const normalizedAddress = address.toLowerCase();
    const offset = (page - 1) * limit;
    
    const [logs, countResult] = await Promise.all([
      db.select()
        .from(transactionLogs)
        .where(sql`lower(${transactionLogs.address}) = ${normalizedAddress}`)
        .orderBy(desc(transactionLogs.blockNumber), desc(transactionLogs.logIndex))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(transactionLogs)
        .where(sql`lower(${transactionLogs.address}) = ${normalizedAddress}`)
    ]);
    
    return { logs, total: countResult[0]?.count || 0 };
  }

  async createTransactionLog(log: InsertTransactionLog): Promise<TransactionLog> {
    const [created] = await db.insert(transactionLogs).values(log).returning();
    return created;
  }

  async createTokenTransfer(transfer: InsertTokenTransfer): Promise<TokenTransfer | null> {
    const [created] = await db
      .insert(tokenTransfers)
      .values(transfer)
      .onConflictDoNothing()
      .returning();
    return created || null;
  }

  async getTokenTransferCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(tokenTransfers);
    return result?.count || 0;
  }

  async getTokenTransfersByAddress(address: string, page: number, limit: number): Promise<{ transfers: TokenTransfer[]; total: number }> {
    const offset = (page - 1) * limit;
    const normalizedAddress = address.toLowerCase();
    const [transferList, totalResult] = await Promise.all([
      db
        .select()
        .from(tokenTransfers)
        .where(or(
          sql`LOWER(${tokenTransfers.from}) = ${normalizedAddress}`,
          sql`LOWER(${tokenTransfers.to}) = ${normalizedAddress}`,
          sql`LOWER(${tokenTransfers.tokenAddress}) = ${normalizedAddress}`
        ))
        .orderBy(desc(tokenTransfers.blockNumber))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(tokenTransfers)
        .where(or(
          sql`LOWER(${tokenTransfers.from}) = ${normalizedAddress}`,
          sql`LOWER(${tokenTransfers.to}) = ${normalizedAddress}`,
          sql`LOWER(${tokenTransfers.tokenAddress}) = ${normalizedAddress}`
        )),
    ]);
    return { transfers: transferList, total: totalResult[0]?.count || 0 };
  }

  async getTokenTransfersByTokenAddress(tokenAddress: string, page: number, limit: number): Promise<{ transfers: TokenTransfer[]; total: number }> {
    const offset = (page - 1) * limit;
    const normalizedAddress = tokenAddress.toLowerCase();
    const [transferList, totalResult] = await Promise.all([
      db
        .select()
        .from(tokenTransfers)
        .where(sql`LOWER(${tokenTransfers.tokenAddress}) = ${normalizedAddress}`)
        .orderBy(desc(tokenTransfers.blockNumber))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(tokenTransfers)
        .where(sql`LOWER(${tokenTransfers.tokenAddress}) = ${normalizedAddress}`),
    ]);
    return { transfers: transferList, total: totalResult[0]?.count || 0 };
  }

  async getTokenTransfersByTxHash(txHash: string): Promise<TokenTransfer[]> {
    return db
      .select()
      .from(tokenTransfers)
      .where(sql`LOWER(${tokenTransfers.transactionHash}) = ${txHash.toLowerCase()}`)
      .orderBy(tokenTransfers.logIndex);
  }

  async getAllTokenTransfersForToken(tokenAddress: string): Promise<TokenTransfer[]> {
    const normalizedAddress = tokenAddress.toLowerCase();
    return db
      .select()
      .from(tokenTransfers)
      .where(sql`LOWER(${tokenTransfers.tokenAddress}) = ${normalizedAddress}`)
      .orderBy(tokenTransfers.blockNumber);
  }

  async getTokenByAddress(address: string): Promise<Token | undefined> {
    const [token] = await db
      .select()
      .from(tokens)
      .where(sql`LOWER(${tokens.address}) = ${address.toLowerCase()}`);
    return token || undefined;
  }

  async createOrUpdateToken(token: InsertToken): Promise<Token> {
    const [created] = await db
      .insert(tokens)
      .values(token)
      .onConflictDoUpdate({
        target: tokens.address,
        set: {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          totalSupply: token.totalSupply,
          tokenType: token.tokenType,
        },
      })
      .returning();
    return created;
  }

  async getTokens(page: number, limit: number): Promise<{ tokens: Token[]; total: number }> {
    const offset = (page - 1) * limit;
    const [tokenList, totalResult] = await Promise.all([
      db.select().from(tokens).orderBy(desc(tokens.transferCount)).limit(limit).offset(offset),
      db.select({ count: count() }).from(tokens),
    ]);
    return { tokens: tokenList, total: totalResult[0]?.count || 0 };
  }

  async incrementTokenTransferCount(address: string): Promise<void> {
    await db
      .update(tokens)
      .set({ transferCount: sql`${tokens.transferCount} + 1` })
      .where(sql`LOWER(${tokens.address}) = ${address.toLowerCase()}`);
  }

  async getUniqueTokenAddresses(): Promise<{ tokenAddress: string; tokenType: string }[]> {
    const result = await db
      .selectDistinct({ tokenAddress: tokenTransfers.tokenAddress, tokenType: tokenTransfers.tokenType })
      .from(tokenTransfers);
    return result;
  }

  async getTokenTransferCountByAddress(address: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(tokenTransfers)
      .where(sql`LOWER(${tokenTransfers.tokenAddress}) = ${address.toLowerCase()}`);
    return result?.count || 0;
  }

  async getAddresses(page: number, limit: number): Promise<{ addresses: Address[]; total: number }> {
    const offset = (page - 1) * limit;
    const [addrList, totalResult] = await Promise.all([
      db.select().from(addresses).orderBy(desc(addresses.transactionCount)).limit(limit).offset(offset),
      db.select({ count: count() }).from(addresses),
    ]);
    return { addresses: addrList, total: totalResult[0]?.count || 0 };
  }

  async getAddressByAddress(address: string): Promise<Address | undefined> {
    const [addr] = await db.select().from(addresses).where(sql`LOWER(${addresses.address}) = ${address.toLowerCase()}`);
    return addr || undefined;
  }

  async getAddressTransactionCounts(address: string): Promise<{ total: number; sent: number; received: number }> {
    const normalizedAddress = address.toLowerCase();
    
    const [totalResult, sentResult, receivedResult] = await Promise.all([
      db
        .select({ count: count() })
        .from(transactions)
        .where(or(
          sql`LOWER(${transactions.from}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.to}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.contractAddress}) = ${normalizedAddress}`
        )),
      db
        .select({ count: count() })
        .from(transactions)
        .where(sql`LOWER(${transactions.from}) = ${normalizedAddress}`),
      db
        .select({ count: count() })
        .from(transactions)
        .where(or(
          sql`LOWER(${transactions.to}) = ${normalizedAddress}`,
          sql`LOWER(${transactions.contractAddress}) = ${normalizedAddress}`
        )),
    ]);
    
    return {
      total: totalResult[0]?.count || 0,
      sent: sentResult[0]?.count || 0,
      received: receivedResult[0]?.count || 0,
    };
  }

  async createOrUpdateAddress(addr: InsertAddress): Promise<Address> {
    const [created] = await db
      .insert(addresses)
      .values(addr)
      .onConflictDoUpdate({
        target: addresses.address,
        set: {
          balance: addr.balance,
          transactionCount: addr.transactionCount,
          sentCount: addr.sentCount,
          receivedCount: addr.receivedCount,
          isContract: addr.isContract,
          contractCode: addr.contractCode,
          contractName: addr.contractName,
          lastSeen: addr.lastSeen,
        },
      })
      .returning();
    return created;
  }

  async getNetworkStats(): Promise<NetworkStats | undefined> {
    const [stats] = await db.select().from(networkStats).limit(1);
    return stats || undefined;
  }

  async updateNetworkStats(stats: InsertNetworkStats): Promise<NetworkStats> {
    await db.delete(networkStats);
    const [created] = await db.insert(networkStats).values(stats).returning();
    return created;
  }

  async getDailyStats(date: Date): Promise<DailyStats | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [stats] = await db.select().from(dailyStats).where(eq(dailyStats.date, startOfDay));
    return stats || undefined;
  }

  async updateDailyStats(date: Date, blockCount: number, txCount: number, gasUsed: string, totalValue: string): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    await db
      .insert(dailyStats)
      .values({
        date: startOfDay,
        blockCount,
        transactionCount: txCount,
        addressCount: 0,
        gasUsed,
        totalValue,
        avgGasPrice: null,
      })
      .onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          blockCount: sql`${dailyStats.blockCount} + ${blockCount}`,
          transactionCount: sql`${dailyStats.transactionCount} + ${txCount}`,
          gasUsed: sql`CAST(${dailyStats.gasUsed} AS NUMERIC) + CAST(${gasUsed} AS NUMERIC)`,
          totalValue: sql`CAST(${dailyStats.totalValue} AS NUMERIC) + CAST(${totalValue} AS NUMERIC)`,
        },
      });
  }

  async getDailyStatsRange(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    return db
      .select()
      .from(dailyStats)
      .where(and(gte(dailyStats.date, startDate), lte(dailyStats.date, endDate)))
      .orderBy(desc(dailyStats.date));
  }

  async backfillDailyStats(): Promise<{ success: boolean; daysProcessed: number; error?: string }> {
    try {
      await db.execute(sql`
        INSERT INTO daily_stats (id, date, block_count, transaction_count, address_count, gas_used, total_value, avg_gas_price)
        SELECT 
          gen_random_uuid()::varchar,
          DATE_TRUNC('day', timestamp) as date,
          COUNT(DISTINCT number)::integer as block_count,
          COALESCE(SUM(transaction_count), 0)::integer as transaction_count,
          0 as address_count,
          COALESCE(SUM(gas_used), 0)::numeric(78,0) as gas_used,
          0::numeric(78,0) as total_value,
          NULL::numeric(78,0) as avg_gas_price
        FROM blocks
        GROUP BY DATE_TRUNC('day', timestamp)
        ON CONFLICT (date) DO UPDATE SET
          block_count = EXCLUDED.block_count,
          transaction_count = EXCLUDED.transaction_count,
          gas_used = EXCLUDED.gas_used
      `);
      
      const [countResult] = await db.select({ count: count() }).from(dailyStats);
      return { success: true, daysProcessed: countResult?.count || 0 };
    } catch (error: any) {
      console.error("Daily stats backfill error:", error.message);
      return { success: false, daysProcessed: 0, error: error.message };
    }
  }

  async getIndexerState(): Promise<IndexerState | undefined> {
    const [state] = await db.select().from(indexerState).where(eq(indexerState.id, "main"));
    return state || undefined;
  }

  async updateIndexerState(lastBlock: number, isRunning: boolean, error?: string): Promise<void> {
    await db
      .insert(indexerState)
      .values({
        id: "main",
        lastIndexedBlock: lastBlock,
        isRunning,
        lastError: error || null,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: indexerState.id,
        set: {
          lastIndexedBlock: lastBlock,
          isRunning,
          lastError: error || null,
          lastUpdated: new Date(),
        },
      });
  }

  async deleteBlocksFromHeight(height: number): Promise<{ blocks: number; transactions: number; logs: number; transfers: number }> {
    return await db.transaction(async (tx) => {
      const deletedTransfers = await tx.delete(tokenTransfers).where(gte(tokenTransfers.blockNumber, height)).returning();
      const deletedLogs = await tx.delete(transactionLogs).where(gte(transactionLogs.blockNumber, height)).returning();
      const deletedTxs = await tx.delete(transactions).where(gte(transactions.blockNumber, height)).returning();
      const deletedBlocks = await tx.delete(blocks).where(gte(blocks.number, height)).returning();
      return {
        blocks: deletedBlocks.length,
        transactions: deletedTxs.length,
        logs: deletedLogs.length,
        transfers: deletedTransfers.length,
      };
    });
  }

  async search(query: string): Promise<{ type: string; block?: Block; transaction?: Transaction; address?: Address } | null> {
    const trimmed = query.trim();

    if (/^\d+$/.test(trimmed)) {
      const blockNum = parseInt(trimmed, 10);
      const block = await this.getBlockByNumber(blockNum);
      if (block) return { type: "block", block };
    }

    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      const block = await this.getBlockByHash(trimmed);
      if (block) return { type: "block", block };

      const tx = await this.getTransactionByHash(trimmed);
      if (tx) return { type: "transaction", transaction: tx };
    }

    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      const addr = await this.getAddressByAddress(trimmed);
      if (addr) return { type: "address", address: addr };
      return { type: "address", address: { id: "", address: trimmed, balance: "0", transactionCount: 0, sentCount: 0, receivedCount: 0, isContract: false, contractCode: null, contractName: null, lastSeen: null, firstSeen: null } };
    }

    // Check for bech32 address (tbt1...)
    if (isBech32Address(trimmed)) {
      const hexAddress = bech32ToHex(trimmed);
      if (hexAddress && hexAddress.length === 42) {
        const addr = await this.getAddressByAddress(hexAddress);
        if (addr) return { type: "address", address: addr };
        return { type: "address", address: { id: "", address: hexAddress, balance: "0", transactionCount: 0, sentCount: 0, receivedCount: 0, isContract: false, contractCode: null, contractName: null, lastSeen: null, firstSeen: null } };
      }
    }

    return null;
  }

  async getVerifiedContract(address: string): Promise<VerifiedContract | undefined> {
    const [contract] = await db.select().from(verifiedContracts).where(sql`LOWER(${verifiedContracts.address}) = ${address.toLowerCase()}`);
    return contract || undefined;
  }

  async createVerifiedContract(contract: InsertVerifiedContract): Promise<VerifiedContract> {
    const [created] = await db
      .insert(verifiedContracts)
      .values(contract)
      .onConflictDoUpdate({
        target: verifiedContracts.address,
        set: {
          name: contract.name,
          compilerVersion: contract.compilerVersion,
          evmVersion: contract.evmVersion,
          optimization: contract.optimization,
          runs: contract.runs,
          constructorArgs: contract.constructorArgs,
          sourceCode: contract.sourceCode,
          abi: contract.abi,
          bytecodeHash: contract.bytecodeHash,
          verificationStatus: contract.verificationStatus,
          license: contract.license,
          verifiedAt: new Date(),
        },
      })
      .returning();
    return created;
  }

  async getVerifiedContracts(page: number, limit: number): Promise<{ contracts: VerifiedContract[]; total: number }> {
    const offset = (page - 1) * limit;
    const [contractList, totalResult] = await Promise.all([
      db.select().from(verifiedContracts).orderBy(desc(verifiedContracts.verifiedAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(verifiedContracts),
    ]);
    return { contracts: contractList, total: totalResult[0]?.count || 0 };
  }

  // Internal Transactions
  async getInternalTransactionsByTxHash(txHash: string): Promise<InternalTransaction[]> {
    return db.select().from(internalTransactions)
      .where(eq(internalTransactions.transactionHash, txHash))
      .orderBy(internalTransactions.id);
  }

  async getInternalTransactionsByAddress(address: string, page: number, limit: number): Promise<{ traces: InternalTransaction[]; total: number }> {
    const offset = (page - 1) * limit;
    const lowerAddr = address.toLowerCase();
    const [traces, totalResult] = await Promise.all([
      db.select().from(internalTransactions)
        .where(or(
          sql`LOWER(${internalTransactions.from}) = ${lowerAddr}`,
          sql`LOWER(${internalTransactions.to}) = ${lowerAddr}`
        ))
        .orderBy(desc(internalTransactions.blockNumber))
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(internalTransactions)
        .where(or(
          sql`LOWER(${internalTransactions.from}) = ${lowerAddr}`,
          sql`LOWER(${internalTransactions.to}) = ${lowerAddr}`
        )),
    ]);
    return { traces, total: totalResult[0]?.count || 0 };
  }

  async createInternalTransaction(trace: InsertInternalTransaction): Promise<InternalTransaction> {
    const [created] = await db.insert(internalTransactions).values(trace).returning();
    return created;
  }

  // Token Holders
  async getTokenHolders(tokenAddress: string, page: number, limit: number): Promise<{ holders: TokenHolder[]; total: number }> {
    const offset = (page - 1) * limit;
    const lowerAddr = tokenAddress.toLowerCase();
    const [holders, totalResult] = await Promise.all([
      db.select().from(tokenHolders)
        .where(sql`LOWER(${tokenHolders.tokenAddress}) = ${lowerAddr}`)
        .orderBy(desc(tokenHolders.balance))
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(tokenHolders)
        .where(sql`LOWER(${tokenHolders.tokenAddress}) = ${lowerAddr}`),
    ]);
    return { holders, total: totalResult[0]?.count || 0 };
  }

  async updateTokenHolder(tokenAddress: string, holderAddress: string, balance: string, tokenType: string, tokenId?: string): Promise<TokenHolder> {
    const [holder] = await db
      .insert(tokenHolders)
      .values({
        tokenAddress: tokenAddress.toLowerCase(),
        holderAddress: holderAddress.toLowerCase(),
        balance,
        tokenType,
        tokenId,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [tokenHolders.tokenAddress, tokenHolders.holderAddress],
        set: {
          balance,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return holder;
  }

  async getHolderTokens(holderAddress: string, page: number, limit: number): Promise<{ tokens: TokenHolder[]; total: number }> {
    const offset = (page - 1) * limit;
    const lowerAddr = holderAddress.toLowerCase();
    const [tokens, totalResult] = await Promise.all([
      db.select().from(tokenHolders)
        .where(sql`LOWER(${tokenHolders.holderAddress}) = ${lowerAddr}`)
        .orderBy(desc(tokenHolders.balance))
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(tokenHolders)
        .where(sql`LOWER(${tokenHolders.holderAddress}) = ${lowerAddr}`),
    ]);
    return { tokens, total: totalResult[0]?.count || 0 };
  }

  async createOrUpdateTokenHolder(holder: InsertTokenHolder): Promise<TokenHolder> {
    const lowerTokenAddr = holder.tokenAddress.toLowerCase();
    const lowerHolderAddr = holder.holderAddress.toLowerCase();
    
    // For ERC20: upsert by (tokenAddress, holderAddress)
    // For ERC721/ERC1155: upsert by (tokenAddress, holderAddress, tokenId)
    if (holder.tokenType === "ERC20" || !holder.tokenId) {
      // ERC20 or no tokenId - aggregate by holder address
      const [existing] = await db.select().from(tokenHolders)
        .where(and(
          sql`LOWER(${tokenHolders.tokenAddress}) = ${lowerTokenAddr}`,
          sql`LOWER(${tokenHolders.holderAddress}) = ${lowerHolderAddr}`,
          eq(tokenHolders.tokenType, "ERC20")
        ))
        .limit(1);
      
      if (existing) {
        const [updated] = await db.update(tokenHolders)
          .set({
            balance: holder.balance,
            lastUpdated: new Date(),
          })
          .where(eq(tokenHolders.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(tokenHolders)
          .values({
            ...holder,
            tokenAddress: lowerTokenAddr,
            holderAddress: lowerHolderAddr,
            lastUpdated: new Date(),
          })
          .returning();
        return created;
      }
    } else {
      // ERC721/ERC1155 - track per tokenId
      const [existing] = await db.select().from(tokenHolders)
        .where(and(
          sql`LOWER(${tokenHolders.tokenAddress}) = ${lowerTokenAddr}`,
          sql`LOWER(${tokenHolders.holderAddress}) = ${lowerHolderAddr}`,
          eq(tokenHolders.tokenId, holder.tokenId)
        ))
        .limit(1);
      
      if (existing) {
        const [updated] = await db.update(tokenHolders)
          .set({
            balance: holder.balance,
            lastUpdated: new Date(),
          })
          .where(eq(tokenHolders.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await db.insert(tokenHolders)
          .values({
            ...holder,
            tokenAddress: lowerTokenAddr,
            holderAddress: lowerHolderAddr,
            lastUpdated: new Date(),
          })
          .returning();
        return created;
      }
    }
  }

  async getTokenHolderCount(tokenAddress: string): Promise<number> {
    const lowerAddr = tokenAddress.toLowerCase();
    const [result] = await db.select({ count: count() }).from(tokenHolders)
      .where(and(
        sql`LOWER(${tokenHolders.tokenAddress}) = ${lowerAddr}`,
        sql`CAST(${tokenHolders.balance} AS NUMERIC) > 0`
      ));
    return result?.count || 0;
  }

  async updateTokenHolderCount(tokenAddress: string, holderCount: number): Promise<void> {
    const lowerAddr = tokenAddress.toLowerCase();
    await db.update(tokens)
      .set({ holderCount })
      .where(sql`LOWER(${tokens.address}) = ${lowerAddr}`);
  }

  // NFT Tokens
  async getNftToken(contractAddress: string, tokenId: string): Promise<NftToken | undefined> {
    const [nft] = await db.select().from(nftTokens)
      .where(and(
        sql`LOWER(${nftTokens.contractAddress}) = ${contractAddress.toLowerCase()}`,
        eq(nftTokens.tokenId, tokenId)
      ));
    return nft || undefined;
  }

  async getNftsByOwner(owner: string, page: number, limit: number): Promise<{ nfts: NftToken[]; total: number }> {
    const offset = (page - 1) * limit;
    const lowerAddr = owner.toLowerCase();
    const [nfts, totalResult] = await Promise.all([
      db.select().from(nftTokens)
        .where(sql`LOWER(${nftTokens.owner}) = ${lowerAddr}`)
        .orderBy(desc(nftTokens.lastUpdated))
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(nftTokens)
        .where(sql`LOWER(${nftTokens.owner}) = ${lowerAddr}`),
    ]);
    return { nfts, total: totalResult[0]?.count || 0 };
  }

  async getNftsByContract(contractAddress: string, page: number, limit: number): Promise<{ nfts: NftToken[]; total: number }> {
    const offset = (page - 1) * limit;
    const lowerAddr = contractAddress.toLowerCase();
    const [nfts, totalResult] = await Promise.all([
      db.select().from(nftTokens)
        .where(sql`LOWER(${nftTokens.contractAddress}) = ${lowerAddr}`)
        .orderBy(nftTokens.tokenId)
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(nftTokens)
        .where(sql`LOWER(${nftTokens.contractAddress}) = ${lowerAddr}`),
    ]);
    return { nfts, total: totalResult[0]?.count || 0 };
  }

  async createOrUpdateNft(nft: InsertNftToken): Promise<NftToken> {
    const [created] = await db
      .insert(nftTokens)
      .values({
        ...nft,
        contractAddress: nft.contractAddress.toLowerCase(),
        owner: nft.owner?.toLowerCase(),
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [nftTokens.contractAddress, nftTokens.tokenId],
        set: {
          owner: nft.owner?.toLowerCase(),
          name: nft.name,
          description: nft.description,
          image: nft.image,
          imageGateway: nft.imageGateway,
          metadataUri: nft.metadataUri,
          attributes: nft.attributes,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return created;
  }

  async createOrUpdateNftToken(nft: InsertNftToken): Promise<NftToken> {
    return this.createOrUpdateNft(nft);
  }

  // API Keys
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey || undefined;
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async updateApiKeyUsage(keyId: string): Promise<void> {
    await db.update(apiKeys)
      .set({
        usageToday: sql`${apiKeys.usageToday} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyId));
  }

  async deleteApiKey(keyId: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
  }

  async getAllApiKeys(page: number, limit: number): Promise<{ apiKeys: (Omit<ApiKey, 'key'> & { keyPrefix: string; username?: string })[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(apiKeys);
    const total = countResult?.count || 0;

    const keys = await db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      key: apiKeys.key,
      label: apiKeys.label,
      scopes: apiKeys.scopes,
      status: apiKeys.status,
      rateLimit: apiKeys.rateLimit,
      dailyQuota: apiKeys.dailyQuota,
      usageToday: apiKeys.usageToday,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
      username: users.username,
    })
      .from(apiKeys)
      .leftJoin(users, eq(apiKeys.userId, users.id))
      .orderBy(desc(apiKeys.createdAt))
      .limit(limit)
      .offset(offset);

    // Mask API keys - only show first 8 characters for security
    const maskedKeys = keys.map(k => {
      const { key, username, ...rest } = k;
      return {
        ...rest,
        keyPrefix: key.substring(0, 8),
        username: username || undefined,
      };
    });

    return { apiKeys: maskedKeys, total };
  }

  async getAllUsers(page: number, limit: number): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const total = countResult?.count || 0;

    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
    })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return { users: result, total };
  }

  // Address Labels
  async getAddressLabel(address: string): Promise<AddressLabel | undefined> {
    const [label] = await db.select().from(addressLabels)
      .where(sql`LOWER(${addressLabels.address}) = ${address.toLowerCase()}`);
    return label || undefined;
  }

  async getAddressLabels(address: string): Promise<AddressLabel[]> {
    return db.select().from(addressLabels)
      .where(sql`LOWER(${addressLabels.address}) = ${address.toLowerCase()}`)
      .orderBy(desc(addressLabels.createdAt));
  }

  async createAddressLabel(label: InsertAddressLabel): Promise<AddressLabel> {
    const [created] = await db.insert(addressLabels).values({
      ...label,
      address: label.address.toLowerCase(),
    }).returning();
    return created;
  }

  async deleteAddressLabel(id: string): Promise<void> {
    await db.delete(addressLabels).where(eq(addressLabels.id, id));
  }

  // Chain Management
  async getChains(): Promise<Chain[]> {
    return db.select().from(chains).orderBy(chains.chainId);
  }

  async getActiveChains(): Promise<Chain[]> {
    return db.select().from(chains)
      .where(eq(chains.isActive, true))
      .orderBy(chains.chainId);
  }

  async getChainById(chainId: number): Promise<Chain | undefined> {
    const [chain] = await db.select().from(chains).where(eq(chains.chainId, chainId));
    return chain || undefined;
  }

  async getDefaultChain(): Promise<Chain | undefined> {
    const [chain] = await db.select().from(chains).where(eq(chains.isDefault, true));
    return chain || undefined;
  }

  async createChain(chain: InsertChain): Promise<Chain> {
    const [created] = await db.insert(chains).values(chain).returning();
    return created;
  }

  async updateChain(chainId: number, updates: Partial<InsertChain>): Promise<Chain | undefined> {
    const [updated] = await db.update(chains)
      .set(updates)
      .where(eq(chains.chainId, chainId))
      .returning();
    return updated || undefined;
  }

  async setDefaultChain(chainId: number): Promise<Chain | undefined> {
    await db.update(chains).set({ isDefault: false });
    const [updated] = await db.update(chains)
      .set({ isDefault: true })
      .where(eq(chains.chainId, chainId))
      .returning();
    return updated || undefined;
  }

  async clearDefaultChains(): Promise<void> {
    await db.update(chains).set({ isDefault: false });
  }

  async deleteChain(chainId: number): Promise<void> {
    await db.delete(chains).where(eq(chains.chainId, chainId));
  }

  async getClaimTransactions(selectors: string[], page: number, limit: number): Promise<{ transactions: Transaction[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    const selectorPatterns = selectors.map(s => `${s}%`);
    const whereClause = sql`(${sql.join(
      selectorPatterns.map(pattern => sql`${transactions.input} LIKE ${pattern}`),
      sql` OR `
    )})`;

    const [txList, countResult] = await Promise.all([
      db.select()
        .from(transactions)
        .where(whereClause)
        .orderBy(desc(transactions.blockNumber), desc(transactions.transactionIndex))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(transactions)
        .where(whereClause)
    ]);

    const total = countResult[0]?.count || 0;
    return {
      transactions: txList,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getClaimStats(selectors: string[]): Promise<{ totalClaims: number; uniqueClaimers: number; totalValue: string }> {
    const selectorPatterns = selectors.map(s => `${s}%`);
    const whereClause = sql`(${sql.join(
      selectorPatterns.map(pattern => sql`${transactions.input} LIKE ${pattern}`),
      sql` OR `
    )})`;

    const [statsResult] = await db.select({
      totalClaims: count(),
      uniqueClaimers: sql<number>`COUNT(DISTINCT ${transactions.from})`,
      totalValue: sql<string>`COALESCE(SUM(CAST(${transactions.value} AS NUMERIC)), 0)::text`
    })
    .from(transactions)
    .where(whereClause);

    return {
      totalClaims: statsResult?.totalClaims || 0,
      uniqueClaimers: Number(statsResult?.uniqueClaimers) || 0,
      totalValue: statsResult?.totalValue || '0'
    };
  }

  // Site Settings
  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting || undefined;
  }

  async getSiteSettingsByCategory(category: string): Promise<SiteSetting[]> {
    return db.select().from(siteSettings).where(eq(siteSettings.category, category));
  }

  async getAllSiteSettings(): Promise<SiteSetting[]> {
    return db.select().from(siteSettings).orderBy(siteSettings.category, siteSettings.key);
  }

  async upsertSiteSetting(key: string, value: string, category: string): Promise<SiteSetting> {
    const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    
    if (existing) {
      const [updated] = await db.update(siteSettings)
        .set({ value, category, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(siteSettings)
        .values({ key, value, category })
        .returning();
      return created;
    }
  }

  async deleteSiteSetting(key: string): Promise<void> {
    await db.delete(siteSettings).where(eq(siteSettings.key, key));
  }

  async getAirdrops(page: number, limit: number): Promise<{ airdrops: Airdrop[]; total: number }> {
    const offset = (page - 1) * limit;
    const [airdropsList, [{ count: totalCount }]] = await Promise.all([
      db.select().from(airdrops)
        .orderBy(desc(airdrops.createdAt))
        .offset(offset)
        .limit(limit),
      db.select({ count: count() }).from(airdrops),
    ]);
    return { airdrops: airdropsList, total: Number(totalCount) };
  }

  async getAirdropById(id: string): Promise<Airdrop | undefined> {
    const [airdrop] = await db.select().from(airdrops).where(eq(airdrops.id, id));
    return airdrop || undefined;
  }

  async getActiveAirdrops(): Promise<Airdrop[]> {
    return db.select().from(airdrops)
      .where(and(
        eq(airdrops.isActive, true),
        or(
          eq(airdrops.status, "active"),
          eq(airdrops.status, "upcoming")
        )
      ))
      .orderBy(desc(airdrops.isFeatured), airdrops.startDate);
  }

  async getFeaturedAirdrops(): Promise<Airdrop[]> {
    return db.select().from(airdrops)
      .where(and(
        eq(airdrops.isActive, true),
        eq(airdrops.isFeatured, true)
      ))
      .orderBy(airdrops.startDate);
  }

  async createAirdrop(airdrop: InsertAirdrop): Promise<Airdrop> {
    const [created] = await db.insert(airdrops).values(airdrop).returning();
    return created;
  }

  async updateAirdrop(id: string, airdrop: Partial<InsertAirdrop>): Promise<Airdrop | undefined> {
    const [updated] = await db.update(airdrops)
      .set({ ...airdrop, updatedAt: new Date() })
      .where(eq(airdrops.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAirdrop(id: string): Promise<void> {
    await db.delete(airdrops).where(eq(airdrops.id, id));
  }
}

export const storage = new DatabaseStorage();
