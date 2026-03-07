"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Receipt,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

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
  payments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    method: string;
    reference: string | null;
    date: string;
  }>;
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

interface StudentRecord {
  id: string;
  admissionNumber: string;
  userId: string;
}

export default function StudentBillingPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <BillingContent />
    </RoleGuard>
  );
}

function BillingContent() {
  const { user } = useAuth();

  const { data: studentRecord, isLoading: recordLoading } = useQuery({
    queryKey: ["student", "record", user?.id],
    queryFn: async () => {
      const response = await axios.get<StudentRecord>(`/portal/student/${user?.id}/summary`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const studentId = (studentRecord as unknown as { studentId?: string })?.studentId;

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ["billing", "statement", studentId],
    queryFn: async () => {
      const response = await axios.get<Statement>(`/billing/statement/${studentId}`);
      return response.data;
    },
    enabled: !!studentId,
  });

  const isLoading = recordLoading || statementLoading;

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

  if (isLoading) {
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

  if (!statement) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Unable to load fee information.</p>
        <p className="text-sm text-muted-foreground">
          Please contact the school administration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8" />
        <h1 className="text-3xl font-bold tracking-tight">My Fees</h1>
      </div>

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
            <p className="text-xs text-muted-foreground">Total payments made</p>
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
          <CardTitle>Fee Invoices</CardTitle>
          <CardDescription>Your school fee invoices and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          {statement.invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Receipt className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {statement.invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.term} - {invoice.academicYear}
                      </p>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(invoice.amountPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-medium text-red-600">
                        {formatCurrency(invoice.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                    </div>
                  </div>

                  {invoice.payments && invoice.payments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Payment History</p>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Receipt No.</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">
                                  {payment.receiptNumber}
                                </TableCell>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {payment.method.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> To make a payment, please contact your parent/guardian or visit
            the school accounts office.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
