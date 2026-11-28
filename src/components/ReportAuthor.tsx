import { BadgeCheck } from 'lucide-react';
import { resolveImageUrl } from '@/lib/media';
import type { Pin } from '@/types';

/** "Relatado por" card for reports sent by a partner (photo, name, verified seal). */
export function ReportAuthor({ author }: { author: NonNullable<Pin['author']> }) {
  const initials = author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <div className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2.5">
      {author.avatarUrl ? (
        <img src={resolveImageUrl(author.avatarUrl)} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-violet-400/60 shrink-0" />
      ) : (
        <span className="w-11 h-11 rounded-full bg-violet-600 text-white font-semibold flex items-center justify-center shrink-0">{initials || '?'}</span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">Relatado por</p>
        <p className="text-sm font-semibold text-white truncate">{author.name}</p>
        <p className="text-[11px] text-violet-300 flex items-center gap-1"><BadgeCheck size={12} /> Parceiro verificado</p>
      </div>
    </div>
  );
}
