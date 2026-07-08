
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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

import { useEffect, useState } from "react";

const AppRoutes = () => {
  const navigate = useNavigate();
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    // Escuta eventos de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log(`[Supabase Auth Event]: ${event}`);

      // Se for SIGNED_OUT, limpa as sessões locais e navega para home
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('school_admin_session');
        localStorage.removeItem('bit_student_session');
        window.dispatchEvent(new Event('admin-session-change')); // Notifica o hook useAdmAuth
        navigate('/');
      } 
      // Se for SIGNED_IN, redireciona caso já tenha uma sessão ativa de admin
      else if (event === 'SIGNED_IN') {
        const storedAdmin = localStorage.getItem('school_admin_session');
        if (storedAdmin) {
          navigate('/admin/participantes');
        }
      }

      // Força uma atualização limpa do componente de rotas resetando a renderização
      setRenderKey(prev => prev + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <Routes key={renderKey}>
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
  );
};

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
          <AppRoutes />
        </BrowserRouter>
        <CookieBanner />
        <BotaoFlutuanteWhatsapp />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
