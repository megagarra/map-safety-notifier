
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Shield, Phone, Mail, Star } from 'lucide-react';

interface SecurityProfileCardProps {
  security: User;
  onClose: () => void;
  onSelect: () => void;
}

const SecurityProfileCard = ({ security, onClose, onSelect }: SecurityProfileCardProps) => {
  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          {security.image ? (
            <img
              src={security.image}
              alt={security.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <Shield size={24} />
            </div>
          )}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-white">{security.name}</h3>
          {security.rating && (
            <div className="flex items-center text-yellow-400 text-sm mt-1">
              <Star size={14} className="mr-1" />
              <span>{security.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center text-gray-300 text-sm">
          <Phone size={14} className="mr-2 text-gray-400" />
          {security.phone}
        </div>
        <div className="flex items-center text-gray-300 text-sm">
          <Mail size={14} className="mr-2 text-gray-400" />
          {security.email}
        </div>
      </div>

      <div className="p-3 bg-[#232323] rounded-md border border-[#333] mb-4">
        <h4 className="text-sm font-medium text-white mb-1">Sobre</h4>
        <p className="text-sm text-gray-300">
          Profissional de segurança com mais de 5 anos de experiência. 
          Especializado em escolta pessoal e serviços de segurança privada.
        </p>
      </div>

      <div className="flex space-x-3 mt-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-[#333] text-gray-300"
        >
          Voltar
        </Button>
        <Button
          onClick={onSelect}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          Selecionar
        </Button>
      </div>
    </div>
  );
};

export default SecurityProfileCard;
