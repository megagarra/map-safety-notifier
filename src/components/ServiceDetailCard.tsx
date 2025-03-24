
import { useState } from 'react';
import { ServiceRequest, User } from '@/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, MapPin, Clock, X, CheckCircle, Star, Navigation } from 'lucide-react';

interface ServiceDetailCardProps {
  service: ServiceRequest;
  currentUser: User;
  onClose: () => void;
  onAccept: () => void;
  onStart: () => void;
  onComplete: (rating: number, feedback: string) => void;
}

const ServiceDetailCard = ({
  service,
  currentUser,
  onClose,
  onAccept,
  onStart,
  onComplete
}: ServiceDetailCardProps) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [showRating, setShowRating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'accepted':
        return 'text-blue-400 bg-blue-500/20';
      case 'in_progress':
        return 'text-green-400 bg-green-500/20';
      case 'completed':
        return 'text-green-500 bg-green-600/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
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

  const isSecurity = currentUser.role === 'security';
  const canAccept = isSecurity && service.status === 'requested';
  const canStart = (isSecurity && service.status === 'accepted');
  const canComplete = (service.status === 'in_progress' && 
    ((isSecurity && service.securityId === currentUser.id) || 
     (!isSecurity && service.clientId === currentUser.id)));
  
  const handleComplete = () => {
    if (isSecurity) {
      // Security just completes the service
      onComplete(0, '');
    } else {
      // Client needs to rate first
      setShowRating(true);
    }
  };

  const submitRating = () => {
    onComplete(rating, feedback);
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-white">Detalhes do Serviço</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(service.status)}`}>
            {getStatusLabel(service.status)}
          </div>
          <span className="text-gray-400 text-xs">
            ID: {service.id.substring(0, 8)}
          </span>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">
            {isSecurity ? 'Cliente' : 'Segurança'}
          </div>
          <div className="text-white">
            {isSecurity 
              ? service.clientName 
              : (service.securityName || 'Aguardando profissional aceitar')}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">Descrição</div>
          <div className="text-white">{service.description}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Solicitado em</div>
            <div className="text-white">
              {format(new Date(service.requestedAt), 'PPpp', { locale: ptBR })}
            </div>
          </div>
          
          {service.scheduledFor && (
            <div>
              <div className="text-sm text-gray-400 mb-1">Agendado para</div>
              <div className="text-white">
                {format(new Date(service.scheduledFor), 'PPpp', { locale: ptBR })}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-1">Localização</div>
          <div className="flex items-center gap-2 text-white">
            <MapPin size={14} className="text-green-400" />
            {`${service.location.lat.toFixed(6)}, ${service.location.lng.toFixed(6)}`}
          </div>
        </div>

        {service.destinationLocation && (
          <div>
            <div className="text-sm text-gray-400 mb-1">Destino</div>
            <div className="flex items-center gap-2 text-white">
              <Navigation size={14} className="text-blue-400" />
              {`${service.destinationLocation.lat.toFixed(6)}, ${service.destinationLocation.lng.toFixed(6)}`}
            </div>
          </div>
        )}

        {service.price && (
          <div className="bg-[#232323] p-3 rounded-md border border-[#333]">
            <div className="text-sm text-gray-400 mb-1">Valor</div>
            <div className="text-xl font-medium text-white">R$ {service.price.toFixed(2)}</div>
          </div>
        )}

        {showRating ? (
          <div className="space-y-3 pt-3 border-t border-[#333]">
            <div>
              <div className="text-sm text-gray-400 mb-2">Avalie o serviço</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Comentário (opcional)</div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full bg-[#232323] border border-[#333] rounded-md p-2 text-white text-sm resize-none"
                rows={3}
                placeholder="Deixe um comentário sobre o serviço..."
              />
            </div>
            <Button
              onClick={submitRating}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Enviar avaliação
            </Button>
          </div>
        ) : (
          <div className="flex space-x-3 pt-4 border-t border-[#333]">
            {canAccept && (
              <Button
                onClick={onAccept}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Shield className="mr-2" size={16} />
                Aceitar serviço
              </Button>
            )}

            {canStart && (
              <Button
                onClick={onStart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Clock className="mr-2" size={16} />
                Iniciar serviço
              </Button>
            )}

            {canComplete && (
              <Button
                onClick={handleComplete}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="mr-2" size={16} />
                Finalizar serviço
              </Button>
            )}

            {service.status === 'completed' && (
              <div className="flex-1 text-center text-white bg-[#232323] rounded-md p-2">
                Serviço finalizado
                {service.rating && (
                  <div className="flex items-center justify-center text-yellow-400 mt-1">
                    <Star size={14} className="mr-1" />
                    {service.rating.toFixed(1)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetailCard;
