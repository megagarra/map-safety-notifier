
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, MapPin, Bike, Car } from 'lucide-react';
import { ServiceRequest } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface ServiceRequestFormProps {
  onSubmit: (data: Partial<ServiceRequest>) => void;
  location: { lat: number; lng: number };
  onCancel: () => void;
  isLoading?: boolean;
}

const ServiceRequestForm = ({ 
  onSubmit, 
  location, 
  onCancel, 
  isLoading = false 
}: ServiceRequestFormProps) => {
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [transportType, setTransportType] = useState<'walking' | 'bike' | 'car'>('walking');
  const [destination, setDestination] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, forneça uma descrição para a solicitação",
        variant: "destructive"
      });
      return;
    }
    
    let scheduledFor: string | undefined = undefined;
    
    if (scheduledDate && scheduledTime) {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      scheduledFor = dateTime.toISOString();
    }
    
    // In a real app, we would geocode the destination address to get coordinates
    // For this demo, we'll just use a slight offset from the current location
    const destinationLocation = destination ? {
      lat: location.lat + 0.01,
      lng: location.lng + 0.01
    } : undefined;
    
    onSubmit({
      location,
      description,
      scheduledFor,
      destinationLocation
    });
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
      <h3 className="text-lg font-medium text-white mb-4">Solicitar Segurança</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="location" className="text-white">Localização atual</Label>
          <div className="mt-1 flex items-center space-x-2">
            <MapPin className="text-green-400" size={18} />
            <span className="text-sm text-gray-300">
              {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Localização não selecionada'}
            </span>
          </div>
        </div>
        
        <div>
          <Label htmlFor="destination" className="text-white">Destino (opcional)</Label>
          <div className="mt-1">
            <Input
              id="destination"
              placeholder="Endereço de destino"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="bg-[#232323] border-[#333] text-white"
            />
          </div>
        </div>
        
        <div>
          <Label className="text-white">Meio de transporte</Label>
          <div className="mt-1 flex space-x-2">
            <Button
              type="button"
              variant={transportType === 'walking' ? 'default' : 'outline'}
              className={transportType === 'walking' ? 'bg-green-600 text-white' : 'border-[#333] text-gray-300'}
              onClick={() => setTransportType('walking')}
            >
              A pé
            </Button>
            <Button
              type="button"
              variant={transportType === 'bike' ? 'default' : 'outline'}
              className={transportType === 'bike' ? 'bg-green-600 text-white' : 'border-[#333] text-gray-300'}
              onClick={() => setTransportType('bike')}
            >
              <Bike className="mr-1" size={16} />
              Bicicleta
            </Button>
            <Button
              type="button"
              variant={transportType === 'car' ? 'default' : 'outline'}
              className={transportType === 'car' ? 'bg-green-600 text-white' : 'border-[#333] text-gray-300'}
              onClick={() => setTransportType('car')}
            >
              <Car className="mr-1" size={16} />
              Carro
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date" className="text-white">Data (opcional)</Label>
            <div className="mt-1 relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <Calendar size={16} />
              </div>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="bg-[#232323] border-[#333] text-white pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="time" className="text-white">Horário (opcional)</Label>
            <div className="mt-1 relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <Clock size={16} />
              </div>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="bg-[#232323] border-[#333] text-white pl-10"
              />
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="description" className="text-white">Descrição</Label>
          <div className="mt-1">
            <Textarea
              id="description"
              placeholder="Descreva sua necessidade de segurança..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#232323] border-[#333] text-white resize-none"
            />
          </div>
        </div>
        
        <div className="flex space-x-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-[#333] text-gray-300"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Enviando...' : 'Solicitar agora'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ServiceRequestForm;
