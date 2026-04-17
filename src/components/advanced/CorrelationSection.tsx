"use client";

import type { ProductAdCorrelation } from "@/lib/advanced-analysis";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

const FORMAT_COLORS: Record<string, string> = {
  UGC: "#8b5cf6",
  Catalog: "#3b82f6",
  Static: "#6b7280",
  Video: "#f59e0b",
  Carousel: "#06b6d4",
};

export default function CorrelationSection({ correlations }: { correlations: ProductAdCorrelation[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Product-to-Ad Correlation Matrix</h2>
        <p className="text-sm text-gray-500">Which creative formats work best for each collection</p>
      </div>

      {correlations.map((corr) => (
        <div key={corr.collection} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">{corr.collection}</h3>
              <p className="text-xs text-gray-500">
                Best: <span className="font-semibold text-green-700">{corr.best_format}</span>
                {corr.format_breakdown.length > 1 && (
                  <> &middot; Weakest: <span className="font-semibold text-red-600">{corr.worst_format}</span></>
                )}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="px-5 py-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={corr.format_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="format" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="roas" tick={{ fontSize: 11 }} label={{ value: "ROAS", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis yAxisId="ctr" orientation="right" tick={{ fontSize: 11 }} label={{ value: "CTR %", angle: 90, position: "insideRight", fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="roas" dataKey="roas" name="ROAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="ctr" dataKey="ctr" name="CTR %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto px-5 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2 text-left">Format</th>
                  <th className="px-3 py-2 text-right">Ads</th>
                  <th className="px-3 py-2 text-right">Spend</th>
                  <th className="px-3 py-2 text-right">Purchases</th>
                  <th className="px-3 py-2 text-right">ROAS</th>
                  <th className="px-3 py-2 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {corr.format_breakdown.map((f) => (
                  <tr key={f.format} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: FORMAT_COLORS[f.format] || "#6b7280" }}>
                        {f.format}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{f.ads}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">₹{fmt(f.spend, 0)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{f.purchases}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(f.roas, 2)}x</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(f.ctr, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insight */}
          <div className="border-t border-gray-100 bg-blue-50 px-5 py-3">
            <p className="text-xs text-blue-800">{corr.insight}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
