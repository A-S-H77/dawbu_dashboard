"use client";

import type { AdWithAnalysis } from "@/lib/creative-analysis";

interface FilterState {
  search: string;
  collection: string;
  creativeType: string;
  campaign: string;
  adset: string;
  status: string;
}

interface CreativeFiltersProps {
  ads: AdWithAnalysis[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export type { FilterState };

export default function CreativeFilters({ ads, filters, onFilterChange }: CreativeFiltersProps) {
  const collections = [...new Set(ads.map((a) => a.collection))].sort();
  const campaigns = [...new Set(ads.map((a) => a.campaign_name))].sort();
  const adsets = [...new Set(ads.map((a) => a.adset_name))].sort();
  const types = [...new Set(ads.map((a) => a.creative_type))].sort();
  const statuses = [...new Set(ads.map((a) => a.analysis.status))].sort();

  const update = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search ad name..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Collection */}
        <select
          value={filters.collection}
          onChange={(e) => update("collection", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Creative Type */}
        <select
          value={filters.creativeType}
          onChange={(e) => update("creativeType", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Campaign */}
        <select
          value={filters.campaign}
          onChange={(e) => update("campaign", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm max-w-[200px]"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Ad Set */}
        <select
          value={filters.adset}
          onChange={(e) => update("adset", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm max-w-[200px]"
        >
          <option value="">All Ad Sets</option>
          {adsets.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Clear */}
        <button
          onClick={() =>
            onFilterChange({ search: "", collection: "", creativeType: "", campaign: "", adset: "", status: "" })
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function applyFilters(ads: AdWithAnalysis[], filters: FilterState): AdWithAnalysis[] {
  return ads.filter((ad) => {
    if (filters.search && !ad.ad_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.collection && ad.collection !== filters.collection) return false;
    if (filters.creativeType && ad.creative_type !== filters.creativeType) return false;
    if (filters.campaign && ad.campaign_name !== filters.campaign) return false;
    if (filters.adset && ad.adset_name !== filters.adset) return false;
    if (filters.status && ad.analysis.status !== filters.status) return false;
    return true;
  });
}
