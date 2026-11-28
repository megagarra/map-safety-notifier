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
import { uploadImage } from '@/controllers/pins';
import { resolveImageUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  moderator: 'Moderador',
  agency: 'Órgão público',
  partner: 'Parceiro',
  user: 'Usuário',
};

const ROLE_HELP: Record<UserRole, string> = {
  admin: 'Acesso total: moderação, usuários, órgãos e configurações.',
  moderator: 'Aprova ou rejeita relatos, bloqueia autores, vê o painel analítico.',
  agency: 'Prefeitura, Guarda ou Polícia: marca ocorrências como recebidas, em andamento ou resolvidas, com resposta pública assinada. Não modera.',
  partner: 'Envia quantas denúncias quiser; elas entram direto no mapa com o nome e a foto do parceiro. Não pode editar nem apagar nada.',
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
  city: string;
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
      <HqPicker
        value={value.hq}
        onChange={(hq, city) => onChange({ ...value, hq, ...(city && !value.city.trim() ? { city } : {}) })}
      />
      <div>
        <Input
          placeholder="Cidade (ex.: Franco da Rocha)"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className="bg-[#121212] border-[#2a2a2a] text-white"
        />
        <p className="text-[11px] text-gray-500 mt-1">Órgãos da mesma cidade aparecem juntos em um único prédio no mapa.</p>
      </div>
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
function HqPicker({ value, onChange }: { value: AgencyFields['hq']; onChange: (v: AgencyFields['hq'], city?: string) => void }) {
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
                onClick={() => { onChange({ lat: r.lat, lng: r.lng, address: [r.title, r.subtitle].filter(Boolean).join(' — ') }, cityFrom(r.subtitle)); setQ(''); setResults([]); }}
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

/** "Centro — Franco da Rocha/SP — CEP ..." -> "Franco da Rocha" */
function cityFrom(subtitle?: string): string | undefined {
  const m = subtitle?.match(/([^—]+?)\s*\/\s*[A-Z]{2}/);
  return m?.[1].trim();
}

/** Partner photo: upload through the app (same pipeline as report photos), shown on their reports. */
function AvatarPicker({ value, onChange, name }: { value: string | null; onChange: (url: string | null) => void; name: string }) {
  const [uploading, setUploading] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      toast({ title: 'Erro na foto', description: err instanceof ApiError ? err.message : 'Não foi possível enviar a foto.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return (
    <div className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
      {value ? (
        <img src={resolveImageUrl(value)} alt="Foto do parceiro" className="w-14 h-14 rounded-full object-cover border-2 border-violet-400/60" />
      ) : (
        <span className="w-14 h-14 rounded-full bg-violet-600/60 text-white font-semibold flex items-center justify-center">{initials || '?'}</span>
      )}
      <div className="space-y-1">
        <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-white/10 hover:bg-white/20 text-sm text-white cursor-pointer">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
          {value ? 'Trocar foto' : 'Enviar foto'}
          <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {value && <button type="button" onClick={() => onChange(null)} className="block text-xs text-gray-400 hover:text-white">Remover foto</button>}
        <p className="text-[11px] text-gray-500">Aparece nas denúncias do parceiro.</p>
      </div>
    </div>
  );
}

const emptyAgency = (): AgencyFields => ({ organization: '', agencyKind: 'prefeitura', answerTypes: DEFAULT_TYPES.prefeitura, hq: null, radiusKm: 5, city: '' });

const agencyPayload = (a: AgencyFields) => ({
  organization: a.organization.trim(),
  agencyKind: a.agencyKind,
  answerTypes: a.answerTypes,
  ...(a.hq && { hqLat: a.hq.lat, hqLng: a.hq.lng, hqAddress: a.hq.address }),
  serviceRadiusKm: a.radiusKm,
  ...(a.city.trim() && { city: a.city.trim() }),
});

export function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [roleFilter, setRoleFilter] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('agency');
  const [agency, setAgency] = useState<AgencyFields>(emptyAgency);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editAgency, setEditAgency] = useState<AgencyFields>(emptyAgency);
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
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
    if (role === 'partner' && !name.trim()) {
      toast({ title: 'Nome do parceiro', description: 'Informe o nome que vai aparecer nas denúncias.', variant: 'destructive' });
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
        ...(role === 'partner' && avatar && { avatarUrl: avatar }),
      };
      await registerUser(input);
      toast({ title: 'Conta criada', description: `${email} cadastrado como ${ROLE_LABELS[role].toLowerCase()}.` });
      setEmail(''); setPassword(''); setName(''); setAgency(emptyAgency()); setAvatar(null);
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
    setEditAvatar(u.avatarUrl ?? null);
    setEditAgency({
      organization: u.organization ?? '',
      agencyKind: u.agencyKind ?? 'prefeitura',
      answerTypes: u.answerTypes?.length ? u.answerTypes : DEFAULT_TYPES[u.agencyKind ?? 'prefeitura'],
      hq: u.hqLat != null && u.hqLng != null ? { lat: u.hqLat, lng: u.hqLng, address: u.hqAddress ?? '' } : null,
      radiusKm: u.serviceRadiusKm ?? 5,
      city: u.city ?? '',
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
        ...(editRole === 'partner' && { avatarUrl: editAvatar ?? '' }),
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

  const roleOptions = (['agency', 'partner', 'moderator', 'admin', 'user'] as UserRole[]).map((r) => (
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
            {role === 'partner' && <AvatarPicker value={avatar} onChange={setAvatar} name={name} />}
            <Input placeholder="Email de acesso" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <Input placeholder={role === 'agency' ? 'Responsável (opcional, não aparece ao público)' : role === 'partner' ? 'Nome público (aparece nas denúncias)' : 'Nome (opcional)'} value={name} onChange={(e) => setName(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
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
              <option value="partner">Parceiros</option>
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
                      {editRole === 'partner' && <AvatarPicker value={editAvatar} onChange={setEditAvatar} name={editName} />}
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
                        {u.role === 'partner' ? (
                          <p className="text-sm font-medium flex items-center gap-2">
                            {u.avatarUrl ? <img src={resolveImageUrl(u.avatarUrl)} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" /> : null}
                            {u.name || u.email}
                          </p>
                        ) : u.role === 'agency' && u.organization ? (
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
                          {u.role === 'agency' && u.city && <span className="text-xs text-gray-400">{u.city}</span>}
                          {u.role === 'agency' && u.hqLat == null && <span className="text-xs text-amber-400">sem sede no mapa</span>}
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
