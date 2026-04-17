"use client";

function fmt(n: number, d = 0) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}

interface HourStat {
  hour: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  purchases: number;
  roas: number;
}

interface CollectionHour {
  collection: string;
  hour: string;
  spend: number;
  purchases: number;
  roas: number;
}

function parseHour(hourStr: string): number {
  // Format: "00:00:00 - 00:59:59" → 0
  const match = hourStr.match(/^(\d{2}):/);
  return match ? parseInt(match[1]) : 0;
}

function formatHourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return "bg-gray-100";
  const intensity = value / max;
  if (intensity >= 0.8) return "bg-green-600 text-white";
  if (intensity >= 0.6) return "bg-green-400 text-white";
  if (intensity >= 0.4) return "bg-green-300 text-gray-900";
  if (intensity >= 0.2) return "bg-green-200 text-gray-900";
  if (intensity > 0) return "bg-green-100 text-gray-700";
  return "bg-gray-50 text-gray-400";
}

function getRoasColor(value: number): string {
  if (value >= 5) return "bg-green-600 text-white";
  if (value >= 3) return "bg-green-400 text-white";
  if (value >= 2) return "bg-green-300 text-gray-900";
  if (value >= 1) return "bg-yellow-200 text-gray-900";
  if (value > 0) return "bg-red-200 text-gray-900";
  return "bg-gray-50 text-gray-400";
}

