import React from 'react';
import { Pin } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PersistenceStatsProps {
  pins: Pin[];
}

const PersistenceStats: React.FC<PersistenceStatsProps> = ({ pins }) => {
  // Filtrar pins com dados de persistência
  const pinsWithPersistence = pins.filter(pin => pin.persistenceDays !== undefined);
  
  if (pinsWithPersistence.length === 0) {
    return null;
  }
  
  // Calcular estatísticas
  const avgPersistence = Math.round(
    pinsWithPersistence.reduce((sum, pin) => sum + (pin.persistenceDays || 0), 0) / 
    pinsWithPersistence.length
  );
  
  const resolvedPins = pinsWithPersistence.filter(pin => pin.status === 'resolved');
  const avgResolutionTime = resolvedPins.length > 0 
    ? Math.round(
        resolvedPins.reduce((sum, pin) => sum + (pin.persistenceDays || 0), 0) / 
        resolvedPins.length
      )
    : null;
  
  const oldestUnresolved = pinsWithPersistence
    .filter(pin => pin.status !== 'resolved')
    .sort((a, b) => (b.persistenceDays || 0) - (a.persistenceDays || 0))[0];
  
  // Agrupar por faixas de tempo
  const timeRanges = [
    { name: '< 7 dias', count: 0, color: '#45a0f8' },
    { name: '7-14 dias', count: 0, color: '#10b981' },
    { name: '15-30 dias', count: 0, color: '#f59e0b' },
    { name: '> 30 dias', count: 0, color: '#ef4444' }
  ];
  
  pinsWithPersistence.forEach(pin => {
    const days = pin.persistenceDays || 0;
    if (days < 7) {
      timeRanges[0].count++;
    } else if (days < 15) {
      timeRanges[1].count++;
    } else if (days < 31) {
      timeRanges[2].count++;
    } else {
      timeRanges[3].count++;
    }
  });
  
  // Agrupar por tipo e status
  const typeStatusData = [];
  const typeGroups = {};
  
  pinsWithPersistence.forEach(pin => {
    const key = `${pin.type}-${pin.status}`;
    if (!typeGroups[key]) {
      typeGroups[key] = {
        type: pin.type,
        status: pin.status,
        count: 0,
        avgDays: 0,
        totalDays: 0
      };
    }
    
    typeGroups[key].count++;
    typeGroups[key].totalDays += (pin.persistenceDays || 0);
  });
  
  Object.values(typeGroups).forEach((group: any) => {
    group.avgDays = Math.round(group.totalDays / group.count);
    typeStatusData.push(group);
  });
  
  return (
    <Card className="bg-[#121212] border-[#2a2a2a] text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Estatísticas de Persistência de Problemas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#1a1a1a] p-3 rounded-md">
              <div className="text-xs text-gray-400">Tempo médio</div>
              <div className="text-xl font-semibold">{avgPersistence} dias</div>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-md">
              <div className="text-xs text-gray-400">Resolução média</div>
              <div className="text-xl font-semibold">
                {avgResolutionTime !== null ? `${avgResolutionTime} dias` : 'N/A'}
              </div>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-md">
              <div className="text-xs text-gray-400">Mais antigo</div>
              <div className="text-xl font-semibold">
                {oldestUnresolved ? `${oldestUnresolved.persistenceDays} dias` : 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="h-40">
            <div className="text-xs text-gray-400 mb-2">Distribuição por tempo</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeRanges}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {timeRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Tempo médio por tipo e status</div>
            {typeStatusData.map((item: any, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 bg-[#1a1a1a] rounded-md"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getPinColorClass(item.type)}`}></div>
                  <span className="text-xs">
                    {getPinTypeLabel(item.type)} ({getStatusLabel(item.status)})
                  </span>
                </div>
                <div className="text-xs font-medium">
                  {item.avgDays} dias
                </div>
              </div>
            ))}
          </div>
        </div>
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

const getStatusLabel = (status) => {
  switch (status) {
    case 'reported': return 'Reportado';
    case 'acknowledged': return 'Reconhecido';
    case 'in_progress': return 'Em andamento';
    case 'resolved': return 'Resolvido';
    default: return status;
  }
};

export default PersistenceStats; 