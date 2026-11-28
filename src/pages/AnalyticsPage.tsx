import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, BarChart3, Download, RefreshCw, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api, apiUrl, getAccessToken } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type Overview = {
  totalApprovedPins: number;
  totalPendingPins: number;
  totalRejectedPins: number;
  byType: { type: string; count: number }[];
  byNeighborhood: { neighborhood: string; totalQuantity: number; markerId?: string }[];
  weeklyTrend: { weekStart: string; count: number }[];
  averageApprovalHours?: number | null;
  oldestPendingHours?: number | null;
  resolvedCount?: number;
  citizenResolvedCount?: number;
  byHour?: number[];
  hotspots?: { lat: number; lng: number; count: number }[];
};

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: 0, label: 'Tudo' },
];

const TYPE_LABEL: Record<string, string> = { crime: 'Crime', infraestrutura: 'Infraestrutura' };

function fmtHours(h?: number | null) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} dias`;
}

function Card({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={cn('text-2xl font-semibold mt-0.5', tone)}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Bars({ values, labels, highlightMax }: { values: number[]; labels: string[]; highlightMax?: boolean }) {
  const max = Math.max(1, ...values);
  const top = values.indexOf(Math.max(...values));
  return (
    <div className="flex items-end gap-1 h-28" role="img" aria-label={labels.map((l, i) => `${l}: ${values[i]}`).join(', ')}>
      {values.map((v, i) => (
        <div key={labels[i]} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] text-gray-400">{v || ''}</span>
          <div className="w-full rounded-t bg-white/5 flex items-end" style={{ height: '80px' }}>
            <div
              className={cn('w-full rounded-t', highlightMax && i === top && v > 0 ? 'bg-red-500' : 'bg-blue-500/70')}
              style={{ height: `${Math.max(v ? 6 : 0, (v / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const { isModerator, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: () => api<Overview>(`/api/analytics/overview${days ? `?days=${days}` : ''}`, { auth: true }),
    enabled: isModerator,
    staleTime: 60_000,
  });

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetch(apiUrl(`/api/analytics/export.csv${days ? `?days=${days}` : ''}`), {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ocorrencias-${days ? `${days}d` : 'todas'}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      toast({ title: 'Não foi possível baixar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }
  if (!isModerator) return <Navigate to="/login" replace />;

  const total = data ? data.totalApprovedPins + data.totalPendingPins + data.totalRejectedPins : 0;
  const approvalRate = data && data.totalApprovedPins + data.totalRejectedPins > 0
    ? Math.round((data.totalApprovedPins / (data.totalApprovedPins + data.totalRejectedPins)) * 100)
    : null;
  const byHour = data?.byHour ?? [];
  const periods = [
    { label: 'Madrugada', v: byHour.slice(0, 6).reduce((a, b) => a + b, 0) },
    { label: 'Manhã', v: byHour.slice(6, 12).reduce((a, b) => a + b, 0) },
    { label: 'Tarde', v: byHour.slice(12, 18).reduce((a, b) => a + b, 0) },
    { label: 'Noite', v: byHour.slice(18, 24).reduce((a, b) => a + b, 0) },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#121212] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/5"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-semibold flex items-center gap-2 flex-1">
            <BarChart3 size={20} className="text-blue-400" /> Painel analítico
          </h1>
          <button
            onClick={() => refetch()}
            className="w-11 h-11 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/5"
            aria-label="Atualizar"
          >
            <RefreshCw size={18} className={cn(isFetching && 'animate-spin')} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Período">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              role="radio"
              aria-checked={days === p.days}
              onClick={() => setDays(p.days)}
              className={cn('h-10 px-4 rounded-full text-sm border shrink-0', days === p.days ? 'bg-blue-600 border-transparent' : 'border-white/15 text-gray-300')}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={downloadCsv}
            disabled={downloading}
            className="ml-auto h-10 px-4 rounded-full text-sm border border-white/15 text-gray-200 flex items-center gap-2 shrink-0"
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
        ) : isError || !data ? (
          <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-6 text-center space-y-3">
            <p className="text-sm text-red-300">Não foi possível carregar os dados.</p>
            <button onClick={() => refetch()} className="h-11 px-4 rounded-lg bg-white/10 text-sm">Tentar de novo</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Card label="Relatos no período" value={total} />
              <Card label="Publicados" value={data.totalApprovedPins} tone="text-emerald-300" hint={approvalRate != null ? `${approvalRate}% aprovados` : undefined} />
              <Card label="Na fila" value={data.totalPendingPins} tone="text-yellow-300" hint={data.oldestPendingHours != null ? `mais antigo há ${fmtHours(data.oldestPendingHours)}` : 'fila vazia'} />
              <Card label="Recusados" value={data.totalRejectedPins} tone="text-red-300" />
              <Card label="Tempo médio de revisão" value={fmtHours(data.averageApprovalHours)} />
              <Card label="Resolvidos" value={data.resolvedCount ?? 0} hint={data.citizenResolvedCount ? `${data.citizenResolvedCount} indicados por cidadãos` : undefined} />
            </div>

            <section className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4 space-y-3">
              <h2 className="text-sm font-semibold">Publicados por semana</h2>
              <Bars
                values={data.weeklyTrend.map((w) => w.count)}
                labels={data.weeklyTrend.map((w) => new Date(w.weekStart + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))}
              />
            </section>

            <div className="grid sm:grid-cols-2 gap-3">
              <section className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4 space-y-3">
                <h2 className="text-sm font-semibold">Horário dos relatos</h2>
                <Bars values={periods.map((p) => p.v)} labels={periods.map((p) => p.label)} highlightMax />
              </section>
              <section className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4 space-y-2">
                <h2 className="text-sm font-semibold">Por tipo</h2>
                {data.byType.length === 0 && <p className="text-sm text-gray-400">Sem dados no período.</p>}
                {data.byType.map((t) => {
                  const pct = data.totalApprovedPins ? Math.round((t.count / data.totalApprovedPins) * 100) : 0;
                  return (
                    <div key={t.type} className="space-y-1">
                      <div className="flex justify-between text-sm"><span>{TYPE_LABEL[t.type] ?? t.type}</span><span className="text-gray-300">{t.count} · {pct}%</span></div>
                      <div className="h-2 rounded bg-white/5"><div className={cn('h-2 rounded', t.type === 'crime' ? 'bg-red-500' : 'bg-orange-500')} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </section>
            </div>

            {(data.hotspots?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4 space-y-2">
                <h2 className="text-sm font-semibold">Pontos com mais relatos (~1 km)</h2>
                <ul className="divide-y divide-white/5">
                  {data.hotspots!.map((h, i) => (
                    <li key={`${h.lat},${h.lng}`}>
                      <button
                        onClick={() => navigate(`/?lat=${h.lat}&lng=${h.lng}&z=15`)}
                        className="w-full flex items-center gap-3 py-2.5 min-h-11 text-left hover:bg-white/5 rounded"
                      >
                        <span className="w-6 text-xs text-gray-400">{i + 1}º</span>
                        <MapPin size={15} className="text-red-400" />
                        <span className="flex-1 text-sm text-gray-300">{h.lat.toFixed(3)}, {h.lng.toFixed(3)}</span>
                        <span className="text-sm font-semibold">{h.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.byNeighborhood.length > 0 && (
              <section className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4 space-y-2">
                <h2 className="text-sm font-semibold">Estatísticas por bairro</h2>
                <ul className="divide-y divide-white/5">
                  {[...data.byNeighborhood].sort((a, b) => b.totalQuantity - a.totalQuantity).map((n) => (
                    <li key={n.markerId ?? n.neighborhood} className="flex justify-between py-2 text-sm">
                      <span className="text-gray-200">{n.neighborhood}</span>
                      <span className="font-semibold">{n.totalQuantity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
