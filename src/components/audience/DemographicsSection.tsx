"use client";

import type { AgePerformance, GenderPerformance, RegionPerformance } from "@/lib/audience-analysis";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

const effColors: Record<string, string> = {
  top: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  average: "bg-yellow-100 text-yellow-700",
  poor: "bg-red-100 text-red-700",
};

export default function DemographicsSection({
  ages,
  genders,
  regions,
}: {
  ages: AgePerformance[];
  genders: GenderPerformance[];
  regions: RegionPerformance[];
}) {
  const maxAgeSpend = Math.max(...ages.map((a) => a.spend), 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Age & Gender Performance</h2>
        <p className="text-sm text-gray-500">See which demographics drive the most purchases and best ROAS</p>
      </div>

      {/* Gender Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {genders.map((g) => (
          <div key={g.gender} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-600 capitalize">{g.gender}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-500">Spend</p>
                <p className="text-sm font-bold text-gray-900">₹{fmt(g.spend)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Purchases</p>
                <p className="text-sm font-bold text-gray-900">{g.purchases}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">ROAS</p>
                <p className="text-sm font-bold text-gray-900">{fmt(g.roas, 2)}x</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">CTR</p>
                <p className="text-sm font-bold text-gray-900">{fmt(g.ctr, 2)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">CPM</p>
                <p className="text-sm font-bold text-gray-900">₹{fmt(g.cpm, 1)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">CPA</p>
                <p className="text-sm font-bold text-gray-900">₹{fmt(g.cpa)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Age Performance Bars */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-600 mb-4">Age Group Performance</p>
        {ages.length === 0 ? (
          <p className="text-xs text-gray-400">No age data available</p>
        ) : (
          <div className="space-y-3">
            {ages.map((a) => (
              <div key={a.age} className="flex items-center gap-3">
                <span className="w-14 text-xs font-medium text-gray-700">{a.age}</span>
                <div className="flex-1">
                  <div className="h-6 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((a.spend / maxAgeSpend) * 100, 4)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">₹{fmt(a.spend)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 text-center">
                  <div className="w-12">
                    <p className="text-[10px] text-gray-500">ROAS</p>
                    <p className="text-xs font-bold text-gray-900">{fmt(a.roas, 2)}x</p>
                  </div>
                  <div className="w-10">
                    <p className="text-[10px] text-gray-500">Purch</p>
                    <p className="text-xs font-bold text-gray-900">{a.purchases}</p>
                  </div>
                  <div className="w-14">
                    <p className="text-[10px] text-gray-500">CTR</p>
                    <p className="text-xs font-bold text-gray-900">{fmt(a.ctr, 2)}%</p>
                  </div>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${effColors[a.efficiency]}`}>
                  {a.efficiency.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Region Performance Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-600 mb-4">Region Performance</p>
        {regions.length === 0 ? (
          <p className="text-xs text-gray-400">No region data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Region</th>
                  <th className="pb-2 font-medium text-right">Spend</th>
                  <th className="pb-2 font-medium text-right">Purchases</th>
                  <th className="pb-2 font-medium text-right">ROAS</th>
                  <th className="pb-2 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">CPA</th>
                  <th className="pb-2 font-medium text-center">Rating</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.region} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-semibold text-gray-900">{r.region}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">₹{fmt(r.spend)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{r.purchases}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{fmt(r.roas, 2)}x</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{fmt(r.ctr, 2)}%</td>
                    <td className="py-2 text-right font-semibold text-gray-900">₹{fmt(r.cpa)}</td>
                    <td className="py-2 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${effColors[r.efficiency]}`}>
                        {r.efficiency.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
