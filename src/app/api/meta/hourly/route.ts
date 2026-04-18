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
    // Fetch account-level insights broken down by hourly_stats_aggregated_by_advertiser_time_zone
    // Meta provides breakdown by hour of day and day of week at the account/campaign level
    const url =
      `${BASE_URL}/act_${accountId}/insights?` +
      `time_range={"since":"${since}","until":"${until}"}` +
      `&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone` +
      `&fields=spend,impressions,clicks,ctr,cpm,actions,purchase_roas` +
      `&level=account` +
      `&limit=500`;

    const res = await metaFetch(url, token);
    const hourlyData = res.data || [];

    // Also fetch by campaign for collection breakdown
    const campaignUrl =
      `${BASE_URL}/act_${accountId}/insights?` +
      `time_range={"since":"${since}","until":"${until}"}` +
      `&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone` +
      `&fields=campaign_name,campaign_id,spend,impressions,clicks,ctr,cpm,actions,purchase_roas` +
      `&level=campaign` +
      `&limit=1000`;

    let campaignHourly: Record<string, unknown>[] = [];
    try {
      const campaignRes = await metaFetch(campaignUrl, token);
      campaignHourly = campaignRes.data || [];
    } catch {
      // Campaign-level hourly may fail, continue with account-level
    }

    // Process account-level hourly data
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

    const accountHours: HourStat[] = hourlyData.map((row: Record<string, unknown>) => {
      const actions = (row.actions as { action_type: string; value: string }[]) || [];
      const purchases = parseInt(
        actions.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
        actions.find((a) => a.action_type === "purchase")?.value || "0"
      );
      const purchaseRoas = (row.purchase_roas as { action_type: string; value: string }[]) || [];
      const roas = parseFloat(purchaseRoas[0]?.value || "0");

      return {
        hour: (row.hourly_stats_aggregated_by_advertiser_time_zone as string) || "00:00:00 - 00:59:59",
        spend: parseFloat(row.spend as string) || 0,
        impressions: parseInt(row.impressions as string) || 0,
        clicks: parseInt(row.clicks as string) || 0,
        ctr: parseFloat(row.ctr as string) || 0,
        cpm: parseFloat(row.cpm as string) || 0,
        purchases,
        roas,
      };
    });

    // Process campaign-level hourly for collection breakdown
    interface CollectionHour {
      collection: string;
      hour: string;
      spend: number;
      purchases: number;
      roas: number;
    }

    const collectionHours: CollectionHour[] = campaignHourly.map((row) => {
      const campaignName = (row.campaign_name as string) || "";
      const actions = (row.actions as { action_type: string; value: string }[]) || [];
      const purchases = parseInt(
        actions.find((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ||
        actions.find((a) => a.action_type === "purchase")?.value || "0"
      );
      const purchaseRoas = (row.purchase_roas as { action_type: string; value: string }[]) || [];
      const roas = parseFloat(purchaseRoas[0]?.value || "0");

      return {
        collection: detectCollection(campaignName),
        hour: (row.hourly_stats_aggregated_by_advertiser_time_zone as string) || "",
        spend: parseFloat(row.spend as string) || 0,
        purchases,
        roas,
      };
    });

    return NextResponse.json({
      accountHours,
      collectionHours,
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
