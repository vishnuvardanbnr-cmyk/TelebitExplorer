import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Check, Zap, Rocket, Building } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
}

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: "0",
    priceLabel: "Forever free",
    description: "Perfect for getting started and testing",
    features: [
      "5 API keys",
      "10,000 requests/day",
      "Standard rate limits",
      "Community support",
      "Basic endpoints",
    ],
    current: true,
  },
  {
    name: "Pro",
    icon: Rocket,
    price: "29",
    priceLabel: "per month",
    description: "For developers and small projects",
    features: [
      "Unlimited API keys",
      "100,000 requests/day",
      "Higher rate limits",
      "Priority support",
      "All endpoints",
      "Webhook notifications",
      "Historical data export",
    ],
    current: false,
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Building,
    price: "Custom",
    priceLabel: "Contact us",
    description: "For large-scale applications",
    features: [
      "Unlimited everything",
      "Custom rate limits",
      "Dedicated support",
      "SLA guarantee",
      "Custom endpoints",
      "Real-time websockets",
      "White-label options",
      "On-premise deployment",
    ],
    current: false,
  },
];

export default function ApiPlansPage() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isAuthLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isAuthLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2" data-testid="text-api-plans-title">
          <CreditCard className="w-6 h-6" />
          API Plans
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Choose the plan that best fits your needs. Upgrade anytime as your project grows.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
            data-testid={`plan-${plan.name.toLowerCase()}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <plan.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                {plan.price === "Custom" ? (
                  <span className="text-3xl font-bold">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.priceLabel}</span>
                  </>
                )}
              </div>
              <ul className="space-y-3 text-left">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.current ? (
                <Button className="w-full" variant="secondary" disabled>
                  Current Plan
                </Button>
              ) : plan.price === "Custom" ? (
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              ) : (
                <Button className="w-full">
                  Upgrade to {plan.name}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
          <CardDescription>Your API usage for the current billing period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-2xl font-bold">Free</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API Keys</p>
              <p className="text-2xl font-bold">1 / 5</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requests Today</p>
              <p className="text-2xl font-bold">0 / 10,000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">What happens if I exceed my daily limit?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your API requests will be rate-limited until the next day. Consider upgrading if you need more capacity.
            </p>
          </div>
          <div>
            <p className="font-medium">Can I downgrade my plan?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Yes, you can downgrade at any time. The change will take effect at the start of your next billing cycle.
            </p>
          </div>
          <div>
            <p className="font-medium">Do you offer refunds?</p>
            <p className="text-sm text-muted-foreground mt-1">
              We offer a 14-day money-back guarantee for all paid plans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
