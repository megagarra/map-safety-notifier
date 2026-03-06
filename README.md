# Map Safety Notifier

Mapa comunitário de segurança urbana para reportar e acompanhar problemas como alagamentos, buracos, assaltos e áreas de risco na cidade de São Paulo.

## Funcionalidades

### Mapa Interativo
- Visualização de ocorrências em mapa escuro (CARTO dark tiles) com Leaflet
- Geolocalização automática do usuário
- Clique no mapa para reportar um novo problema
- Coordenadas na URL para compartilhar localizações específicas

### Reportar Problemas
- **Alagamento** — áreas com acúmulo de água
- **Buraco** — danos na via, risco de acidente
- **Assalto** — pontos com histórico de crimes
- **Transitável** — vias com obras ou restrições parciais

### Sistema de Votos
- Confirme problemas reportados por outros usuários
- Quanto mais votos, maior a relevância do report

### Heatmap
- Visualização em mapa de calor das áreas mais problemáticas

### Persistência
- Acompanhe há quantos dias um problema continua sem solução
- Estatísticas de persistência no dashboard
- Filtros por faixa de tempo (0-7, 8-14, 15-30, 30+ dias)

### Dashboard de Segurança
- Painel com solicitações de escolta/segurança
- Perfis de cliente e segurança
- Histórico de serviços
- Botão de emergência

### Autenticação
- Login com email/senha (mock)
- Login com Google (em breve)
- Cadastro de novos usuários

## Tech Stack

| Categoria | Tecnologia |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 (SWC) |
| UI | shadcn/ui (Radix UI) |
| Estilização | Tailwind CSS 3 |
| Mapas | Leaflet + react-leaflet |
| Estado | TanStack React Query v5 |
| Roteamento | React Router DOM v6 |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Datas | date-fns (ptBR) |
| IDs | uuid |

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- npm 9 ou superior

## Instalação

```bash
git clone https://github.com/seu-usuario/map-safety-notifier.git
cd map-safety-notifier
npm install
```

## Uso

### Desenvolvimento

```bash
npm run dev
```

O servidor inicia em `http://localhost:8080`.

### Build de produção

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## Estrutura do Projeto

```
src/
├── components/          # Componentes de feature
│   ├── ui/              # Primitivos shadcn/ui (não editar manualmente)
│   ├── Map.tsx          # Mapa principal com Leaflet
│   ├── NavBar.tsx       # Barra de navegação lateral
│   ├── ReportModal.tsx  # Modal de novo report
│   ├── PinDetails.tsx   # Detalhes de um pin
│   ├── PinList.tsx      # Lista de pins
│   ├── PinHistory.tsx   # Histórico de um pin
│   ├── FilterBar.tsx    # Filtro por tipo de pin
│   ├── HeatmapControl.tsx
│   ├── PersistenceStats.tsx
│   ├── PersistenceFilter.tsx
│   ├── PersistenceTable.tsx
│   ├── PersistenceTimeline.tsx
│   ├── GoogleSignIn.tsx
│   ├── SecurityProfileCard.tsx
│   ├── ServiceRequestForm.tsx
│   ├── ServiceDetailCard.tsx
│   └── ServiceHistoryList.tsx
├── controllers/         # Lógica de negócio e acesso a dados
│   └── pins.ts          # CRUD de pins (localStorage)
├── hooks/               # Custom React hooks
│   ├── useMapData.tsx   # Dados do mapa (pins, votos)
│   ├── useSecurityData.tsx  # Dados de segurança (mock)
│   ├── useMapCache.ts   # Cache de tiles do mapa
│   └── use-mobile.tsx   # Detecção de dispositivo móvel
├── lib/                 # Utilitários
│   ├── utils.ts         # cn() para classes condicionais
│   └── helpers.ts       # Geolocalização, heatmap, DMS
├── pages/               # Páginas (rotas)
│   ├── HomePage.tsx     # Mapa principal (/)
│   ├── DashboardPage.tsx # Dashboard de segurança (/dashboard)
│   ├── LoginPage.tsx    # Login (/login)
│   ├── SignupPage.tsx   # Cadastro (/signup)
│   └── NotFound.tsx     # 404
├── types/               # Tipos TypeScript compartilhados
│   └── index.ts
├── App.tsx              # Rotas e providers
├── main.tsx             # Entry point
└── index.css            # Estilos globais e Tailwind
```

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | HomePage | Mapa interativo com pins |
| `/login` | LoginPage | Tela de login |
| `/signup` | SignupPage | Tela de cadastro |
| `/dashboard` | DashboardPage | Painel de segurança |

## Dados

Atualmente o projeto é 100% front-end. Os dados são armazenados no `localStorage` do navegador com pins mock iniciais localizados em São Paulo. O controller `src/controllers/pins.ts` implementa todas as operações CRUD localmente.

### Credenciais de teste (mock)

| Perfil | Email | Senha |
|--------|-------|-------|
| Cliente | `cliente@secureme.com` | `senha123` |
| Segurança | `seguranca@secureme.com` | `senha123` |

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executar ESLint |

## Licença

Este projeto é privado.
