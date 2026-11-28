# Map Safety — web app

Mapa colaborativo de segurança e infraestrutura urbana, pensado para celular (PWA).
Qualquer pessoa vê o mapa e relata problemas sem criar conta; a moderação revisa antes de publicar o texto e as fotos.

## Funcionalidades

- **Mapa**: agrupamento de pins, mapa de calor, filtros (tipo, aguardando, resolvidos), legenda, busca de endereço, tema claro/escuro, localização com círculo de precisão, posição salva e links diretos (`#/?pin=<id>`).
- **Relatar**: tocar no mapa ou "Reportar aqui" (GPS), formulário em folha inferior com rascunho salvo, câmera/galeria (fotos reduzidas no aparelho), tipo de crime, aviso de duplicado.
- **Comunidade**: pins pendentes visíveis (sem texto/fotos) com "Eu também vi", "Ainda está aí / Já foi resolvido", lista "Perto de mim" com resumo da área, compartilhar (prévia no WhatsApp) e "Como chegar".
- **Acompanhamento**: "Meus relatos" (status e motivo de recusa, sem conta), alertas por push com área (500 m / 1 km / 3 km).
- **Offline**: últimos dados ficam no aparelho; aviso mostra a hora dos dados.
- **Moderação** (`/admin/moderation`): fila com fotos, "Ver no mapa", indício de duplicado, aprovação em lote, atalhos de teclado (J/K/A/R/X/Shift+A), abas Rejeitados e "Resolvidos?".
- **Painel** (`/admin/analytics`): período, fila, horário, tipos, pontos quentes, CSV.
- **Páginas**: `/sobre` (como funciona), `/privacidade` (LGPD).

## Rodar localmente

```bash
npm install
cp .env.example .env   # aponte VITE_API_URL para a API
npm run dev            # http://localhost:8080
```

## Build e verificação

```bash
npm run build
npx vite preview --port 4173   # confira se o site abre sem erros antes de publicar
```

## Deploy (Railway)

Serviço `web` a partir desta pasta (`railway up -s web`). A variável `VITE_API_URL` é lida **no build**.
Na API, inclua a URL do web app em `CORS_ORIGINS` e defina `FRONTEND_URL`.

## Estrutura

- `src/pages` — Home (mapa), Moderação, Painel, Usuários, Login, Sobre, Privacidade
- `src/components` — Map, ReportModal, NearbySheet, MyReportsSheet, MapOverlays, HeatLayer…
- `src/sw.js` — service worker (cache de tiles e dados, push)
- `src/hooks` — geolocalização compartilhada, notificações, acessibilidade de diálogos
