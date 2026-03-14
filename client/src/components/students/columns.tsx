"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Trash, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export type Student = {
  id: string;
  isActive?: boolean;
  email?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    dob?: string | Date;
    gender?: string;
    contactNumber?: string;
    address?: { city?: string };
  };
  studentRecord?: {
    admissionNumber?: string;
    currentSection?: {
      id?: string;
      name?: string;
      class?: {
        name?: string;
      };
    } | null;
  } | null;
};

export function getColumns(onEdit?: (student: Student) => void): ColumnDef<Student>[] {
  return [
  {
    accessorKey: "avatar",
    header: "",
    cell: ({ row }) => {
      const student = row.original;
      const firstName = student.profile?.firstName || "";
      const lastName = student.profile?.lastName || "";
      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

      return (
        <Avatar className="h-24 w-24">
          <AvatarImage src={student.profile?.avatarUrl || ""} alt={`${firstName} ${lastName}`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const student = row.original;
      return `${student.profile?.firstName} ${student.profile?.lastName}`;
    },
  },
  {
    accessorKey: "admissionNumber",
    header: "Admission No",
    cell: ({ row }) => {
      return row.original.studentRecord?.admissionNumber || "-";
    },
  },
  {
    accessorKey: "class",
    header: "Class",
    cell: ({ row }) => {
      const section = row.original.studentRecord?.currentSection;
      return section ? section.name : "-";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.isActive ?? true;
      return (
        <Badge variant={isActive ? "success" : "destructive-soft"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const student = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/students/${student.id}`} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/students/${student.id}/report`} className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                View Report Card
              </Link>
            </DropdownMenuItem>
            {onEdit ? (
              <DropdownMenuItem
                onClick={() => onEdit(student)}
                className="flex items-center cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href={`/students/${student.id}/edit`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600 focus:text-red-600" asChild>
              <button className="flex w-full items-center">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
}

export const columns = getColumns();