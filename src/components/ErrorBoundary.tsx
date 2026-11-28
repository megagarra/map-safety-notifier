import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Map as MapIcon, WifiOff } from 'lucide-react';

type State = { error: Error | null };

const RETRY_KEY = 'map-safety:chunk-retry';

function isChunkError(e: Error) {
  return /Loading chunk|dynamically imported module|Importing a module script failed/i.test(e.message);
}

/** Catches render errors so users never get a blank white screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App error:', error);
    // A deploy replaced the old chunks (or a flaky connection): reload once automatically.
    // One automatic reload per 30 s (a later deploy in the same tab can reload again).
    const last = Number(sessionStorage.getItem(RETRY_KEY) || 0);
    if (isChunkError(error) && navigator.onLine && Date.now() - last > 30_000) {
      sessionStorage.setItem(RETRY_KEY, String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const offline = !navigator.onLine || isChunkError(error);
    return (
      <div role="alert" className="min-h-[100dvh] bg-[#121212] text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          {offline ? <WifiOff className="mx-auto text-amber-400" size={40} /> : <AlertTriangle className="mx-auto text-red-400" size={40} />}
          <h1 className="text-xl font-semibold">{offline ? 'Sem conexão?' : 'Algo deu errado'}</h1>
          <p className="text-sm text-gray-300">
            {offline
              ? 'Não foi possível carregar esta parte do app. Verifique sua internet e tente de novo.'
              : 'Um erro inesperado aconteceu. Recarregue a página para continuar.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { sessionStorage.removeItem(RETRY_KEY); window.location.reload(); }}
              className="h-11 rounded-lg bg-white text-black text-sm font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Recarregar
            </button>
            <button
              onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
              className="h-11 rounded-lg bg-white/10 text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <MapIcon size={16} /> Ir ao mapa
            </button>
          </div>
        </div>
      </div>
    );
  }
}
