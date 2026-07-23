
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
import AdminResgates from "./components/AdminResgates";
import CookieBanner from "./components/CookieBanner";
import BotaoFlutuanteWhatsapp from "./components/BotaoFlutuanteWhatsapp";
import GerenciadorNotificacoes from "./components/GerenciadorNotificacoes";
import AdminLogs from "./components/AdminLogs"; // Import do log de auditoria do admin
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
        <Route path="resgates" element={<AdminResgates />} />
        <Route path="ips" element={<GerenciarIps />} />
        <Route path="notificacoes" element={<GerenciadorNotificacoes />} />
        <Route path="logs" element={<AdminLogs />} />
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

// Função auxiliar para converter a chave VAPID pública
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const App = () => {
  // Efeito para registrar e assinar notificações push de alunos
  useEffect(() => {
    const dispararPermissaoAoEntrar = async () => {
      // 1. Verificação de compatibilidade do navegador
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Este navegador não suporta notificações Push.');
        return;
      }

      // Só executa se o aluno estiver logado (ou seja, se tiver bit_student_session no localStorage)
      const stored = localStorage.getItem('bit_student_session');
      if (!stored) {
        return;
      }
      
      let student;
      try {
        student = JSON.parse(stored);
      } catch {
        return;
      }
      
      if (!student || !student.id) {
        return;
      }

      try {
        // 2. Registra o arquivo sw.js que está na raiz da pasta public
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker preparado para a entrada do estudante.');

        // 3. SEGREDO DE UX: Aguarda o Service Worker ficar 100% ativo no navegador
        await navigator.serviceWorker.ready;

        // 4. Dispara a pergunta nativa imediatamente na tela
        const permissao = await Notification.requestPermission();
        
        if (permissao === 'granted') {
          console.log('Permissão concedida de forma imediata!');
          
          // 5. Gera a assinatura criptográfica para o dispositivo
          const publicVapidKey = 'BKWtC0RNqgTDzgH-Cf0l6T5HeH90aLAznBp37ZSRpxOlDcEj5bg3ZogFr10xCm0g5nssCquKfzhr6X6JrtWDfsQ'; 
          const options = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          };

          const subscription = await registration.pushManager.subscribe(options);
          
          const authBuffer = subscription.getKey('auth');
          const p256dhBuffer = subscription.getKey('p256dh');

          const auth_key = authBuffer 
            ? btoa(Array.from(new Uint8Array(authBuffer)).map(val => String.fromCharCode(val)).join('')) 
            : '';

          const p256dh_key = p256dhBuffer 
            ? btoa(Array.from(new Uint8Array(p256dhBuffer)).map(val => String.fromCharCode(val)).join('')) 
            : '';

          // Captura token do Supabase para autorizar a rota
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || localStorage.getItem('token') || '';

          // 6. Envia os dados gerados para o seu banco de dados via Backend
          await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/notifications/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              aluno_id: student.id,
              endpoint: subscription.endpoint,
              auth_key,
              p256dh_key,
              dispositivo: navigator.userAgent
            })
          });
          
          console.log('Dispositivo registrado no banco com sucesso!');
        } else {
          console.warn('O usuário recusou ou fechou o alerta automático.');
        }
      } catch (error) {
        console.error('Erro na rotina de disparo automático de notificações:', error);
      }
    };

    dispararPermissaoAoEntrar();
  }, []);

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
