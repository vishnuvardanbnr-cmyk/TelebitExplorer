const KNOWN_METHODS: Record<string, { name: string; type: string }> = {
  "0xa9059cbb": { name: "transfer", type: "token" },
  "0x23b872dd": { name: "transferFrom", type: "token" },
  "0x095ea7b3": { name: "approve", type: "token" },
  "0x70a08231": { name: "balanceOf", type: "token" },
  "0xdd62ed3e": { name: "allowance", type: "token" },
  "0x18160ddd": { name: "totalSupply", type: "token" },
  "0x313ce567": { name: "decimals", type: "token" },
  "0x06fdde03": { name: "name", type: "token" },
  "0x95d89b41": { name: "symbol", type: "token" },
  
  "0x42842e0e": { name: "safeTransferFrom", type: "nft" },
  "0xb88d4fde": { name: "safeTransferFrom", type: "nft" },
  "0xa22cb465": { name: "setApprovalForAll", type: "nft" },
  "0x6352211e": { name: "ownerOf", type: "nft" },
  "0xe985e9c5": { name: "isApprovedForAll", type: "nft" },
  "0x081812fc": { name: "getApproved", type: "nft" },
  "0xc87b56dd": { name: "tokenURI", type: "nft" },
  
  "0xd0e30db0": { name: "deposit", type: "defi" },
  "0x2e1a7d4d": { name: "withdraw", type: "defi" },
  "0xe2bbb158": { name: "deposit", type: "defi" },
  "0x441a3e70": { name: "withdraw", type: "defi" },
  "0xf305d719": { name: "addLiquidity", type: "defi" },
  "0xbaa2abde": { name: "removeLiquidity", type: "defi" },
  "0x38ed1739": { name: "swapExactTokensForTokens", type: "defi" },
  "0x7ff36ab5": { name: "swapExactETHForTokens", type: "defi" },
  "0x18cbafe5": { name: "swapExactTokensForETH", type: "defi" },
  "0xfb3bdb41": { name: "swapETHForExactTokens", type: "defi" },
  "0x8803dbee": { name: "swapTokensForExactTokens", type: "defi" },
  "0x5c11d795": { name: "swapExactTokensForTokensSupportingFeeOnTransferTokens", type: "defi" },
  "0xb6f9de95": { name: "swapExactETHForTokensSupportingFeeOnTransferTokens", type: "defi" },
  "0x791ac947": { name: "swapExactTokensForETHSupportingFeeOnTransferTokens", type: "defi" },
  "0xe8e33700": { name: "addLiquidity", type: "defi" },
  "0xf91b3f72": { name: "addLiquidityETH", type: "defi" },
  
  "0x60806040": { name: "Contract Creation", type: "deploy" },
  "0x5fbfb9cf": { name: "initialize", type: "proxy" },
  "0xc4d66de8": { name: "initialize", type: "proxy" },
  "0xfe4b84df": { name: "initialize", type: "proxy" },
  "0x8129fc1c": { name: "initialize", type: "proxy" },
  "0x4f1ef286": { name: "upgradeToAndCall", type: "proxy" },
  "0x3659cfe6": { name: "upgradeTo", type: "proxy" },
  
  "0x8da5cb5b": { name: "owner", type: "ownership" },
  "0x715018a6": { name: "renounceOwnership", type: "ownership" },
  "0xf2fde38b": { name: "transferOwnership", type: "ownership" },
  
  "0x3ccfd60b": { name: "withdraw", type: "common" },
  "0x12065fe0": { name: "getBalance", type: "common" },
  "0x8456cb59": { name: "pause", type: "common" },
  "0x3f4ba83a": { name: "unpause", type: "common" },
  "0x40c10f19": { name: "mint", type: "common" },
  "0xa0712d68": { name: "mint", type: "common" },
  "0x42966c68": { name: "burn", type: "common" },
  "0x79cc6790": { name: "burnFrom", type: "common" },
  "0x1249c58b": { name: "mint", type: "common" },
  
  "0x3593564c": { name: "execute", type: "uniswap" },
  "0x04e45aaf": { name: "exactInputSingle", type: "uniswap" },
  "0xb858183f": { name: "exactInput", type: "uniswap" },
  "0x5023b4df": { name: "exactOutputSingle", type: "uniswap" },
  "0x09b81346": { name: "exactOutput", type: "uniswap" },
  
  "0x0d58e9ad": { name: "claim", type: "airdrop" },
  "0x4e71d92d": { name: "claim", type: "airdrop" },
  "0x2e7ba6ef": { name: "claim", type: "airdrop" },
  
  "0x150b7a02": { name: "onERC721Received", type: "callback" },
  "0xf23a6e61": { name: "onERC1155Received", type: "callback" },
  "0xbc197c81": { name: "onERC1155BatchReceived", type: "callback" },
};

export interface DecodedMethod {
  selector: string;
  name: string;
  type: string;
  isKnown: boolean;
}

export function decodeMethod(input: string | null | undefined): DecodedMethod {
  if (!input || input === "0x" || input.length < 10) {
    return {
      selector: "",
      name: "Transfer",
      type: "native",
      isKnown: true
    };
  }

  const selector = input.slice(0, 10).toLowerCase();
  const known = KNOWN_METHODS[selector];

  if (known) {
    return {
      selector,
      name: known.name,
      type: known.type,
      isKnown: true
    };
  }

  return {
    selector,
    name: selector,
    type: "unknown",
    isKnown: false
  };
}

export function getMethodBadgeColor(type: string): string {
  switch (type) {
    case "token":
      return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800";
    case "nft":
      return "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800";
    case "defi":
      return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
    case "deploy":
      return "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800";
    case "proxy":
      return "text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-950 dark:border-cyan-800";
    case "ownership":
      return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800";
    case "native":
      return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-700";
    case "uniswap":
      return "text-pink-600 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-950 dark:border-pink-800";
    case "airdrop":
      return "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800";
    case "callback":
      return "text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950 dark:border-teal-800";
    default:
      return "text-gray-500 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-700";
  }
}

export function formatMethodName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  
  if (name.startsWith("0x")) {
    return name.slice(0, 8) + "..";
  }
  
  const words = name.replace(/([A-Z])/g, ' $1').trim().split(' ');
  if (words.length > 2) {
    return words.slice(0, 2).join('') + "..";
  }
  
  return name.slice(0, maxLength - 2) + "..";
}
