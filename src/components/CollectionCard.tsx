"use client";

import { useState } from "react";
import type { CollectionSummary } from "@/lib/collections";
import MetricCard from "./MetricCard";

const COLLECTION_COLORS: Record<string, string> = {
  "Building Blocks": "#3b82f6",
  Miniatures: "#8b5cf6",
  "Diamond Paintings": "#f59e0b",
  Diecast: "#10b981",
  Other: "#6b7280",
};

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export default function CollectionCard({ collection }: { collection: CollectionSummary }) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = COLLECTION_COLORS[collection.name] || "#6b7280";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `3px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: accentColor }} />
          <h2 className="text-xl font-bold text-gray-900">{collection.name}</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {collection.campaignCount} campaigns
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          {expanded ? "Hide Campaigns" : "Show Campaigns"}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <MetricCard label="Daily Budget" value={`₹${fmt(collection.totalDailyBudget)}`} color="blue" />
        <MetricCard label="Amount Spent" value={`₹${fmt(collection.totalSpend, 2)}`} color="orange" />
        <MetricCard label="Purchases" value={fmt(collection.totalPurchases)} color="green" />
        <MetricCard
          label="Cost per Purchase"
          value={`₹${fmt(collection.avgCPR, 2)}`}
          color="red"
        />
        <MetricCard label="ROAS" value={`${fmt(collection.avgROAS, 2)}x`} color="purple" />
        <MetricCard label="Reach" value={fmt(collection.totalReach)} color="cyan" />
        <MetricCard label="Impressions" value={fmt(collection.totalImpressions)} color="blue" />
        <MetricCard label="CPM" value={`₹${fmt(collection.avgCPM, 2)}`} color="orange" />
        <MetricCard label="Frequency" value={fmt(collection.avgFrequency, 2)} color="green" />
      </div>

      {/* Expanded Campaign Table */}
      {expanded && (
        <div className="overflow-x-auto border-t border-gray-100 px-5 pb-5">
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2 text-right">Budget/day</th>
                <th className="px-3 py-2 text-right">Spent</th>
                <th className="px-3 py-2 text-right">Purchases</th>
                <th className="px-3 py-2 text-right">CPR</th>
                <th className="px-3 py-2 text-right">ROAS</th>
                <th className="px-3 py-2 text-right">Reach</th>
                <th className="px-3 py-2 text-right">CPM</th>
              </tr>
            </thead>
            <tbody>
              {collection.campaigns.map((c) => (
                <tr key={c.campaign_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="max-w-[250px] truncate px-3 py-2 font-medium text-gray-800" title={c.campaign_name}>
                    {c.campaign_name}
                    {c.budget_source === "adset" && (
                      <span className="ml-1 text-[10px] text-gray-400">(adset)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">₹{fmt(c.daily_budget)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(c.spend, 2)}</td>
                  <td className="px-3 py-2 text-right">{c.purchases}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(c.cpr, 2)}</td>
                  <td className="px-3 py-2 text-right">{fmt(c.roas, 2)}x</td>
                  <td className="px-3 py-2 text-right">{fmt(c.reach)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(c.cpm, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
