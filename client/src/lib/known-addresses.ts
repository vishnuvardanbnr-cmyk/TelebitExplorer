export interface KnownAddress {
  address: string;
  name: string;
  type: "contract" | "token" | "dex" | "bridge" | "wallet" | "deployer" | "exchange" | "defi" | "nft" | "system";
  description?: string;
  website?: string;
  logo?: string;
}

const KNOWN_ADDRESSES: Record<string, KnownAddress> = {
  "0x0000000000000000000000000000000000000000": {
    address: "0x0000000000000000000000000000000000000000",
    name: "Null Address",
    type: "system",
    description: "Zero address (burn/mint destination)"
  },
  "0x000000000000000000000000000000000000dead": {
    address: "0x000000000000000000000000000000000000dEaD",
    name: "Dead Address",
    type: "system",
    description: "Common burn address"
  },
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    name: "Native Token",
    type: "system",
    description: "Represents native chain token"
  },
  
  "0x92ccd9cf162f8d823123231e77c7ce5b94f34cb0": {
    address: "0x92cCd9cf162F8d823123231E77c7CE5b94F34cb0",
    name: "BOXCAT",
    type: "token",
    description: "BOXCAT Token"
  },
  
  "0x614ea7bdbca6a9a24b7aba6fddee98295e591804": {
    address: "0x614ea7bdbca6a9a24b7aba6fddee98295e591804",
    name: "Deployer",
    type: "deployer",
    description: "Contract deployer account"
  },
};

export function getKnownAddress(address: string): KnownAddress | null {
  if (!address) return null;
  const normalized = address.toLowerCase();
  return KNOWN_ADDRESSES[normalized] || null;
}

export function isKnownAddress(address: string): boolean {
  return getKnownAddress(address) !== null;
}

export function getAddressLabel(address: string): string | null {
  const known = getKnownAddress(address);
  return known?.name || null;
}

export function getAddressTypeColor(type: string): string {
  switch (type) {
    case "token":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "dex":
      return "text-green-600 bg-green-50 border-green-200";
    case "bridge":
      return "text-purple-600 bg-purple-50 border-purple-200";
    case "deployer":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "exchange":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "defi":
      return "text-cyan-600 bg-cyan-50 border-cyan-200";
    case "nft":
      return "text-pink-600 bg-pink-50 border-pink-200";
    case "system":
      return "text-gray-600 bg-gray-50 border-gray-200";
    case "wallet":
      return "text-indigo-600 bg-indigo-50 border-indigo-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function addKnownAddress(address: KnownAddress): void {
  KNOWN_ADDRESSES[address.address.toLowerCase()] = address;
}

export function getAllKnownAddresses(): KnownAddress[] {
  return Object.values(KNOWN_ADDRESSES);
}
