import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, boolean, timestamp, decimal, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Chain configuration table for multi-chain support
export const chains = pgTable("chains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chainId: integer("chain_id").notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  shortName: varchar("short_name", { length: 20 }).notNull(),
  rpcUrl: text("rpc_url").notNull(),
  explorerUrl: text("explorer_url"),
  nativeCurrency: varchar("native_currency", { length: 20 }).notNull().default("ETH"),
  nativeDecimals: integer("native_decimals").notNull().default(18),
  nativeSymbol: varchar("native_symbol", { length: 10 }).notNull().default("ETH"),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  blockTime: integer("block_time").default(5),
  bech32Prefix: varchar("bech32_prefix", { length: 20 }),
  addressDisplayFormat: varchar("address_display_format", { length: 10 }).notNull().default("0x"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chains_chain_id_idx").on(table.chainId),
  index("chains_active_idx").on(table.isActive),
]);

export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: bigint("number", { mode: "number" }).notNull().unique(),
  hash: varchar("hash", { length: 66 }).notNull().unique(),
  parentHash: varchar("parent_hash", { length: 66 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  miner: varchar("miner", { length: 42 }).notNull(),
  gasUsed: bigint("gas_used", { mode: "number" }).notNull(),
  gasLimit: bigint("gas_limit", { mode: "number" }).notNull(),
  baseFeePerGas: varchar("base_fee_per_gas", { length: 78 }),
  transactionCount: integer("transaction_count").notNull().default(0),
  size: integer("size"),
  extraData: text("extra_data"),
  nonce: varchar("nonce", { length: 18 }),
  difficulty: varchar("difficulty", { length: 78 }),
  totalDifficulty: varchar("total_difficulty", { length: 78 }),
  sha3Uncles: varchar("sha3_uncles", { length: 66 }),
  stateRoot: varchar("state_root", { length: 66 }),
  receiptsRoot: varchar("receipts_root", { length: 66 }),
  transactionsRoot: varchar("transactions_root", { length: 66 }),
  logsBloom: text("logs_bloom"),
}, (table) => [
  index("blocks_number_idx").on(table.number),
  index("blocks_timestamp_idx").on(table.timestamp),
  index("blocks_miner_idx").on(table.miner),
  index("blocks_number_desc_idx").on(sql`${table.number} DESC`),
]);

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hash: varchar("hash", { length: 66 }).notNull().unique(),
  blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  blockHash: varchar("block_hash", { length: 66 }).notNull(),
  transactionIndex: integer("transaction_index").notNull(),
  from: varchar("from_address", { length: 42 }).notNull(),
  to: varchar("to_address", { length: 42 }),
  value: varchar("value", { length: 78 }).notNull(),
  gas: bigint("gas", { mode: "number" }).notNull(),
  gasPrice: varchar("gas_price", { length: 78 }),
  maxFeePerGas: varchar("max_fee_per_gas", { length: 78 }),
  maxPriorityFeePerGas: varchar("max_priority_fee_per_gas", { length: 78 }),
  input: text("input"),
  nonce: integer("nonce").notNull(),
  type: integer("type"),
  status: boolean("status"),
  gasUsed: bigint("gas_used", { mode: "number" }),
  effectiveGasPrice: varchar("effective_gas_price", { length: 78 }),
  cumulativeGasUsed: bigint("cumulative_gas_used", { mode: "number" }),
  contractAddress: varchar("contract_address", { length: 42 }),
  timestamp: timestamp("timestamp").notNull(),
  methodId: varchar("method_id", { length: 10 }),
  methodName: varchar("method_name", { length: 100 }),
}, (table) => [
  index("transactions_block_number_idx").on(table.blockNumber),
  index("transactions_from_idx").on(table.from),
  index("transactions_to_idx").on(table.to),
  index("transactions_timestamp_idx").on(table.timestamp),
  index("transactions_block_tx_idx").on(table.blockNumber, table.transactionIndex),
  index("transactions_from_block_desc_idx").on(sql`${table.from}, ${table.blockNumber} DESC`),
  index("transactions_to_block_desc_idx").on(sql`${table.to}, ${table.blockNumber} DESC`),
  index("transactions_contract_address_idx").on(table.contractAddress),
  index("transactions_method_id_idx").on(table.methodId),
  index("transactions_lower_from_idx").on(sql`lower(${table.from})`),
  index("transactions_lower_to_idx").on(sql`lower(${table.to})`),
  index("transactions_lower_contract_idx").on(sql`lower(${table.contractAddress})`),
]);

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 42 }).notNull().unique(),
  balance: varchar("balance", { length: 78 }).notNull().default("0"),
  transactionCount: integer("transaction_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  receivedCount: integer("received_count").notNull().default(0),
  isContract: boolean("is_contract").notNull().default(false),
  contractCode: text("contract_code"),
  contractName: varchar("contract_name", { length: 255 }),
  lastSeen: timestamp("last_seen"),
  firstSeen: timestamp("first_seen"),
}, (table) => [
  index("addresses_address_idx").on(table.address),
  index("addresses_tx_count_desc_idx").on(sql`${table.transactionCount} DESC`),
  index("addresses_lower_address_idx").on(sql`lower(${table.address})`),
]);

