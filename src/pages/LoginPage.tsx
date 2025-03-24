
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSecurityData } from '@/hooks/useSecurityData';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setCurrentUser } = useSecurityData();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulando login (em uma aplicação real, isso seria uma chamada de API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock login logic - in a real app this would validate with a backend
      if (email === 'cliente@secureme.com' && password === 'senha123') {
        setCurrentUser({
          id: '1',
          name: 'João Silva',
          email: 'cliente@secureme.com',
          phone: '(11) 91234-5678',
          role: 'client'
        });
        
        toast({
          title: "Login bem-sucedido",
          description: "Bem-vindo de volta!",
        });
        
        navigate('/dashboard');
      } else if (email === 'seguranca@secureme.com' && password === 'senha123') {
        setCurrentUser({
          id: '101',
          name: 'Carlos Oliveira',
          email: 'seguranca@secureme.com',
          phone: '(11) 98765-4321',
          role: 'security',
          rating: 4.8,
          image: '/images/security1.jpg'
        });
        
        toast({
          title: "Login bem-sucedido",
          description: "Bem-vindo de volta!",
        });
        
        navigate('/dashboard');
      } else {
        toast({
          title: "Erro de autenticação",
          description: "Email ou senha incorretos",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao fazer login. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-green-400" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          <span className="text-green-400">Secure</span>Me
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Entre com sua conta para continuar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1a1a1a] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[#333]">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#232323] border-[#333] text-white"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-white">
                Senha
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#232323] border-[#333] text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-400">
                  Lembrar-me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="text-green-400 hover:text-green-300">
                  Esqueceu sua senha?
                </a>
              </div>
            </div>
            
            <div className="text-sm text-gray-400 text-center">
              <p>Teste com:</p>
              <p>cliente@secureme.com / senha123 (cliente)</p>
              <p>seguranca@secureme.com / senha123 (segurança)</p>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#333]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a1a1a] text-gray-400">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" className="border-[#333] text-white">
                Google
              </Button>
              <Button variant="outline" className="border-[#333] text-white">
                Facebook
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Não tem uma conta?{' '}
              <Link to="/signup" className="text-green-400 hover:text-green-300">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
