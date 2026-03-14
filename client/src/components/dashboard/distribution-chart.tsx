"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChartIcon } from "lucide-react";

// Colors visible on dark/black backgrounds - no black, cream for dark slots
const COLORS = [
  "#FFF8E7", // cream
  "#60A5FA", // light blue
  "#4ADE80", // green
  "#FACC15", // yellow
  "#A78BFA", // purple
  "#F87171", // coral/light red
];
const CHART_STROKE = "#FFF8E7"; // cream stroke between segments (visible on black)

interface DistributionDataPoint {
  name: string;
  value: number;
}

interface DistributionChartProps {
  data?: DistributionDataPoint[];
  isLoading?: boolean;
}

export function DistributionChart({ data, isLoading }: DistributionChartProps) {
  const total = data?.reduce((sum, item) => sum + item.value, 0) ?? 0;

  return (
    <Card className="border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border hover:-translate-y-[2px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-violet-500/10 text-violet-600 p-2 rounded-lg">
            <PieChartIcon className="h-5 w-5" />
          </span>
          Student Distribution by Class
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No class distribution data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke={CHART_STROKE}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value) => [`${value} students`, "Count"]}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="text-center mt-2">
          <p className="text-sm text-muted-foreground">
            Total Students: <span className="font-semibold text-foreground">{total}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
