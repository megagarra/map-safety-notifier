import { useQuery } from '@tanstack/react-query';
import { X, Loader2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { getPinConfig } from '@/lib/pinConfig';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { cn } from '@/lib/utils';

import { loadMyReports } from '@/lib/myReports';
export type { MyReport } from '@/lib/myReports';
import type { MyReport } from '@/lib/myReports';

function statusInfo(r: MyReport): { label: string; cls: string; detail?: string } {
  if (r.approvalStatus === 'pending') return { label: 'Aguardando aprovação', cls: 'bg-yellow-500/20 text-yellow-300' };
  if (r.approvalStatus === 'rejected') return { label: 'Não aprovado', cls: 'bg-red-500/20 text-red-300', detail: r.rejectionReason ?? undefined };
  if (r.status === 'resolved') return { label: 'Resolvido', cls: 'bg-emerald-500/20 text-emerald-300' };
  if (r.status === 'in_progress') return { label: 'Em andamento', cls: 'bg-blue-500/20 text-blue-300' };
  if (r.status === 'acknowledged') return { label: 'Reconhecido', cls: 'bg-blue-500/20 text-blue-300' };
  return { label: 'Publicado no mapa', cls: 'bg-white/10 text-gray-200' };
}

export function MyReportsSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (r: MyReport) => void }) {
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const stored = loadMyReports();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['my-reports', stored.map((s) => s.id).join(',')],
    queryFn: () => api<MyReport[]>('/api/pins/mine', { method: 'POST', body: JSON.stringify(stored) }),
    enabled: stored.length > 0,
    staleTime: 30_000,
  });

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Meus relatos"
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md max-h-[75dvh] flex flex-col rounded-t-2xl md:rounded-2xl bg-[#161618] border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
          <div>
            <p className="text-white font-semibold">Meus relatos</p>
            <p className="text-xs text-gray-400">Enviados deste aparelho</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/5 text-gray-300 flex items-center justify-center" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain">
          {stored.length === 0 ? (
            <div className="px-6 py-10 text-center space-y-2">
              <FileText className="mx-auto text-gray-500" size={28} />
              <p className="text-sm text-gray-300">Você ainda não enviou relatos deste aparelho.</p>
              <p className="text-xs text-gray-400">Toque no mapa ou em "Reportar aqui" para registrar um problema.</p>
            </div>
          ) : isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : isError ? (
            <div className="px-6 py-8 text-center space-y-3">
              <p className="text-sm text-red-300">Não foi possível carregar seus relatos.</p>
              <button onClick={() => refetch()} className="h-11 px-4 rounded-lg bg-white/10 text-white text-sm">Tentar de novo</button>
            </div>
          ) : (
            <ul>
              {data.map((r) => {
                const s = statusInfo(r);
                const cfg = getPinConfig(r.type);
                return (
                  <li key={r.id} className="border-b border-white/5">
                    <button
                      onClick={() => r.approvalStatus !== 'rejected' && onOpen(r)}
                      disabled={r.approvalStatus === 'rejected'}
                      className="w-full text-left px-4 py-3 min-h-14 hover:bg-white/5 disabled:hover:bg-transparent"
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
                        <span className={cn('text-[11px] px-1.5 py-0.5 rounded', s.cls)}>{s.label}</span>
                        <span className="ml-auto text-xs text-gray-400">
                          {formatDistanceToNow(new Date(r.reportedAt), { locale: ptBR, addSuffix: true })}
                        </span>
                      </span>
                      {r.address && <span className="block text-xs text-gray-400 truncate mt-0.5">{r.address}</span>}
                      {s.detail && <span className="block text-xs text-red-300 mt-1">Motivo: {s.detail}</span>}
                      {r.approvalStatus === 'approved' && r.votes > 0 && (
                        <span className="block text-xs text-gray-400 mt-0.5">{r.votes} pessoa{r.votes === 1 ? '' : 's'} confirmaram</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
