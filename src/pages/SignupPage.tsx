
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'client' | 'security'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !phone || !password || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // TODO: integrar com backend real (Supabase)
      toast({
        title: "Indisponível",
        description: "Cadastro ainda não configurado. Aguarde a integração com o backend.",
        variant: "destructive"
      });
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao criar conta. Tente novamente.",
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
          Criar conta no <span className="text-green-400">Secure</span>Me
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Preencha seus dados para criar sua conta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1a1a1a] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[#333]">
          <form className="space-y-6" onSubmit={handleSignup}>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="role-client" className="text-white">Tipo de conta</Label>
                <div className="mt-1 flex space-x-2">
                  <div 
                    className={`flex-1 p-3 border rounded-md cursor-pointer transition-colors ${
                      role === 'client' 
                        ? 'bg-green-500/20 border-green-500 text-white' 
                        : 'bg-[#232323] border-[#333] text-gray-400'
                    }`}
                    onClick={() => setRole('client')}
                  >
                    <div className="text-center">Cliente</div>
                  </div>
                  <div 
                    className={`flex-1 p-3 border rounded-md cursor-pointer transition-colors ${
                      role === 'security' 
                        ? 'bg-green-500/20 border-green-500 text-white' 
                        : 'bg-[#232323] border-[#333] text-gray-400'
                    }`}
                    onClick={() => setRole('security')}
                  >
                    <div className="text-center">Segurança</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="name" className="text-white">
                Nome completo
              </Label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#232323] border-[#333] text-white"
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-white">
                Telefone
              </Label>
              <div className="mt-1">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[#232323] border-[#333] text-white"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#232323] border-[#333] text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-white">
                Confirmar senha
              </Label>
              <div className="mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#232323] border-[#333] text-white"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-green-400 hover:text-green-300">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
