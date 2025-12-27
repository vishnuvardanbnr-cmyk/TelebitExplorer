import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import type { Chain } from "@shared/schema";

interface ChainSelectorProps {
  selectedChainId?: number;
  onChainChange?: (chainId: number) => void;
  className?: string;
}

export function ChainSelector({ selectedChainId, onChainChange, className }: ChainSelectorProps) {
  const { data, isLoading } = useQuery<{ chains: Chain[] }>({
    queryKey: ["/api/chains/active"],
  });

  const chains = data?.chains || [];
  const selectedChain = chains.find(c => c.chainId === selectedChainId) || chains.find(c => c.isDefault) || chains[0];

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="animate-pulse">
          <Globe className="h-3 w-3 mr-1" />
          Loading...
        </Badge>
      </div>
    );
  }

  if (chains.length === 0) {
    return null;
  }

  if (chains.length === 1) {
    const chain = chains[0];
    const displayName = chain.nativeSymbol || chain.shortName?.split('_')[0] || 'Chain';
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="gap-1.5" data-testid="chain-badge">
          <Globe className="h-3 w-3" />
          <span className="font-medium">{displayName}</span>
        </Badge>
      </div>
    );
  }

  return (
    <Select
      value={selectedChain?.chainId?.toString()}
      onValueChange={(value) => onChainChange?.(parseInt(value))}
    >
      <SelectTrigger 
        className={`w-auto gap-2 ${className}`}
        data-testid="select-chain"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Select chain" />
      </SelectTrigger>
      <SelectContent>
        {chains.map((chain) => (
          <SelectItem 
            key={chain.chainId} 
            value={chain.chainId.toString()}
            data-testid={`chain-option-${chain.chainId}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{chain.shortName}</span>
              <span className="text-muted-foreground text-xs">({chain.name})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ChainBadge({ chain }: { chain?: Chain | null }) {
  if (!chain) {
    return null;
  }

  return (
    <Badge variant="outline" className="gap-1" data-testid="chain-info-badge">
      <Globe className="h-3 w-3" />
      <span>{chain.shortName}</span>
      <span className="text-muted-foreground">#{chain.chainId}</span>
    </Badge>
  );
}