export const transactionLogs = pgTable("transaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
  logIndex: integer("log_index").notNull(),
  address: varchar("address", { length: 42 }).notNull(),
  topics: text("topics").array(),
  data: text("data"),
  blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  blockHash: varchar("block_hash", { length: 66 }).notNull(),
  removed: boolean("removed").default(false),
  topic0: varchar("topic0", { length: 66 }),
}, (table) => [
  index("logs_transaction_hash_idx").on(table.transactionHash),
  index("logs_address_idx").on(table.address),
  index("logs_block_number_idx").on(table.blockNumber),
  index("logs_address_block_desc_idx").on(sql`${table.address}, ${table.blockNumber} DESC`),
  index("logs_topic0_idx").on(table.topic0),
  index("logs_lower_address_idx").on(sql`lower(${table.address})`),
]);

export const tokenTransfers = pgTable("token_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
  logIndex: integer("log_index").notNull(),
  blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  tokenAddress: varchar("token_address", { length: 42 }).notNull(),
  from: varchar("from_address", { length: 42 }).notNull(),
  to: varchar("to_address", { length: 42 }).notNull(),
  value: decimal("value", { precision: 78, scale: 0 }),
  tokenId: decimal("token_id", { precision: 78, scale: 0 }),
  tokenType: varchar("token_type", { length: 10 }).notNull(),
}, (table) => [
  uniqueIndex("token_transfers_tx_log_idx").on(table.transactionHash, table.logIndex),
  index("token_transfers_tx_hash_idx").on(table.transactionHash),
  index("token_transfers_token_address_idx").on(table.tokenAddress),
  index("token_transfers_from_idx").on(table.from),
  index("token_transfers_to_idx").on(table.to),
  index("token_transfers_block_desc_idx").on(sql`${table.blockNumber} DESC`),
  index("token_transfers_from_block_desc_idx").on(sql`${table.from}, ${table.blockNumber} DESC`),
  index("token_transfers_to_block_desc_idx").on(sql`${table.to}, ${table.blockNumber} DESC`),
  index("token_transfers_lower_token_idx").on(sql`lower(${table.tokenAddress})`),
  index("token_transfers_lower_from_idx").on(sql`lower(${table.from})`),
  index("token_transfers_lower_to_idx").on(sql`lower(${table.to})`),
]);

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 42 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  symbol: varchar("symbol", { length: 50 }),
  decimals: integer("decimals"),
  totalSupply: decimal("total_supply", { precision: 78, scale: 0 }),
  tokenType: varchar("token_type", { length: 10 }).notNull(),
  holderCount: integer("holder_count").notNull().default(0),
  transferCount: integer("transfer_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("tokens_address_idx").on(table.address),
  index("tokens_type_idx").on(table.tokenType),
]);

