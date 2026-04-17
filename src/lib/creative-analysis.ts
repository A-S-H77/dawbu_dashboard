import type { AdCreativeData } from "@/app/api/meta/creatives/route";

// --- Scoring types ---

export interface CreativeScore {
  overall: number; // 0-100
  hook_strength: number;
  product_visibility: number;
  offer_clarity: number;
  cta_clarity: number;
  scroll_stopping: number;
  visual_format: "UGC" | "Catalog" | "Static" | "Video" | "Carousel";
  status: "winner" | "promising" | "average" | "underperforming" | "new";
  why_working: string;
  why_underperforming: string;
  suggested_improvement: string;
  suggested_next_test: string;
  // Video-specific
  video_hook_analysis: string;
  video_pacing: string;
  product_shown_timing: string;
  cta_timing: string;
  has_subtitles: "likely" | "unlikely" | "unknown";
  has_audio: "likely" | "unlikely" | "unknown";
}

export interface AdWithAnalysis extends AdCreativeData {
  analysis: CreativeScore;
}

export interface CreativeInsightsSummary {
  best_creative_type: { type: string; avg_roas: number };
  highest_roas_ad: AdWithAnalysis | null;
  lowest_ctr_ad: AdWithAnalysis | null;
  high_spend_low_purchase: AdWithAnalysis[];
  top_winning_hooks: string[];
  common_issues: string[];
  top_10_winners: AdWithAnalysis[];
  bottom_10: AdWithAnalysis[];
  category_patterns: { category: string; best_type: string; avg_roas: number; avg_ctr: number; top_ad: string }[];
  test_recommendations: string[];
}

// --- Analysis engine ---

function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= value).length;
  return Math.round((rank / sorted.length) * 100);
}

function scoreFromPercentile(percentile: number): number {
  // Convert 0-100 percentile to a 0-100 score
  return Math.min(100, Math.max(0, percentile));
}

function classifyVisualFormat(ad: AdCreativeData): "UGC" | "Catalog" | "Static" | "Video" | "Carousel" {
  const name = (ad.ad_name + " " + ad.campaign_name).toLowerCase();

  if (ad.creative_type === "carousel") return "Carousel";

  // Check for catalog indicators
  if (name.includes("catalog") || name.includes("dpa") || name.includes("adv+") || name.includes("adv_")) {
    return "Catalog";
  }

  // Check for UGC indicators
  if (name.includes("ugc") || name.includes("influe") || name.includes("creator") || name.includes("china")) {
    if (ad.creative_type === "video") return "UGC";
    return "UGC";
  }

  if (name.includes("static")) return "Static";
  if (ad.creative_type === "video") return "Video";
  if (ad.creative_type === "image") return "Static";

  return "Static";
}

function determineStatus(
  ad: AdCreativeData,
  avgROAS: number,
  avgCTR: number
): "winner" | "promising" | "average" | "underperforming" | "new" {
  // New ads with low spend
  if (ad.spend < 200) return "new";

  const roasRatio = avgROAS > 0 ? ad.roas / avgROAS : 0;
  const ctrRatio = avgCTR > 0 ? ad.ctr / avgCTR : 0;

  if (roasRatio >= 1.3 && ad.purchases >= 3) return "winner";
  if (roasRatio >= 1.0 && ctrRatio >= 0.9) return "promising";
  if (roasRatio >= 0.7) return "average";
  return "underperforming";
}

function analyzeWhyWorking(ad: AdCreativeData, avgROAS: number, avgCTR: number, avgCPR: number): string {
  const reasons: string[] = [];

  if (ad.roas > avgROAS * 1.3) reasons.push("ROAS significantly above average");
  if (ad.ctr > avgCTR * 1.2) reasons.push("Strong click-through rate");
  if (ad.cost_per_purchase > 0 && ad.cost_per_purchase < avgCPR * 0.8) reasons.push("Very efficient cost per purchase");
  if (ad.purchases >= 10) reasons.push("Strong purchase volume");
  if (ad.frequency < 1.5) reasons.push("Low frequency — fresh audience");

  const format = classifyVisualFormat(ad);
  if (format === "UGC") reasons.push("UGC format tends to build trust");
  if (format === "Catalog") reasons.push("Catalog ads show relevant products dynamically");

  if (ad.primary_text && ad.primary_text.length > 50) reasons.push("Detailed primary text hooks attention");

  return reasons.length > 0 ? reasons.join(". ") + "." : "Insufficient data to determine.";
}

