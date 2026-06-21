import { PinHistoryEntry } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText } from 'lucide-react';
import { getOccurrenceHistory, isSystemHistoryEntry } from '@/lib/pins';

interface DefaultLocationHistoryProps {
  history: PinHistoryEntry[];
}

export function DefaultLocationHistory({ history }: DefaultLocationHistoryProps) {
  const occurrences = getOccurrenceHistory(history);
  const systemEvents = history.filter(isSystemHistoryEntry);

  const sortedOccurrences = [...occurrences].sort(
    (a, b) =>
      new Date(b.timestamp || b.date || '').getTime() -
      new Date(a.timestamp || a.date || '').getTime(),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white">Ocorrências sem endereço</h3>

      {sortedOccurrences.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhuma ocorrência registrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {sortedOccurrences.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className="p-3 rounded-lg bg-[#121212] border border-[#2a2a2a]"
            >
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-violet-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">
                      {format(new Date(entry.timestamp || entry.date || ''), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-gray-200 mt-1 leading-relaxed">{entry.description}</p>
                  )}
                  {entry.comment && (
                    <p className="text-xs text-violet-300/80 mt-1.5">{entry.comment}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {systemEvents.length > 0 && (
        <div className="pt-2 border-t border-[#2a2a2a]">
          <p className="text-xs text-gray-500 mb-2">Eventos do sistema</p>
          <ul className="space-y-1">
            {systemEvents.map((entry, index) => (
              <li key={`sys-${index}`} className="text-xs text-gray-500">
                {entry.description || entry.comment}
                {' · '}
                {format(new Date(entry.timestamp || entry.date || ''), 'dd/MM/yyyy', { locale: ptBR })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
