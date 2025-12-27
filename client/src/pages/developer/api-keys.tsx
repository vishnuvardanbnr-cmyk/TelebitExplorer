import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  requestsToday: number;
  dailyLimit: number;
}

interface User {
  id: number;
  username: string;
  email: string;
}

export default function ApiKeysPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: user, isLoading: isAuthLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: apiKeys, isLoading: isKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/user/api-keys"],
    enabled: !!user,
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/user/api-keys", { name });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      setShowNewKey(data.key);
      setNewKeyName("");
      setIsCreateDialogOpen(false);
      toast({
        title: "API Key Created",
        description: "Make sure to copy your key now. You won't be able to see it again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create API key",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await apiRequest("DELETE", `/api/user/api-keys/${keyId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete API key",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard.",
    });
  };

  if (isAuthLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-api-keys-title">
            <Key className="w-6 h-6" />
            API Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your API keys for accessing Telebit Explorer API
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-api-key">
              <Plus className="h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Give your API key a name to help you identify it later.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="e.g., My dApp Integration"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              data-testid="input-api-key-name"
            />
            <DialogFooter>
              <Button
                onClick={() => createKeyMutation.mutate(newKeyName)}
                disabled={!newKeyName.trim() || createKeyMutation.isPending}
                data-testid="button-confirm-create"
              >
                {createKeyMutation.isPending ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showNewKey && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Check className="h-5 w-5" />
              API Key Created Successfully
            </CardTitle>
            <CardDescription>
              Copy this key now. For security reasons, you won't be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm break-all">
                {showNewKey}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(showNewKey)}
                data-testid="button-copy-new-key"
              >
                {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setShowNewKey(null)}
            >
              I've copied the key
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            API keys allow you to authenticate requests to the Telebit Explorer API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isKeysLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                  data-testid={`api-key-${key.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {key.keyPrefix}...
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                      {key.lastUsedAt && (
                        <> · Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}</>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Usage today:</span>{" "}
                      <span className={key.requestsToday >= key.dailyLimit ? "text-destructive" : ""}>
                        {key.requestsToday.toLocaleString()} / {key.dailyLimit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        data-testid={`button-delete-key-${key.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{key.name}"? This action cannot be undone
                          and any applications using this key will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteKeyMutation.mutate(key.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet</p>
              <p className="text-sm">Create your first API key to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Include your API key in requests:</p>
            <code className="text-sm bg-muted px-3 py-2 rounded block overflow-x-auto">
              curl -H "X-API-Key: YOUR_API_KEY" {typeof window !== 'undefined' ? window.location.origin : ''}/api/stats
            </code>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Or as a query parameter:</p>
            <code className="text-sm bg-muted px-3 py-2 rounded block overflow-x-auto">
              curl "{typeof window !== 'undefined' ? window.location.origin : ''}/api/stats?apikey=YOUR_API_KEY"
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