function analyzeWhyUnderperforming(ad: AdCreativeData, avgROAS: number, avgCTR: number, avgCPR: number): string {
  const reasons: string[] = [];

  if (ad.roas < avgROAS * 0.5 && ad.spend > 500) reasons.push("ROAS well below average despite significant spend");
  if (ad.ctr < avgCTR * 0.7 && ad.impressions > 5000) reasons.push("Low CTR — creative may not be attention-grabbing");
  if (ad.cost_per_purchase > avgCPR * 1.5 && ad.purchases > 0) reasons.push("High cost per purchase");
  if (ad.purchases === 0 && ad.spend > 300) reasons.push("No purchases despite spend — check targeting or landing page");
  if (ad.frequency > 2.5) reasons.push("High frequency — audience fatigue likely");
  if (ad.cpm > 100) reasons.push("High CPM — audience may be too narrow");

  if (!ad.primary_text || ad.primary_text.length < 20) reasons.push("Weak or missing primary text");
  if (!ad.cta_type) reasons.push("No clear CTA set");

  return reasons.length > 0 ? reasons.join(". ") + "." : "Performance is within acceptable range.";
}

function suggestImprovement(ad: AdCreativeData, avgCTR: number, avgROAS: number): string {
  const suggestions: string[] = [];

  if (ad.ctr < avgCTR * 0.8) {
    suggestions.push("Test a stronger opening hook — first 3 seconds need to stop the scroll");
    if (ad.creative_type === "image") suggestions.push("Try a video version of this ad");
  }

  if (ad.ctr > avgCTR * 1.2 && ad.roas < avgROAS * 0.7) {
    suggestions.push("Good CTR but low ROAS — check landing page experience and offer clarity");
  }

  if (ad.frequency > 2.0) {
    suggestions.push("Refresh the creative — audience is seeing it too often");
  }

  if (!ad.primary_text || ad.primary_text.length < 30) {
    suggestions.push("Add a compelling primary text with a clear hook and benefit");
  }

  const format = classifyVisualFormat(ad);
  if (format === "Static") suggestions.push("Test a UGC or video version for higher engagement");
  if (format === "Catalog" && ad.roas < avgROAS) suggestions.push("Improve product images or try curated collections");

  return suggestions.length > 0 ? suggestions.join(". ") + "." : "Maintain current creative — performance is solid.";
}

function suggestNextTest(ad: AdCreativeData): string {
  const suggestions: string[] = [];
  const format = classifyVisualFormat(ad);

  if (format === "UGC" && ad.roas > 2) {
    suggestions.push("Create variations with different creators");
    suggestions.push("Test different hooks with the same product");
  }

  if (format === "Static") {
    suggestions.push("Test carousel format showing multiple products");
    suggestions.push("Create a short video (15-30s) with the same product");
  }

  if (format === "Video") {
    suggestions.push("Test different video lengths (15s vs 30s vs 60s)");
    suggestions.push("Try a static image version for comparison");
  }

  if (format === "Carousel") {
    suggestions.push("Test single product hero image vs carousel");
    suggestions.push("Reorder carousel slides — put best seller first");
  }

  if (ad.purchases > 5 && ad.roas > 2) {
    suggestions.push("Scale budget by 20-30% and monitor");
    suggestions.push("Duplicate to new audiences");
  }

  return suggestions.length > 0 ? suggestions.slice(0, 2).join(". ") + "." : "Test a new format or angle.";
}

