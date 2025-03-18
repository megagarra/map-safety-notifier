
import { ServiceRequest, User } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, Shield, X } from 'lucide-react';

interface ServiceHistoryListProps {
  services: ServiceRequest[];
  currentUser: User;
  onViewDetails: (service: ServiceRequest) => void;
  onClose: () => void;
}

const ServiceHistoryList = ({
  services,
  currentUser,
  onViewDetails,
  onClose
}: ServiceHistoryListProps) => {
  // Sort services by date (most recent first)
  const sortedServices = [...services].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'text-yellow-400';
      case 'accepted':
        return 'text-blue-400';
      case 'in_progress':
        return 'text-green-400';
      case 'completed':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-500/20';
      case 'accepted':
        return 'bg-blue-500/20';
      case 'in_progress':
        return 'bg-green-500/20';
      case 'completed':
        return 'bg-green-600/20';
      default:
        return 'bg-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Solicitado';
      case 'accepted':
        return 'Aceito';
      case 'in_progress':
        return 'Em andamento';
      case 'completed':
        return 'Concluído';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock size={14} />;
      case 'accepted':
        return <Shield size={14} />;
      case 'in_progress':
        return <Shield size={14} />;
      case 'completed':
        return <CheckCircle size={14} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Histórico de Serviços</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <X size={16} />
        </Button>
      </div>

      {sortedServices.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-500 mx-auto mb-2 opacity-50" />
          <p className="text-gray-400">Nenhum serviço no histórico</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedServices.map((service) => (
            <div
              key={service.id}
              className="bg-[#232323] rounded-md border border-[#333] p-3 cursor-pointer hover:border-green-500/30 transition-colors"
              onClick={() => onViewDetails(service)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-white font-medium">
                    {currentUser.role === 'client'
                      ? service.securityName || 'Segurança não atribuído'
                      : service.clientName}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ml-2 ${getStatusBg(
                      service.status
                    )} ${getStatusColor(service.status)}`}
                  >
                    {getStatusIcon(service.status)}
                    <span>{getStatusLabel(service.status)}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(service.requestedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>

              <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                {service.description}
              </p>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">
                  {service.price ? `R$ ${service.price.toFixed(2)}` : 'Preço não definido'}
                </span>

                {service.rating && (
                  <div className="flex items-center text-yellow-400">
                    <span className="mr-1">★</span>
                    {service.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceHistoryList;
