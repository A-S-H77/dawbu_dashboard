"use client";

import { useState } from "react";
import type { FatigueAlert } from "@/lib/advanced-analysis";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

const severityStyles = {
  critical: { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-600 text-white", icon: "!!" },
  warning: { bg: "bg-orange-50", border: "border-orange-300", badge: "bg-orange-500 text-white", icon: "!" },
  watch: { bg: "bg-yellow-50", border: "border-yellow-300", badge: "bg-yellow-500 text-white", icon: "~" },
};

export default function FatigueSection({ alerts }: { alerts: FatigueAlert[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");
  const watch = alerts.filter((a) => a.severity === "watch");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Creative Fatigue Detection</h2>
        <p className="text-sm text-gray-500">Monitors CTR drops, frequency spikes, and CPM increases to flag fatigued ads</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{critical.length}</p>
          <p className="text-xs font-medium text-red-600">Critical — Pause Now</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-3xl font-bold text-orange-700">{warning.length}</p>
          <p className="text-xs font-medium text-orange-600">Warning — Refresh Soon</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-700">{watch.length}</p>
          <p className="text-xs font-medium text-yellow-600">Watch — Monitor</p>
        </div>
      </div>

      {alerts.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-lg font-semibold text-green-800">All creatives are healthy</p>
          <p className="text-sm text-green-600">No fatigue signals detected in this period</p>
        </div>
      )}

      {/* Alert Cards */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const style = severityStyles[alert.severity];
          const isExpanded = expanded === alert.ad_id;

          return (
            <div key={alert.ad_id} className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
              <div className="flex items-center gap-4 px-5 py-4">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style.badge}`}>
                  {alert.severity.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{alert.ad_name}</p>
                  <p className="truncate text-xs text-gray-500">{alert.campaign_name} &middot; {alert.collection}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className={`text-sm font-bold ${alert.ctr_trend < -20 ? "text-red-600" : "text-gray-700"}`}>
                      {alert.ctr_trend > 0 ? "+" : ""}{fmt(alert.ctr_trend, 0)}%
                    </p>
                    <p className="text-[10px] text-gray-500">CTR Trend</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${alert.frequency_current > 2.5 ? "text-red-600" : "text-gray-700"}`}>
                      {fmt(alert.frequency_current, 1)}
                    </p>
                    <p className="text-[10px] text-gray-500">Frequency</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${alert.cpm_trend > 25 ? "text-red-600" : "text-gray-700"}`}>
                      {alert.cpm_trend > 0 ? "+" : ""}{fmt(alert.cpm_trend, 0)}%
                    </p>
                    <p className="text-[10px] text-gray-500">CPM Trend</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(isExpanded ? null : alert.ad_id)}
                  className="rounded-lg bg-white/60 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white"
                >
                  {isExpanded ? "Hide" : "Details"}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200/50 bg-white/50 px-5 py-4 space-y-3">
                  {/* Signals */}
                  <div className="flex flex-wrap gap-2">
                    {alert.signals.map((s, i) => (
                      <span key={i} className="rounded-full bg-white border border-gray-300 px-2.5 py-0.5 text-xs text-gray-700">{s}</span>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-lg bg-white p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">Recommendation</p>
                    <p className="mt-1 text-sm text-gray-800">{alert.recommendation}</p>
                  </div>

                  {/* CTR Trend Chart */}
                  {alert.daily_data.length > 2 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">CTR & Frequency over time</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={alert.daily_data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="ctr" stroke="#3b82f6" fill="#93c5fd" name="CTR %" />
                          <Area type="monotone" dataKey="frequency" stroke="#ef4444" fill="#fca5a5" name="Frequency" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