export default function HeatmapSection({ accountHours, collectionHours }: { accountHours: HourStat[]; collectionHours: CollectionHour[] }) {
  // Process account-level data into 24-hour grid
  const hourData: Record<number, HourStat> = {};
  for (const h of accountHours) {
    const hour = parseHour(h.hour);
    if (!hourData[hour]) {
      hourData[hour] = { ...h };
    } else {
      hourData[hour].spend += h.spend;
      hourData[hour].impressions += h.impressions;
      hourData[hour].clicks += h.clicks;
      hourData[hour].purchases += h.purchases;
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxSpend = Math.max(...hours.map((h) => hourData[h]?.spend || 0));
  const maxPurchases = Math.max(...hours.map((h) => hourData[h]?.purchases || 0));

  // Process collection-level hourly data
  const collections = [...new Set(collectionHours.map((c) => c.collection))];
  const collHourData: Record<string, Record<number, { spend: number; purchases: number; roas: number[] }>> = {};

  for (const ch of collectionHours) {
    const hour = parseHour(ch.hour);
    if (!collHourData[ch.collection]) collHourData[ch.collection] = {};
    if (!collHourData[ch.collection][hour]) {
      collHourData[ch.collection][hour] = { spend: 0, purchases: 0, roas: [] };
    }
    collHourData[ch.collection][hour].spend += ch.spend;
    collHourData[ch.collection][hour].purchases += ch.purchases;
    if (ch.roas > 0) collHourData[ch.collection][hour].roas.push(ch.roas);
  }

  // Find best hours
  const bestSpendHour = hours.reduce((best, h) => (hourData[h]?.purchases || 0) > (hourData[best]?.purchases || 0) ? h : best, 0);
  const worstSpendHour = hours.filter((h) => (hourData[h]?.spend || 0) > 0).reduce((worst, h) => {
    const hPurchases = hourData[h]?.purchases || 0;
    const hSpend = hourData[h]?.spend || 0;
    const wPurchases = hourData[worst]?.purchases || 0;
    const wSpend = hourData[worst]?.spend || 0;
    const hEfficiency = hSpend > 0 ? hPurchases / hSpend : 0;
    const wEfficiency = wSpend > 0 ? wPurchases / wSpend : 0;
    return hEfficiency < wEfficiency ? h : worst;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Day/Hour Performance Heatmap</h2>
        <p className="text-sm text-gray-500">Find your best and worst performing hours to optimize ad scheduling</p>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-xs font-semibold text-green-600">Best Hour</p>
          <p className="text-xl font-bold text-green-800">{formatHourLabel(bestSpendHour)}</p>
          <p className="text-[10px] text-green-600">{hourData[bestSpendHour]?.purchases || 0} purchases</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-xs font-semibold text-red-600">Worst Efficiency</p>
          <p className="text-xl font-bold text-red-800">{formatHourLabel(worstSpendHour)}</p>
          <p className="text-[10px] text-red-600">₹{fmt(hourData[worstSpendHour]?.spend || 0)} spent</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-xs font-semibold text-blue-600">Total Hours Active</p>
          <p className="text-xl font-bold text-blue-800">{hours.filter((h) => (hourData[h]?.spend || 0) > 0).length}</p>
          <p className="text-[10px] text-blue-600">out of 24</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-center">
          <p className="text-xs font-semibold text-purple-600">Peak Window</p>
          <p className="text-xl font-bold text-purple-800">
            {formatHourLabel(Math.max(bestSpendHour - 2, 0))} - {formatHourLabel(Math.min(bestSpendHour + 2, 23))}
          </p>
          <p className="text-[10px] text-purple-600">Recommended focus</p>
        </div>
      </div>

      {/* Account-Level Heatmap */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">Hourly Spend & Purchases</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="px-1 py-1 text-left font-medium">Metric</th>
                {hours.map((h) => (
                  <th key={h} className="px-1 py-1 text-center font-medium w-10">{formatHourLabel(h).replace(" ", "\n")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Spend Row */}
              <tr>
                <td className="px-1 py-1 font-semibold text-gray-700 whitespace-nowrap">Spend</td>
                {hours.map((h) => {
                  const val = hourData[h]?.spend || 0;
                  return (
                    <td key={h} className="px-0.5 py-0.5">
                      <div className={`rounded p-1 text-center text-[9px] font-medium ${getHeatColor(val, maxSpend)}`}>
                        {val > 0 ? `₹${fmt(val)}` : "-"}
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* Purchases Row */}
              <tr>
                <td className="px-1 py-1 font-semibold text-gray-700 whitespace-nowrap">Purchases</td>
                {hours.map((h) => {
                  const val = hourData[h]?.purchases || 0;
                  return (
                    <td key={h} className="px-0.5 py-0.5">
                      <div className={`rounded p-1 text-center text-[9px] font-medium ${getHeatColor(val, maxPurchases)}`}>
                        {val > 0 ? val : "-"}
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* CTR Row */}
              <tr>
                <td className="px-1 py-1 font-semibold text-gray-700 whitespace-nowrap">CTR %</td>
                {hours.map((h) => {
                  const clicks = hourData[h]?.clicks || 0;
                  const impr = hourData[h]?.impressions || 0;
                  const ctr = impr > 0 ? (clicks / impr) * 100 : 0;
                  return (
                    <td key={h} className="px-0.5 py-0.5">
                      <div className={`rounded p-1 text-center text-[9px] font-medium ${ctr > 1.5 ? "bg-green-300 text-gray-900" : ctr > 0 ? "bg-green-100 text-gray-700" : "bg-gray-50 text-gray-400"}`}>
                        {ctr > 0 ? ctr.toFixed(1) : "-"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection-Level Heatmap */}
      {collections.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">Purchases by Collection & Hour</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-1 py-1 text-left font-medium">Collection</th>
                  {hours.map((h) => (
                    <th key={h} className="px-1 py-1 text-center font-medium w-10">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collections.map((col) => {
                  const colMax = Math.max(...hours.map((h) => collHourData[col]?.[h]?.purchases || 0));
                  return (
                    <tr key={col}>
                      <td className="px-1 py-1 font-semibold text-gray-700 whitespace-nowrap">{col}</td>
                      {hours.map((h) => {
                        const val = collHourData[col]?.[h]?.purchases || 0;
                        return (
                          <td key={h} className="px-0.5 py-0.5">
                            <div className={`rounded p-1 text-center text-[9px] font-medium ${getHeatColor(val, colMax)}`}>
                              {val > 0 ? val : "-"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500">
            <span>Low</span>
            <div className="flex gap-0.5">
              <div className="h-3 w-6 rounded bg-gray-50" />
              <div className="h-3 w-6 rounded bg-green-100" />
              <div className="h-3 w-6 rounded bg-green-200" />
              <div className="h-3 w-6 rounded bg-green-300" />
              <div className="h-3 w-6 rounded bg-green-400" />
              <div className="h-3 w-6 rounded bg-green-600" />
            </div>
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}
