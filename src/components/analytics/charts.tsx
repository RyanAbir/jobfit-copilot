export type BarDatum = {
  label: string;
  value: number;
  tone?: string;
};

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

/**
 * Horizontal labeled bars — good for rankings and distributions.
 */
export function HorizontalBars({
  data,
  emptyLabel = "No data yet",
}: {
  data: BarDatum[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2.5">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="truncate pr-2 font-medium text-slate-700">
              {item.label}
            </span>
            <span className="tabular-nums text-slate-500">{item.value}</span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.tone ?? "bg-blue-500"}`}
              style={{ width: `${Math.max(pct(item.value, max), item.value > 0 ? 6 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Vertical column chart — good for a time series across a fixed set of buckets.
 */
export function ColumnChart({
  data,
  emptyLabel = "No data yet",
}: {
  data: BarDatum[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: "160px" }}>
      {data.map((item, index) => {
        const height = item.value > 0 ? Math.max(pct(item.value, max), 4) : 0;
        return (
          <div
            key={`${item.label}-${index}`}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-xs font-semibold tabular-nums text-slate-700">
              {item.value > 0 ? item.value : ""}
            </span>
            <div
              className="w-full rounded-t-md bg-blue-500"
              style={{ height: `${height}%`, minHeight: item.value > 0 ? "4px" : "0" }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="w-full truncate text-center text-[10px] text-slate-500">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
