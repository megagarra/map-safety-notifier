import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { ArrowLeft, Loader2, Shield } from 'lucide-react';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: 'Campos obrigatórios', description: 'Informe email e senha.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast({ title: 'Login realizado', description: 'Bem-vindo de volta.' });
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Credenciais inválidas.';
      toast({ title: 'Erro ao entrar', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Shield size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Entrar</h1>
              <p className="text-sm text-gray-400">Acesso para moderadores, admins e usuários cadastrados</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#121212] border-[#2a2a2a] text-white"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#121212] border-[#2a2a2a] text-white"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" /> Entrando...</> : 'Entrar'}
          </Button>
        </form>

        <div className="px-6 pb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
            Voltar ao mapa
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
