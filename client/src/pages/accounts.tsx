import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { AddressLink } from "@/components/address-link";
import { formatNumber, formatTBT, formatTimestamp } from "@/lib/formatters";
import { Users, FileCode, User } from "lucide-react";
import { useAddressFormat } from "@/contexts/address-format-context";
import type { Address } from "@shared/schema";

const PAGE_SIZE = 25;

export default function AccountsPage() {
  const [page, setPage] = useState(1);
  const { chainConfig } = useAddressFormat();
  const nativeSymbol = chainConfig.native_symbol || "ETH";

  const { data, isLoading } = useQuery<{ addresses: Address[]; total: number }>({
    queryKey: ["/api/addresses", page],
    queryFn: async () => {
      const res = await fetch(`/api/addresses?page=${page}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return res.json();
    },
  });

  const addresses = data?.addresses || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <Users className="h-6 w-6" />
          Accounts
        </h1>
        <p className="text-muted-foreground mt-1">
          {data?.total ? `${formatNumber(data.total)} accounts found` : "Loading accounts..."}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Txns</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : addresses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  addresses.map((addr, index) => (
                    <TableRow key={addr.address} className="hover-elevate">
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {addr.isContract ? (
                            <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <AddressLink address={addr.address} showCopy={false} />
                          {addr.contractName && (
                            <Badge variant="outline" className="text-xs">
                              {addr.contractName}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={addr.isContract ? "secondary" : "outline"} className="text-xs">
                          {addr.isContract ? "Contract" : "EOA"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatTBT(addr.balance)} {nativeSymbol}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono text-sm">
                        {formatNumber(addr.transactionCount)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {addr.lastSeen ? formatTimestamp(addr.lastSeen) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