export const indexerCheckpoints = pgTable("indexer_checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkpointType: varchar("checkpoint_type", { length: 50 }).notNull().unique(),
  lastProcessedBlock: bigint("last_processed_block", { mode: "number" }).notNull().default(0),
  lastProcessedHash: varchar("last_processed_hash", { length: 66 }),
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("checkpoints_type_idx").on(table.checkpointType),
]);

export const dailyStats = pgTable("daily_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().unique(),
  blockCount: integer("block_count").notNull().default(0),
  transactionCount: integer("transaction_count").notNull().default(0),
  addressCount: integer("address_count").notNull().default(0),
  gasUsed: decimal("gas_used", { precision: 78, scale: 0 }).notNull().default("0"),
  totalValue: decimal("total_value", { precision: 78, scale: 0 }).notNull().default("0"),
  avgGasPrice: decimal("avg_gas_price", { precision: 78, scale: 0 }),
}, (table) => [
  index("daily_stats_date_idx").on(table.date),
]);

export const networkStats = pgTable("network_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  latestBlock: bigint("latest_block", { mode: "number" }).notNull(),
  totalTransactions: bigint("total_transactions", { mode: "number" }).notNull().default(0),
  totalAddresses: integer("total_addresses").notNull().default(0),
  avgBlockTime: decimal("avg_block_time", { precision: 10, scale: 2 }),
  avgGasPrice: varchar("avg_gas_price", { length: 78 }),
  totalTokenTransfers: bigint("total_token_transfers", { mode: "number" }).notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const indexerState = pgTable("indexer_state", {
  id: varchar("id").primaryKey().default("main"),
  lastIndexedBlock: bigint("last_indexed_block", { mode: "number" }).notNull().default(0),
  isRunning: boolean("is_running").notNull().default(false),
  lastError: text("last_error"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const verifiedContracts = pgTable("verified_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 42 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  compilerVersion: varchar("compiler_version", { length: 50 }).notNull(),
  evmVersion: varchar("evm_version", { length: 50 }),
  optimization: boolean("optimization").notNull().default(false),
  runs: integer("runs").default(200),
  constructorArgs: text("constructor_args"),
  sourceCode: text("source_code").notNull(),
  abi: jsonb("abi").notNull(),
  bytecodeHash: varchar("bytecode_hash", { length: 66 }),
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("verified"),
  license: varchar("license", { length: 50 }),
  verifiedAt: timestamp("verified_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("verified_contracts_address_idx").on(table.address),
  index("verified_contracts_lower_address_idx").on(sql`lower(${table.address})`),
  index("verified_contracts_name_idx").on(table.name),
]);

export const blocksRelations = relations(blocks, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  block: one(blocks, {
    fields: [transactions.blockNumber],
    references: [blocks.number],
  }),
  logs: many(transactionLogs),
}));

export const transactionLogsRelations = relations(transactionLogs, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionLogs.transactionHash],
    references: [transactions.hash],
  }),
}));

export const insertChainSchema = createInsertSchema(chains).omit({ id: true, createdAt: true });
export const insertBlockSchema = createInsertSchema(blocks).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({ id: true });
export const insertNetworkStatsSchema = createInsertSchema(networkStats).omit({ id: true });
export const insertTokenTransferSchema = createInsertSchema(tokenTransfers).omit({ id: true });
export const insertTokenSchema = createInsertSchema(tokens).omit({ id: true });
export const insertIndexerCheckpointSchema = createInsertSchema(indexerCheckpoints).omit({ id: true });
export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({ id: true });
export const insertVerifiedContractSchema = createInsertSchema(verifiedContracts).omit({ id: true, verifiedAt: true, createdAt: true });

