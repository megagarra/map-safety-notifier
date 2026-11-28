import { useEffect, useState } from 'react';
import { parseCep, searchCep, searchPlaces, type Place } from '@/lib/placeSearch';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { fetchUsers, registerUser, updateUser, deleteUser } from '@/controllers/auth';
import { AgencyKind, AuthUser, PinType, UserRole, RegisterInput } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { ArrowLeft, Loader2, UserPlus, Pencil, Trash2, X, Check, BadgeCheck, MapPin } from 'lucide-react';
import { AGENCY_KIND_LABELS } from '@/components/OfficialResponse';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  moderator: 'Moderador',
  agency: 'Órgão público',
  user: 'Usuário',
};

const ROLE_HELP: Record<UserRole, string> = {
  admin: 'Acesso total: moderação, usuários, órgãos e configurações.',
  moderator: 'Aprova ou rejeita relatos, bloqueia autores, vê o painel analítico.',
  agency: 'Prefeitura, Guarda ou Polícia: marca ocorrências como recebidas, em andamento ou resolvidas, com resposta pública assinada. Não modera.',
  user: 'Conta comum, sem limites de envio. Não modera.',
};

const TYPE_LABELS: Record<PinType, string> = { infraestrutura: 'Infraestrutura', crime: 'Crime' };

// What each kind of agency answers by default (same as the server).
const DEFAULT_TYPES: Record<AgencyKind, PinType[]> = {
  prefeitura: ['infraestrutura'],
  guarda: ['crime'],
  policia: ['crime'],
  outro: ['infraestrutura'],
};

type AgencyFields = {
  organization: string;
  agencyKind: AgencyKind;
  answerTypes: PinType[];
  hq: { lat: number; lng: number; address: string } | null;
  radiusKm: number;
};

