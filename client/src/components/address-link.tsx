import { Link } from "wouter";
import { formatAddress as formatAddressType, shortenAddress } from "@/lib/address-utils";
import { CopyButton } from "./copy-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { FileCode, User, Tag } from "lucide-react";
import { getKnownAddress, getAddressTypeColor } from "@/lib/known-addresses";
import { useAddressFormat } from "@/contexts/address-format-context";

interface AddressLinkProps {
  address: string | null | undefined;
  isContract?: boolean;
  showFull?: boolean;
  showCopy?: boolean;
  highlight?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function AddressLink({
  address,
  isContract = false,
  showFull = false,
  showCopy = true,
  highlight = false,
  className = "",
  showLabel = true,
}: AddressLinkProps) {
  const { addressFormat, bech32Prefix } = useAddressFormat();
  
  if (!address) {
    return <span className="text-muted-foreground">-</span>;
  }

  const knownAddress = getKnownAddress(address);
  // Convert address based on selected format with dynamic prefix
  const formattedAddress = formatAddressType(address, addressFormat, bech32Prefix);
  const displayAddress = showFull ? formattedAddress : shortenAddress(formattedAddress, addressFormat === "bech32" ? 10 : 6, 4);
  const Icon = isContract ? FileCode : User;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/address/${formattedAddress}`}
            className={`font-mono text-sm hover:text-primary transition-colors ${highlight ? "text-muted-foreground" : ""}`}
            data-testid={`link-address-${address.slice(0, 8)}`}
          >
            {knownAddress && showLabel ? knownAddress.name : displayAddress}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {knownAddress && (
              <p className="font-medium text-xs">{knownAddress.name}</p>
            )}
            <p className="font-mono text-xs">{formattedAddress}</p>
            {addressFormat === "bech32" && (
              <p className="font-mono text-xs text-muted-foreground">{address}</p>
            )}
            {knownAddress?.description && (
              <p className="text-xs text-muted-foreground">{knownAddress.description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
      {knownAddress && showLabel && (
        <Badge 
          variant="outline" 
          className={`text-[10px] h-4 px-1 ${getAddressTypeColor(knownAddress.type)}`}
        >
          <Tag className="h-2.5 w-2.5 mr-0.5" />
          {knownAddress.type}
        </Badge>
      )}
      {showCopy && <CopyButton text={formattedAddress} />}
    </span>
  );
}
