
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, Star, Map, Clock, CheckCircle } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#121212] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/security-bg.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent"></div>
        
        <div className="container mx-auto px-4 z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-green-400">Secure</span>Me
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Segurança pessoal sob demanda. Conectamos você a profissionais de segurança quando e onde precisar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <Link to="/dashboard">Solicitar Segurança</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-500/10">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-[#1a1a1a]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Como funciona</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#232323] p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Map className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Solicite</h3>
              <p className="text-gray-400">Escolha seu destino e horário. Solicite um segurança para acompanhá-lo.</p>
            </div>
            
            <div className="bg-[#232323] p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Shield className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Conecte-se</h3>
              <p className="text-gray-400">Profissionais verificados aceitam sua solicitação e vão até você.</p>
            </div>
            
            <div className="bg-[#232323] p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Viaje seguro</h3>
              <p className="text-gray-400">Sinta-se seguro com acompanhamento profissional até seu destino.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[#121212]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Recursos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Clock className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Atendimento 24/7</h3>
                <p className="text-gray-400">Solicite segurança a qualquer hora, dia ou noite. Estamos sempre disponíveis para você.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <User className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Profissionais Verificados</h3>
                <p className="text-gray-400">Todos os profissionais passam por rigorosa verificação de antecedentes e treinamento.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Map className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Rastreamento em Tempo Real</h3>
                <p className="text-gray-400">Compartilhe sua localização com familiares durante todo o percurso.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Star className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Avaliações Transparentes</h3>
                <p className="text-gray-400">Veja avaliações e escolha o profissional mais bem avaliado da sua região.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-green-900/30 to-blue-900/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Pronto para se sentir mais seguro?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Crie sua conta e tenha acesso a segurança sob demanda em poucos cliques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <Link to="/signup">Criar Conta</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-500/10">
              <Link to="/about">Saiba Mais</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#1a1a1a] border-t border-[#333]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold">
                <span className="text-green-400">Secure</span>Me
              </h2>
              <p className="text-gray-400">Segurança pessoal sob demanda</p>
            </div>
            
            <div className="flex gap-6">
              <Link to="/about" className="text-gray-400 hover:text-white">Sobre</Link>
              <Link to="/contact" className="text-gray-400 hover:text-white">Contato</Link>
              <Link to="/privacy" className="text-gray-400 hover:text-white">Privacidade</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white">Termos</Link>
            </div>
          </div>
          
          <div className="mt-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} SecureMe. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
