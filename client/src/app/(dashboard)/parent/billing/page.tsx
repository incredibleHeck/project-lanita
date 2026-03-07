"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  AlertCircle,
  DollarSign,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { MobileMoneyDialog } from "@/components/billing/mobile-money-dialog";

interface Child {
  id: string;
  admissionNumber: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  currentSection: {
    name: string;
    class: {
      name: string;
    };
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  dueDate: string;
}

interface Statement {
  student: {
    id: string;
    admissionNumber: string;
    name: string;
  };
  summary: {
    totalBilled: number;
    totalPaid: number;
    balance: number;
  };
  invoices: Invoice[];
}

export default function ParentBillingPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <BillingContent />
    </RoleGuard>
  );
}

function BillingContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const preselectedChildId = searchParams.get("childId");

  const [selectedChildId, setSelectedChildId] = useState<string | null>(preselectedChildId);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ["parent", "children", user?.id],
    queryFn: async () => {
      const response = await axios.get<{ data: Child[] }>("/portal/parent/children");
      return response.data;
    },
    enabled: !!user?.id,
  });

  const children = childrenData?.data || [];

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      const childToSelect = preselectedChildId || children[0].id;
      setSelectedChildId(childToSelect);
    }
  }, [children, selectedChildId, preselectedChildId]);

  const { data: statement, isLoading: statementLoading, refetch: refetchStatement } = useQuery({
    queryKey: ["billing", "statement", selectedChildId],
    queryFn: async () => {
      const response = await axios.get<Statement>(`/billing/statement/${selectedChildId}`);
      return response.data;
    },
    enabled: !!selectedChildId,
  });

  const handlePayNow = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    refetchStatement();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);

  if (childrenLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <Users className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">No children linked to your account.</p>
        <p className="text-sm text-muted-foreground">
          Contact the school administration to link your children.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Fees & Payments</h1>
        </div>

        {children.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Select Child:</span>
            <Select
              value={selectedChildId || ""}
              onValueChange={(value) => setSelectedChildId(value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.user.profile?.firstName} {child.user.profile?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedChild && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {selectedChild.user.profile?.firstName} {selectedChild.user.profile?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedChild.currentSection.class.name} - {selectedChild.currentSection.name} |{" "}
                  {selectedChild.admissionNumber}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {statementLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </>
      ) : statement ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(statement.summary.totalBilled)}
                </div>
                <p className="text-xs text-muted-foreground">All term fees combined</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(statement.summary.totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground">Total payments received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                <Clock className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(statement.summary.balance)}
                </div>
                <p className="text-xs text-muted-foreground">Amount remaining</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>View all invoices and make payments</CardDescription>
            </CardHeader>
            <CardContent>
              {statement.invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No.</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p>{invoice.term}</p>
                              <p className="text-xs text-muted-foreground">{invoice.academicYear}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(invoice.amountPaid)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(invoice.balance)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="text-right">
                            {invoice.status !== "PAID" && (
                              <Button
                                size="sm"
                                onClick={() => handlePayNow(invoice)}
                              >
                                Pay Now
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load billing information</p>
        </div>
      )}

      <MobileMoneyDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
