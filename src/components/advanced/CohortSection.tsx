"use client";

import type { CohortData } from "@/lib/advanced-analysis";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function CohortSection({ cohorts }: { cohorts: CohortData[] }) {
  const collections = [...new Set(cohorts.map((c) => c.collection))];

  // Build chart data: rows = periods, columns = collection values
  const periods = [...new Set(cohorts.map((c) => c.period))].sort();
  const chartData = periods.map((period) => {
    const row: Record<string, string | number> = { period };
    for (const col of collections) {
      const cohort = cohorts.find((c) => c.period === period && c.collection === col);
      row[`${col}_roas`] = cohort ? parseFloat(cohort.avg_roas.toFixed(2)) : 0;
      row[`${col}_cpa`] = cohort ? parseFloat(cohort.cost_per_new_customer.toFixed(0)) : 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Cohort & Performance Trends</h2>
        <p className="text-sm text-gray-500">Weekly performance trends by collection — identify improving or declining patterns</p>
      </div>

      {/* ROAS Trend Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">ROAS by Collection (Weekly)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {collections.map((col, i) => (
              <Line key={col} type="monotone" dataKey={`${col}_roas`} name={`${col} ROAS`} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cohort Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Weekly Cohort Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 text-left">Week</th>
                <th className="px-3 py-2 text-left">Collection</th>
                <th className="px-3 py-2 text-right">Purchases</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">Cost/Customer</th>
                <th className="px-3 py-2 text-right">ROAS</th>
                <th className="px-3 py-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c, i) => (
                <tr key={`${c.period}-${c.collection}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-700 font-medium">{c.period}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{c.collection}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{c.new_purchasers}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">₹{fmt(c.total_spend, 0)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {c.cost_per_new_customer > 0 ? `₹${fmt(c.cost_per_new_customer, 0)}` : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(c.avg_roas, 2)}x</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.trend === "improving" ? "bg-green-100 text-green-700" :
                      c.trend === "declining" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {c.trend === "improving" ? "Improving" : c.trend === "declining" ? "Declining" : "Stable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
