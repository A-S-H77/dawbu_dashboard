"use client";

import { useState, useEffect, useCallback } from "react";
import { groupByCollection, type CampaignData, type CollectionSummary } from "@/lib/collections";
import CollectionCard from "./CollectionCard";
import SummaryChart from "./SummaryChart";
import MetricCard from "./MetricCard";
import CreativeDashboard from "./creative/CreativeDashboard";
import AdvancedDashboard from "./advanced/AdvancedDashboard";
import AudienceDashboard from "./audience/AudienceDashboard";

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

type Tab = "performance" | "creative" | "advanced" | "audience";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("performance");
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [until, setUntil] = useState(() => new Date().toISOString().split("T")[0]);
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta?since=${since}&until=${until}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const campaigns: CampaignData[] = data.campaigns;
      const grouped = groupByCollection(campaigns);
      setCollections(grouped);
      setFetchedAt(new Date(data.fetchedAt).toLocaleString("en-IN"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [since, until]);

  useEffect(() => {
    if (activeTab === "performance") {
      fetchData();
    }
  }, [fetchData, activeTab]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (activeTab === "performance") fetchData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData, activeTab]);

  // Totals
  const totalBudget = collections.reduce((s, c) => s + c.totalDailyBudget, 0);
  const totalSpend = collections.reduce((s, c) => s + c.totalSpend, 0);
  const totalPurchases = collections.reduce((s, c) => s + c.totalPurchases, 0);
  const totalCampaigns = collections.reduce((s, c) => s + c.campaignCount, 0);
  const overallCPR = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const overallROAS =
    totalSpend > 0
      ? collections.reduce((s, c) => s + c.avgROAS * c.totalSpend, 0) / totalSpend
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dawbu Ads Dashboard</h1>
              <p className="text-xs text-gray-500">Collection-wise Meta Ads Performance</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  autoRefresh
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </button>
              {/* Manual refresh */}
              {activeTab === "performance" && (
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-3 flex gap-1 border-t border-gray-100 pt-2">
            <button
              onClick={() => setActiveTab("performance")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "performance"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Collection Performance
            </button>
            <button
              onClick={() => setActiveTab("creative")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "creative"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Creative Analysis
            </button>
            <button
              onClick={() => setActiveTab("advanced")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "advanced"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Advanced Analytics
            </button>
            <button
              onClick={() => setActiveTab("audience")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "audience"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Audience Intelligence
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* ============ PERFORMANCE TAB ============ */}
        {activeTab === "performance" && (
          <>
            {/* Error */}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                <p className="font-semibold">Error fetching data</p>
                <p className="mt-1">{error}</p>
                {error.includes("credentials") && (
                  <p className="mt-2 text-xs">
                    Set <code className="rounded bg-red-100 px-1">META_ACCESS_TOKEN</code> and{" "}
                    <code className="rounded bg-red-100 px-1">META_AD_ACCOUNT_ID</code> in your{" "}
                    <code className="rounded bg-red-100 px-1">.env.local</code> file.
                  </p>
                )}
              </div>
            )}

            {/* Overall Summary */}
            {!loading && collections.length > 0 && (
              <>
                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <MetricCard label="Total Daily Budget" value={`₹${fmt(totalBudget)}`} color="blue" />
                  <MetricCard label="Total Spend" value={`₹${fmt(totalSpend, 2)}`} color="orange" />
                  <MetricCard label="Total Purchases" value={fmt(totalPurchases)} color="green" />
                  <MetricCard label="Overall CPR" value={`₹${fmt(overallCPR, 2)}`} color="red" />
                  <MetricCard label="Overall ROAS" value={`${fmt(overallROAS, 2)}x`} color="purple" />
                  <MetricCard label="Total Campaigns" value={`${totalCampaigns}`} color="cyan" />
                </div>

                {/* Charts */}
                <div className="mb-6">
                  <SummaryChart collections={collections} />
                </div>

                {/* Collection Cards */}
                <div className="space-y-6">
                  {collections.map((c) => (
                    <CollectionCard key={c.name} collection={c} />
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-gray-400">
                  Last updated: {fetchedAt} &middot; Data from Meta Marketing API &middot;{" "}
                  {since} to {until}
                </div>
              </>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  <p className="text-sm text-gray-500">Fetching data from Meta...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ CREATIVE ANALYSIS TAB ============ */}
        {activeTab === "creative" && (
          <CreativeDashboard since={since} until={until} />
        )}

        {/* ============ ADVANCED ANALYTICS TAB ============ */}
        {activeTab === "advanced" && (
          <AdvancedDashboard since={since} until={until} />
        )}

        {/* ============ AUDIENCE INTELLIGENCE TAB ============ */}
        {activeTab === "audience" && (
          <AudienceDashboard since={since} until={until} />
        )}
      </main>
    </div>
  );
}
