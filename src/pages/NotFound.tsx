import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-[100dvh] bg-[#121212] text-white flex items-center justify-center p-6">
    <div className="text-center space-y-4 max-w-sm">
      <MapPinOff className="mx-auto text-gray-400" size={40} />
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-gray-300">O endereço que você abriu não existe ou foi removido.</p>
      <Link to="/" className="inline-flex h-11 px-5 items-center rounded-lg bg-white text-black text-sm font-semibold">
        Voltar ao mapa
      </Link>
    </div>
  </div>
);

export default NotFound;
