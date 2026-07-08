
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
import Instrucoes from "./pages/Instrucoes";
// import AvatarCreator from "./pages/AvatarCreator";
import AdminPrivateRoute from "./components/AdminPrivateRoute";
import AdminJackpot from "@/pages/AdminJackpot";
import GerenciarIps from "./pages/GerenciarIps";
import AdminLayout from "./pages/AdminLayout";
import AdminCodes from "./pages/AdminCodes";
import Participantes from "./components/Participantes";
import FeedbackModeration from "./components/FeedbackModeration";
import CadastroPremios from "./components/CadastroPremios";
import CookieBanner from "./components/CookieBanner";
import BotaoFlutuanteWhatsapp from "./components/BotaoFlutuanteWhatsapp";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    let timerId: any;

    const resetarCronometro = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const hasAdminSession = !!localStorage.getItem('school_admin_session');
        const hasStudentSession = !!localStorage.getItem('bit_student_session');
        if (session || hasAdminSession || hasStudentSession) {
          await supabase.auth.signOut();
          localStorage.removeItem('school_admin_session');
          localStorage.removeItem('bit_student_session');
          alert('Sessão expirada por inatividade.');
          window.location.href = '/';
        }
      }, 15 * 60 * 1000);
    };

    resetarCronometro();

    window.addEventListener('mousemove', resetarCronometro);
    window.addEventListener('keydown', resetarCronometro);
    window.addEventListener('click', resetarCronometro);
    window.addEventListener('scroll', resetarCronometro);

    return () => {
      window.removeEventListener('mousemove', resetarCronometro);
      window.removeEventListener('keydown', resetarCronometro);
      window.removeEventListener('click', resetarCronometro);
      window.removeEventListener('scroll', resetarCronometro);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="participantes" replace />} />
              <Route path="participantes" element={<Participantes />} />
              <Route path="codigos" element={<AdminCodes />} />
              <Route path="moderacao" element={<FeedbackModeration />} />
              <Route path="premios" element={<CadastroPremios />} />
              <Route path="ips" element={<GerenciarIps />} />
            </Route>
            <Route path="/admin/registro" element={<AdminRegister />} />
            <Route path="/admin/jackpot" element={
              <AdminPrivateRoute>
                <AdminJackpot />
              </AdminPrivateRoute>
            } />
            <Route path="/vitrine" element={<Vitrine />} />
            <Route path="/instrucoes" element={<Instrucoes />} />
            {/* <Route path="/avatar-creator" element={<AvatarCreator />} /> */}
            <Route path="/avatar" element={<Navigate to="/" replace />} />
            <Route path="/avatar-creator" element={<Navigate to="/" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <CookieBanner />
        <BotaoFlutuanteWhatsapp />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
