import { formatDistanceToNow } from "date-fns";

export function formatHash(hash: string, length: number = 8): string {
  if (!hash) return "";
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.slice(0, length + 2)}...${hash.slice(-length)}`;
}

export function formatAddress(address: string, length: number = 6): string {
  if (!address) return "";
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

export function formatNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return "0";
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCompactNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return "0";
  const n = typeof num === "string" ? parseFloat(num) : num;
  
  if (n < 1000) return n.toString();
  if (n < 10000) return new Intl.NumberFormat("en-US").format(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 100000 ? 1 : 0) + "K";
  if (n < 1000000000) return (n / 1000000).toFixed(n < 100000000 ? 1 : 0) + "M";
  return (n / 1000000000).toFixed(n < 100000000000 ? 1 : 0) + "B";
}

export function formatTBT(wei: string | undefined): string {
  if (!wei) return "0";
  try {
    const weiBigInt = BigInt(wei);
    const tbt = Number(weiBigInt) / 1e18;
    if (tbt === 0) return "0";
    if (tbt < 0.000001) return "< 0.000001";
    return tbt.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  } catch {
    return "0";
  }
}

export function formatGwei(wei: string | undefined): string {
  if (!wei) return "0";
  try {
    const weiBigInt = BigInt(wei);
    const gwei = Number(weiBigInt) / 1e9;
    return gwei.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return "0";
  }
}

export function formatTimestamp(timestamp: string | Date | undefined): string {
  if (!timestamp) return "";
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatShortTimestamp(timestamp: string | Date | undefined): string {
  if (!timestamp) return "";
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatFullTimestamp(timestamp: string | Date | undefined): string {
  if (!timestamp) return "";
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function formatGasPercentage(used: number, limit: number): number {
  if (!limit) return 0;
  return Math.round((used / limit) * 100);
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function getMethodColor(methodName: string | undefined): string {
  if (!methodName) return "secondary";
  const method = methodName.toLowerCase();
  if (method.includes("transfer")) return "default";
  if (method.includes("swap")) return "default";
  if (method.includes("approve")) return "secondary";
  if (method.includes("mint")) return "default";
  if (method.includes("burn")) return "destructive";
  return "secondary";
}
