// Auto-detect collection from campaign/ad set name
// Add new keywords here to detect new collections automatically

const COLLECTION_RULES: { name: string; keywords: string[] }[] = [
  {
    name: "Building Blocks",
    keywords: ["-bb-", "-bb ", "_bb_", "_bb-", "-bb_", "building block", "plantsBB", "plants-bb", "catalog-bb", "static-bb", "ocean", "catalog-animal", "catalog-08", "ls- bb", "diecast"],
  },
  {
    name: "Miniatures",
    keywords: ["miniature", "miniature", "minitautre", "minitaure", "glow_mini", "glowmini", "glow mini", "_mini_", "-mini-", "_mini-", "insta_mini"],
  },
  {
    name: "Diamond Paintings",
    keywords: ["diamond"],
  },
  {
    name: "Diecast",
    keywords: ["diecast"],
  },
];

export function detectCollection(campaignName: string): string {
  const lower = campaignName.toLowerCase();

  for (const rule of COLLECTION_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return rule.name;
      }
    }
  }

  return "Other";
}

export interface CampaignData {
  campaign_name: string;
  campaign_id: string;
  daily_budget: number;
  budget_source: "campaign" | "adset";
  spend: number;
  purchases: number;
  roas: number;
  reach: number;
  impressions: number;
  cpr: number;
  cpm: number;
  frequency: number;
  collection: string;
}

export interface CollectionSummary {
  name: string;
  totalDailyBudget: number;
  totalSpend: number;
  totalPurchases: number;
  avgCPR: number;
  avgROAS: number;
  totalReach: number;
  totalImpressions: number;
  avgCPM: number;
  avgFrequency: number;
  campaignCount: number;
  campaigns: CampaignData[];
}

export function groupByCollection(campaigns: CampaignData[]): CollectionSummary[] {
  const groups: Record<string, CampaignData[]> = {};

  for (const c of campaigns) {
    if (!groups[c.collection]) {
      groups[c.collection] = [];
    }
    groups[c.collection].push(c);
  }

  return Object.entries(groups)
    .map(([name, camps]) => {
      const totalSpend = camps.reduce((s, c) => s + c.spend, 0);
      const totalPurchases = camps.reduce((s, c) => s + c.purchases, 0);
      const totalReach = camps.reduce((s, c) => s + c.reach, 0);
      const totalImpressions = camps.reduce((s, c) => s + c.impressions, 0);

      return {
        name,
        totalDailyBudget: camps.reduce((s, c) => s + c.daily_budget, 0),
        totalSpend,
        totalPurchases,
        avgCPR: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
        avgROAS:
          camps.filter((c) => c.roas > 0).length > 0
            ? camps.reduce((s, c) => s + c.roas * c.spend, 0) / totalSpend
            : 0,
        totalReach,
        totalImpressions,
        avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        avgFrequency:
          totalReach > 0 ? totalImpressions / totalReach : 0,
        campaignCount: camps.length,
        campaigns: camps.sort((a, b) => b.spend - a.spend),
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);
}
