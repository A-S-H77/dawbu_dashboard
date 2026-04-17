"use client";

import type { SpendPacing } from "@/lib/advanced-analysis";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

const statusStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", badge: "bg-red-600 text-white" },
  over: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", badge: "bg-orange-500 text-white" },
  "on-track": { bg: "bg-green-50", border: "border-green-300", text: "text-green-800", badge: "bg-green-600 text-white" },
  under: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", badge: "bg-yellow-500 text-white" },
};

export default function PacingSection({ pacing }: { pacing: SpendPacing[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Spend Pacing & Budget Alerts</h2>
        <p className="text-sm text-gray-500">Track actual spend vs budget allocation per collection</p>
      </div>

      {/* Pacing Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {pacing.map((p) => {
          const style = statusStyles[p.status] || statusStyles["on-track"];
          const pacingBarWidth = Math.min(100, p.pacing_percent);

          return (
            <div key={p.collection} className={`rounded-xl border ${style.border} ${style.bg} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">{p.collection}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>
                  {p.status === "on-track" ? "On Track" : p.status.toUpperCase()}
                </span>
              </div>

              {/* Budget vs Spend */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Period Budget</p>
                  <p className="text-lg font-bold text-gray-900">₹{fmt(p.period_budget)}</p>
                  <p className="text-[10px] text-gray-500">₹{fmt(p.daily_budget)}/day</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500">Period Spend</p>
                  <p className="text-lg font-bold text-gray-900">₹{fmt(p.period_spend)}</p>
                  <p className="text-[10px] text-gray-500">Today: ₹{fmt(p.today_spend)}</p>
                </div>
              </div>

              {/* Pacing Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>0%</span>
                  <span className="font-bold text-gray-700">{fmt(p.pacing_percent, 0)}% paced</span>
                  <span>100%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-3 rounded-full ${
                      p.status === "critical" ? "bg-red-500" :
                      p.status === "over" ? "bg-orange-500" :
                      p.status === "under" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`}
                    style={{ width: `${pacingBarWidth}%` }}
                  />
                </div>
              </div>

              {/* Alert */}
              <p className={`text-xs ${style.text}`}>{p.alert}</p>

              {/* Daily Spend Mini Chart */}
              {p.daily_spends.length > 1 && (
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={p.daily_spends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(8)} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip formatter={(value) => `₹${fmt(Number(value))}`} />
                      <ReferenceLine y={p.daily_budget} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Budget", fontSize: 9 }} />
                      <Bar dataKey="spend" fill="#6366f1" radius={[2, 2, 0, 0]} name="Spend" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
