import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressLink } from "@/components/address-link";
import { formatNumber } from "@/lib/formatters";
import { 
  Gift, 
  Calendar, 
  Coins, 
  Users, 
  ExternalLink, 
  ArrowLeft, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { useAddressFormat } from "@/contexts/address-format-context";

interface Airdrop {
  id: string;
  name: string;
  description: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  totalAmount: string | null;
  claimedAmount: string | null;
  totalParticipants: number | null;
  claimedCount: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  claimUrl: string | null;
  imageUrl: string | null;
  eligibilityCriteria: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "upcoming":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "ended":
      return "bg-gray-500/10 text-gray-600 border-gray-200";
    case "cancelled":
      return "bg-red-500/10 text-red-600 border-red-200";
    default:
      return "";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return <CheckCircle2 className="h-4 w-4" />;
    case "upcoming":
      return <Clock className="h-4 w-4" />;
    case "ended":
      return <AlertCircle className="h-4 w-4" />;
    case "cancelled":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

export default function AirdropDetailPage() {
  const params = useParams<{ id: string }>();
  const airdropId = params.id;
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data: airdrop, isLoading, error } = useQuery<Airdrop>({
    queryKey: ["/api/airdrops", airdropId],
    queryFn: async () => {
      const res = await fetch(`/api/airdrops/${airdropId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Airdrop not found");
        throw new Error("Failed to fetch airdrop");
      }
      return res.json();
    },
    enabled: !!airdropId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error || !airdrop) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Airdrop Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The airdrop you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/airdrops">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Airdrops
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = airdrop.totalAmount && airdrop.claimedAmount
    ? (parseFloat(airdrop.claimedAmount) / parseFloat(airdrop.totalAmount)) * 100
    : 0;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/airdrops">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-airdrop-name">
              {airdrop.name}
            </h1>
            <Badge 
              variant="outline" 
              className={`gap-1 ${getStatusColor(airdrop.status)}`}
              data-testid="badge-status"
            >
              {getStatusIcon(airdrop.status)}
              {airdrop.status.charAt(0).toUpperCase() + airdrop.status.slice(1)}
            </Badge>
            {airdrop.isFeatured && (
              <Badge variant="secondary" className="gap-1">
                <Gift className="h-3 w-3" />
                Featured
              </Badge>
            )}
          </div>
          {airdrop.tokenSymbol && (
            <p className="text-muted-foreground mt-1">
              Token: {airdrop.tokenSymbol}
            </p>
          )}
        </div>
        {airdrop.claimUrl && airdrop.status === "active" && (
          <a href={airdrop.claimUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2" data-testid="button-claim">
              <ExternalLink className="h-4 w-4" />
              Claim Now
            </Button>
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold" data-testid="text-total-amount">
                  {airdrop.totalAmount ? formatNumber(parseFloat(airdrop.totalAmount)) : "TBA"} {airdrop.tokenSymbol || nativeSymbol}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Claimed</p>
                <p className="text-2xl font-bold" data-testid="text-claimed-amount">
                  {airdrop.claimedAmount ? formatNumber(parseFloat(airdrop.claimedAmount)) : "0"} {airdrop.tokenSymbol || nativeSymbol}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold" data-testid="text-participants">
                  {airdrop.claimedCount || 0} / {airdrop.totalParticipants || "TBA"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {airdrop.totalAmount && airdrop.claimedAmount && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Claim Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About This Airdrop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {airdrop.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
                {airdrop.description}
              </p>
            ) : (
              <p className="text-muted-foreground italic">No description provided.</p>
            )}

            {airdrop.eligibilityCriteria && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Eligibility Criteria</h4>
                <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-eligibility">
                  {airdrop.eligibilityCriteria}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {airdrop.startDate && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium" data-testid="text-start-date">
                    {format(new Date(airdrop.startDate), "PPP p")}
                  </span>
                </div>
              )}
              {airdrop.endDate && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium" data-testid="text-end-date">
                    {format(new Date(airdrop.endDate), "PPP p")}
                  </span>
                </div>
              )}
              {airdrop.contractAddress && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Contract</span>
                  <AddressLink 
                    address={airdrop.contractAddress} 
                    showCopy 
                    className="font-mono text-sm"
                  />
                </div>
              )}
              {airdrop.tokenAddress && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Token Address</span>
                  <AddressLink 
                    address={airdrop.tokenAddress} 
                    showCopy 
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {airdrop.claimUrl && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Ready to Claim?</h3>
                  <p className="text-muted-foreground">
                    {airdrop.status === "active" 
                      ? "This airdrop is currently active. Visit the claim page to check your eligibility."
                      : airdrop.status === "upcoming"
                      ? "This airdrop hasn't started yet. Check back when it goes live."
                      : "This airdrop has ended."}
                  </p>
                </div>
              </div>
              <a href={airdrop.claimUrl} target="_blank" rel="noopener noreferrer">
                <Button 
                  size="lg" 
                  className="gap-2"
                  disabled={airdrop.status !== "active"}
                  data-testid="button-claim-cta"
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Claim Page
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
