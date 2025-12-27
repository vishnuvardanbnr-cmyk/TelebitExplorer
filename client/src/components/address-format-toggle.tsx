import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeftRight } from "lucide-react";
import { useAddressFormat } from "@/contexts/address-format-context";
import { cn } from "@/lib/utils";

interface AddressFormatToggleProps {
  className?: string;
}

export function AddressFormatToggle({ className }: AddressFormatToggleProps) {
  const { addressFormat, toggleAddressFormat, bech32Prefix } = useAddressFormat();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAddressFormat}
          className={cn("gap-1.5 h-8 px-2", className)}
          data-testid="button-address-format-toggle"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <Badge 
            variant={addressFormat === "hex" ? "default" : "secondary"} 
            className="text-[10px] h-5 px-1.5"
          >
            {addressFormat === "hex" ? "0x" : bech32Prefix}
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-center">
          <p className="font-medium text-xs">Switch Address Format</p>
          <p className="text-xs text-muted-foreground">
            {addressFormat === "hex" 
              ? `Click to show ${bech32Prefix}1... format` 
              : "Click to show 0x... format"}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
