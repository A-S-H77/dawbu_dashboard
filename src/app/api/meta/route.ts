import { NextRequest, NextResponse } from "next/server";
import { detectCollection, type CampaignData } from "@/lib/collections";

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaCampaign {
  id: string;
  name: string;
  daily_budget?: string;
  lifetime_budget?: string;
  status: string;
  insights?: { data: MetaInsight[] };
}

interface MetaAdSet {
  id: string;
  name: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  status: string;
  insights?: { data: MetaInsight[] };
}

interface MetaInsight {
  spend: string;
  reach: string;
  impressions: string;
  frequency: string;
  cpm: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
}

async function metaFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Meta API error: ${res.status}`);
  }
  return res.json();
}

function parseInsight(insight: MetaInsight | undefined) {
  if (!insight)
    return { spend: 0, purchases: 0, roas: 0, reach: 0, impressions: 0, cpm: 0, frequency: 0 };

  const purchases =
    insight.actions?.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ??
    insight.actions?.find((a) => a.action_type === "purchase")?.value ??
    "0";

  const roas =
    insight.purchase_roas?.find(
      (a) => a.action_type === "offsite_conversion.fb_pixel_purchase"
    )?.value ??
    insight.purchase_roas?.[0]?.value ??
    "0";

  return {
    spend: parseFloat(insight.spend) || 0,
    purchases: parseInt(purchases) || 0,
    roas: parseFloat(roas) || 0,
    reach: parseInt(insight.reach) || 0,
    impressions: parseInt(insight.impressions) || 0,
    cpm: parseFloat(insight.cpm) || 0,
    frequency: parseFloat(insight.frequency) || 0,
  };
}

export async function GET(request: NextRequest) {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId || token === "your_meta_access_token_here") {
    return NextResponse.json({ error: "Meta credentials not configured" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const since = searchParams.get("since") || getDefaultSince();
  const until = searchParams.get("until") || getDefaultUntil();

  try {
    // Step 1: Fetch all active campaigns with insights
    const campaignsUrl =
      `${BASE_URL}/act_${accountId}/campaigns?` +
      `fields=id,name,daily_budget,lifetime_budget,status,` +
      `insights.time_range({"since":"${since}","until":"${until}"}){spend,reach,impressions,frequency,cpm,actions,action_values,purchase_roas}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
      `&limit=200`;

    const campaignsRes = await metaFetch(campaignsUrl, token);
    const campaigns: MetaCampaign[] = campaignsRes.data || [];

    // Step 2: Fetch all ad sets with budgets and insights
    const adsetsUrl =
      `${BASE_URL}/act_${accountId}/adsets?` +
      `fields=id,name,campaign_id,daily_budget,lifetime_budget,status,` +
      `insights.time_range({"since":"${since}","until":"${until}"}){spend,reach,impressions,frequency,cpm,actions,action_values,purchase_roas}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
      `&limit=500`;

    const adsetsRes = await metaFetch(adsetsUrl, token);
    const adsets: MetaAdSet[] = adsetsRes.data || [];

    // Step 3: Build campaign data with correct budgets
    // Group ad sets by campaign
    const adsetsByCampaign: Record<string, MetaAdSet[]> = {};
    for (const adset of adsets) {
      if (!adsetsByCampaign[adset.campaign_id]) {
        adsetsByCampaign[adset.campaign_id] = [];
      }
      adsetsByCampaign[adset.campaign_id].push(adset);
    }

    const result: CampaignData[] = [];

    for (const campaign of campaigns) {
      const campaignBudget = parseFloat(campaign.daily_budget || "0") / 100; // Meta returns in cents
      const insight = parseInsight(campaign.insights?.data?.[0]);
      const collection = detectCollection(campaign.name);

      if (campaignBudget > 0) {
        // Campaign has its own budget
        result.push({
          campaign_name: campaign.name,
          campaign_id: campaign.id,
          daily_budget: campaignBudget,
          budget_source: "campaign",
          spend: insight.spend,
          purchases: insight.purchases,
          roas: insight.roas,
          reach: insight.reach,
          impressions: insight.impressions,
          cpr: insight.purchases > 0 ? insight.spend / insight.purchases : 0,
          cpm: insight.cpm,
          frequency: insight.frequency,
          collection,
        });
      } else {
        // Budget is at ad set level — sum up ad set budgets
        const campAdsets = adsetsByCampaign[campaign.id] || [];
        const totalAdsetBudget = campAdsets.reduce(
          (sum, as) => sum + parseFloat(as.daily_budget || "0") / 100,
          0
        );

        result.push({
          campaign_name: campaign.name,
          campaign_id: campaign.id,
          daily_budget: totalAdsetBudget,
          budget_source: "adset",
          spend: insight.spend,
          purchases: insight.purchases,
          roas: insight.roas,
          reach: insight.reach,
          impressions: insight.impressions,
          cpr: insight.purchases > 0 ? insight.spend / insight.purchases : 0,
          cpm: insight.cpm,
          frequency: insight.frequency,
          collection,
        });
      }
    }

    return NextResponse.json({
      campaigns: result,
      dateRange: { since, until },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getDefaultSince(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

function getDefaultUntil(): string {
  return new Date().toISOString().split("T")[0];
}
