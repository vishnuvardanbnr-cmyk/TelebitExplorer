import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type DesignVariant = "design1" | "design2" | "design3";

interface SettingsData {
  branding?: Record<string, string>;
}

interface DesignContextType {
  design: DesignVariant;
  setDesign: (design: DesignVariant) => void;
  isDesign2: boolean;
  isDesign3: boolean;
}

const DESIGN_STORAGE_KEY = "explorer_design_variant";

function getInitialDesign(): DesignVariant {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (cached === "design1" || cached === "design2" || cached === "design3") {
      return cached;
    }
  }
  return "design1";
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesignState] = useState<DesignVariant>(getInitialDesign);

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
    staleTime: 5000,
  });

  useEffect(() => {
    if (settings?.branding) {
      const designValue = settings.branding.design_variant;
      if (designValue === "design1" || designValue === "design2" || designValue === "design3") {
        setDesignState(designValue as DesignVariant);
        localStorage.setItem(DESIGN_STORAGE_KEY, designValue);
      }
    }
  }, [settings]);

  useEffect(() => {
    document.documentElement.classList.remove("design1", "design2", "design3");
    document.documentElement.classList.add(design);
  }, [design]);

  const setDesign = (newDesign: DesignVariant) => {
    setDesignState(newDesign);
    localStorage.setItem(DESIGN_STORAGE_KEY, newDesign);
  };

  return (
    <DesignContext.Provider value={{ design, setDesign, isDesign2: design === "design2", isDesign3: design === "design3" }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return context;
}
