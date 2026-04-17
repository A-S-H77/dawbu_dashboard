"use client";

import type { CreativeInsightsSummary } from "@/lib/creative-analysis";

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export default function CreativeInsights({ insights }: { insights: CreativeInsightsSummary }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Best Creative Type */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Best Creative Type</p>
          <p className="mt-2 text-2xl font-bold text-purple-900">{insights.best_creative_type.type}</p>
          <p className="text-xs text-purple-600">Avg ROAS: {fmt(insights.best_creative_type.avg_roas, 2)}x</p>
        </div>

        {/* Highest ROAS Ad */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Highest ROAS Ad</p>
          {insights.highest_roas_ad ? (
            <>
              <p className="mt-2 truncate text-sm font-bold text-green-900" title={insights.highest_roas_ad.ad_name}>
                {insights.highest_roas_ad.ad_name}
              </p>
              <p className="text-xs text-green-600">
                ROAS: {fmt(insights.highest_roas_ad.roas, 2)}x &middot; Spend: ₹{fmt(insights.highest_roas_ad.spend, 0)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-green-600">No data</p>
          )}
        </div>

        {/* Lowest CTR Ad */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Lowest CTR Ad</p>
          {insights.lowest_ctr_ad ? (
            <>
              <p className="mt-2 truncate text-sm font-bold text-red-900" title={insights.lowest_ctr_ad.ad_name}>
                {insights.lowest_ctr_ad.ad_name}
              </p>
              <p className="text-xs text-red-600">
                CTR: {fmt(insights.lowest_ctr_ad.ctr, 2)}% &middot; Spend: ₹{fmt(insights.lowest_ctr_ad.spend, 0)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-red-600">No data</p>
          )}
        </div>

        {/* High Spend Low Purchase */}
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Wasted Spend Ads</p>
          <p className="mt-2 text-2xl font-bold text-orange-900">{insights.high_spend_low_purchase.length}</p>
          <p className="text-xs text-orange-600">High spend, weak purchases</p>
        </div>
      </div>

      {/* Top Winning Hooks */}
      {insights.top_winning_hooks.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Top Winning Hooks</h3>
          <div className="space-y-2">
            {insights.top_winning_hooks.map((hook, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2">
                <span className="flex-shrink-0 rounded-full bg-green-200 px-2 py-0.5 text-xs font-bold text-green-800">
                  #{i + 1}
                </span>
                <p className="text-xs text-gray-700">&ldquo;{hook}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Issues */}
      {insights.common_issues.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Common Issues in Low-Performing Ads</h3>
          <div className="space-y-2">
            {insights.common_issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                <span className="text-red-500 text-sm">!</span>
                <p className="text-xs text-red-700">{issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category-wise Patterns */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Category-wise Creative Patterns</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Best Format</th>
                <th className="px-3 py-2 text-right">Avg ROAS</th>
                <th className="px-3 py-2 text-right">Avg CTR</th>
                <th className="px-3 py-2">Top Ad</th>
              </tr>
            </thead>
            <tbody>
              {insights.category_patterns.map((p) => (
                <tr key={p.category} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{p.category}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">{p.best_type}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{fmt(p.avg_roas, 2)}x</td>
                  <td className="px-3 py-2 text-right">{fmt(p.avg_ctr, 2)}%</td>
                  <td className="px-3 py-2 max-w-[200px] truncate text-xs text-gray-600" title={p.top_ad}>{p.top_ad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Recommendations */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">Creative Test Recommendations</h3>
        <div className="space-y-2">
          {insights.test_recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                TEST
              </span>
              <p className="text-xs text-blue-900">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
