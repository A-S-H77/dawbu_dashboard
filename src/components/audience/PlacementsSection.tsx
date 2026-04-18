"use client";

import type { PlacementPerformance, DeviceBreakdown } from "@/lib/audience-analysis";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

export default function PlacementsSection({
  placements,
  devices,
}: {
  placements: PlacementPerformance[];
  devices: DeviceBreakdown[];
}) {
  const totalPlacementSpend = placements.reduce((s, p) => s + p.spend, 0) || 1;
  const totalDeviceSpend = devices.reduce((s, d) => s + d.spend, 0) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Placements & Devices</h2>
        <p className="text-sm text-gray-500">Where your ads are shown and which platforms perform best</p>
      </div>

      {/* Placement Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-600 mb-4">Platform & Position Breakdown</p>
        {placements.length === 0 ? (
          <p className="text-xs text-gray-400">No placement data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Platform</th>
                  <th className="pb-2 font-medium">Position</th>
                  <th className="pb-2 font-medium text-right">Spend</th>
                  <th className="pb-2 font-medium text-right">Share</th>
                  <th className="pb-2 font-medium text-right">Purchases</th>
                  <th className="pb-2 font-medium text-right">ROAS</th>
                  <th className="pb-2 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">CPM</th>
                  <th className="pb-2 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p, i) => {
                  const share = (p.spend / totalPlacementSpend) * 100;
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 font-semibold text-gray-900 capitalize">{p.platform}</td>
                      <td className="py-2 text-gray-700">{p.position.replace(/_/g, " ")}</td>
                      <td className="py-2 text-right font-semibold text-gray-900">₹{fmt(p.spend)}</td>
                      <td className="py-2 text-right text-gray-600">{fmt(share, 1)}%</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{p.purchases}</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{fmt(p.roas, 2)}x</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{fmt(p.ctr, 2)}%</td>
                      <td className="py-2 text-right font-semibold text-gray-900">₹{fmt(p.cpm, 1)}</td>
                      <td className="py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          p.recommendation.toLowerCase().includes("scale") ? "bg-green-100 text-green-700" :
                          p.recommendation.toLowerCase().includes("cut") || p.recommendation.toLowerCase().includes("reduce") ? "bg-red-100 text-red-700" :
                          p.recommendation.toLowerCase().includes("test") ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {p.recommendation}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Device Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-600 mb-4">Device Performance</p>
        {devices.length === 0 ? (
          <p className="text-xs text-gray-400">No device data available</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {devices.map((d) => {
              const share = (d.spend / totalDeviceSpend) * 100;
              return (
                <div key={d.device} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900 capitalize">{d.device}</p>
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                      {fmt(share, 1)}% spend
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500">Spend</p>
                      <p className="text-xs font-bold text-gray-900">₹{fmt(d.spend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Purchases</p>
                      <p className="text-xs font-bold text-gray-900">{d.purchases}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">ROAS</p>
                      <p className="text-xs font-bold text-gray-900">{fmt(d.roas, 2)}x</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">CTR</p>
                      <p className="text-xs font-bold text-gray-900">{fmt(d.ctr, 2)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">CPM</p>
                      <p className="text-xs font-bold text-gray-900">₹{fmt(d.cpm, 1)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Clicks</p>
                      <p className="text-xs font-bold text-gray-900">{fmt(d.clicks)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
