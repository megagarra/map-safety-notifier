import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { registerUser } from '@/controllers/auth';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { UserRole } from '@/types';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';

export function AdminUsersPage() {
  const { isAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('moderator');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      toast({
        title: 'Dados inválidos',
        description: 'Informe email e senha com pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await registerUser({ email: email.trim(), password, role });
      toast({ title: 'Usuário criado', description: `${email} cadastrado como ${role}.` });
      setEmail('');
      setPassword('');
      setRole('moderator');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível criar o usuário.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <UserPlus size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Cadastrar usuário</h1>
              <p className="text-sm text-gray-400">Somente administradores</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#121212] border-[#2a2a2a] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#121212] border-[#2a2a2a] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-gray-300">Perfil</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-3 text-sm"
            >
              <option value="moderator">Moderador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" /> Criando...</> : 'Criar usuário'}
          </Button>
        </form>

        <div className="px-6 pb-6 flex gap-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
            Voltar ao mapa
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;
