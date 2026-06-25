
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminRegister from "./pages/AdminRegister";
import NotFound from "./pages/NotFound";
import Vitrine from "./pages/Vitrine";
import AvatarCreator from "./pages/AvatarCreator";
import AdminPrivateRoute from "./components/AdminPrivateRoute";
import AdminJackpot from "@/pages/AdminJackpot";
import CookieBanner from "./components/CookieBanner";

const queryClient = new QueryClient();

/** Verifica sessão salva no localStorage sem depender de estado React */
const isSessionValid = (): boolean => {
  try {
    const stored = localStorage.getItem('school_admin_session');
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { isAdmin?: boolean; expiresAt?: number };
    if (!parsed.isAdmin) return false;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem('school_admin_session');
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

import { useEffect } from "react";

const App = () => {
  useEffect(() => {
    // Apply theme on load
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen to system changes globally
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const currentSavedTheme = localStorage.getItem('theme');
      if (!currentSavedTheme) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/registro" element={<AdminRegister />} />
            <Route path="/admin/jackpot" element={
              <AdminPrivateRoute>
                <AdminJackpot />
              </AdminPrivateRoute>
            } />
            <Route path="/vitrine" element={<Vitrine />} />
            <Route path="/avatar-creator" element={<AvatarCreator />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <CookieBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
