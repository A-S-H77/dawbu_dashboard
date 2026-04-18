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
  const timeRange = `{"since":"${since}","until":"${until}"}`;

  try {
    // 1. Fetch ad sets with targeting specs
    const adsetsUrl =
      `${BASE_URL}/act_${accountId}/adsets?` +
      `fields=id,name,campaign{id,name},targeting,status,daily_budget,` +
      `insights.time_range(${timeRange}){spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,purchase_roas}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
      `&limit=200`;

    const adsets = await fetchAllPages(adsetsUrl, token, 3);

    // 1b. Fetch active ads to filter ad sets that actually have running ads
    const adsUrl =
      `${BASE_URL}/act_${accountId}/ads?` +
      `fields=id,adset_id` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
      `&limit=500`;
    const adsRes = await metaFetch(adsUrl, token);
    const activeAdsetIds = new Set(((adsRes.data || []) as { id: string; adset_id: string }[]).map((ad) => ad.adset_id));

    // Filter ad sets to only those with at least one active ad
    const activeAdsets = adsets.filter((adset) => activeAdsetIds.has(adset.id as string));

    // 2. Fetch demographic breakdowns (age, gender)
    const ageGenderUrl =
      `${BASE_URL}/act_${accountId}/insights?` +
      `time_range=${timeRange}` +
      `&breakdowns=age,gender` +
      `&fields=campaign_name,campaign_id,spend,impressions,reach,clicks,ctr,cpc,cpm,actions,purchase_roas` +
      `&level=campaign` +
      `&limit=500`;

    // 3. Fetch region breakdown
    const regionUrl =
      `${BASE_URL}/act_${accountId}/insights?` +
      `time_range=${timeRange}` +
      `&breakdowns=region` +
      `&fields=campaign_name,spend,impressions,clicks,ctr,actions,purchase_roas` +
      `&level=account` +
      `&limit=100`;

    // 4. Fetch placement breakdown
    const placementUrl =
      `${BASE_URL}/act_${accountId}/insights?` +
      `time_range=${timeRange}` +
      `&breakdowns=publisher_platform,platform_position` +
      `&fields=spend,impressions,clicks,ctr,cpm,actions,purchase_roas` +
      `&level=account` +
      `&limit=100`;

    // 5. Fetch device breakdown
    const deviceUrl =
      `${BASE_URL}/act_${accountId}/insights?` +
      `time_range=${timeRange}` +
      `&breakdowns=device_platform` +
      `&fields=spend,impressions,clicks,ctr,cpm,actions,purchase_roas` +
      `&level=account` +
      `&limit=20`;

    const [ageGenderRes, regionRes, placementRes, deviceRes] = await Promise.all([
      metaFetch(ageGenderUrl, token).catch(() => ({ data: [] })),
      metaFetch(regionUrl, token).catch(() => ({ data: [] })),
      metaFetch(placementUrl, token).catch(() => ({ data: [] })),
      metaFetch(deviceUrl, token).catch(() => ({ data: [] })),
    ]);

    // Process ad set targeting
    interface TargetingInfo {
      adset_id: string;
      adset_name: string;
      campaign_name: string;
      campaign_id: string;
      collection: string;
      daily_budget: number;
      age_min: number;
      age_max: number;
      genders: string[];
      geo_locations: string[];
      interests: string[];
      custom_audiences: string[];
      lookalike_audiences: string[];
      excluded_audiences: string[];
      behaviors: string[];
      // Performance
      spend: number;
      impressions: number;
      reach: number;
      clicks: number;
      ctr: number;
      cpm: number;
      purchases: number;
      roas: number;
      frequency: number;
    }

    const targetingData: TargetingInfo[] = activeAdsets.map((adset) => {
      const campaign = (adset.campaign as Record<string, unknown>) || {};
      const targeting = (adset.targeting as Record<string, unknown>) || {};
      const insightsArr = (adset.insights as { data: Record<string, unknown>[] })?.data || [];
      const insight = insightsArr[0] || {};
      const campaignName = (campaign.name as string) || "";

      // Parse targeting
      const geoLocations = targeting.geo_locations as Record<string, unknown> | undefined;
      const countries = (geoLocations?.countries as string[]) || [];
      const cities = ((geoLocations?.cities as { name: string }[]) || []).map((c) => c.name);
      const regions = ((geoLocations?.regions as { name: string }[]) || []).map((r) => r.name);

      const flexSpec = (targeting.flexible_spec as Record<string, unknown>[]) || [];
      const interests: string[] = [];
      const behaviors: string[] = [];
      for (const spec of flexSpec) {
        const interestList = (spec.interests as { name: string }[]) || [];
        interests.push(...interestList.map((i) => i.name));
        const behaviorList = (spec.behaviors as { name: string }[]) || [];
        behaviors.push(...behaviorList.map((b) => b.name));
      }

      const customAudiences = ((targeting.custom_audiences as { name: string }[]) || []).map((a) => a.name);
      const excludedAudiences = ((targeting.excluded_custom_audiences as { name: string }[]) || []).map((a) => a.name);

      // Detect lookalikes
      const lookalikes = customAudiences.filter((a) => a.toLowerCase().includes("lookalike") || a.toLowerCase().includes("lal"));
      const nonLookalikes = customAudiences.filter((a) => !a.toLowerCase().includes("lookalike") && !a.toLowerCase().includes("lal"));

      const genders: string[] = [];
      const genderVal = targeting.genders as number[] | undefined;
      if (!genderVal || genderVal.length === 0) genders.push("All");
      else {
        if (genderVal.includes(1)) genders.push("Male");
        if (genderVal.includes(2)) genders.push("Female");
      }

      // Parse insights
      const actions = (insight.actions as { action_type: string; value: string }[]) || [];
      const purchases = parseInt(
        actions.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
        actions.find((a) => a.action_type === "purchase")?.value || "0"
      );
      const purchaseRoas = (insight.purchase_roas as { action_type: string; value: string }[]) || [];
      const roas = parseFloat(purchaseRoas[0]?.value || "0");

      return {
        adset_id: adset.id as string,
        adset_name: (adset.name as string) || "",
        campaign_name: campaignName,
        campaign_id: (campaign.id as string) || "",
        collection: detectCollection(campaignName),
        daily_budget: parseFloat(adset.daily_budget as string || "0") / 100,
        age_min: (targeting.age_min as number) || 18,
        age_max: (targeting.age_max as number) || 65,
        genders,
        geo_locations: [...countries, ...cities, ...regions],
        interests,
        custom_audiences: nonLookalikes,
        lookalike_audiences: lookalikes,
        excluded_audiences: excludedAudiences,
        behaviors,
        spend: parseFloat(insight.spend as string) || 0,
        impressions: parseInt(insight.impressions as string) || 0,
        reach: parseInt(insight.reach as string) || 0,
        clicks: parseInt(insight.clicks as string) || 0,
        ctr: parseFloat(insight.ctr as string) || 0,
        cpm: parseFloat(insight.cpm as string) || 0,
        purchases,
        roas,
        frequency: parseFloat(insight.frequency as string) || 0,
      };
    });

    // Process demographic breakdowns
    function parseInsightRow(row: Record<string, unknown>) {
      const actions = (row.actions as { action_type: string; value: string }[]) || [];
      const purchases = parseInt(
        actions.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
        actions.find((a) => a.action_type === "purchase")?.value || "0"
      );
      const purchaseRoas = (row.purchase_roas as { action_type: string; value: string }[]) || [];
      const roas = parseFloat(purchaseRoas[0]?.value || "0");

      return {
        spend: parseFloat(row.spend as string) || 0,
        impressions: parseInt(row.impressions as string) || 0,
        clicks: parseInt(row.clicks as string) || 0,
        ctr: parseFloat(row.ctr as string) || 0,
        cpm: parseFloat(row.cpm as string) || 0,
        purchases,
        roas,
      };
    }

    const ageGenderData = (ageGenderRes.data || []).map((row: Record<string, unknown>) => ({
      age: (row.age as string) || "",
      gender: (row.gender as string) || "",
      campaign_name: (row.campaign_name as string) || "",
      collection: detectCollection((row.campaign_name as string) || ""),
      ...parseInsightRow(row),
    }));

    const regionData = (regionRes.data || []).map((row: Record<string, unknown>) => ({
      region: (row.region as string) || "",
      ...parseInsightRow(row),
    }));

    const placementData = (placementRes.data || []).map((row: Record<string, unknown>) => ({
      platform: (row.publisher_platform as string) || "",
      position: (row.platform_position as string) || "",
      ...parseInsightRow(row),
    }));

    const deviceData = (deviceRes.data || []).map((row: Record<string, unknown>) => ({
      device: (row.device_platform as string) || "",
      ...parseInsightRow(row),
    }));

    return NextResponse.json({
      targeting: targetingData,
      ageGender: ageGenderData,
      regions: regionData,
      placements: placementData,
      devices: deviceData,
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
