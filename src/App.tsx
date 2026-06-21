import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ModerationPage from "./pages/ModerationPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="app-container">
        <HashRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/moderation" element={<ModerationPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </HashRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
