import { NextRequest, NextResponse } from "next/server";
import { detectCollection } from "@/lib/collections";

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

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

async function fetchAllPages(url: string, token: string, maxPages = 5) {
  const allData: Record<string, unknown>[] = [];
  let nextUrl: string | null = url;
  let page = 0;
  while (nextUrl && page < maxPages) {
    const res = await metaFetch(nextUrl, token);
    if (res.data) allData.push(...res.data);
    nextUrl = res.paging?.next || null;
    page++;
  }
  return allData;
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
    // Fetch ads with daily breakdown insights
    const adsUrl =
      `${BASE_URL}/act_${accountId}/ads?` +
      `fields=id,name,campaign{id,name},adset{id,name},` +
      `insights.time_range({"since":"${since}","until":"${until}"}).time_increment(1){` +
      `date_start,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,purchase_roas}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
      `&limit=100`;

    const ads = await fetchAllPages(adsUrl, token, 5);

    interface DayData {
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

    interface AdDaily {
      ad_id: string;
      ad_name: string;
      campaign_name: string;
      campaign_id: string;
      adset_name: string;
      collection: string;
      daily_data: DayData[];
    }

    const results: AdDaily[] = [];

    for (const ad of ads) {
      const campaign = (ad.campaign as Record<string, unknown>) || {};
      const adset = (ad.adset as Record<string, unknown>) || {};
      const insightsData = (ad.insights as { data: Record<string, unknown>[] })?.data || [];
      const campaignName = (campaign.name as string) || "";

      if (insightsData.length === 0) continue;

      const dailyData: DayData[] = insightsData.map((day) => {
        const actions = (day.actions as { action_type: string; value: string }[]) || [];
        const purchases = parseInt(
          actions.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
          actions.find((a) => a.action_type === "purchase")?.value || "0"
        );
        const purchaseRoas = (day.purchase_roas as { action_type: string; value: string }[]) || [];
        const roas = parseFloat(purchaseRoas[0]?.value || "0");

        return {
          date: (day.date_start as string) || "",
          spend: parseFloat(day.spend as string) || 0,
          impressions: parseInt(day.impressions as string) || 0,
          reach: parseInt(day.reach as string) || 0,
          clicks: parseInt(day.clicks as string) || 0,
          ctr: parseFloat(day.ctr as string) || 0,
          cpc: parseFloat(day.cpc as string) || 0,
          cpm: parseFloat(day.cpm as string) || 0,
          frequency: parseFloat(day.frequency as string) || 0,
          purchases,
          roas,
        };
      });

      results.push({
        ad_id: ad.id as string,
        ad_name: (ad.name as string) || "",
        campaign_name: campaignName,
        campaign_id: (campaign.id as string) || "",
        adset_name: (adset.name as string) || "",
        collection: detectCollection(campaignName),
        daily_data: dailyData.sort((a, b) => a.date.localeCompare(b.date)),
      });
    }

    return NextResponse.json({
      ads: results,
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
  d.setDate(d.getDate() - 14);
  return d.toISOString().split("T")[0];
}

function getDefaultUntil(): string {
  return new Date().toISOString().split("T")[0];
}
