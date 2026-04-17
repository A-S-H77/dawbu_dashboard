"use client";

import { useState } from "react";
import type { AdWithAnalysis } from "@/lib/creative-analysis";

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70 ? "bg-green-100 text-green-700" :
    score >= 40 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{score}</div>
      <span className="mt-0.5 text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    winner: "bg-green-100 text-green-800 border-green-300",
    promising: "bg-blue-100 text-blue-800 border-blue-300",
    average: "bg-yellow-100 text-yellow-800 border-yellow-300",
    underperforming: "bg-red-100 text-red-800 border-red-300",
    new: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] || styles.new}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    UGC: "bg-purple-100 text-purple-700",
    Catalog: "bg-blue-100 text-blue-700",
    Static: "bg-gray-100 text-gray-700",
    Video: "bg-orange-100 text-orange-700",
    Carousel: "bg-cyan-100 text-cyan-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[type] || styles.Static}`}>
      {type}
    </span>
  );
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-200">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CreativeCard({ ad }: { ad: AdWithAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  const a = ad.analysis;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Top row: thumbnail + key info */}
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {ad.thumbnail_url ? (
            <img
              src={ad.thumbnail_url}
              alt={ad.ad_name}
              className="h-24 w-24 rounded-lg object-cover bg-gray-100"
              onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).className = "h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center"; }}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
              No preview
            </div>
          )}
          <div className="mt-1 flex items-center justify-center gap-1">
            <TypeBadge type={a.visual_format} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900" title={ad.ad_name}>
                {ad.ad_name}
              </h3>
              <p className="truncate text-xs text-gray-500" title={ad.campaign_name}>
                {ad.campaign_name}
              </p>
              <p className="truncate text-[11px] text-gray-400" title={ad.adset_name}>
                {ad.adset_name}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={a.status} />
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{ad.collection}</span>
            </div>
          </div>

          {/* Metrics row */}
          <div className="mt-3 grid grid-cols-4 gap-2 text-center md:grid-cols-8">
            <div>
              <p className="text-[10px] text-gray-500">Spend</p>
              <p className="text-xs font-bold">₹{fmt(ad.spend, 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Impressions</p>
              <p className="text-xs font-bold">{fmt(ad.impressions)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">CTR</p>
              <p className="text-xs font-bold">{fmt(ad.ctr, 2)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">CPC</p>
              <p className="text-xs font-bold">₹{fmt(ad.cpc, 2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">CPM</p>
              <p className="text-xs font-bold">₹{fmt(ad.cpm, 1)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Purchases</p>
              <p className="text-xs font-bold">{ad.purchases}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">ROAS</p>
              <p className="text-xs font-bold">{fmt(ad.roas, 2)}x</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">Freq</p>
              <p className="text-xs font-bold">{fmt(ad.frequency, 2)}</p>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="flex flex-shrink-0 flex-col items-center justify-center px-2">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${
            a.overall >= 70 ? "border-green-400 text-green-700" :
            a.overall >= 40 ? "border-yellow-400 text-yellow-700" :
            "border-red-400 text-red-700"
          }`}>
            <span className="text-lg font-bold">{a.overall}</span>
          </div>
          <span className="mt-1 text-[10px] text-gray-500">Score</span>
        </div>
      </div>

      {/* Score bars */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex gap-4">
          <ScoreBadge score={a.hook_strength} label="Hook" />
          <ScoreBadge score={a.product_visibility} label="Product" />
          <ScoreBadge score={a.offer_clarity} label="Offer" />
          <ScoreBadge score={a.cta_clarity} label="CTA" />
          <ScoreBadge score={a.scroll_stopping} label="Scroll Stop" />
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full border-t border-gray-100 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
      >
        {expanded ? "Hide Analysis" : "Show Full Analysis"}
      </button>

      {/* Expanded Analysis */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
          {/* Score details */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Hook Strength</p>
              <ScoreBar value={a.hook_strength} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Product Visibility</p>
              <ScoreBar value={a.product_visibility} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Offer Clarity</p>
              <ScoreBar value={a.offer_clarity} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">CTA Clarity</p>
              <ScoreBar value={a.cta_clarity} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Scroll-Stopping Potential</p>
              <ScoreBar value={a.scroll_stopping} />
            </div>
          </div>

          {/* Primary Text */}
          {ad.primary_text && (
            <div>
              <p className="text-xs font-semibold text-gray-700">Primary Text / Hook</p>
              <p className="mt-1 rounded-lg bg-white p-2 text-xs text-gray-600 border border-gray-200">
                {ad.primary_text.length > 300 ? ad.primary_text.slice(0, 300) + "..." : ad.primary_text}
              </p>
            </div>
          )}

          {/* AI Analysis */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-green-50 p-3 border border-green-100">
              <p className="text-xs font-semibold text-green-800">Why This May Be Working</p>
              <p className="mt-1 text-xs text-green-700">{a.why_working}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 border border-red-100">
              <p className="text-xs font-semibold text-red-800">Why This May Be Underperforming</p>
              <p className="mt-1 text-xs text-red-700">{a.why_underperforming}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-800">Suggested Improvement</p>
              <p className="mt-1 text-xs text-blue-700">{a.suggested_improvement}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 border border-purple-100">
              <p className="text-xs font-semibold text-purple-800">Suggested Next Test</p>
              <p className="mt-1 text-xs text-purple-700">{a.suggested_next_test}</p>
            </div>
          </div>

          {/* Video Analysis */}
          {ad.creative_type === "video" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-xs font-bold text-orange-800 mb-2">Video Analysis</p>
              <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                <div>
                  <span className="font-medium text-gray-700">Length: </span>
                  <span className="text-gray-600">{ad.video_length > 0 ? `${ad.video_length}s` : "Unknown"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Hook (first 3s): </span>
                  <span className="text-gray-600">{a.video_hook_analysis}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Pacing: </span>
                  <span className="text-gray-600">{a.video_pacing}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Product Timing: </span>
                  <span className="text-gray-600">{a.product_shown_timing}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">CTA Timing: </span>
                  <span className="text-gray-600">{a.cta_timing}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Subtitles: </span>
                  <span className="text-gray-600">{a.has_subtitles}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
