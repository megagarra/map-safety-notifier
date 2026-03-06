
import { useState, useEffect } from 'react';
import { ServiceRequest, User, SecurityServiceStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export function useSecurityData() {
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [availableSecurity, setAvailableSecurity] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(false);
  }, []);

  const requestService = (serviceData: Partial<ServiceRequest>): ServiceRequest => {
    try {
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const newService: ServiceRequest = {
        id: uuidv4(),
        clientId: currentUser.id,
        clientName: currentUser.name,
        location: serviceData.location || { lat: 0, lng: 0 },
        destinationLocation: serviceData.destinationLocation,
        status: 'requested',
        requestedAt: new Date().toISOString(),
        scheduledFor: serviceData.scheduledFor,
        description: serviceData.description || 'Solicitação de escolta',
        price: serviceData.price || calculatePrice(serviceData)
      };
      
      setServices((prev) => [newService, ...prev]);
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de segurança foi enviada com sucesso!",
      });
      
      return newService;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const acceptService = (serviceId: string, securityId: string) => {
    try {
      if (!securityId) {
        throw new Error('ID do segurança não fornecido');
      }

      const security = availableSecurity.find(s => s.id === securityId);
      if (!security) {
        throw new Error('Segurança não encontrado');
      }

      setServices(prev => 
        prev.map(service => 
          service.id === serviceId 
            ? { 
                ...service, 
                status: 'accepted' as SecurityServiceStatus, 
                securityId: security.id,
                securityName: security.name
              } 
            : service
        )
      );

      toast({
        title: "Solicitação aceita",
        description: `Você aceitou a solicitação de ${services.find(s => s.id === serviceId)?.clientName}`,
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const startService = (serviceId: string) => {
    try {
      setServices(prev => 
        prev.map(service => 
          service.id === serviceId 
            ? { ...service, status: 'in_progress' as SecurityServiceStatus } 
            : service
        )
      );

      toast({
        title: "Serviço iniciado",
        description: "O serviço de escolta foi iniciado",
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const completeService = (serviceId: string, rating?: number, feedback?: string) => {
    try {
      setServices(prev => 
        prev.map(service => 
          service.id === serviceId 
            ? { 
                ...service, 
                status: 'completed' as SecurityServiceStatus,
                completedAt: new Date().toISOString(),
                rating,
                feedback
              } 
            : service
        )
      );

      toast({
        title: "Serviço concluído",
        description: rating ? "Obrigado pela sua avaliação!" : "Serviço finalizado com sucesso",
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const calculatePrice = (serviceData: Partial<ServiceRequest>): number => {
    // Simplified price calculation based on distance
    const basePrice = 50;
    
    if (serviceData.destinationLocation && serviceData.location) {
      // Calculate rough distance (very simplified)
      const latDiff = Math.abs(serviceData.destinationLocation.lat - serviceData.location.lat);
      const lngDiff = Math.abs(serviceData.destinationLocation.lng - serviceData.location.lng);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      
      // Convert to km (very rough estimation)
      const kmDistance = distance * 111;
      
      return basePrice + (kmDistance * 5);
    }
    
    return basePrice;
  };

  return {
    services,
    availableSecurity,
    currentUser,
    loading,
    error,
    requestService,
    acceptService,
    startService,
    completeService,
    setCurrentUser
  };
}
