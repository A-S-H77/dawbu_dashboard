"use client";

import { useState, useEffect, useCallback } from "react";
import {
  detectFatigue,
  detectOverlap,
  computeProductAdCorrelation,
  computeCohorts,
  computeSpendPacing,
  generateTestBlueprints,
  type AdDaily,
  type FatigueAlert,
  type OverlapAlert,
  type ProductAdCorrelation,
  type CohortData,
  type SpendPacing,
  type TestBlueprint,
} from "@/lib/advanced-analysis";
import { analyzeCreatives } from "@/lib/creative-analysis";
import type { AdCreativeData } from "@/app/api/meta/creatives/route";
import FatigueSection from "./FatigueSection";
import OverlapSection from "./OverlapSection";
import CorrelationSection from "./CorrelationSection";
import CohortSection from "./CohortSection";
import PacingSection from "./PacingSection";
import TestBlueprintSection from "./TestBlueprintSection";
import HeatmapSection from "./HeatmapSection";

interface AdvancedDashboardProps {
  since: string;
  until: string;
}

type Section = "fatigue" | "overlap" | "correlation" | "cohort" | "pacing" | "tests" | "heatmap";

export default function AdvancedDashboard({ since, until }: AdvancedDashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>("fatigue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [fatigueAlerts, setFatigueAlerts] = useState<FatigueAlert[]>([]);
  const [overlapAlerts, setOverlapAlerts] = useState<OverlapAlert[]>([]);
  const [correlations, setCorrelations] = useState<ProductAdCorrelation[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [pacing, setPacing] = useState<SpendPacing[]>([]);
  const [testBlueprints, setTestBlueprints] = useState<TestBlueprint[]>([]);
  const [hourlyData, setHourlyData] = useState<{ accountHours: HourStat[]; collectionHours: CollectionHour[] }>({ accountHours: [], collectionHours: [] });

  // Alert counts for nav badges
  const criticalFatigue = fatigueAlerts.filter((a) => a.severity === "critical").length;
  const highOverlap = overlapAlerts.filter((a) => a.overlap_score >= 50).length;
  const pacingIssues = pacing.filter((p) => p.status !== "on-track").length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch daily breakdown, creatives, campaigns, and hourly in parallel
      const [dailyRes, creativeRes, campaignRes, hourlyRes] = await Promise.all([
        fetch(`/api/meta/daily-breakdown?since=${since}&until=${until}`),
        fetch(`/api/meta/creatives?since=${since}&until=${until}`),
        fetch(`/api/meta?since=${since}&until=${until}`),
        fetch(`/api/meta/hourly?since=${since}&until=${until}`),
      ]);

      const dailyData = await dailyRes.json();
      const creativeData = await creativeRes.json();
      const campaignData = await campaignRes.json();
      const hourlyDataRes = await hourlyRes.json();

      if (dailyData.error) throw new Error(dailyData.error);
      if (creativeData.error) throw new Error(creativeData.error);

      const dailyAds: AdDaily[] = dailyData.ads || [];
      const creativeAds: AdCreativeData[] = creativeData.ads || [];
      const campaigns = campaignData.campaigns || [];

      // Analyze creatives for format info
      const { analyzed } = analyzeCreatives(creativeAds);

      // Compute number of days in range
      const d1 = new Date(since);
      const d2 = new Date(until);
      const numDays = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      // Feature 1: Fatigue detection
      setFatigueAlerts(detectFatigue(dailyAds));

      // Feature 2: Overlap detection
      setOverlapAlerts(detectOverlap(dailyAds));

      // Feature 3: Product-to-Ad correlation
      const corrData = analyzed.map((a) => ({
        collection: a.collection,
        visual_format: a.analysis.visual_format,
        spend: a.spend,
        purchases: a.purchases,
        roas: a.roas,
        ctr: a.ctr,
      }));
      const corrs = computeProductAdCorrelation(corrData);
      setCorrelations(corrs);

      // Feature 4: Cohorts
      setCohorts(computeCohorts(dailyAds));

      // Feature 5: Spend pacing
      const pacingData = campaigns.map((c: Record<string, unknown>) => ({
        collection: c.collection as string,
        daily_budget: (c.daily_budget as number) || 0,
        spend: (c.spend as number) || 0,
      }));
      setPacing(computeSpendPacing(pacingData, dailyAds, numDays));

      // Feature 6: Test blueprints
      const testData = analyzed.map((a) => ({
        ad_name: a.ad_name,
        collection: a.collection,
        visual_format: a.analysis.visual_format,
        spend: a.spend,
        purchases: a.purchases,
        roas: a.roas,
        ctr: a.ctr,
        primary_text: a.primary_text,
        status: a.analysis.status,
      }));
      setTestBlueprints(generateTestBlueprints(testData, corrs));

      // Feature 7: Hourly data
      setHourlyData({
        accountHours: hourlyDataRes.accountHours || [],
        collectionHours: hourlyDataRes.collectionHours || [],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [since, until]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sections: { key: Section; label: string; badge?: number; badgeColor?: string }[] = [
    { key: "fatigue", label: "Fatigue Detection", badge: criticalFatigue, badgeColor: "bg-red-500" },
    { key: "overlap", label: "Overlap Alerts", badge: highOverlap, badgeColor: "bg-orange-500" },
    { key: "pacing", label: "Spend Pacing", badge: pacingIssues, badgeColor: "bg-yellow-500" },
    { key: "correlation", label: "Product-Ad Matrix" },
    { key: "cohort", label: "Cohort Analysis" },
    { key: "tests", label: "Test Blueprints", badge: testBlueprints.length, badgeColor: "bg-blue-500" },
    { key: "heatmap", label: "Day/Hour Heatmap" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-gray-500">Analyzing ad performance deeply...</p>
          <p className="mt-1 text-xs text-gray-400">Fatigue, overlap, pacing, correlations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <p className="font-semibold">Error loading advanced analytics</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === s.key
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s.label}
            {s.badge !== undefined && s.badge > 0 && (
              <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${s.badgeColor}`}>
                {s.badge}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={fetchData}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Refresh
        </button>
      </div>

      {/* Sections */}
      {activeSection === "fatigue" && <FatigueSection alerts={fatigueAlerts} />}
      {activeSection === "overlap" && <OverlapSection alerts={overlapAlerts} />}
      {activeSection === "correlation" && <CorrelationSection correlations={correlations} />}
      {activeSection === "cohort" && <CohortSection cohorts={cohorts} />}
      {activeSection === "pacing" && <PacingSection pacing={pacing} />}
      {activeSection === "tests" && <TestBlueprintSection blueprints={testBlueprints} />}
      {activeSection === "heatmap" && <HeatmapSection accountHours={hourlyData.accountHours} collectionHours={hourlyData.collectionHours} />}
    </div>
  );
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
