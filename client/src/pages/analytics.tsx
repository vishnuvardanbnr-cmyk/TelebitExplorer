import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Activity, Fuel, Users, Blocks, ArrowRightLeft, Calendar } from "lucide-react";
import { formatNumber } from "@/lib/formatters";

interface DailyStat {
  date: string;
  blockCount: number;
  transactionCount: number;
  addressCount: number;
  gasUsed: string;
  totalValue: string;
  avgGasPrice: string | null;
}

interface DailyStatsData {
  stats: DailyStat[];
}

const TIME_RANGES = [
  { value: "7", label: "7 Days" },
  { value: "14", label: "14 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
];

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");

  const { data, isLoading, error } = useQuery<DailyStatsData>({
    queryKey: [`/api/stats/daily?days=${days}`],
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatGas = (gasUsed: string) => {
    try {
      const gas = BigInt(gasUsed);
      const millions = Number(gas) / 1_000_000;
      return millions.toFixed(2);
    } catch {
      return "0";
    }
  };

  const formatValue = (value: string) => {
    try {
      const bigVal = BigInt(value);
      const eth = Number(bigVal) / 1e18;
      return eth.toFixed(2);
    } catch {
      return "0";
    }
  };

  const rawChartData = (data?.stats ?? []).map(stat => ({
    date: formatDate(stat.date),
    rawDate: stat.date,
    transactions: stat.transactionCount,
    blocks: stat.blockCount,
    addresses: stat.addressCount,
    gasUsed: parseFloat(formatGas(stat.gasUsed)),
    value: parseFloat(formatValue(stat.totalValue)),
    avgGasPrice: stat.avgGasPrice ? Number(stat.avgGasPrice) / 1e9 : 0,
  })).reverse();

  // Add placeholder dates if we have less than 10 data points to make charts look better
  const minDataPoints = 10;
  const chartData = (() => {
    if (rawChartData.length >= minDataPoints) return rawChartData;
    
    const placeholders = [];
    const existingDates = new Set(rawChartData.map(d => d.rawDate));
    
    // Find the earliest date in our data or use today
    const today = new Date();
    let startDate = rawChartData.length > 0 
      ? new Date(rawChartData[0].rawDate) 
      : today;
    
    // Go back to add placeholder dates
    for (let i = minDataPoints - rawChartData.length; i > 0; i--) {
      const placeholderDate = new Date(startDate);
      placeholderDate.setDate(placeholderDate.getDate() - i);
      const dateStr = placeholderDate.toISOString().split('T')[0];
      
      if (!existingDates.has(dateStr)) {
        placeholders.push({
          date: formatDate(dateStr),
          rawDate: dateStr,
          transactions: 0,
          blocks: 0,
          addresses: 0,
          gasUsed: 0,
          value: 0,
          avgGasPrice: 0,
        });
      }
    }
    
    return [...placeholders, ...rawChartData];
  })();

  const totals = chartData.reduce((acc, curr) => ({
    transactions: acc.transactions + curr.transactions,
    blocks: acc.blocks + curr.blocks,
    addresses: acc.addresses + curr.addresses,
    gasUsed: acc.gasUsed + curr.gasUsed,
    value: acc.value + curr.value,
  }), { transactions: 0, blocks: 0, addresses: 0, gasUsed: 0, value: 0 });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-analytics-title">
            <TrendingUp className="w-6 h-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Network statistics and trends
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32" data-testid="select-time-range">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map(range => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowRightLeft className="w-4 h-4" />
              Total Transactions ({days}d)
            </div>
            <div className="text-2xl font-bold" data-testid="stat-total-transactions">
              {formatNumber(totals.transactions)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Blocks className="w-4 h-4" />
              Total Blocks ({days}d)
            </div>
            <div className="text-2xl font-bold" data-testid="stat-total-blocks">
              {formatNumber(totals.blocks)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              Active Addresses ({days}d)
            </div>
            <div className="text-2xl font-bold" data-testid="stat-active-addresses">
              {formatNumber(totals.addresses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Fuel className="w-4 h-4" />
              Gas Used ({days}d)
            </div>
            <div className="text-2xl font-bold" data-testid="stat-gas-used">
              {formatNumber(Math.round(totals.gasUsed))}M
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
          <TabsList className="inline-flex w-max gap-1">
            <TabsTrigger value="transactions" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-transactions">
              <ArrowRightLeft className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Txns</span>
            </TabsTrigger>
            <TabsTrigger value="gas" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-gas">
              <Fuel className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Gas Usage</span>
              <span className="sm:hidden">Gas</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-addresses">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Addresses</span>
              <span className="sm:hidden">Addr</span>
            </TabsTrigger>
            <TabsTrigger value="blocks" className="gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm" data-testid="tab-blocks">
              <Blocks className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              Blocks
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Transactions</CardTitle>
              <CardDescription>Number of transactions processed per day</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No transaction data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="transactions" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#txGradient)" 
                      name="Transactions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gas Usage</CardTitle>
              <CardDescription>Daily gas consumption in millions</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No gas data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="gasUsed" 
                      fill="hsl(var(--chart-2))" 
                      radius={[4, 4, 0, 0]}
                      name="Gas Used (M)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Addresses</CardTitle>
              <CardDescription>Unique addresses interacting with the network daily</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No address data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="addresses" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      dot={false}
                      name="Active Addresses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Blocks</CardTitle>
              <CardDescription>Number of blocks produced per day</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No block data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="blockGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="blocks" 
                      stroke="hsl(var(--chart-4))" 
                      fillOpacity={1} 
                      fill="url(#blockGradient)" 
                      name="Blocks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Network Overview</CardTitle>
          <CardDescription>Combined metrics over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No data available for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Transactions"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="gasUsed" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                  name="Gas (M)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
