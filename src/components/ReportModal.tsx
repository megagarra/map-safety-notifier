import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PinType, CreatePinInput } from '@/types';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, DropletIcon, CircleOff, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePinInput) => void;
  location: { lat: number; lng: number } | null;
}

const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  location 
}) => {
  const [type, setType] = useState<PinType>('flood');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setType('flood');
    setDescription('');
    setImages([]);
    onClose();
  };

  const handleSubmit = () => {
    if (!location) return;
    
    setIsSubmitting(true);
    
    const data: CreatePinInput = {
      type,
      location,
      description,
      images
    };
    
    try {
      onSubmit(data);
      handleClose();
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In a real application, you would upload these to a storage service
    // For now, we'll just create object URLs for preview
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Função para converter coordenadas decimais para formato DMS (graus, minutos, segundos)
  const convertToDMS = (coordinate, isLatitude) => {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
    
    const direction = isLatitude 
      ? (coordinate >= 0 ? "N" : "S") 
      : (coordinate >= 0 ? "E" : "W");
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-lg border-0 bg-[#121212] shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <DialogTitle className="text-lg font-medium text-white">Reportar Problema</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Compartilhe informações sobre esta localização.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 bg-[#121212]">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-white">Tipo de problema</Label>
              <div className="text-xs text-gray-400">
                {location ? (
                  <>
                    {convertToDMS(location.lat, true)}, {convertToDMS(location.lng, false)}
                  </>
                ) : (
                  "Localização não definida"
                )}
              </div>
            </div>
            
            <RadioGroup 
              value={type}
              onValueChange={(value) => setType(value as PinType)}
              className="grid grid-cols-2 gap-3"
            >
              <div className={cn(
                "flex items-center rounded-md border p-3 cursor-pointer transition-colors",
                type === 'flood' 
                  ? "bg-[#1a1a1a] border-[#45a0f8]" 
                  : "border-[#2a2a2a] hover:border-[#45a0f8]/50 bg-[#1e1e1e]"
              )}>
                <RadioGroupItem value="flood" id="flood" className="sr-only" />
                <Label htmlFor="flood" className="flex items-center gap-2 cursor-pointer w-full text-white">
                  <div className="w-6 h-6 rounded-full bg-[#45a0f8] flex items-center justify-center">
                    <DropletIcon size={14} className="text-white" />
                  </div>
                  <span>Alagamento</span>
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center rounded-md border p-3 cursor-pointer transition-colors",
                type === 'pothole' 
                  ? "bg-[#1a1a1a] border-[#f59e0b]" 
                  : "border-[#2a2a2a] hover:border-[#f59e0b]/50 bg-[#1e1e1e]"
              )}>
                <RadioGroupItem value="pothole" id="pothole" className="sr-only" />
                <Label htmlFor="pothole" className="flex items-center gap-2 cursor-pointer w-full text-white">
                  <div className="w-6 h-6 rounded-full bg-[#f59e0b] flex items-center justify-center">
                    <CircleOff size={14} className="text-white" />
                  </div>
                  <span>Buraco</span>
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center rounded-md border p-3 cursor-pointer transition-colors",
                type === 'passable' 
                  ? "bg-[#1a1a1a] border-[#10b981]" 
                  : "border-[#2a2a2a] hover:border-[#10b981]/50 bg-[#1e1e1e]"
              )}>
                <RadioGroupItem value="passable" id="passable" className="sr-only" />
                <Label htmlFor="passable" className="flex items-center gap-2 cursor-pointer w-full text-white">
                  <div className="w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                  <span>Passável</span>
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center rounded-md border p-3 cursor-pointer transition-colors",
                type === 'robbery' 
                  ? "bg-[#1a1a1a] border-[#ef4444]" 
                  : "border-[#2a2a2a] hover:border-[#ef4444]/50 bg-[#1e1e1e]"
              )}>
                <RadioGroupItem value="robbery" id="robbery" className="sr-only" />
                <Label htmlFor="robbery" className="flex items-center gap-2 cursor-pointer w-full text-white">
                  <div className="w-6 h-6 rounded-full bg-[#ef4444] flex items-center justify-center">
                    <AlertCircle size={14} className="text-white" />
                  </div>
                  <span>Assalto</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-white">Descrição</Label>
            <Textarea 
              id="description" 
              placeholder="Descreva o problema ou situação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none bg-[#1e1e1e] border-[#2a2a2a] focus:border-white focus:ring-0 text-white placeholder-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">Fotos</Label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-[#2a2a2a] bg-[#252525]">
                  <img src={img} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1.5 bg-[#121212]/80 rounded-full hover:bg-[#333333]"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-square rounded-md border border-[#2a2a2a] border-dashed cursor-pointer hover:bg-[#252525] bg-[#1e1e1e]">
                <ImageIcon size={20} className="mb-1 text-gray-400" />
                <span className="text-xs text-gray-400">Adicionar</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t border-[#2a2a2a] flex justify-end bg-[#1a1a1a]">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="border-[#2a2a2a] bg-[#252525] text-white hover:bg-[#333333]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !description || !location}
            className="bg-white text-black hover:bg-white/90 ml-2"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Enviar Relatório"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
