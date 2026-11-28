import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { officialAnswer } from '@/controllers/pins';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { AgencyKind, OfficialResponse, Pin, PinStatus } from '@/types';

export const AGENCY_KIND_LABELS: Record<AgencyKind, string> = {
  prefeitura: 'Prefeitura',
  guarda: 'Guarda Municipal',
  policia: 'Polícia',
  outro: 'Outro órgão',
};

const STATUS_TEXT: Partial<Record<PinStatus, string>> = {
  acknowledged: 'Recebido por',
  in_progress: 'Em andamento —',
  resolved: 'Resolvido por',
  reported: 'Reaberto por',
};

const ACTIONS: { status: PinStatus; label: string; tone: string }[] = [
  { status: 'acknowledged', label: 'Recebido', tone: 'bg-sky-600 hover:bg-sky-500' },
  { status: 'in_progress', label: 'Em andamento', tone: 'bg-amber-600 hover:bg-amber-500' },
  { status: 'resolved', label: 'Resolvido', tone: 'bg-emerald-600 hover:bg-emerald-500' },
];

/** Public seal: "Resolvido por Prefeitura de Franco da Rocha" + note. */
export function OfficialSeal({ response }: { response: OfficialResponse }) {
  const resolved = response.status === 'resolved';
  return (
    <div className={cn('rounded-lg border p-3', resolved ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-sky-500/40 bg-sky-500/10')}>
      <p className={cn('text-sm font-medium flex items-center gap-1.5', resolved ? 'text-emerald-200' : 'text-sky-200')}>
        <BadgeCheck size={16} className="shrink-0" />
        {STATUS_TEXT[response.status] ?? 'Atualizado por'} {response.org}
      </p>
      {response.comment && <p className="text-sm text-gray-200 mt-1.5">“{response.comment}”</p>}
      {response.at && (
        <p className="text-xs text-gray-400 mt-1">
          Resposta oficial · {formatDistanceToNow(new Date(response.at), { addSuffix: true, locale: ptBR })}
        </p>
      )}
    </div>
  );
}

/** Seal for everyone + answer buttons for the agency that handles this kind of report. */
export function OfficialSection({ pin, onAnswered }: { pin: Pin; onAnswered?: (p: Pin) => void }) {
  const { user, isAgency, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [response, setResponse] = useState<OfficialResponse | null | undefined>(pin.officialResponse);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState<PinStatus | null>(null);
  const canAnswer =
    pin.approvalStatus !== 'pending' &&
    pin.approvalStatus !== 'rejected' &&
    ((isAgency && (user?.answerTypes ?? []).includes(pin.type)) || isAdmin);

  const answer = async (status: PinStatus) => {
    setSending(status);
    try {
      const updated = await officialAnswer(pin.id, status, comment.trim());
      setResponse(updated.officialResponse);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['pins'] });
      queryClient.invalidateQueries({ queryKey: ['agency'] });
      onAnswered?.(updated);
      toast({ title: 'Resposta publicada', description: 'Quem relatou e quem acompanha a região serão avisados.' });
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof ApiError ? err.message : 'Não foi possível responder.', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  if (!response && !canAnswer) return null;
  return (
    <div className="space-y-2">
      {response && <OfficialSeal response={response} />}
      {canAnswer && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          <p className="text-xs text-gray-400">
            Responder como <span className="text-gray-200 font-medium">{isAgency ? user?.organization : 'Administração'}</span> (público)
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Nota pública (opcional). Ex.: Equipe enviada; buraco tapado em 28/11."
            className="w-full rounded-md bg-[#121212] border border-[#2a2a2a] text-white text-base sm:text-sm p-2 placeholder:text-gray-500"
          />
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.status}
                onClick={() => answer(a.status)}
                disabled={!!sending}
                className={cn('h-10 rounded-lg text-white text-xs font-semibold flex items-center justify-center disabled:opacity-60', a.tone, pin.status === a.status && 'ring-2 ring-white/70')}
              >
                {sending === a.status ? <Loader2 size={14} className="animate-spin" /> : a.label}
              </button>
            ))}
          </div>
          {pin.status === 'resolved' && (
            <button onClick={() => answer('reported')} disabled={!!sending} className="text-xs text-gray-400 hover:text-white min-h-8">
              Reabrir (não foi resolvido)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
