import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

interface SettingsData {
  legal?: Record<string, string>;
}

export default function TermsPage() {
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
    staleTime: 60000,
  });

  const termsContent = settings?.legal?.terms_content || `
# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

## 1. Acceptance of Terms

By accessing and using the Telebit Blockchain Explorer, you agree to be bound by these Terms of Service.

## 2. Use of Service

The Telebit Blockchain Explorer provides blockchain data exploration tools. The service is provided "as is" without warranties of any kind.

## 3. User Responsibilities

Users are responsible for their own use of the service and any consequences thereof.

## 4. Data Accuracy

While we strive for accuracy, blockchain data is provided as-is from the network and may have slight delays.

## 5. API Usage

API access is subject to rate limits and fair usage policies. Abuse of the API may result in access restrictions.

## 6. Changes to Terms

We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.

## 7. Contact

For questions about these terms, please contact the Telebit team.
  `.trim();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-terms-title">
            <FileText className="h-5 w-5" />
            Terms of Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-terms-content">
              {termsContent.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-bold mb-4">{line.slice(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-semibold mt-6 mb-3">{line.slice(3)}</h2>;
                } else if (line.trim() === '') {
                  return <br key={i} />;
                } else {
                  return <p key={i} className="mb-2 text-muted-foreground">{line}</p>;
                }
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
