import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as AnalyticsController from '@/controllers/analytics';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, BarChart3 } from 'lucide-react';

export function AnalyticsPage() {
  const { isModerator, isLoading: authLoading } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: AnalyticsController.fetchAnalyticsOverview,
    enabled: isModerator,
    staleTime: 60_000,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  if (!isModerator) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-400" />
              Painel analítico
            </h1>
            <p className="text-sm text-gray-400">Visão geral de ocorrências e bairros</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-gray-400" size={28} />
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            Não foi possível carregar GET /api/analytics/overview.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total pins', value: data?.totalPins },
                { label: 'Pendentes', value: data?.pendingCount },
                { label: 'Aprovados', value: data?.approvedCount },
                { label: 'Rejeitados', value: data?.rejectedCount },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold mt-1">{card.value ?? '—'}</p>
                </div>
              ))}
            </div>

            {typeof data?.averageApprovalHours === 'number' && (
              <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                <p className="text-xs text-gray-500">Tempo médio de aprovação</p>
                <p className="text-lg font-medium mt-1">{data.averageApprovalHours.toFixed(1)} h</p>
              </div>
            )}

            {data?.pinsByType && data.pinsByType.length > 0 && (
              <section className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
                <h2 className="text-sm font-medium text-gray-300">Pins por tipo</h2>
                {data.pinsByType.map((row) => (
                  <div key={row.type} className="flex justify-between text-sm">
                    <span className="text-gray-400">{row.label ?? row.type}</span>
                    <span className="font-medium">{row.count}</span>
                  </div>
                ))}
              </section>
            )}

            {data?.neighborhoodStats && data.neighborhoodStats.length > 0 && (
              <section className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
                <h2 className="text-sm font-medium text-gray-300">Estatísticas por bairro</h2>
                {data.neighborhoodStats.map((row) => (
                  <div key={row.neighborhood} className="flex justify-between gap-3 text-sm border-b border-[#2a2a2a]/60 pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="text-gray-200 truncate">{row.neighborhood}</p>
                      {row.periodLabel && <p className="text-[11px] text-gray-500 truncate">{row.periodLabel}</p>}
                    </div>
                    <span className="text-violet-300 font-semibold shrink-0">{row.entryCount}</span>
                  </div>
                ))}
              </section>
            )}

            {data?.weeklyTrend && data.weeklyTrend.length > 0 && (
              <section className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
                <h2 className="text-sm font-medium text-gray-300">Tendência semanal</h2>
                {data.weeklyTrend.map((row) => (
                  <div key={row.week} className="flex justify-between text-sm">
                    <span className="text-gray-400">{row.label ?? row.week}</span>
                    <span className="font-medium">{row.count}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