export type InsertChain = z.infer<typeof insertChainSchema>;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;
export type InsertNetworkStats = z.infer<typeof insertNetworkStatsSchema>;
export type InsertTokenTransfer = z.infer<typeof insertTokenTransferSchema>;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type InsertIndexerCheckpoint = z.infer<typeof insertIndexerCheckpointSchema>;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type InsertVerifiedContract = z.infer<typeof insertVerifiedContractSchema>;

export type Chain = typeof chains.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type TransactionLog = typeof transactionLogs.$inferSelect;
export type NetworkStats = typeof networkStats.$inferSelect;
export type IndexerState = typeof indexerState.$inferSelect;
export type TokenTransfer = typeof tokenTransfers.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type IndexerCheckpoint = typeof indexerCheckpoints.$inferSelect;
export type DailyStats = typeof dailyStats.$inferSelect;
export type VerifiedContract = typeof verifiedContracts.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_username_idx").on(table.username),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// Internal Transactions/Traces Table
export const internalTransactions = pgTable("internal_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
  blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  traceAddress: text("trace_address").array(),
  type: varchar("type", { length: 50 }).notNull(),
  from: varchar("from_address", { length: 42 }),
  to: varchar("to_address", { length: 42 }),
  value: varchar("value", { length: 78 }),
  gas: bigint("gas", { mode: "number" }),
  gasUsed: bigint("gas_used", { mode: "number" }),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  callType: varchar("call_type", { length: 50 }),
  rewardType: varchar("reward_type", { length: 50 }),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => [
  index("internal_tx_hash_idx").on(table.transactionHash),
  index("internal_tx_block_idx").on(table.blockNumber),
  index("internal_tx_from_idx").on(sql`lower(${table.from})`),
  index("internal_tx_to_idx").on(sql`lower(${table.to})`),
]);

// Token Holders Table
// For ERC20: (tokenAddress, holderAddress) uniquely identifies balance
// For ERC721/ERC1155: (tokenAddress, holderAddress, tokenId) uniquely identifies balance
export const tokenHolders = pgTable("token_holders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: varchar("token_address", { length: 42 }).notNull(),
  holderAddress: varchar("holder_address", { length: 42 }).notNull(),
  balance: varchar("balance", { length: 78 }).notNull().default("0"),
  tokenId: varchar("token_id", { length: 78 }),
  tokenType: varchar("token_type", { length: 20 }).notNull().default("ERC20"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("token_holders_token_idx").on(sql`lower(${table.tokenAddress})`),
  index("token_holders_holder_idx").on(sql`lower(${table.holderAddress})`),
  index("token_holders_balance_idx").on(table.balance),
  index("token_holders_token_type_idx").on(table.tokenType),
]);

// NFT Tokens Table (individual NFT metadata)
export const nftTokens = pgTable("nft_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractAddress: varchar("contract_address", { length: 42 }).notNull(),
  tokenId: varchar("token_id", { length: 78 }).notNull(),
  owner: varchar("owner", { length: 42 }),
  name: text("name"),
  description: text("description"),
  image: text("image"),
  imageGateway: text("image_gateway"),
  metadataUri: text("metadata_uri"),
  attributes: jsonb("attributes"),
  tokenType: varchar("token_type", { length: 20 }).notNull().default("ERC721"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("nft_tokens_contract_token_idx").on(table.contractAddress, table.tokenId),
  index("nft_tokens_contract_idx").on(sql`lower(${table.contractAddress})`),
  index("nft_tokens_owner_idx").on(sql`lower(${table.owner})`),
  index("nft_tokens_token_id_idx").on(table.tokenId),
]);

// API Keys Table
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 100 }),
  scopes: text("scopes").array().default([]),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  rateLimit: integer("rate_limit").notNull().default(100),
  dailyQuota: integer("daily_quota").notNull().default(10000),
  usageToday: integer("usage_today").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("api_keys_user_idx").on(table.userId),
  index("api_keys_key_idx").on(table.key),
  index("api_keys_status_idx").on(table.status),
]);

