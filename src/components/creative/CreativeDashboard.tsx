"use client";

import { useState, useEffect, useCallback } from "react";
import { analyzeCreatives, type AdWithAnalysis, type CreativeInsightsSummary } from "@/lib/creative-analysis";
import type { AdCreativeData } from "@/app/api/meta/creatives/route";
import CreativeFilters, { applyFilters, type FilterState } from "./CreativeFilters";
import CreativeCard from "./CreativeCard";
import CreativeInsights from "./CreativeInsights";
import TopAdsTable from "./TopAdsTable";

interface CreativeDashboardProps {
  since: string;
  until: string;
}

type ViewMode = "insights" | "all" | "winners" | "losers";

export default function CreativeDashboard({ since, until }: CreativeDashboardProps) {
  const [allAds, setAllAds] = useState<AdWithAnalysis[]>([]);
  const [insights, setInsights] = useState<CreativeInsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("insights");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    collection: "",
    creativeType: "",
    campaign: "",
    adset: "",
    status: "",
  });
  const [sortBy, setSortBy] = useState<"score" | "spend" | "roas" | "ctr" | "purchases">("score");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/creatives?since=${since}&until=${until}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const ads: AdCreativeData[] = data.ads;
      const { analyzed, insights: ins } = analyzeCreatives(ads);
      setAllAds(analyzed);
      setInsights(ins);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch creative data");
    } finally {
      setLoading(false);
    }
  }, [since, until]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters and sorting
  const filteredAds = applyFilters(allAds, filters);
  const sortedAds = [...filteredAds].sort((a, b) => {
    switch (sortBy) {
      case "score": return b.analysis.overall - a.analysis.overall;
      case "spend": return b.spend - a.spend;
      case "roas": return b.roas - a.roas;
      case "ctr": return b.ctr - a.ctr;
      case "purchases": return b.purchases - a.purchases;
      default: return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="text-sm text-gray-500">Analyzing creatives from Meta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <p className="font-semibold">Error fetching creative data</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["insights", "all", "winners", "losers"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === mode
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {mode === "insights" && "Insights"}
              {mode === "all" && `All Ads (${allAds.length})`}
              {mode === "winners" && `Winners (${allAds.filter((a) => a.analysis.status === "winner").length})`}
              {mode === "losers" && `Needs Work (${allAds.filter((a) => a.analysis.status === "underperforming").length})`}
            </button>
          ))}
        </div>

        {/* Sort (only for all/winners/losers views) */}
        {viewMode !== "insights" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="score">Score</option>
              <option value="spend">Spend</option>
              <option value="roas">ROAS</option>
              <option value="ctr">CTR</option>
              <option value="purchases">Purchases</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Filters (for non-insights views) */}
      {viewMode !== "insights" && (
        <CreativeFilters ads={allAds} filters={filters} onFilterChange={setFilters} />
      )}

      {/* INSIGHTS VIEW */}
      {viewMode === "insights" && insights && (
        <div className="space-y-6">
          <CreativeInsights insights={insights} />

          {/* Top 10 Winners */}
          {insights.top_10_winners.length > 0 && (
            <TopAdsTable
              title="Top 10 Winning Ads"
              ads={insights.top_10_winners}
              variant="winners"
            />
          )}

          {/* Bottom 10 */}
          {insights.bottom_10.length > 0 && (
            <TopAdsTable
              title="Bottom 10 — Needs Improvement"
              ads={insights.bottom_10}
              variant="losers"
            />
          )}

          {/* High Spend Low Purchase detail */}
          {insights.high_spend_low_purchase.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-orange-50 px-5 py-3">
                <h3 className="text-sm font-semibold text-orange-800">
                  Wasted Spend — High Budget, Weak Conversions
                </h3>
                <p className="text-xs text-orange-600 mt-0.5">Consider pausing or refreshing these ads</p>
              </div>
              <div className="p-4 space-y-3">
                {insights.high_spend_low_purchase.map((ad) => (
                  <CreativeCard key={ad.ad_id} ad={ad} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALL ADS VIEW */}
      {viewMode === "all" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{sortedAds.length} ads</p>
          {sortedAds.map((ad) => (
            <CreativeCard key={ad.ad_id} ad={ad} />
          ))}
          {sortedAds.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-400">No ads match your filters</p>
          )}
        </div>
      )}

      {/* WINNERS VIEW */}
      {viewMode === "winners" && (
        <div className="space-y-3">
          {sortedAds.filter((a) => a.analysis.status === "winner" || a.analysis.status === "promising").length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No winning ads found in this period</p>
          ) : (
            sortedAds
              .filter((a) => a.analysis.status === "winner" || a.analysis.status === "promising")
              .map((ad) => <CreativeCard key={ad.ad_id} ad={ad} />)
          )}
        </div>
      )}

      {/* LOSERS VIEW */}
      {viewMode === "losers" && (
        <div className="space-y-3">
          {sortedAds.filter((a) => a.analysis.status === "underperforming").length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No underperforming ads found</p>
          ) : (
            sortedAds
              .filter((a) => a.analysis.status === "underperforming")
              .map((ad) => <CreativeCard key={ad.ad_id} ad={ad} />)
          )}
        </div>
      )}
    </div>
  );
}
