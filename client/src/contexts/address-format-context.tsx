import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type AddressFormat = "hex" | "bech32";

interface ChainConfig {
  chain_name?: string;
  chain_id?: string;
  native_symbol?: string;
  native_name?: string;
  rpc_url?: string;
  address_format?: string;
  bech32_prefix?: string;
}

interface SettingsResponse {
  chain?: {
    bech32Prefix?: string;
    shortName?: string;
    chainId?: number;
  };
}

interface AddressFormatContextType {
  addressFormat: AddressFormat;
  setAddressFormat: (format: AddressFormat) => void;
  toggleAddressFormat: () => void;
  bech32Prefix: string;
  chainConfig: ChainConfig;
}

const AddressFormatContext = createContext<AddressFormatContextType | undefined>(undefined);

const STORAGE_KEY = "telebit-address-format";
const DEFAULT_BECH32_PREFIX = "tbt";

export function AddressFormatProvider({ children }: { children: ReactNode }) {
  const [addressFormat, setAddressFormatState] = useState<AddressFormat>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "hex" || stored === "bech32") {
        return stored;
      }
    }
    return "hex";
  });

  const [bech32Prefix, setBech32Prefix] = useState(DEFAULT_BECH32_PREFIX);
  const [chainConfig, setChainConfig] = useState<ChainConfig>({});

  const { data: chainSettings } = useQuery<ChainConfig>({
    queryKey: ["/api/settings/chain"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (chainSettings) {
      setChainConfig(chainSettings);
      
      if (chainSettings.bech32_prefix) {
        setBech32Prefix(chainSettings.bech32_prefix);
      }
      
      if (chainSettings.address_format === "bech32") {
        setAddressFormatState("bech32");
      }
    }
    
    // Also check the /api/settings chain object for bech32Prefix
    if (settings?.chain?.bech32Prefix) {
      setBech32Prefix(settings.chain.bech32Prefix);
    }
  }, [chainSettings, settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, addressFormat);
  }, [addressFormat]);

  const setAddressFormat = (format: AddressFormat) => {
    setAddressFormatState(format);
  };

  const toggleAddressFormat = () => {
    setAddressFormatState(prev => prev === "hex" ? "bech32" : "hex");
  };

  return (
    <AddressFormatContext.Provider value={{ 
      addressFormat, 
      setAddressFormat, 
      toggleAddressFormat, 
      bech32Prefix,
      chainConfig 
    }}>
      {children}
    </AddressFormatContext.Provider>
  );
}

export function useAddressFormat() {
  const context = useContext(AddressFormatContext);
  if (context === undefined) {
    throw new Error("useAddressFormat must be used within an AddressFormatProvider");
  }
  return context;
}