function AgencyFieldsEditor({ value, onChange, compact }: { value: AgencyFields; onChange: (v: AgencyFields) => void; compact?: boolean }) {
  const toggle = (t: PinType) =>
    onChange({ ...value, answerTypes: value.answerTypes.includes(t) ? value.answerTypes.filter((x) => x !== t) : [...value.answerTypes, t] });
  return (
    <div className={cn('space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5', compact ? 'p-2' : 'p-3')}>
      <Input
        placeholder="Nome público do órgão (ex.: Prefeitura de Franco da Rocha)"
        value={value.organization}
        onChange={(e) => onChange({ ...value, organization: e.target.value })}
        className="bg-[#121212] border-[#2a2a2a] text-white"
      />
      <select
        value={value.agencyKind}
        onChange={(e) => {
          const k = e.target.value as AgencyKind;
          onChange({ ...value, agencyKind: k, answerTypes: DEFAULT_TYPES[k] });
        }}
        className="w-full h-10 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-3 text-sm"
        aria-label="Tipo de órgão"
      >
        {(Object.keys(AGENCY_KIND_LABELS) as AgencyKind[]).map((k) => (
          <option key={k} value={k}>{AGENCY_KIND_LABELS[k]}</option>
        ))}
      </select>
      <div>
        <p className="text-xs text-gray-400 mb-1.5">Pode responder ocorrências de:</p>
        <div className="flex gap-2">
          {(Object.keys(TYPE_LABELS) as PinType[]).map((t) => (
            <label key={t} className="flex items-center gap-2 h-9 px-3 rounded-full border border-white/15 text-sm text-gray-200 cursor-pointer">
              <input type="checkbox" checked={value.answerTypes.includes(t)} onChange={() => toggle(t)} className="accent-emerald-500" />
              {TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </div>
      <HqPicker value={value.hq} onChange={(hq) => onChange({ ...value, hq })} />
      <div>
        <p className="text-xs text-gray-400 mb-1.5">Área atendida (raio a partir da sede)</p>
        <select
          value={value.radiusKm}
          onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })}
          className="w-full h-10 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-3 text-sm"
          aria-label="Área atendida"
        >
          {[2, 3, 5, 8, 10, 15].map((km) => <option key={km} value={km}>{km} km</option>)}
        </select>
      </div>
    </div>
  );
}

/** Headquarters address: search a street/place/CEP and pick it (shown on the map as a building). */
function HqPicker({ value, onChange }: { value: AgencyFields['hq']; onChange: (v: AgencyFields['hq']) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const term = q.trim();
    const cep = parseCep(term);
    if (!cep && term.length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(cep ? await searchCep(cep, ctrl.signal).then((p) => (p && !p.outside ? [p] : [])) : await searchPlaces(term, null, ctrl.signal));
      } catch { /* aborted or offline */ } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  if (value) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-[#121212] border border-[#2a2a2a] p-2">
        <MapPin size={15} className="mt-0.5 text-emerald-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white truncate">{value.address || 'Sede marcada'}</p>
          <p className="text-[11px] text-gray-500">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-blue-400 min-h-8 px-1">Trocar</button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          placeholder="Endereço da sede (rua, número ou CEP)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-[#121212] border-[#2a2a2a] text-white pr-8"
        />
        {loading && <Loader2 size={14} className="animate-spin text-gray-400 absolute right-2.5 top-3" />}
      </div>
      {results.length > 0 && (
        <ul className="rounded-md border border-[#2a2a2a] bg-[#121212] max-h-48 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { onChange({ lat: r.lat, lng: r.lng, address: [r.title, r.subtitle].filter(Boolean).join(' — ') }); setQ(''); setResults([]); }}
                className="w-full text-left px-3 py-2 min-h-11 hover:bg-white/5"
              >
                <span className="block text-sm text-gray-100 truncate">{r.title}</span>
                {r.subtitle && <span className="block text-xs text-gray-500 truncate">{r.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-gray-500">Opcional. Com a sede marcada, o órgão aparece no mapa como um prédio com o placar de ocorrências resolvidas.</p>
    </div>
  );
}

const emptyAgency = (): AgencyFields => ({ organization: '', agencyKind: 'prefeitura', answerTypes: DEFAULT_TYPES.prefeitura, hq: null, radiusKm: 5 });

const agencyPayload = (a: AgencyFields) => ({
  organization: a.organization.trim(),
  agencyKind: a.agencyKind,
  answerTypes: a.answerTypes,
  ...(a.hq && { hqLat: a.hq.lat, hqLng: a.hq.lng, hqAddress: a.hq.address }),
  serviceRadiusKm: a.radiusKm,
});

export function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [roleFilter, setRoleFilter] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('agency');
  const [agency, setAgency] = useState<AgencyFields>(emptyAgency);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editAgency, setEditAgency] = useState<AgencyFields>(emptyAgency);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['auth', 'users', roleFilter],
    queryFn: () => fetchUsers(roleFilter || undefined),
    enabled: isAdmin,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const agencyInvalid = (a: AgencyFields) =>
    !a.organization.trim() ? 'Informe o nome público do órgão.' : !a.answerTypes.length ? 'Escolha ao menos um tipo de ocorrência.' : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 10) {
      toast({ title: 'Dados inválidos', description: 'Email e senha (mín. 10 caracteres, não óbvia) são obrigatórios.', variant: 'destructive' });
      return;
    }
    if (role === 'agency' && agencyInvalid(agency)) {
      toast({ title: 'Dados do órgão', description: agencyInvalid(agency)!, variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const input: RegisterInput = {
        email: email.trim(),
        password,
        role,
        ...(name.trim() && { name: name.trim() }),
        ...(role === 'agency' && agencyPayload(agency)),
      };
      await registerUser(input);
      toast({ title: 'Conta criada', description: `${email} cadastrado como ${ROLE_LABELS[role].toLowerCase()}.` });
      setEmail(''); setPassword(''); setName(''); setAgency(emptyAgency());
      refetch();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof ApiError ? err.message : 'Falha ao criar.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (u: AuthUser) => {
    setEditingUser(u);
    setEditName(u.name ?? '');
    setEditRole(u.role);
    setEditActive(u.isActive);
    setEditPassword('');
    setEditAgency({
      organization: u.organization ?? '',
      agencyKind: u.agencyKind ?? 'prefeitura',
      answerTypes: u.answerTypes?.length ? u.answerTypes : DEFAULT_TYPES[u.agencyKind ?? 'prefeitura'],
      hq: u.hqLat != null && u.hqLng != null ? { lat: u.hqLat, lng: u.hqLng, address: u.hqAddress ?? '' } : null,
      radiusKm: u.serviceRadiusKm ?? 5,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (editPassword && editPassword.length < 10) {
      toast({ title: 'Senha muito curta', description: 'A nova senha precisa ter pelo menos 10 caracteres.', variant: 'destructive' });
      return;
    }
    if (editRole === 'agency' && agencyInvalid(editAgency)) {
      toast({ title: 'Dados do órgão', description: agencyInvalid(editAgency)!, variant: 'destructive' });
      return;
    }
    setActionId(editingUser.id);
    try {
      await updateUser(editingUser.id, {
        name: editName.trim() || undefined,
        role: editRole,
        isActive: editActive,
        ...(editPassword && { password: editPassword }),
        ...(editRole === 'agency' && agencyPayload(editAgency)),
      });
      toast({ title: 'Conta atualizada' });
      setEditingUser(null);
      refetch();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof ApiError ? err.message : 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (u: AuthUser) => {
    if (!window.confirm(`Excluir a conta ${u.email}? Essa ação não pode ser desfeita.`)) return;
    setActionId(u.id);
    try {
      await deleteUser(u.id);
      toast({ title: 'Conta excluída' });
      refetch();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof ApiError ? err.message : 'Falha ao excluir.', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const roleOptions = (['agency', 'moderator', 'admin', 'user'] as UserRole[]).map((r) => (
    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
  ));

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white" aria-label="Voltar ao mapa"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-semibold">Contas e órgãos públicos</h1>
            <p className="text-sm text-gray-400">Somente administradores</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus size={16} /> Nova conta</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full h-10 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-3 text-sm" aria-label="Tipo de conta">
              {roleOptions}
            </select>
            <p className="text-xs text-gray-400 -mt-1">{ROLE_HELP[role]}</p>
            {role === 'agency' && <AgencyFieldsEditor value={agency} onChange={setAgency} />}
            <Input placeholder="Email de acesso" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <Input placeholder={role === 'agency' ? 'Responsável (opcional, não aparece ao público)' : 'Nome (opcional)'} value={name} onChange={(e) => setName(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <Input placeholder="Senha (mín. 10)" autoComplete="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Criar conta'}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Contas ({users.length})</h2>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-8 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-2 text-xs" aria-label="Filtrar por tipo">
              <option value="">Todas</option>
              <option value="agency">Órgãos públicos</option>
              <option value="moderator">Moderadores</option>
              <option value="admin">Admins</option>
              <option value="user">Usuários</option>
            </select>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="p-3 rounded-lg bg-[#121212] border border-[#2a2a2a]">
                  {editingUser?.id === u.id ? (
                    <div className="space-y-2">
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="w-full h-9 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 text-sm" aria-label="Tipo de conta">
                        {roleOptions}
                      </select>
                      {editRole === 'agency' && <AgencyFieldsEditor value={editAgency} onChange={setEditAgency} compact />}
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className="h-9 text-sm bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                        Conta ativa
                      </label>
                      <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Nova senha (opcional, mín. 10)" type="password" autoComplete="new-password" className="h-9 text-sm bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={actionId === u.id} className="flex-1 h-9 text-sm">
                          {actionId === u.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} className="mr-1" /> Salvar</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingUser(null)} className="h-9 border-[#2a2a2a] text-white" aria-label="Cancelar"><X size={14} /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {u.role === 'agency' && u.organization ? (
                          <p className="text-sm font-medium flex items-center gap-1.5"><BadgeCheck size={14} className="text-emerald-400 shrink-0" /> {u.organization}</p>
                        ) : (
                          <p className="text-sm font-medium">{u.name || u.email}</p>
                        )}
                        <p className="text-xs text-gray-500 truncate">{u.email}{u.role === 'agency' && u.name ? ` · ${u.name}` : ''}</p>
                        <div className="flex flex-wrap gap-x-2 mt-1">
                          <span className="text-xs text-blue-400">
                            {u.role === 'agency' && u.agencyKind ? AGENCY_KIND_LABELS[u.agencyKind] : ROLE_LABELS[u.role]}
                          </span>
                          {u.role === 'agency' && !!u.answerTypes?.length && (
                            <span className="text-xs text-gray-400">responde: {u.answerTypes.map((t) => TYPE_LABELS[t]).join(', ')}</span>
                          )}
                          {!u.isActive && <span className="text-xs text-red-400">Inativa</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(u)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white" aria-label={`Editar ${u.email}`}><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(u)} disabled={actionId === u.id} className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-300" aria-label={`Excluir ${u.email}`}>
                          {actionId === u.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;
