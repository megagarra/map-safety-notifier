import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import HomePage from "./pages/HomePage";

// Páginas secundárias carregadas sob demanda para reduzir o bundle inicial
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const ModerationPage = lazy(() => import("./pages/ModerationPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const AgencyPage = lazy(() => import("./pages/AgencyPage"));
import { ErrorBoundary } from "@/components/ErrorBoundary";

const PageFallback = () => (
  <div className="flex h-[100dvh] items-center justify-center bg-[#121212]" role="status" aria-label="Carregando">
    <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-300/30 rounded-full animate-spin" />
  </div>
);
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="app-container">
        <HashRouter>
          <AuthProvider>
            <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/orgao" element={<AgencyPage />} />
              <Route path="/admin/moderation" element={<ModerationPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/sobre" element={<AboutPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </HashRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
