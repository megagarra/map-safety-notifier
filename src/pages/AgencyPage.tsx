import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, BadgeCheck, Loader2, MapPin, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAgencyQueue } from '@/controllers/pins';
import { OfficialSection, AGENCY_KIND_LABELS } from '@/components/OfficialResponse';
import { getPinConfig } from '@/lib/pinConfig';
import { thumbUrl, fallbackToFull } from '@/lib/media';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  reported: 'Sem resposta',
  acknowledged: 'Recebido',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
};

/** City hall / guard / police: published reports in their area, oldest unanswered first. */
export function AgencyPage() {
  const { user, isAgency, isAdmin, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['agency', 'queue', tab],
    queryFn: () => fetchAgencyQueue(tab),
    enabled: isAgency || isAdmin,
    refetchInterval: 60_000,
  });

  if (authLoading) {
    return <div className="min-h-screen bg-[#121212] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={32} /></div>;
  }
  if (!isAgency && !isAdmin) return <Navigate to="/login" replace />;

  const items = data?.items ?? [];
  const types = isAgency ? (user?.answerTypes ?? []) : ['infraestrutura', 'crime'];

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white" aria-label="Voltar ao mapa"><ArrowLeft size={20} /></Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold flex items-center gap-2 truncate">
              <BadgeCheck size={20} className="text-emerald-400 shrink-0" />
              {isAgency ? user?.organization : 'Painel de órgãos'}
            </h1>
            <p className="text-sm text-gray-400">
              {isAgency && user?.agencyKind ? `${AGENCY_KIND_LABELS[user.agencyKind]} · ` : ''}
              ocorrências de {types.map((t) => (t === 'crime' ? 'crime' : 'infraestrutura')).join(' e ')}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 rounded-lg border border-white/10 bg-white/5 p-3">
          Suas respostas aparecem para todos no mapa, assinadas como <span className="text-gray-200">{isAgency ? user?.organization : 'Administração'}</span>.
          Quem relatou e quem acompanha a região recebe um aviso.
        </p>

        <div className="flex gap-2" role="tablist">
          {(['open', 'resolved'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('h-10 px-4 rounded-full text-sm border', tab === t ? 'bg-white text-[#1a1a1a] border-transparent font-semibold' : 'border-white/15 text-gray-300')}
            >
              {t === 'open' ? 'Em aberto' : 'Resolvidas'}
              {tab === t && data && <span className="ml-1.5 text-xs opacity-70">{data.total}</span>}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : isError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm text-red-300">Não foi possível carregar as ocorrências.</p>
            <button onClick={() => refetch()} className="h-10 px-4 rounded-lg bg-white/10 text-sm">Tentar de novo</button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            {tab === 'open' ? 'Nenhuma ocorrência em aberto. 🎉' : 'Nenhuma ocorrência resolvida ainda.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((pin) => {
              const cfg = getPinConfig(pin.type);
              return (
                <li key={pin.id} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', pin.type === 'crime' ? 'bg-red-500' : 'bg-orange-500')} />
                        {cfg.label}{pin.crimeTypeLabel ? ` · ${pin.crimeTypeLabel}` : ''}
                      </p>
                      {pin.address && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} className="shrink-0" /> <span className="truncate">{pin.address}</span></p>}
                    </div>
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full shrink-0',
                      pin.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-300' : pin.status === 'reported' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300',
                    )}>
                      {STATUS_LABEL[pin.status] ?? pin.status}
                    </span>
                  </div>
                  {pin.description && <p className="text-sm text-gray-200">{pin.description}</p>}
                  {pin.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {pin.images.slice(0, 4).map((img) => (
                        <img key={img} src={thumbUrl(img)} onError={fallbackToFull(img)} alt="" loading="lazy" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDistanceToNow(new Date(pin.reportedAt), { addSuffix: true, locale: ptBR })}</span>
                    {(pin.votes ?? 0) > 0 && <span className="flex items-center gap-1"><ThumbsUp size={11} /> {pin.votes} confirmaram</span>}
                    <Link to={`/?pin=${pin.id}`} className="ml-auto text-blue-400 hover:text-blue-300 min-h-8 flex items-center">Ver no mapa</Link>
                  </div>
                  <OfficialSection pin={pin} onAnswered={() => refetch()} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AgencyPage;
