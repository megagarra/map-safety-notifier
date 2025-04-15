import React, { useState } from 'react';
import { Pin } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Search, AlertCircle, Clock, Wrench, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PersistenceTableProps {
  pins: Pin[];
  onSelectPin?: (pin: Pin) => void;
}

const PersistenceTable: React.FC<PersistenceTableProps> = ({ pins, onSelectPin }) => {
  const [sortField, setSortField] = useState<'type' | 'status' | 'persistenceDays' | 'reportedAt'>('persistenceDays');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtrar pins com dados de persistência
  const pinsWithPersistence = pins.filter(pin => pin.persistenceDays !== undefined);
  
  if (pinsWithPersistence.length === 0) {
    return (
      <Card className="bg-[#121212] border-[#2a2a2a] text-white w-full max-w-2xl">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Nenhum dado de persistência disponível</p>
        </CardContent>
      </Card>
    );
  }
  
  // Filtrar por pesquisa
  const filteredPins = pinsWithPersistence.filter(pin => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      getPinTypeLabel(pin.type).toLowerCase().includes(query) ||
      getStatusLabel(pin.status).toLowerCase().includes(query) ||
      pin.description.toLowerCase().includes(query) ||
      (pin.address && pin.address.toLowerCase().includes(query))
    );
  });
  
  // Ordenar pins
  const sortedPins = filteredPins.sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'type':
        comparison = getPinTypeLabel(a.type).localeCompare(getPinTypeLabel(b.type));
        break;
      case 'status':
        comparison = getStatusLabel(a.status).localeCompare(getStatusLabel(b.status));
        break;
      case 'persistenceDays':
        comparison = (a.persistenceDays || 0) - (b.persistenceDays || 0);
        break;
      case 'reportedAt':
        if (!a.reportedAt && !b.reportedAt) comparison = 0;
        else if (!a.reportedAt) comparison = 1;
        else if (!b.reportedAt) comparison = -1;
        else comparison = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  // Toggle de ordenação
  const toggleSort = (field: 'type' | 'status' | 'persistenceDays' | 'reportedAt') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  return (
    <Card className="bg-[#121212] border-[#2a2a2a] text-white w-full max-w-2xl max-h-[600px] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Comparação de Persistência de Problemas
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
            <Input 
              type="text" 
              placeholder="Buscar por tipo, status..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] focus:border-white focus:ring-0"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-auto max-h-[550px]">
        <Table>
          <TableHeader className="bg-[#1a1a1a] sticky top-0">
            <TableRow>
              <TableHead className="text-xs text-gray-400 font-medium">
                <button 
                  className="flex items-center gap-1 hover:text-white"
                  onClick={() => toggleSort('type')}
                >
                  Tipo
                  {sortField === 'type' && (
                    sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-xs text-gray-400 font-medium">
                <button 
                  className="flex items-center gap-1 hover:text-white"
                  onClick={() => toggleSort('status')}
                >
                  Status
                  {sortField === 'status' && (
                    sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-xs text-gray-400 font-medium">
                <button 
                  className="flex items-center gap-1 hover:text-white"
                  onClick={() => toggleSort('persistenceDays')}
                >
                  Persistência
                  {sortField === 'persistenceDays' && (
                    sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-xs text-gray-400 font-medium">
                <button 
                  className="flex items-center gap-1 hover:text-white"
                  onClick={() => toggleSort('reportedAt')}
                >
                  Reportado em
                  {sortField === 'reportedAt' && (
                    sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-xs text-gray-400 font-medium">Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPins.map((pin) => (
              <TableRow 
                key={pin.id} 
                className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] cursor-pointer" 
                onClick={() => onSelectPin && onSelectPin(pin)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getPinColorClass(pin.type))}></div>
                    <span className="text-xs">{getPinTypeLabel(pin.type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    getStatusTextColor(pin.status)
                  )}>
                    {getStatusIcon(pin.status, 10)}
                    <span>{getStatusLabel(pin.status)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn(
                    "text-xs font-medium",
                    pin.persistenceDays && pin.persistenceDays > 30 ? "text-robbery" :
                    pin.persistenceDays && pin.persistenceDays > 14 ? "text-pothole" :
                    "text-white"
                  )}>
                    {pin.persistenceDays} dias
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-gray-400">
                    {pin.reportedAt 
                      ? format(new Date(pin.reportedAt), "dd/MM/yyyy", { locale: ptBR })
                      : 'Data desconhecida'
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs truncate block max-w-xs">
                    {pin.description}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filteredPins.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                  Nenhum resultado encontrado para "{searchQuery}"
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Funções auxiliares
const getPinColorClass = (type) => {
  switch (type) {
    case 'flood': return 'bg-flood';
    case 'pothole': return 'bg-pothole';
    case 'passable': return 'bg-passable';
    case 'robbery': return 'bg-robbery';
    default: return 'bg-gray-500';
  }
};

const getPinTypeLabel = (type) => {
  switch (type) {
    case 'flood': return 'Alagamento';
    case 'pothole': return 'Buracos';
    case 'passable': return 'Passável';
    case 'robbery': return 'Assalto';
    default: return type;
  }
};

const getStatusTextColor = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'bg-flood/20 text-flood';
    case 'acknowledged':
      return 'bg-pothole/20 text-pothole';
    case 'in_progress':
      return 'bg-passable/20 text-passable';
    case 'resolved':
      return 'bg-white/20 text-white';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusIcon = (status: string, size: number = 14) => {
  switch (status) {
    case 'reported':
      return <AlertCircle size={size} className="text-current" />;
    case 'acknowledged':
      return <Clock size={size} className="text-current" />;
    case 'in_progress':
      return <Wrench size={size} className="text-current" />;
    case 'resolved':
      return <CheckCircle size={size} className="text-current" />;
    default:
      return null;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'Reportado';
    case 'acknowledged':
      return 'Reconhecido';
    case 'in_progress':
      return 'Em andamento';
    case 'resolved':
      return 'Resolvido';
    default:
      return status;
  }
};

export default PersistenceTable; 