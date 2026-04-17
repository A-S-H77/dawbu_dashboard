"use client";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

export default function MetricCard({ label, value, subtitle, trend, color = "blue" }: MetricCardProps) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    purple: "border-purple-500 bg-purple-50",
    orange: "border-orange-500 bg-orange-50",
    red: "border-red-500 bg-red-50",
    cyan: "border-cyan-500 bg-cyan-50",
  };

  const trendIcon = trend === "up" ? "▲" : trend === "down" ? "▼" : "";
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "";

  return (
    <div className={`rounded-xl border-l-4 ${colorMap[color] || colorMap.blue} p-4 shadow-sm`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
        {trendIcon && <span className={`ml-2 text-sm ${trendColor}`}>{trendIcon}</span>}
      </p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}