// API Key Usage Table
export const apiKeyUsage = pgTable("api_key_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyId: varchar("key_id").notNull().references(() => apiKeys.id),
  date: timestamp("date").notNull(),
  count: integer("count").notNull().default(0),
  endpoint: varchar("endpoint", { length: 255 }),
}, (table) => [
  index("api_key_usage_key_idx").on(table.keyId),
  index("api_key_usage_date_idx").on(table.date),
]);

// Address Labels Table (ENS/vanity names)
export const addressLabels = pgTable("address_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address", { length: 42 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  source: varchar("source", { length: 50 }).notNull().default("user"),
  type: varchar("type", { length: 50 }).default("custom"),
  userId: varchar("user_id").references(() => users.id),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("address_labels_address_idx").on(sql`lower(${table.address})`),
  index("address_labels_label_idx").on(table.label),
  index("address_labels_user_idx").on(table.userId),
]);

// Site Settings Table (configurable site-wide settings)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("site_settings_key_idx").on(table.key),
  index("site_settings_category_idx").on(table.category),
]);

// Airdrops Table (admin-created airdrop campaigns)
export const airdrops = pgTable("airdrops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  contractAddress: varchar("contract_address", { length: 42 }),
  tokenAddress: varchar("token_address", { length: 42 }),
  tokenSymbol: varchar("token_symbol", { length: 20 }),
  tokenDecimals: integer("token_decimals").default(18),
  totalAmount: varchar("total_amount", { length: 78 }),
  claimedAmount: varchar("claimed_amount", { length: 78 }).default("0"),
  totalParticipants: integer("total_participants").default(0),
  claimedCount: integer("claimed_count").default(0),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  claimUrl: text("claim_url"),
  imageUrl: text("image_url"),
  eligibilityCriteria: text("eligibility_criteria"),
  methodSelectors: text("method_selectors").array(),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("airdrops_status_idx").on(table.status),
  index("airdrops_contract_idx").on(sql`lower(${table.contractAddress})`),
  index("airdrops_active_idx").on(table.isActive),
  index("airdrops_featured_idx").on(table.isFeatured),
  index("airdrops_start_date_idx").on(table.startDate),
]);

// Insert schemas for new tables
export const insertInternalTransactionSchema = createInsertSchema(internalTransactions).omit({ id: true });
export const insertTokenHolderSchema = createInsertSchema(tokenHolders).omit({ id: true });
export const insertNftTokenSchema = createInsertSchema(nftTokens).omit({ id: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertApiKeyUsageSchema = createInsertSchema(apiKeyUsage).omit({ id: true });
export const insertAddressLabelSchema = createInsertSchema(addressLabels).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({ id: true, updatedAt: true });
export const insertAirdropSchema = createInsertSchema(airdrops).omit({ id: true, createdAt: true, updatedAt: true });

// Types for new tables
export type InternalTransaction = typeof internalTransactions.$inferSelect;
export type TokenHolder = typeof tokenHolders.$inferSelect;
export type NftToken = typeof nftTokens.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiKeyUsage = typeof apiKeyUsage.$inferSelect;
export type AddressLabel = typeof addressLabels.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertInternalTransaction = z.infer<typeof insertInternalTransactionSchema>;
export type InsertTokenHolder = z.infer<typeof insertTokenHolderSchema>;
export type InsertNftToken = z.infer<typeof insertNftTokenSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type InsertApiKeyUsage = z.infer<typeof insertApiKeyUsageSchema>;
export type InsertAddressLabel = z.infer<typeof insertAddressLabelSchema>;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type Airdrop = typeof airdrops.$inferSelect;
export type InsertAirdrop = z.infer<typeof insertAirdropSchema>;
