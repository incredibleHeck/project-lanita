"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  section: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  dueDate: string;
  createdAt: string;
};

const statusConfig = {
  PAID: { label: "Paid", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" },
  PARTIAL: { label: "Partial", variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-black" },
  PENDING: { label: "Pending", variant: "destructive" as const, className: "" },
  OVERDUE: { label: "Overdue", variant: "destructive" as const, className: "bg-red-700 hover:bg-red-800" },
};

export const createInvoiceColumns = (
  onRecordPayment: (invoice: Invoice) => void
): ColumnDef<Invoice>[] => [
  {
    accessorKey: "studentName",
    header: "Student Name",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("studentName")}</div>
        <div className="text-xs text-muted-foreground">{row.original.admissionNumber}</div>
      </div>
    ),
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice No",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("invoiceNumber")}</span>
    ),
  },
  {
    accessorKey: "term",
    header: "Term",
    cell: ({ row }) => (
      <div>
        <div>{row.getValue("term")}</div>
        <div className="text-xs text-muted-foreground">{row.original.academicYear}</div>
      </div>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => formatCurrency(row.getValue("totalAmount")),
  },
  {
    accessorKey: "balance",
    header: "Balance Due",
    cell: ({ row }) => {
      const balance = row.getValue("balance") as number;
      return (
        <span className={balance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
          {formatCurrency(balance)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Invoice["status"];
      const config = statusConfig[status];
      return (
        <Badge variant={config.variant} className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => formatDate(row.getValue("dueDate")),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original;
      const canPay = invoice.status !== "PAID";

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canPay && (
              <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </DropdownMenuItem>
            )}
            {!canPay && (
              <DropdownMenuItem disabled>
                Fully Paid
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
