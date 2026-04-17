"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { CollectionSummary } from "@/lib/collections";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#6b7280", "#ef4444", "#06b6d4"];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export default function SummaryChart({ collections }: { collections: CollectionSummary[] }) {
  const barData = collections.map((c) => ({
    name: c.name,
    Budget: c.totalDailyBudget,
    Spend: c.totalSpend,
  }));

  const pieData = collections.map((c) => ({
    name: c.name,
    value: c.totalSpend,
  }));

  const roasData = collections.map((c) => ({
    name: c.name,
    ROAS: parseFloat(c.avgROAS.toFixed(2)),
    CPR: parseFloat(c.avgCPR.toFixed(2)),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Budget vs Spend */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Daily Budget vs Spend (INR)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${fmt(v)}`} />
            <Tooltip formatter={(value) => `₹${fmt(Number(value))}`} />
            <Legend />
            <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spend Distribution Pie */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Spend Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `₹${fmt(Number(value))}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ROAS & CPR Comparison */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          ROAS & Cost per Purchase
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={roasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="roas" tick={{ fontSize: 12 }} label={{ value: "ROAS", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="cpr" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} label={{ value: "CPR", angle: 90, position: "insideRight" }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="roas" dataKey="ROAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="cpr" dataKey="CPR" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
