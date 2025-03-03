
import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Info, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavBarProps {
  onNewReport: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onNewReport }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6">
        <a href="/" className="flex items-center gap-2 text-primary">
          <div className="w-8 h-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MapPin size={18} />
          </div>
          <span className="font-semibold text-lg">MapAlert</span>
        </a>
        
        <div className="hidden md:flex items-center gap-4">
          <Button 
            onClick={onNewReport}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
            size="sm"
          >
            <MapPin size={16} />
            Reportar Problema
          </Button>
          
          <Button variant="ghost" size="sm" className="gap-2">
            <Info size={16} />
            Sobre
          </Button>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] p-0">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <MapPin size={18} />
                </div>
                <span className="font-semibold text-lg">MapAlert</span>
              </div>
            </div>
            <nav className="flex flex-col p-6 gap-1">
              <Button 
                onClick={onNewReport}
                className="w-full justify-start bg-primary hover:bg-primary/90 text-white gap-2"
              >
                <MapPin size={16} />
                Reportar Problema
              </Button>
              
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Info size={16} />
                Sobre
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default NavBar;
