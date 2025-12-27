import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Plus, Trash2, Edit, Star, Wallet, ArrowRight } from "lucide-react";
import { getWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistEntry, WatchlistEntry } from "@/lib/watchlist";
import { AddressLink } from "@/components/address-link";
import { formatTBT, formatNumber } from "@/lib/formatters";
import { useAddressFormat } from "@/contexts/address-format-context";
import { useToast } from "@/hooks/use-toast";

interface AddressBalance {
  address: string;
  balance: string;
  transactionCount: number;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingEntry, setEditingEntry] = useState<WatchlistEntry | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const { data: balances, isLoading } = useQuery<Record<string, AddressBalance>>({
    queryKey: ["/api/watchlist-balances", watchlist.map(w => w.address)],
    queryFn: async () => {
      if (watchlist.length === 0) return {};
      
      const results: Record<string, AddressBalance> = {};
      await Promise.all(
        watchlist.map(async (entry) => {
          try {
            const res = await fetch(`/api/addresses/${entry.address}`);
            if (res.ok) {
              const data = await res.json();
              results[entry.address.toLowerCase()] = {
                address: entry.address,
                balance: data.balance || "0",
                transactionCount: data.transactionCount || 0
              };
            }
          } catch {
            results[entry.address.toLowerCase()] = {
              address: entry.address,
              balance: "0",
              transactionCount: 0
            };
          }
        })
      );
      return results;
    },
    enabled: watchlist.length > 0,
    refetchInterval: 30000,
  });

  const handleAddAddress = () => {
    if (!newAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address (0x...)",
        variant: "destructive"
      });
      return;
    }

    const updated = addToWatchlist({
      address: newAddress,
      label: newLabel || `Address ${watchlist.length + 1}`
    });
    
    setWatchlist(updated);
    setNewAddress("");
    setNewLabel("");
    setDialogOpen(false);
    
    toast({
      title: "Address Added",
      description: "The address has been added to your watchlist"
    });
  };

  const handleRemoveAddress = (address: string) => {
    const updated = removeFromWatchlist(address);
    setWatchlist(updated);
    toast({
      title: "Address Removed",
      description: "The address has been removed from your watchlist"
    });
  };

  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    
    const updated = updateWatchlistEntry(editingEntry.address, { label: editLabel });
    setWatchlist(updated);
    setEditingEntry(null);
    setEditLabel("");
    setEditDialogOpen(false);
    
    toast({
      title: "Label Updated",
      description: "The address label has been updated"
    });
  };

  const openEditDialog = (entry: WatchlistEntry) => {
    setEditingEntry(entry);
    setEditLabel(entry.label);
    setEditDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-watchlist-title">
            <Eye className="w-6 h-6" />
            Watchlist
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your favorite addresses
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-address">
              <Plus className="w-4 h-4" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Address to Watchlist</DialogTitle>
              <DialogDescription>
                Enter an address to track its balance and transactions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  data-testid="input-new-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  placeholder="My Wallet"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  data-testid="input-new-label"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAddress} data-testid="button-confirm-add">
                Add to Watchlist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {watchlist.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No addresses in watchlist</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Add addresses to your watchlist to track their balances and transactions in one place.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {watchlist.map((entry) => {
            const balance = balances?.[entry.address.toLowerCase()];
            
            return (
              <Card key={entry.address} data-testid={`watchlist-card-${entry.address.slice(0, 8)}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 flex-shrink-0">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{entry.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEditDialog(entry)}
                            data-testid={`button-edit-${entry.address.slice(0, 8)}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <AddressLink 
                          address={entry.address} 
                          showFull={false}
                          showLabel={false}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Balance</div>
                        {isLoading ? (
                          <Skeleton className="h-5 w-24" />
                        ) : (
                          <div className="font-mono font-medium">
                            {formatTBT(balance?.balance || "0")} {nativeSymbol}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Transactions</div>
                        {isLoading ? (
                          <Skeleton className="h-5 w-16" />
                        ) : (
                          <div className="font-medium">
                            {formatNumber(balance?.transactionCount || 0)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/address/${entry.address}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            View
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAddress(entry.address)}
                          data-testid={`button-remove-${entry.address.slice(0, 8)}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
            <DialogDescription>
              Update the label for this address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                data-testid="input-edit-label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEntry} data-testid="button-confirm-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
