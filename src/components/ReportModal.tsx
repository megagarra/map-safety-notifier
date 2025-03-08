import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PinType, CreatePinInput } from '@/types';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, DropletIcon, CircleOff, Image as ImageIcon, X, BarChart3, Upload } from 'lucide-react';
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
  const [type, setType] = useState<PinType>('infraestrutura');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setType('infraestrutura');
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
      console.error('Erro ao enviar relatório:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages([...images, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
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
            
            <div className="grid grid-cols-2 gap-3">
              <div onClick={() => setType('infraestrutura')} className={cn(
                "flex items-center rounded-md border p-3 cursor-pointer transition-colors",
                type === 'infraestrutura' 
                  ? "bg-[#1a1a1a] border-[#45a0f8]" 
                  : "border-[#2a2a2a] hover:border-[#45a0f8]/50 bg-[#1e1e1e]"
              )}>
                <div className="h-8 w-8 mr-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Infraestrutura</div>
                  <div className="text-xs text-gray-400">Problemas de estrutura urbana</div>
                </div>
              </div>

              <div onClick={() => setType('crime')} className={cn(
                "flex items-center rounded-md border p-3 cursor-pointer transition-colors",
                type === 'crime' 
                  ? "bg-[#1a1a1a] border-[#f43f5e]" 
                  : "border-[#2a2a2a] hover:border-[#f43f5e]/50 bg-[#1e1e1e]"
              )}>
                <div className="h-8 w-8 mr-3 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Crime</div>
                  <div className="text-xs text-gray-400">Ocorrências de segurança</div>
                </div>
              </div>
            </div>
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
