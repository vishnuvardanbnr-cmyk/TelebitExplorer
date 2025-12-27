import { Link } from "wouter";
import { formatHash } from "@/lib/formatters";
import { formatTxHash, formatBlockHash, shortenAddress } from "@/lib/address-utils";
import { CopyButton } from "./copy-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAddressFormat } from "@/contexts/address-format-context";

interface HashLinkProps {
  hash: string;
  type: "block" | "tx";
  showFull?: boolean;
  showCopy?: boolean;
  className?: string;
}

export function HashLink({
  hash,
  type,
  showFull = false,
  showCopy = true,
  className = "",
}: HashLinkProps) {
  const { addressFormat, bech32Prefix } = useAddressFormat();
  
  if (!hash) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Format the hash based on address format setting
  const formattedHash = type === "tx" 
    ? formatTxHash(hash, addressFormat, bech32Prefix)
    : formatBlockHash(hash, addressFormat, bech32Prefix);
  
  // Shorten for display if not showing full
  const displayHash = showFull 
    ? formattedHash 
    : (addressFormat === "bech32" && bech32Prefix 
        ? shortenAddress(formattedHash, 12, 6) 
        : formatHash(hash));
  
  const href = type === "block" ? `/block/${hash}` : `/tx/${hash}`;

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className="font-mono text-sm hover:text-primary transition-colors truncate"
            data-testid={`link-${type}-${hash.slice(0, 8)}`}
          >
            {displayHash}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-mono text-xs">{formattedHash}</p>
            {addressFormat === "bech32" && (
              <p className="font-mono text-xs text-muted-foreground">{hash}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
      {showCopy && <CopyButton text={formattedHash} />}
    </span>
  );
}
