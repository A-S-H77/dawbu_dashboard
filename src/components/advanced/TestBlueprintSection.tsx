"use client";

import type { TestBlueprint } from "@/lib/advanced-analysis";

const priorityStyles = {
  high: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-600 text-white" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-500 text-white" },
  low: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-500 text-white" },
};

export default function TestBlueprintSection({ blueprints }: { blueprints: TestBlueprint[] }) {
  const high = blueprints.filter((b) => b.priority === "high");
  const medium = blueprints.filter((b) => b.priority === "medium");
  const low = blueprints.filter((b) => b.priority === "low");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Creative A/B Test Blueprints</h2>
        <p className="text-sm text-gray-500">Data-driven test recommendations based on your current ad performance</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{high.length}</p>
          <p className="text-xs font-medium text-red-600">High Priority Tests</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-700">{medium.length}</p>
          <p className="text-xs font-medium text-yellow-600">Medium Priority</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{low.length}</p>
          <p className="text-xs font-medium text-blue-600">Low Priority</p>
        </div>
      </div>

      {blueprints.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-lg font-semibold text-gray-700">No test recommendations yet</p>
          <p className="text-sm text-gray-500">Need more ad data to generate meaningful tests</p>
        </div>
      )}

      {/* Blueprint Cards */}
      <div className="space-y-4">
        {blueprints.map((bp, i) => {
          const style = priorityStyles[bp.priority];
          return (
            <div key={i} className={`rounded-xl border ${style.border} ${style.bg} p-5`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>
                      {bp.priority.toUpperCase()}
                    </span>
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{bp.collection}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{bp.test_name}</h3>
                </div>
              </div>

              {/* Hypothesis */}
              <div className="rounded-lg bg-white/70 p-3 border border-gray-200 mb-3">
                <p className="text-xs font-semibold text-gray-600">Hypothesis</p>
                <p className="text-sm text-gray-800 mt-0.5">{bp.hypothesis}</p>
              </div>

              {/* Control vs Variant */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg bg-white p-3 border border-gray-200">
                  <p className="text-[10px] font-semibold uppercase text-gray-500">Control (Current)</p>
                  <p className="text-xs text-gray-800 mt-1">{bp.control}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-green-200">
                  <p className="text-[10px] font-semibold uppercase text-green-600">Variant (Test)</p>
                  <p className="text-xs text-gray-800 mt-1">{bp.variant}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-500">Expected Impact</p>
                  <p className="text-xs font-semibold text-gray-800">{bp.expected_impact}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Budget</p>
                  <p className="text-xs font-semibold text-gray-800">{bp.budget_recommendation}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Based On</p>
                  <p className="text-xs font-semibold text-gray-800">{bp.based_on}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
