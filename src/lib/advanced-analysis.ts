// ===== Feature 1: Creative Fatigue Detection =====

export interface DayData {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  purchases: number;
  roas: number;
}

export interface AdDaily {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  campaign_id: string;
  adset_name: string;
  collection: string;
  daily_data: DayData[];
}

export interface FatigueAlert {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  collection: string;
  severity: "critical" | "warning" | "watch";
  signals: string[];
  ctr_trend: number; // percentage change
  frequency_current: number;
  frequency_trend: number;
  cpm_trend: number;
  days_running: number;
  recommendation: string;
  daily_data: DayData[];
}

export function detectFatigue(ads: AdDaily[]): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];

  for (const ad of ads) {
    const days = ad.daily_data;
    if (days.length < 3) continue;

    const signals: string[] = [];

    // Split into first half and second half
    const mid = Math.floor(days.length / 2);
    const firstHalf = days.slice(0, mid);
    const secondHalf = days.slice(mid);

    const avgCTR1 = avg(firstHalf.map((d) => d.ctr));
    const avgCTR2 = avg(secondHalf.map((d) => d.ctr));
    const ctrChange = avgCTR1 > 0 ? ((avgCTR2 - avgCTR1) / avgCTR1) * 100 : 0;

    const avgCPM1 = avg(firstHalf.map((d) => d.cpm));
    const avgCPM2 = avg(secondHalf.map((d) => d.cpm));
    const cpmChange = avgCPM1 > 0 ? ((avgCPM2 - avgCPM1) / avgCPM1) * 100 : 0;

    const latestFreq = days[days.length - 1].frequency;
    const avgFreq1 = avg(firstHalf.map((d) => d.frequency));
    const freqChange = avgFreq1 > 0 ? ((latestFreq - avgFreq1) / avgFreq1) * 100 : 0;

    // Signal detection
    if (ctrChange < -20) signals.push(`CTR dropped ${Math.abs(ctrChange).toFixed(0)}%`);
    if (ctrChange < -35) signals.push("Severe CTR decline");
    if (cpmChange > 25) signals.push(`CPM increased ${cpmChange.toFixed(0)}%`);
    if (latestFreq > 2.5) signals.push(`High frequency: ${latestFreq.toFixed(1)}`);
    if (latestFreq > 3.5) signals.push("Critical frequency level");
    if (freqChange > 30) signals.push(`Frequency rising fast: +${freqChange.toFixed(0)}%`);

    // Check purchase decline
    const purchases1 = firstHalf.reduce((s, d) => s + d.purchases, 0);
    const purchases2 = secondHalf.reduce((s, d) => s + d.purchases, 0);
    const spend2 = secondHalf.reduce((s, d) => s + d.spend, 0);
    if (purchases1 > 0 && purchases2 === 0 && spend2 > 200) {
      signals.push("Purchases stopped despite spend");
    }

    if (signals.length === 0) continue;

    // Determine severity
    let severity: "critical" | "warning" | "watch" = "watch";
    if (signals.length >= 3 || ctrChange < -35 || latestFreq > 3.5) severity = "critical";
    else if (signals.length >= 2 || ctrChange < -20 || latestFreq > 2.5) severity = "warning";

    // Recommendation
    let recommendation = "";
    if (severity === "critical") {
      recommendation = "Pause this ad immediately and replace with a fresh creative. Audience is fatigued.";
    } else if (severity === "warning") {
      recommendation = "Refresh the creative — try a new hook or visual. Consider duplicating with a new audience.";
    } else {
      recommendation = "Monitor closely. If CTR continues to drop, prepare a replacement creative.";
    }

    alerts.push({
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      campaign_name: ad.campaign_name,
      collection: ad.collection,
      severity,
      signals,
      ctr_trend: ctrChange,
      frequency_current: latestFreq,
      frequency_trend: freqChange,
      cpm_trend: cpmChange,
      days_running: days.length,
      recommendation,
      daily_data: days,
    });
  }

  return alerts.sort((a, b) => {
    const sev = { critical: 0, warning: 1, watch: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

// ===== Feature 2: Audience Overlap Detection =====

export interface OverlapAlert {
  campaign_a: string;
  campaign_b: string;
  collection_a: string;
  collection_b: string;
  overlap_score: number; // 0-100 estimated
  shared_signals: string[];
  wasted_spend_estimate: number;
  recommendation: string;
}

export function detectOverlap(ads: AdDaily[]): OverlapAlert[] {
  // Group by campaign
  const campaigns: Record<string, { name: string; collection: string; totalSpend: number; totalReach: number; avgCPM: number; avgFreq: number }> = {};

  for (const ad of ads) {
    if (!campaigns[ad.campaign_id]) {
      campaigns[ad.campaign_id] = {
        name: ad.campaign_name,
        collection: ad.collection,
        totalSpend: 0,
        totalReach: 0,
        avgCPM: 0,
        avgFreq: 0,
      };
    }
    const totalSpend = ad.daily_data.reduce((s, d) => s + d.spend, 0);
    const totalReach = ad.daily_data.reduce((s, d) => s + d.reach, 0);
    const avgCPM = avg(ad.daily_data.map((d) => d.cpm));
    const avgFreq = avg(ad.daily_data.map((d) => d.frequency));

    campaigns[ad.campaign_id].totalSpend += totalSpend;
    campaigns[ad.campaign_id].totalReach += totalReach;
    campaigns[ad.campaign_id].avgCPM = avgCPM;
    campaigns[ad.campaign_id].avgFreq = avgFreq;
  }

  const alerts: OverlapAlert[] = [];
  const campIds = Object.keys(campaigns);

  for (let i = 0; i < campIds.length; i++) {
    for (let j = i + 1; j < campIds.length; j++) {
      const a = campaigns[campIds[i]];
      const b = campaigns[campIds[j]];

      // Same collection = higher overlap risk
      const sameCollection = a.collection === b.collection;
      if (!sameCollection) continue; // Only flag same-collection overlap

      const signals: string[] = [];
      let overlapScore = 0;

      // High frequency in both = likely overlapping
      if (a.avgFreq > 1.8 && b.avgFreq > 1.8) {
        signals.push("Both campaigns have high frequency");
        overlapScore += 30;
      }

      // Similar CPM = similar audience
      const cpmDiff = Math.abs(a.avgCPM - b.avgCPM) / Math.max(a.avgCPM, b.avgCPM, 1);
      if (cpmDiff < 0.2) {
        signals.push("Very similar CPM — likely targeting same audience");
        overlapScore += 25;
      }

      // Same collection with significant spend in both
      if (a.totalSpend > 500 && b.totalSpend > 500) {
        signals.push("Both have significant spend in same collection");
        overlapScore += 20;
      }

      // Similar reach patterns
      if (a.totalReach > 0 && b.totalReach > 0) {
        const reachRatio = Math.min(a.totalReach, b.totalReach) / Math.max(a.totalReach, b.totalReach);
        if (reachRatio > 0.5) {
          signals.push("Similar reach volumes");
          overlapScore += 15;
        }
      }

      if (signals.length < 2 || overlapScore < 30) continue;

      const wastedEstimate = Math.min(a.totalSpend, b.totalSpend) * (overlapScore / 100) * 0.3;

      let recommendation = "";
      if (overlapScore >= 60) {
        recommendation = `Consider merging these campaigns or adding audience exclusions. Estimated ₹${wastedEstimate.toFixed(0)} wasted on overlap.`;
      } else {
        recommendation = `Monitor these campaigns. Add negative audience targeting if frequency keeps rising.`;
      }

      alerts.push({
        campaign_a: a.name,
        campaign_b: b.name,
        collection_a: a.collection,
        collection_b: b.collection,
        overlap_score: Math.min(100, overlapScore),
        shared_signals: signals,
        wasted_spend_estimate: wastedEstimate,
        recommendation,
      });
    }
  }

  return alerts.sort((a, b) => b.overlap_score - a.overlap_score).slice(0, 15);
}

// ===== Feature 3: Product-to-Ad Correlation =====

export interface ProductAdCorrelation {
  collection: string;
  format_breakdown: { format: string; ads: number; spend: number; purchases: number; roas: number; ctr: number }[];
  best_format: string;
  worst_format: string;
  insight: string;
}

export function computeProductAdCorrelation(
  ads: { collection: string; visual_format: string; spend: number; purchases: number; roas: number; ctr: number }[]
): ProductAdCorrelation[] {
  const collectionData: Record<string, Record<string, { ads: number; spend: number; purchases: number; roas: number[]; ctr: number[] }>> = {};

  for (const ad of ads) {
    if (!collectionData[ad.collection]) collectionData[ad.collection] = {};
    if (!collectionData[ad.collection][ad.visual_format]) {
      collectionData[ad.collection][ad.visual_format] = { ads: 0, spend: 0, purchases: 0, roas: [], ctr: [] };
    }
    const d = collectionData[ad.collection][ad.visual_format];
    d.ads++;
    d.spend += ad.spend;
    d.purchases += ad.purchases;
    if (ad.roas > 0) d.roas.push(ad.roas);
    if (ad.ctr > 0) d.ctr.push(ad.ctr);
  }

  return Object.entries(collectionData).map(([collection, formats]) => {
    const breakdown = Object.entries(formats).map(([format, d]) => ({
      format,
      ads: d.ads,
      spend: d.spend,
      purchases: d.purchases,
      roas: d.roas.length > 0 ? d.roas.reduce((a, b) => a + b, 0) / d.roas.length : 0,
      ctr: d.ctr.length > 0 ? d.ctr.reduce((a, b) => a + b, 0) / d.ctr.length : 0,
    })).sort((a, b) => b.roas - a.roas);

    const best = breakdown[0];
    const worst = breakdown[breakdown.length - 1];

    let insight = "";
    if (best && worst && breakdown.length > 1) {
      insight = `${best.format} is the best format for ${collection} with ${best.roas.toFixed(2)}x ROAS. `;
      if (worst.roas < best.roas * 0.5) {
        insight += `${worst.format} is underperforming — consider shifting budget to ${best.format}.`;
      } else {
        insight += `All formats are performing similarly — test new creative angles.`;
      }
    } else if (best) {
      insight = `Only using ${best.format} format — test other formats for comparison.`;
    }

    return {
      collection,
      format_breakdown: breakdown,
      best_format: best?.format || "N/A",
      worst_format: worst?.format || "N/A",
      insight,
    };
  });
}

// ===== Feature 4: Cohort Analysis (from Meta data) =====

export interface CohortData {
  collection: string;
  period: string;
  new_purchasers: number;
  total_spend: number;
  cost_per_new_customer: number;
  avg_roas: number;
  trend: "improving" | "stable" | "declining";
}

export function computeCohorts(ads: AdDaily[]): CohortData[] {
  // Group daily data by collection and week
  const collectionWeeks: Record<string, Record<string, { spend: number; purchases: number; roas: number[] }>> = {};

  for (const ad of ads) {
    for (const day of ad.daily_data) {
      const weekStart = getWeekStart(day.date);
      const key = ad.collection;
      if (!collectionWeeks[key]) collectionWeeks[key] = {};
      if (!collectionWeeks[key][weekStart]) collectionWeeks[key][weekStart] = { spend: 0, purchases: 0, roas: [] };
      collectionWeeks[key][weekStart].spend += day.spend;
      collectionWeeks[key][weekStart].purchases += day.purchases;
      if (day.roas > 0) collectionWeeks[key][weekStart].roas.push(day.roas);
    }
  }

  const cohorts: CohortData[] = [];

  for (const [collection, weeks] of Object.entries(collectionWeeks)) {
    const weekKeys = Object.keys(weeks).sort();

    for (let i = 0; i < weekKeys.length; i++) {
      const w = weeks[weekKeys[i]];
      const avgRoas = w.roas.length > 0 ? w.roas.reduce((a, b) => a + b, 0) / w.roas.length : 0;

      let trend: "improving" | "stable" | "declining" = "stable";
      if (i > 0) {
        const prevW = weeks[weekKeys[i - 1]];
        const prevRoas = prevW.roas.length > 0 ? prevW.roas.reduce((a, b) => a + b, 0) / prevW.roas.length : 0;
        if (avgRoas > prevRoas * 1.1) trend = "improving";
        else if (avgRoas < prevRoas * 0.9) trend = "declining";
      }

      cohorts.push({
        collection,
        period: weekKeys[i],
        new_purchasers: w.purchases,
        total_spend: w.spend,
        cost_per_new_customer: w.purchases > 0 ? w.spend / w.purchases : 0,
        avg_roas: avgRoas,
        trend,
      });
    }
  }

  return cohorts;
}

// ===== Feature 5: Spend Pacing =====

export interface SpendPacing {
  collection: string;
  daily_budget: number;
  today_spend: number;
  period_budget: number;
  period_spend: number;
  pacing_percent: number; // 100 = on track, >120 = overspending, <80 = underspending
  status: "over" | "on-track" | "under" | "critical";
  alert: string;
  daily_spends: { date: string; spend: number; budget: number }[];
}

export function computeSpendPacing(
  campaigns: { collection: string; daily_budget: number; spend: number }[],
  dailyAds: AdDaily[],
  numDays: number
): SpendPacing[] {
  // Sum budgets and spend by collection
  const collData: Record<string, { budget: number; spend: number }> = {};
  for (const c of campaigns) {
    if (!collData[c.collection]) collData[c.collection] = { budget: 0, spend: 0 };
    collData[c.collection].budget += c.daily_budget;
    collData[c.collection].spend += c.spend;
  }

  // Get daily spend by collection
  const dailyByCollection: Record<string, Record<string, number>> = {};
  for (const ad of dailyAds) {
    if (!dailyByCollection[ad.collection]) dailyByCollection[ad.collection] = {};
    for (const day of ad.daily_data) {
      dailyByCollection[ad.collection][day.date] = (dailyByCollection[ad.collection][day.date] || 0) + day.spend;
    }
  }

  return Object.entries(collData).map(([collection, d]) => {
    const periodBudget = d.budget * numDays;
    const pacingPct = periodBudget > 0 ? (d.spend / periodBudget) * 100 : 0;

    let status: "over" | "on-track" | "under" | "critical" = "on-track";
    let alert = "";

    if (pacingPct > 130) {
      status = "critical";
      alert = `${collection} is ${(pacingPct - 100).toFixed(0)}% OVER budget! Reduce spend immediately.`;
    } else if (pacingPct > 110) {
      status = "over";
      alert = `${collection} is slightly over budget by ${(pacingPct - 100).toFixed(0)}%. Monitor closely.`;
    } else if (pacingPct < 60) {
      status = "under";
      alert = `${collection} is underspending by ${(100 - pacingPct).toFixed(0)}%. Check ad delivery issues.`;
    } else if (pacingPct < 80) {
      status = "under";
      alert = `${collection} is slightly under budget. Ads may have delivery issues.`;
    } else {
      alert = `${collection} spend is on track.`;
    }

    const dailySpends = Object.entries(dailyByCollection[collection] || {})
      .map(([date, spend]) => ({ date, spend, budget: d.budget }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      collection,
      daily_budget: d.budget,
      today_spend: dailySpends.length > 0 ? dailySpends[dailySpends.length - 1].spend : 0,
      period_budget: periodBudget,
      period_spend: d.spend,
      pacing_percent: pacingPct,
      status,
      alert,
      daily_spends: dailySpends,
    };
  }).sort((a, b) => Math.abs(b.pacing_percent - 100) - Math.abs(a.pacing_percent - 100));
}

// ===== Feature 6: A/B Test Blueprint =====

export interface TestBlueprint {
  test_name: string;
  hypothesis: string;
  control: string;
  variant: string;
  collection: string;
  priority: "high" | "medium" | "low";
  expected_impact: string;
  budget_recommendation: string;
  based_on: string;
}

export function generateTestBlueprints(
  ads: { ad_name: string; collection: string; visual_format: string; spend: number; purchases: number; roas: number; ctr: number; primary_text: string; status: string }[],
  correlations: ProductAdCorrelation[]
): TestBlueprint[] {
  const blueprints: TestBlueprint[] = [];

  // 1. Format tests based on correlation gaps
  for (const corr of correlations) {
    if (corr.format_breakdown.length >= 2) {
      const best = corr.format_breakdown[0];
      const underused = corr.format_breakdown.find((f) => f.ads <= 2 && f.roas > 0);

      if (underused && underused.format !== best.format) {
        blueprints.push({
          test_name: `${corr.collection}: Scale ${underused.format}`,
          hypothesis: `${underused.format} shows ${underused.roas.toFixed(1)}x ROAS with only ${underused.ads} ads — more budget could scale results`,
          control: `Current ${best.format} ads`,
          variant: `New ${underused.format} ads with top-performing products`,
          collection: corr.collection,
          priority: "high",
          expected_impact: `Potential ${underused.roas.toFixed(1)}x ROAS at scale`,
          budget_recommendation: `₹${Math.round(best.spend * 0.2)}/day for 7 days`,
          based_on: `${underused.format} has ${underused.roas.toFixed(2)}x ROAS vs ${best.format}'s ${best.roas.toFixed(2)}x`,
        });
      }

      // Test format that's missing
      const allFormats = ["UGC", "Catalog", "Static", "Video", "Carousel"];
      const usedFormats = corr.format_breakdown.map((f) => f.format);
      const missingFormats = allFormats.filter((f) => !usedFormats.includes(f));

      for (const missing of missingFormats.slice(0, 1)) {
        blueprints.push({
          test_name: `${corr.collection}: Try ${missing}`,
          hypothesis: `${missing} format hasn't been tested for ${corr.collection} — could unlock new performance`,
          control: `Current best: ${best.format} (${best.roas.toFixed(1)}x ROAS)`,
          variant: `New ${missing} creative with best-selling products`,
          collection: corr.collection,
          priority: "medium",
          expected_impact: "Unknown — discovery test",
          budget_recommendation: `₹300/day for 5 days`,
          based_on: `${missing} not yet tested in ${corr.collection}`,
        });
      }
    }
  }

  // 2. Hook tests based on winning vs losing ads
  const collections = [...new Set(ads.map((a) => a.collection))];
  for (const collection of collections) {
    const collAds = ads.filter((a) => a.collection === collection && a.spend > 200);
    const winners = collAds.filter((a) => a.status === "winner" && a.primary_text);
    const losers = collAds.filter((a) => a.status === "underperforming" && a.primary_text);

    if (winners.length > 0 && losers.length > 0) {
      blueprints.push({
        test_name: `${collection}: Winning Hook on Weak Ads`,
        hypothesis: "Apply winning ad hooks to underperforming creatives",
        control: losers[0].ad_name,
        variant: `Same creative, replace hook with winning style from "${winners[0].ad_name}"`,
        collection,
        priority: "high",
        expected_impact: `Winners have ${avg(winners.map((w) => w.ctr)).toFixed(2)}% CTR vs losers' ${avg(losers.map((l) => l.ctr)).toFixed(2)}%`,
        budget_recommendation: `₹${Math.round(avg(winners.map((w) => w.spend)) * 0.3)}/day`,
        based_on: `CTR gap between winners and losers`,
      });
    }
  }

  // 3. Audience expansion for top performers
  const topAds = ads.filter((a) => a.status === "winner" && a.roas > 3).slice(0, 3);
  for (const ad of topAds) {
    blueprints.push({
      test_name: `Duplicate "${ad.ad_name.slice(0, 30)}..." to new audience`,
      hypothesis: "Top performer can scale with broader targeting",
      control: `Current targeting (${ad.roas.toFixed(1)}x ROAS)`,
      variant: "Broad audience or lookalike expansion",
      collection: ad.collection,
      priority: "high",
      expected_impact: `${ad.roas.toFixed(1)}x ROAS on current audience — expect 60-80% on new audience`,
      budget_recommendation: `₹${Math.round(ad.spend * 0.5)}/day for 7 days`,
      based_on: `${ad.roas.toFixed(2)}x ROAS with ${ad.purchases} purchases`,
    });
  }

  return blueprints.sort((a, b) => {
    const pri = { high: 0, medium: 1, low: 2 };
    return pri[a.priority] - pri[b.priority];
  });
}

// ===== Utilities =====

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}
