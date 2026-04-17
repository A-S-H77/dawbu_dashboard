"use client";

import type { OverlapAlert } from "@/lib/advanced-analysis";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

export default function OverlapSection({ alerts }: { alerts: OverlapAlert[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Audience Overlap & Cannibalization</h2>
        <p className="text-sm text-gray-500">Detects campaigns competing for the same audience within your collections</p>
      </div>

      {alerts.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-lg font-semibold text-green-800">No significant overlap detected</p>
          <p className="text-sm text-green-600">Your campaigns have healthy audience separation</p>
        </div>
      )}

      <div className="space-y-4">
        {alerts.map((alert, i) => {
          const severity = alert.overlap_score >= 60 ? "high" : alert.overlap_score >= 40 ? "medium" : "low";
          const borderColor = severity === "high" ? "border-red-300" : severity === "medium" ? "border-orange-300" : "border-yellow-300";
          const bgColor = severity === "high" ? "bg-red-50" : severity === "medium" ? "bg-orange-50" : "bg-yellow-50";

          return (
            <div key={i} className={`rounded-xl border ${borderColor} ${bgColor} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                      severity === "high" ? "bg-red-600" : severity === "medium" ? "bg-orange-500" : "bg-yellow-500"
                    }`}>
                      {alert.overlap_score}% overlap
                    </span>
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{alert.collection_a}</span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 rounded-lg bg-white p-2 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-900 truncate">{alert.campaign_a}</p>
                    </div>
                    <span className="text-lg text-gray-400">vs</span>
                    <div className="flex-1 rounded-lg bg-white p-2 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-900 truncate">{alert.campaign_b}</p>
                    </div>
                  </div>

                  {/* Signals */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {alert.shared_signals.map((s, j) => (
                      <span key={j} className="rounded-full bg-white border border-gray-300 px-2 py-0.5 text-[10px] text-gray-600">{s}</span>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-lg bg-white/80 p-3 border border-gray-200">
                    <p className="text-xs text-gray-800">{alert.recommendation}</p>
                  </div>
                </div>

                {alert.wasted_spend_estimate > 0 && (
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-gray-500">Est. Wasted</p>
                    <p className="text-lg font-bold text-red-600">₹{fmt(alert.wasted_spend_estimate, 0)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