function analyzeVideoAd(ad: AdCreativeData): Pick<CreativeScore, "video_hook_analysis" | "video_pacing" | "product_shown_timing" | "cta_timing" | "has_subtitles" | "has_audio"> {
  if (ad.creative_type !== "video") {
    return {
      video_hook_analysis: "N/A",
      video_pacing: "N/A",
      product_shown_timing: "N/A",
      cta_timing: "N/A",
      has_subtitles: "unknown",
      has_audio: "unknown",
    };
  }

  const length = ad.video_length;
  const name = (ad.ad_name + " " + ad.campaign_name).toLowerCase();

  // Hook analysis based on CTR + length
  let hookAnalysis = "";
  if (ad.ctr > 1.5) hookAnalysis = "Strong hook — high CTR suggests first 3 seconds are engaging";
  else if (ad.ctr > 0.8) hookAnalysis = "Moderate hook — test a more attention-grabbing opening";
  else hookAnalysis = "Weak hook — first 3 seconds need improvement, try starting with the product or a bold claim";

  // Pacing
  let pacing = "";
  if (length <= 15) pacing = "Short format — fast-paced, good for awareness";
  else if (length <= 30) pacing = "Standard format — good balance of info and engagement";
  else if (length <= 60) pacing = "Medium format — ensure enough scene changes to maintain attention";
  else pacing = "Long format — consider a shorter cut for better completion rates";

  // Product timing
  let productTiming = "";
  if (name.includes("ugc") || name.includes("influe") || name.includes("china")) {
    productTiming = "UGC style — product likely shown through demonstration";
  } else if (name.includes("catalog")) {
    productTiming = "Catalog — product shown immediately";
  } else {
    productTiming = length <= 15 ? "Short video — product likely visible early" : "Check if product appears within first 5 seconds";
  }

  // CTA timing
  const ctaTiming = length <= 15
    ? "Short video — CTA should be at the end (last 3s)"
    : length <= 30
    ? "Place CTA at 20-25s mark and end frame"
    : "Add mid-roll CTA and end CTA for longer videos";

  // Subtitle/audio inference from naming
  const hasSubtitles = name.includes("subtitle") || name.includes("text") || name.includes("caption") ? "likely" as const : "unknown" as const;
  const hasAudio = name.includes("voiceover") || name.includes("audio") || name.includes("voice") ? "likely" as const : "likely" as const; // Most video ads have audio

  return {
    video_hook_analysis: hookAnalysis,
    video_pacing: pacing,
    product_shown_timing: productTiming,
    cta_timing: ctaTiming,
    has_subtitles: hasSubtitles,
    has_audio: hasAudio,
  };
}

// --- Main analysis function ---

