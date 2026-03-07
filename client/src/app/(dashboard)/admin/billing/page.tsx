"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
} from "lucide-react";
import api from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingDataTable } from "@/components/billing/billing-data-table";
import { createInvoiceColumns, Invoice } from "@/components/billing/invoice-columns";
import { RecordPaymentDialog } from "@/components/billing/record-payment-dialog";

interface BillingStats {
  totalExpected: number;
  totalCollected: number;
  outstanding: number;
  invoiceCount: {
    total: number;
    pending: number;
    partial: number;
    paid: number;
    overdue: number;
  };
}

interface InvoicesResponse {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export default function BillingPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<BillingStats>({
    queryKey: ["billing-stats"],
    queryFn: async () => {
      const res = await api.get("/billing/stats");
      return res.data;
    },
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<InvoicesResponse>({
    queryKey: ["invoices", page, statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (search) {
        params.search = search;
      }
      const res = await api.get("/billing/invoices", { params });
      return res.data;
    },
  });

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => createInvoiceColumns(handleRecordPayment),
    []
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Financial Operations</h1>
          <p className="text-muted-foreground">
            Manage student invoices and payments
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expected Collection
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalExpected ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats?.invoiceCount?.total ?? 0} invoices total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalCollected ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats?.invoiceCount?.paid ?? 0} fully paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats?.outstanding ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {(stats?.invoiceCount?.pending ?? 0) +
                (stats?.invoiceCount?.partial ?? 0) +
                (stats?.invoiceCount?.overdue ?? 0)}{" "}
              outstanding invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BillingDataTable
            columns={columns}
            data={invoicesData?.data ?? []}
            isLoading={invoicesLoading}
          />

          {invoicesData && invoicesData.meta.lastPage > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {invoicesData.meta.page} of {invoicesData.meta.lastPage} (
                {invoicesData.meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= invoicesData.meta.lastPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog
        invoice={selectedInvoice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
