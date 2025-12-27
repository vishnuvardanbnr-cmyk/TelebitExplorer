import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isBech32Address, bech32ToHex, bech32HashToHex } from "@/lib/address-utils";
import { useAddressFormat } from "@/contexts/address-format-context";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  inputClassName?: string;
  iconOnly?: boolean;
}

function isBech32TxHash(value: string, prefix: string): boolean {
  if (!value || !prefix) return false;
  const txPrefix = prefix + "tx";
  return value.toLowerCase().startsWith(txPrefix + "1");
}

function isBech32BlockHash(value: string, prefix: string): boolean {
  if (!value || !prefix) return false;
  const blockPrefix = prefix + "block";
  return value.toLowerCase().startsWith(blockPrefix + "1");
}

export function SearchBar({ className = "", placeholder, inputClassName = "", iconOnly = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const { bech32Prefix } = useAddressFormat();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Check if it's a bech32 transaction hash (e.g., temtx1...)
    if (isBech32TxHash(trimmed, bech32Prefix)) {
      const hexHash = bech32HashToHex(trimmed);
      if (hexHash.startsWith("0x") && hexHash.length === 66) {
        setLocation(`/tx/${hexHash}`);
        setQuery("");
        return;
      }
    }

    // Check if it's a bech32 block hash (e.g., temblock1...)
    if (isBech32BlockHash(trimmed, bech32Prefix)) {
      const hexHash = bech32HashToHex(trimmed);
      if (hexHash.startsWith("0x") && hexHash.length === 66) {
        setLocation(`/block/${hexHash}`);
        setQuery("");
        return;
      }
    }

    // Check if it's a bech32 address (any valid bech32 format)
    if (isBech32Address(trimmed)) {
      const hexAddress = bech32ToHex(trimmed);
      if (hexAddress.startsWith("0x") && hexAddress.length === 42) {
        setLocation(`/address/${trimmed}`);
        setQuery("");
        return;
      }
    }

    if (trimmed.startsWith("0x")) {
      if (trimmed.length === 66) {
        setLocation(`/tx/${trimmed}`);
      } else if (trimmed.length === 42) {
        setLocation(`/address/${trimmed}`);
      } else {
        setLocation(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    } else if (/^\d+$/.test(trimmed)) {
      setLocation(`/block/${trimmed}`);
    } else {
      setLocation(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    setQuery("");
  };

  return (
    <form onSubmit={handleSearch} className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || `Search by Address (0x or ${bech32Prefix}1) / Txn Hash / Block`}
          className={`pl-10 font-mono text-sm ${inputClassName}`}
          data-testid="input-search"
        />
      </div>
      <Button type="submit" size={iconOnly ? "icon" : "default"} data-testid="button-search">
        {iconOnly ? <Search className="h-4 w-4" /> : "Search"}
      </Button>
    </form>
  );
}
