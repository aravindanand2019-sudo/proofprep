"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ReadinessPoint = { at: string; trigger: string } & Record<string, number | string>;
export type CategoryPoint = {
  at: string;
  aptitude: number;
  coding: number;
  cs: number;
  communication: number;
  projects: number;
};

// Validated categorical palette (distinct in light and dark mode).
const PALETTE = ["#2563eb", "#d97706", "#059669", "#db2777", "#7c3aed"];

const label = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ProgressCharts({
  readiness,
  categories,
  companies,
}: {
  readiness: ReadinessPoint[];
  categories: CategoryPoint[];
  companies: Array<{ id: string; name: string }>;
}) {
  const categoryKeys: Array<[keyof Omit<CategoryPoint, "at">, string]> = [
    ["aptitude", "Aptitude"],
    ["coding", "Coding"],
    ["cs", "CS fundamentals"],
    ["communication", "Communication"],
    ["projects", "Projects"],
  ];
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Readiness per company</CardTitle>
          <CardDescription>0–100, one point per snapshot.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={readiness} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="at" tickFormatter={label} fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip labelFormatter={(v) => label(String(v))} />
              <Legend />
              {companies.map((c, i) => (
                <Line
                  key={c.id}
                  type="monotone"
                  dataKey={c.id}
                  name={c.name}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Category scores</CardTitle>
          <CardDescription>Unweighted, independent of company.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={categories} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="at" tickFormatter={label} fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip labelFormatter={(v) => label(String(v))} />
              <Legend />
              {categoryKeys.map(([key, name], i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
