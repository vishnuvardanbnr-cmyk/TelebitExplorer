import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

interface SettingsData {
  legal?: Record<string, string>;
}

export default function PrivacyPage() {
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
    staleTime: 60000,
  });

  const privacyContent = settings?.legal?.privacy_content || `
# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

## 1. Information We Collect

The Telebit Blockchain Explorer collects minimal data necessary for service operation:
- Browser session data for functionality
- API usage statistics for rate limiting
- Blockchain addresses you search for (stored locally)

## 2. Blockchain Data

All blockchain data displayed is public information available on the Telebit network. We do not collect or store private keys or wallet credentials.

## 3. Cookies

We use essential cookies for session management and user preferences (like theme selection and address format).

## 4. Third-Party Services

We may use third-party analytics services to improve the explorer. These services may collect anonymized usage data.

## 5. Data Security

We implement reasonable security measures to protect the data we process. However, no internet transmission is completely secure.

## 6. Your Rights

You can clear your browser data at any time to remove locally stored preferences and watchlist data.

## 7. Contact

For privacy concerns, please contact the Telebit team.
  `.trim();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-privacy-title">
            <Shield className="h-5 w-5" />
            Privacy Policy
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
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-privacy-content">
              {privacyContent.split('\n').map((line, i) => {
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
