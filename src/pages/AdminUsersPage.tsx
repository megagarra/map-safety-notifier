import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { fetchUsers, registerUser, updateUser, deleteUser } from '@/controllers/auth';
import { AuthUser, UserRole, RegisterInput } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { ArrowLeft, Loader2, UserPlus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  moderator: 'Moderador',
  user: 'Usuário',
};

export function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      toast({ title: 'Dados inválidos', description: 'Email e senha (mín. 8 caracteres) são obrigatórios.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const input: RegisterInput = { email: email.trim(), password, role, ...(name.trim() && { name: name.trim() }) };
      await registerUser(input);
      toast({ title: 'Usuário criado', description: `${email} cadastrado.` });
      setEmail(''); setPassword(''); setName(''); setRole('user');
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
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setActionId(editingUser.id);
    try {
      await updateUser(editingUser.id, {
        name: editName.trim() || undefined,
        role: editRole,
        isActive: editActive,
        ...(editPassword.length >= 8 && { password: editPassword }),
      });
      toast({ title: 'Usuário atualizado' });
      setEditingUser(null);
      refetch();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof ApiError ? err.message : 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      await deleteUser(id);
      toast({ title: 'Usuário excluído' });
      refetch();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof ApiError ? err.message : 'Falha ao excluir.', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-semibold">Gestão de usuários</h1>
            <p className="text-sm text-gray-400">Somente administradores</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus size={16} /> Novo usuário</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <Input placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <Input placeholder="Senha (mín. 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#121212] border-[#2a2a2a] text-white" />
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full h-10 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-3 text-sm">
              <option value="user">Usuário</option>
              <option value="moderator">Moderador</option>
              <option value="admin">Administrador</option>
            </select>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Criar usuário'}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Usuários ({users.length})</h2>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-8 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-2 text-xs">
              <option value="">Todos</option>
              <option value="user">Usuários</option>
              <option value="moderator">Moderadores</option>
              <option value="admin">Admins</option>
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
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className="h-8 text-sm bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="w-full h-8 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 text-xs">
                        <option value="user">Usuário</option>
                        <option value="moderator">Moderador</option>
                        <option value="admin">Admin</option>
                      </select>
                      <label className="flex items-center gap-2 text-xs text-gray-300">
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                        Conta ativa
                      </label>
                      <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Nova senha (opcional)" type="password" className="h-8 text-sm bg-[#1a1a1a] border-[#2a2a2a] text-white" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={actionId === u.id} className="flex-1 h-7 text-xs">
                          {actionId === u.id ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} className="mr-1" /> Salvar</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingUser(null)} className="h-7 text-xs border-[#2a2a2a] text-white"><X size={12} /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{u.name || u.email}</p>
                        {u.name && <p className="text-xs text-gray-500">{u.email}</p>}
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-blue-400">{ROLE_LABELS[u.role]}</span>
                          {!u.isActive && <span className="text-xs text-red-400">Inativo</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(u)} className="p-1.5 text-gray-400 hover:text-white"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(u.id)} disabled={actionId === u.id} className="p-1.5 text-red-400 hover:text-red-300">
                          {actionId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
