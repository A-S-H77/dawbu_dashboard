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

async function fetchAllPages(url: string, token: string, maxPages = 10) {
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

export interface AdCreativeData {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  campaign_id: string;
  adset_name: string;
  adset_id: string;
  collection: string;
  status: string;
  creative_type: "image" | "video" | "carousel" | "unknown";
  thumbnail_url: string;
  preview_url: string;
  video_url: string;
  video_length: number;
  primary_text: string;
  headline: string;
  cta_type: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  roas: number;
  frequency: number;
  cost_per_purchase: number;
}

function getCreativeType(creative: Record<string, unknown>): "image" | "video" | "carousel" | "unknown" {
  if (creative.object_story_spec) {
    const spec = creative.object_story_spec as Record<string, unknown>;
    if (spec.video_data) return "video";
    if (spec.link_data) {
      const linkData = spec.link_data as Record<string, unknown>;
      if (linkData.child_attachments) return "carousel";
      if (linkData.image_hash || linkData.picture) return "image";
    }
    if (spec.photo_data) return "image";
  }
  // Fallback: check for video_id on creative
  if (creative.video_id) return "video";
  if (creative.image_url || creative.image_hash) return "image";
  return "unknown";
}

function extractText(creative: Record<string, unknown>): { primary_text: string; headline: string; cta_type: string } {
  let primary_text = "";
  let headline = "";
  let cta_type = "";

  if (creative.object_story_spec) {
    const spec = creative.object_story_spec as Record<string, unknown>;
    const data = (spec.video_data || spec.link_data || spec.photo_data || {}) as Record<string, unknown>;
    primary_text = (data.message as string) || "";
    headline = (data.name as string) || (data.title as string) || "";
    if (data.call_to_action) {
      const cta = data.call_to_action as Record<string, unknown>;
      cta_type = (cta.type as string) || "";
    }
  }

  if (!primary_text && creative.body) primary_text = creative.body as string;
  if (!headline && creative.title) headline = creative.title as string;

  return { primary_text, headline, cta_type };
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
    // Fetch ads with insights and creative data
    const adsUrl =
      `${BASE_URL}/act_${accountId}/ads?` +
      `fields=id,name,status,campaign{id,name},adset{id,name},` +
      `creative{id,thumbnail_url,image_url,video_id,object_story_spec,body,title,asset_feed_spec},` +
      `insights.time_range({"since":"${since}","until":"${until}"}){` +
      `spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values,purchase_roas}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
      `&limit=100`;

    const ads = await fetchAllPages(adsUrl, token, 5);

    // For video ads, fetch video details
    const videoIds = new Set<string>();
    for (const ad of ads) {
      const creative = (ad.creative as Record<string, unknown>) || {};
      if (creative.video_id) videoIds.add(creative.video_id as string);
      const spec = creative.object_story_spec as Record<string, unknown> | undefined;
      if (spec?.video_data) {
        const vd = spec.video_data as Record<string, unknown>;
        if (vd.video_id) videoIds.add(vd.video_id as string);
      }
    }

    // Batch fetch video lengths
    const videoLengths: Record<string, number> = {};
    const videoUrls: Record<string, string> = {};
    const videoIdArr = Array.from(videoIds);
    for (let i = 0; i < videoIdArr.length; i += 50) {
      const batch = videoIdArr.slice(i, i + 50);
      const idsParam = batch.join(",");
      try {
        const videosRes = await metaFetch(
          `${BASE_URL}/?ids=${idsParam}&fields=length,source`,
          token
        );
        for (const [vid, info] of Object.entries(videosRes)) {
          const videoInfo = info as Record<string, unknown>;
          videoLengths[vid] = (videoInfo.length as number) || 0;
          videoUrls[vid] = (videoInfo.source as string) || "";
        }
      } catch {
        // Some videos may not be accessible
      }
    }

    // Build ad creative data
    const results: AdCreativeData[] = [];

    for (const ad of ads) {
      const campaign = (ad.campaign as Record<string, unknown>) || {};
      const adset = (ad.adset as Record<string, unknown>) || {};
      const creative = (ad.creative as Record<string, unknown>) || {};
      const insightsArr = (ad.insights as { data: Record<string, unknown>[] })?.data || [];
      const insight = insightsArr[0] || {};

      const campaignName = (campaign.name as string) || "";
      const collection = detectCollection(campaignName);
      const creativeType = getCreativeType(creative);
      const { primary_text, headline, cta_type } = extractText(creative);

      // Get video ID for length lookup
      let videoId = (creative.video_id as string) || "";
      if (!videoId) {
        const spec = creative.object_story_spec as Record<string, unknown> | undefined;
        if (spec?.video_data) {
          const vd = spec.video_data as Record<string, unknown>;
          videoId = (vd.video_id as string) || "";
        }
      }

      // Parse actions
      const actions = (insight.actions as { action_type: string; value: string }[]) || [];
      const purchases = parseInt(
        actions.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
        actions.find((a) => a.action_type === "purchase")?.value ||
        "0"
      );

      const purchaseRoas = (insight.purchase_roas as { action_type: string; value: string }[]) || [];
      const roas = parseFloat(
        purchaseRoas.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
        purchaseRoas[0]?.value ||
        "0"
      );

      const spend = parseFloat(insight.spend as string) || 0;
      const impressions = parseInt(insight.impressions as string) || 0;

      results.push({
        ad_id: ad.id as string,
        ad_name: (ad.name as string) || "",
        campaign_name: campaignName,
        campaign_id: (campaign.id as string) || "",
        adset_name: (adset.name as string) || "",
        adset_id: (adset.id as string) || "",
        collection,
        status: (ad.status as string) || "",
        creative_type: creativeType,
        thumbnail_url: (creative.thumbnail_url as string) || (creative.image_url as string) || "",
        preview_url: (creative.image_url as string) || (creative.thumbnail_url as string) || "",
        video_url: videoId ? videoUrls[videoId] || "" : "",
        video_length: videoId ? videoLengths[videoId] || 0 : 0,
        primary_text,
        headline,
        cta_type,
        spend,
        impressions,
        reach: parseInt(insight.reach as string) || 0,
        clicks: parseInt(insight.clicks as string) || 0,
        ctr: parseFloat(insight.ctr as string) || 0,
        cpc: parseFloat(insight.cpc as string) || 0,
        cpm: parseFloat(insight.cpm as string) || 0,
        purchases,
        roas,
        frequency: parseFloat(insight.frequency as string) || 0,
        cost_per_purchase: purchases > 0 ? spend / purchases : 0,
      });
    }

    // Sort by spend descending
    results.sort((a, b) => b.spend - a.spend);

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
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

function getDefaultUntil(): string {
  return new Date().toISOString().split("T")[0];
}
