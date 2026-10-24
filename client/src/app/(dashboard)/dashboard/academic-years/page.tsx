"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calendar,
  CalendarDays,
  Plus,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  academicYearId: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms?: Term[];
}

export default function AcademicYearsPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <AcademicYearsContent />
    </RoleGuard>
  );
}

function AcademicYearsContent() {
  const queryClient = useQueryClient();

  // Dialog states
  const [createYearOpen, setCreateYearOpen] = useState(false);
  const [yearName, setYearName] = useState("");
  const [yearStartDate, setYearStartDate] = useState("");
  const [yearEndDate, setYearEndDate] = useState("");
  const [yearIsCurrent, setYearIsCurrent] = useState(false);

  const [createTermOpen, setCreateTermOpen] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [termName, setTermName] = useState("");
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");
  const [termIsCurrent, setTermIsCurrent] = useState(false);

  // Queries
  const {
    data: academicYears,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYear[]>("/academic-year");
      return res.data;
    },
  });

  // Mutations
  const createYearMutation = useMutation({
    mutationFn: async () => {
      return api.post("/academic-year", {
        name: yearName,
        startDate: yearStartDate,
        endDate: yearEndDate,
        isCurrent: yearIsCurrent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year created successfully!");
      setCreateYearOpen(false);
      resetYearForm();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to create academic year"
      );
    },
  });

  const setActiveYearMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/academic-year/${id}/set-active`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Active academic year updated!");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to set active academic year"
      );
    },
  });

  const deleteYearMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/academic-year/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year deleted successfully.");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message || "Failed to delete academic year"
      );
    },
  });

  const createTermMutation = useMutation({
    mutationFn: async () => {
      if (!selectedYearId) return;
      return api.post("/terms", {
        academicYearId: selectedYearId,
        name: termName,
        startDate: termStartDate,
        endDate: termEndDate,
        isCurrent: termIsCurrent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Term added successfully!");
      setCreateTermOpen(false);
      resetTermForm();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to add term");
    },
  });

  const setActiveTermMutation = useMutation({
    mutationFn: async (termId: string) => {
      return api.patch(`/terms/${termId}/set-active`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Active term updated!");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to set active term");
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: async (termId: string) => {
      return api.delete(`/terms/${termId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Term removed successfully.");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete term");
    },
  });

  function resetYearForm() {
    setYearName("");
    setYearStartDate("");
    setYearEndDate("");
    setYearIsCurrent(false);
  }

  function resetTermForm() {
    setSelectedYearId(null);
    setTermName("");
    setTermStartDate("");
    setTermEndDate("");
    setTermIsCurrent(false);
  }

  function handleOpenAddTerm(yearId: string) {
    setSelectedYearId(yearId);
    setCreateTermOpen(true);
  }

  const currentYear = academicYears?.find((y) => y.isCurrent);
  const currentTerm = currentYear?.terms?.find((t) => t.isCurrent);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic sessions, terms, and the active instructional period.
          </p>
        </div>
        <Button onClick={() => setCreateYearOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Academic Year
        </Button>
      </div>

      {/* Active Session Spotlight Banner */}
      {currentYear && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Current Instructional Session</CardTitle>
              </div>
              <Badge className="bg-primary hover:bg-primary">Active Now</Badge>
            </div>
            <CardDescription>
              All course allocations, daily attendance, and exam marks default to this session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block">Session</span>
                <span className="font-semibold text-base">{currentYear.name}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block">Duration</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(currentYear.startDate), "MMM d, yyyy")} - {format(new Date(currentYear.endDate), "MMM d, yyyy")}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block">Active Term</span>
                <span className="font-medium text-sm">
                  {currentTerm ? (
                    <Badge variant="outline" className="border-primary text-primary">
                      {currentTerm.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">No active term set</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Failed to load academic calendar. Please try again.
        </div>
      ) : !academicYears || academicYears.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed">
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No academic years defined"
            description="Create your school's first academic year to begin managing terms and allocations."
          />
          <Button onClick={() => setCreateYearOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Academic Year
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {academicYears.map((year) => (
            <Card key={year.id} className={year.isCurrent ? "border-primary shadow-sm" : ""}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{year.name}</CardTitle>
                        {year.isCurrent && (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            Active Session
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {format(new Date(year.startDate), "MMMM d, yyyy")} &ndash;{" "}
                        {format(new Date(year.endDate), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!year.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setActiveYearMutation.isPending}
                        onClick={() => setActiveYearMutation.mutate(year.id)}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                        Set Active Session
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddTerm(year.id)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Term
                    </Button>
                    {!year.isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-600"
                        title="Delete academic year"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete session "${year.name}"?`)) {
                            deleteYearMutation.mutate(year.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-md border mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Term / Trimester</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {year.terms && year.terms.length > 0 ? (
                        year.terms.map((term) => (
                          <TableRow key={term.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {term.name}
                            </TableCell>
                            <TableCell>
                              {format(new Date(term.startDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {format(new Date(term.endDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {term.isCurrent ? (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700">
                                  Active Term
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Inactive</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!term.isCurrent && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={setActiveTermMutation.isPending}
                                    onClick={() => setActiveTermMutation.mutate(term.id)}
                                  >
                                    Set Active
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-red-600 h-8 w-8"
                                  onClick={() => {
                                    if (confirm(`Delete term "${term.name}"?`)) {
                                      deleteTermMutation.mutate(term.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-20 text-center text-muted-foreground text-sm">
                            No terms added to this academic year yet. Click &quot;Add Term&quot; to configure Term 1, Term 2, etc.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Academic Year Dialog */}
      <Dialog open={createYearOpen} onOpenChange={setCreateYearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Academic Year</DialogTitle>
            <DialogDescription>
              Create a new school session (e.g., 2026/2027) with its start and end dates.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createYearMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="yearName">Academic Year Name</Label>
              <Input
                id="yearName"
                placeholder="e.g. 2026/2027"
                required
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearStartDate">Start Date</Label>
                <Input
                  id="yearStartDate"
                  type="date"
                  required
                  value={yearStartDate}
                  onChange={(e) => setYearStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearEndDate">End Date</Label>
                <Input
                  id="yearEndDate"
                  type="date"
                  required
                  value={yearEndDate}
                  onChange={(e) => setYearEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="isCurrent"
                type="checkbox"
                checked={yearIsCurrent}
                onChange={(e) => setYearIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isCurrent" className="text-sm font-medium cursor-pointer">
                Set as Current Active Session
              </Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateYearOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createYearMutation.isPending}>
                {createYearMutation.isPending ? "Creating..." : "Create Academic Year"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Term Dialog */}
      <Dialog open={createTermOpen} onOpenChange={setCreateTermOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Term / Semester</DialogTitle>
            <DialogDescription>
              Configure an instructional term with its start and end dates.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTermMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="termName">Term Name</Label>
              <Input
                id="termName"
                placeholder="e.g. First Term, Second Term, Fall Semester"
                required
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="termStartDate">Start Date</Label>
                <Input
                  id="termStartDate"
                  type="date"
                  required
                  value={termStartDate}
                  onChange={(e) => setTermStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termEndDate">End Date</Label>
                <Input
                  id="termEndDate"
                  type="date"
                  required
                  value={termEndDate}
                  onChange={(e) => setTermEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="termIsCurrent"
                type="checkbox"
                checked={termIsCurrent}
                onChange={(e) => setTermIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="termIsCurrent" className="text-sm font-medium cursor-pointer">
                Set as Active Term
              </Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateTermOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTermMutation.isPending}>
                {createTermMutation.isPending ? "Adding..." : "Add Term"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
