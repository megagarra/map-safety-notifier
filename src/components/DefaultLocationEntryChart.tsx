import { DefaultLocationEntry } from '@/types';
import { getEntryLabel } from '@/lib/entryLabels';
import { cn } from '@/lib/utils';

interface DefaultLocationEntryChartProps {
  entries: DefaultLocationEntry[];
  totalQuantity: number;
}

const CHART_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#8b5cf6', '#6d28d9', '#5b21b6', '#4c1d95'];

export function DefaultLocationEntryChart({ entries, totalQuantity }: DefaultLocationEntryChartProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => b.quantity - a.quantity);
  const maxQty = sorted[0]?.quantity ?? 1;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Distribuição por tipo ({totalQuantity} total)</p>
      <div className="space-y-2">
        {sorted.map((entry, index) => {
          const pct = totalQuantity > 0 ? Math.round((entry.quantity / totalQuantity) * 100) : 0;
          const widthPct = maxQty > 0 ? (entry.quantity / maxQty) * 100 : 0;
          const color = CHART_COLORS[index % CHART_COLORS.length];
          return (
            <div key={entry.id ?? `${getEntryLabel(entry)}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-300 truncate flex-1" title={getEntryLabel(entry)}>
                  {getEntryLabel(entry)}
                </span>
                <span className="text-violet-300 font-medium tabular-nums shrink-0">
                  {entry.quantity} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#2a2a2a] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all')}
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
