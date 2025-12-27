// @ts-ignore - bech32 types
import * as bech32Module from "bech32";

const bech32 = bech32Module.bech32 || bech32Module;

// Telebit bech32 prefix
export const BECH32_PREFIX = "tbt";

/**
 * Convert a hex address (0x...) to bech32 format
 */
export function hexToBech32(hexAddress: string, prefix: string = BECH32_PREFIX): string {
  if (!hexAddress || !hexAddress.startsWith("0x")) {
    return hexAddress;
  }
  
  try {
    // Remove 0x prefix and convert to bytes
    const hex = hexAddress.slice(2).toLowerCase();
    const bytes: number[] = [];
    
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    
    // Convert to 5-bit words for bech32
    const words = bech32.toWords(new Uint8Array(bytes));
    
    // Encode as bech32
    return bech32.encode(prefix, words);
  } catch (error) {
    console.error("Error converting address to bech32:", error);
    return hexAddress;
  }
}

/**
 * Convert a bech32 address to hex format (0x...)
 */
export function bech32ToHex(bech32Address: string): string {
  if (!bech32Address || bech32Address.startsWith("0x")) {
    return bech32Address;
  }
  
  try {
    const decoded = bech32.decode(bech32Address);
    const bytes = bech32.fromWords(decoded.words);
    
    // Convert bytes to hex
    const hex = Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
    
    return "0x" + hex;
  } catch (error) {
    console.error("Error converting bech32 to hex:", error);
    return bech32Address;
  }
}

/**
 * Check if an address is in bech32 format
 */
export function isBech32Address(address: string): boolean {
  if (!address) return false;
  try {
    bech32.decode(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an address is in hex format
 */
export function isHexAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format address based on the selected format
 */
export function formatAddress(address: string, format: "hex" | "bech32", prefix?: string): string {
  if (!address) return "";
  
  if (format === "bech32") {
    if (isHexAddress(address)) {
      return hexToBech32(address, prefix || BECH32_PREFIX);
    }
    return address;
  } else {
    if (isBech32Address(address)) {
      return bech32ToHex(address);
    }
    return address;
  }
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return "";
  
  if (address.length <= startChars + endChars + 3) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Check if a hash is a valid hex transaction/block hash (66 chars with 0x prefix)
 */
export function isHexHash(hash: string): boolean {
  if (!hash) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Convert a hex hash to bech32 format with custom prefix
 * Uses bech32m for longer data (transaction/block hashes)
 */
export function hexHashToBech32(hexHash: string, prefix: string): string {
  if (!hexHash || !hexHash.startsWith("0x")) {
    return hexHash;
  }
  
  try {
    const hex = hexHash.slice(2).toLowerCase();
    const bytes: number[] = [];
    
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    
    const words = bech32.toWords(new Uint8Array(bytes));
    
    // Use longer limit for transaction hashes (90 chars vs default 90)
    return bech32.encode(prefix, words, 120);
  } catch (error) {
    console.error("Error converting hash to bech32:", error);
    return hexHash;
  }
}

/**
 * Convert a bech32 hash back to hex format
 */
export function bech32HashToHex(bech32Hash: string): string {
  if (!bech32Hash || bech32Hash.startsWith("0x")) {
    return bech32Hash;
  }
  
  try {
    const decoded = bech32.decode(bech32Hash, 120);
    const bytes = bech32.fromWords(decoded.words);
    
    const hex = Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
    
    return "0x" + hex;
  } catch (error) {
    console.error("Error converting bech32 hash to hex:", error);
    return bech32Hash;
  }
}

/**
 * Format transaction hash based on selected format
 */
export function formatTxHash(hash: string, format: "hex" | "bech32", prefix?: string): string {
  if (!hash) return "";
  
  if (format === "bech32" && prefix) {
    if (isHexHash(hash)) {
      return hexHashToBech32(hash, prefix + "tx");
    }
    return hash;
  } else {
    if (!hash.startsWith("0x")) {
      return bech32HashToHex(hash);
    }
    return hash;
  }
}

/**
 * Format block hash based on selected format
 */
export function formatBlockHash(hash: string, format: "hex" | "bech32", prefix?: string): string {
  if (!hash) return "";
  
  if (format === "bech32" && prefix) {
    if (isHexHash(hash)) {
      return hexHashToBech32(hash, prefix + "block");
    }
    return hash;
  } else {
    if (!hash.startsWith("0x")) {
      return bech32HashToHex(hash);
    }
    return hash;
  }
}
