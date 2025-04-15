import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";
import "./App.css";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Função para limpar todos os caches do aplicativo
const clearAllCaches = () => {
  try {
    // Limpar cache específico do mapa
    localStorage.removeItem('mapState');
    
    // Limpar cache do Leaflet (biblioteca de mapas)
    const leafletStorageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('leaflet') || key.includes('tile')
    );
    
    leafletStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Limpar cache de service worker se existir
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
      
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
    }
    
    console.log("✅ Todos os caches foram limpos com sucesso");
  } catch (error) {
    console.error("Erro ao limpar caches:", error);
  }
};

const App = () => {
  // Limpar todos os caches quando o aplicativo inicia
  useEffect(() => {
    clearAllCaches();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="app-container">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
