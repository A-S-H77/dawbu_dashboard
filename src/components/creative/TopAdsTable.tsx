"use client";

import type { AdWithAnalysis } from "@/lib/creative-analysis";

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = {
    winner: "bg-green-500",
    promising: "bg-blue-500",
    average: "bg-yellow-500",
    underperforming: "bg-red-500",
    new: "bg-gray-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${color[status] || color.new}`} />;
}

interface TopAdsTableProps {
  title: string;
  ads: AdWithAnalysis[];
  variant: "winners" | "losers";
}

export default function TopAdsTable({ title, ads, variant }: TopAdsTableProps) {
  const borderColor = variant === "winners" ? "border-green-200" : "border-red-200";
  const headerBg = variant === "winners" ? "bg-green-50" : "bg-red-50";
  const headerText = variant === "winners" ? "text-green-800" : "text-red-800";

  return (
    <div className={`rounded-xl border ${borderColor} bg-white shadow-sm overflow-hidden`}>
      <div className={`px-5 py-3 ${headerBg}`}>
        <h3 className={`text-sm font-semibold ${headerText}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 w-8">#</th>
              <th className="px-3 py-2">Ad Name</th>
              <th className="px-3 py-2">Collection</th>
              <th className="px-3 py-2">Format</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Spend</th>
              <th className="px-3 py-2 text-right">Purchases</th>
              <th className="px-3 py-2 text-right">ROAS</th>
              <th className="px-3 py-2 text-right">CTR</th>
              <th className="px-3 py-2 text-right">CPR</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad, i) => (
              <tr key={ad.ad_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 max-w-[200px]">
                  <p className="truncate text-xs font-medium text-gray-800" title={ad.ad_name}>{ad.ad_name}</p>
                  <p className="truncate text-[10px] text-gray-400" title={ad.campaign_name}>{ad.campaign_name}</p>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{ad.collection}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] text-gray-600">{ad.analysis.visual_format}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-bold text-xs ${
                    ad.analysis.overall >= 70 ? "text-green-600" :
                    ad.analysis.overall >= 40 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {ad.analysis.overall}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-xs">₹{fmt(ad.spend, 0)}</td>
                <td className="px-3 py-2 text-right text-xs">{ad.purchases}</td>
                <td className="px-3 py-2 text-right text-xs font-medium">{fmt(ad.roas, 2)}x</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(ad.ctr, 2)}%</td>
                <td className="px-3 py-2 text-right text-xs">
                  {ad.cost_per_purchase > 0 ? `₹${fmt(ad.cost_per_purchase, 0)}` : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <StatusDot status={ad.analysis.status} />
                    <span className="text-[10px] text-gray-600">
                      {ad.analysis.status.charAt(0).toUpperCase() + ad.analysis.status.slice(1)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