export function analyzeCreatives(ads: AdCreativeData[]): {
  analyzed: AdWithAnalysis[];
  insights: CreativeInsightsSummary;
} {
  if (ads.length === 0) {
    return {
      analyzed: [],
      insights: {
        best_creative_type: { type: "N/A", avg_roas: 0 },
        highest_roas_ad: null,
        lowest_ctr_ad: null,
        high_spend_low_purchase: [],
        top_winning_hooks: [],
        common_issues: [],
        top_10_winners: [],
        bottom_10: [],
        category_patterns: [],
        test_recommendations: [],
      },
    };
  }

  // Compute averages across all ads with spend
  const adsWithSpend = ads.filter((a) => a.spend > 0);
  const allROAS = adsWithSpend.map((a) => a.roas);
  const allCTR = adsWithSpend.map((a) => a.ctr);
  const allCPR = adsWithSpend.filter((a) => a.cost_per_purchase > 0).map((a) => a.cost_per_purchase);
  const allCPM = adsWithSpend.map((a) => a.cpm);

  const avgROAS = allROAS.length > 0 ? allROAS.reduce((a, b) => a + b, 0) / allROAS.length : 0;
  const avgCTR = allCTR.length > 0 ? allCTR.reduce((a, b) => a + b, 0) / allCTR.length : 0;
  const avgCPR = allCPR.length > 0 ? allCPR.reduce((a, b) => a + b, 0) / allCPR.length : 0;

  // Analyze each ad
  const analyzed: AdWithAnalysis[] = ads.map((ad) => {
    const format = classifyVisualFormat(ad);
    const status = determineStatus(ad, avgROAS, avgCTR);

    // Score components (0-100)
    const hook_strength = scoreFromPercentile(computePercentile(ad.ctr, allCTR));
    const product_visibility = ad.purchases > 0 ? scoreFromPercentile(computePercentile(ad.roas, allROAS)) : 30;
    const offer_clarity = ad.cost_per_purchase > 0
      ? scoreFromPercentile(100 - computePercentile(ad.cost_per_purchase, allCPR))
      : 30;
    const cta_clarity = ad.cta_type ? 70 : 30;
    const scroll_stopping = scoreFromPercentile(
      computePercentile(ad.ctr * (ad.impressions > 0 ? 1 : 0), allCTR)
    );

    // CPM efficiency bonus
    const cpmScore = scoreFromPercentile(100 - computePercentile(ad.cpm, allCPM));

    // Overall weighted score
    const overall = Math.round(
      hook_strength * 0.25 +
      product_visibility * 0.20 +
      offer_clarity * 0.20 +
      cta_clarity * 0.10 +
      scroll_stopping * 0.15 +
      cpmScore * 0.10
    );

    const videoAnalysis = analyzeVideoAd(ad);

    const analysis: CreativeScore = {
      overall,
      hook_strength,
      product_visibility,
      offer_clarity,
      cta_clarity,
      scroll_stopping,
      visual_format: format,
      status,
      why_working: analyzeWhyWorking(ad, avgROAS, avgCTR, avgCPR),
      why_underperforming: analyzeWhyUnderperforming(ad, avgROAS, avgCTR, avgCPR),
      suggested_improvement: suggestImprovement(ad, avgCTR, avgROAS),
      suggested_next_test: suggestNextTest(ad),
      ...videoAnalysis,
    };

    return { ...ad, analysis };
  });

  // Sort by overall score for rankings
  const sortedByScore = [...analyzed].sort((a, b) => b.analysis.overall - a.analysis.overall);

  // --- Compute insights ---

  // Best creative type by ROAS
  const typeRoas: Record<string, { totalRoas: number; count: number }> = {};
  for (const ad of analyzed) {
    const t = ad.analysis.visual_format;
    if (!typeRoas[t]) typeRoas[t] = { totalRoas: 0, count: 0 };
    if (ad.roas > 0) {
      typeRoas[t].totalRoas += ad.roas;
      typeRoas[t].count += 1;
    }
  }
  const bestType = Object.entries(typeRoas)
    .map(([type, d]) => ({ type, avg_roas: d.count > 0 ? d.totalRoas / d.count : 0 }))
    .sort((a, b) => b.avg_roas - a.avg_roas)[0] || { type: "N/A", avg_roas: 0 };

  // Highest ROAS ad
  const highestRoasAd = [...analyzed].filter((a) => a.spend > 200).sort((a, b) => b.roas - a.roas)[0] || null;

  // Lowest CTR ad (with enough impressions)
  const lowestCtrAd = [...analyzed]
    .filter((a) => a.impressions > 5000)
    .sort((a, b) => a.ctr - b.ctr)[0] || null;

  // High spend, low purchase
  const highSpendLowPurchase = analyzed
    .filter((a) => a.spend > 500 && (a.purchases === 0 || a.cost_per_purchase > avgCPR * 2))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  // Top winning hooks
  const topHooks = analyzed
    .filter((a) => a.primary_text && a.roas > avgROAS && a.spend > 300)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5)
    .map((a) => {
      const text = a.primary_text;
      // Extract first line or first 80 chars
      const firstLine = text.split("\n")[0];
      return firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;
    })
    .filter((h) => h.length > 0);

  // Common issues
  const issues: Record<string, number> = {};
  for (const ad of analyzed.filter((a) => a.analysis.status === "underperforming")) {
    if (ad.ctr < avgCTR * 0.7) issues["Low CTR — weak hook or creative"] = (issues["Low CTR — weak hook or creative"] || 0) + 1;
    if (ad.frequency > 2.5) issues["High frequency — audience fatigue"] = (issues["High frequency — audience fatigue"] || 0) + 1;
    if (ad.cpm > 100) issues["High CPM — narrow or expensive audience"] = (issues["High CPM — narrow or expensive audience"] || 0) + 1;
    if (!ad.primary_text) issues["Missing primary text"] = (issues["Missing primary text"] || 0) + 1;
    if (ad.purchases === 0 && ad.spend > 300) issues["Spend without conversions"] = (issues["Spend without conversions"] || 0) + 1;
  }
  const commonIssues = Object.entries(issues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `${issue} (${count} ads)`);

  // Category patterns
  const catData: Record<string, { roas: number[]; ctr: number[]; types: Record<string, number>; topAd: AdWithAnalysis | null }> = {};
  for (const ad of analyzed) {
    if (!catData[ad.collection]) catData[ad.collection] = { roas: [], ctr: [], types: {}, topAd: null };
    if (ad.roas > 0) catData[ad.collection].roas.push(ad.roas);
    if (ad.ctr > 0) catData[ad.collection].ctr.push(ad.ctr);
    catData[ad.collection].types[ad.analysis.visual_format] = (catData[ad.collection].types[ad.analysis.visual_format] || 0) + 1;
    if (!catData[ad.collection].topAd || ad.roas > (catData[ad.collection].topAd?.roas ?? 0)) {
      catData[ad.collection].topAd = ad;
    }
  }
  const categoryPatterns = Object.entries(catData).map(([category, d]) => {
    const avgR = d.roas.length > 0 ? d.roas.reduce((a, b) => a + b, 0) / d.roas.length : 0;
    const avgC = d.ctr.length > 0 ? d.ctr.reduce((a, b) => a + b, 0) / d.ctr.length : 0;
    const bestT = Object.entries(d.types).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    return {
      category,
      best_type: bestT,
      avg_roas: avgR,
      avg_ctr: avgC,
      top_ad: d.topAd?.ad_name || "N/A",
    };
  });

  // Test recommendations
  const testRecs: string[] = [];
  if (bestType.type === "UGC") testRecs.push("UGC is performing best — invest in more creator-based content");
  if (bestType.type === "Catalog") testRecs.push("Catalog ads leading — optimize product feed images");
  const videoAds = analyzed.filter((a) => a.creative_type === "video");
  const staticAds = analyzed.filter((a) => a.creative_type === "image");
  if (videoAds.length < staticAds.length * 0.5) testRecs.push("Test more video creatives — currently underrepresented");
  if (highSpendLowPurchase.length > 3) testRecs.push("Pause or refresh " + highSpendLowPurchase.length + " high-spend low-conversion ads");
  for (const pattern of categoryPatterns) {
    if (pattern.avg_roas > avgROAS * 1.3) {
      testRecs.push(`${pattern.category} is outperforming — scale winning creatives in this category`);
    }
  }
  if (testRecs.length === 0) testRecs.push("Test new hooks and creative angles across all collections");

  return {
    analyzed,
    insights: {
      best_creative_type: bestType,
      highest_roas_ad: highestRoasAd,
      lowest_ctr_ad: lowestCtrAd,
      high_spend_low_purchase: highSpendLowPurchase,
      top_winning_hooks: topHooks,
      common_issues: commonIssues,
      top_10_winners: sortedByScore.filter((a) => a.spend > 100).slice(0, 10),
      bottom_10: sortedByScore.filter((a) => a.spend > 200).slice(-10).reverse(),
      category_patterns: categoryPatterns,
      test_recommendations: testRecs,
    },
  };
}
