
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-semibold">Reportar Problema</DialogTitle>
          <DialogDescription>
            Compartilhe informações sobre esta localização.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4">
          <div className="space-y-3">
            <Label>Tipo de problema</Label>
            <RadioGroup 
              value={type}
              onValueChange={(value) => setType(value as PinType)}
              className="grid grid-cols-2 gap-2"
            >
              <div className={cn(
                "flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-all",
                type === 'flood' ? "border-flood bg-flood/5" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="flood" id="flood" className="sr-only" />
                <Label htmlFor="flood" className="flex items-center gap-2 cursor-pointer font-medium">
                  <DropletIcon className="h-4 w-4 text-flood" />
                  Alagamento
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-all",
                type === 'pothole' ? "border-pothole bg-pothole/5" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="pothole" id="pothole" className="sr-only" />
                <Label htmlFor="pothole" className="flex items-center gap-2 cursor-pointer font-medium">
                  <CircleOff className="h-4 w-4 text-pothole" />
                  Buraco
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-all",
                type === 'passable' ? "border-passable bg-passable/5" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="passable" id="passable" className="sr-only" />
                <Label htmlFor="passable" className="flex items-center gap-2 cursor-pointer font-medium">
                  <CheckCircle className="h-4 w-4 text-passable" />
                  Passável
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-all",
                type === 'robbery' ? "border-robbery bg-robbery/5" : "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="robbery" id="robbery" className="sr-only" />
                <Label htmlFor="robbery" className="flex items-center gap-2 cursor-pointer font-medium">
                  <AlertCircle className="h-4 w-4 text-robbery" />
                  Assalto
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea 
              id="description" 
              placeholder="Descreva o problema ou situação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos</Label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                  <img src={img} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-background/80 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-square rounded-md border border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                <ImageIcon size={20} className="mb-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Adicionar</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !description || !location}
            className="relative overflow-hidden group"
          >
            <span className={cn(
              "transition-all",
              isSubmitting ? "opacity-0" : "opacity-100"
            )}>
              Enviar Relatório
            </span>
            {isSubmitting && (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
