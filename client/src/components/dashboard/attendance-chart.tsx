"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

interface AttendanceDataPoint {
  day: string;
  present: number;
  absent: number;
}

interface AttendanceChartProps {
  data?: AttendanceDataPoint[];
  isLoading?: boolean;
}

export function AttendanceChart({ data, isLoading }: AttendanceChartProps) {
  return (
    <Card className="border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border hover:-translate-y-[2px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-primary/10 text-primary p-2 rounded-lg">
            <CalendarDays className="h-5 w-5" />
          </span>
          Weekly Attendance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] p-6 pt-0">
          {isLoading ? (
            <div className="flex flex-col justify-end h-full gap-2">
              <Skeleton className="h-full w-full" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No attendance data available for this week.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="color-mix(in srgb, var(--color-border) 30%, transparent)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
                <Bar
                  dataKey="present"
                  name="Present"
                  fill="#4ADE80"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill="#F87171"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
