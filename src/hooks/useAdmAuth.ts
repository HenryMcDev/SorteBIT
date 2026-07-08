import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  name: string;
  isAdmin?: boolean;
}

const STORAGE_KEY = 'school_admin_session';
const WEBHOOK_URL = 'https://bitn8n.infinityflowapp.com/webhook/admin-sortebit';

export const useAdmAuth = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as AdminUser & { expiresAt?: number };
      // Invalida sessão expirada
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função utilitária para atualizar a sessão e disparar o evento de sincronização
  const updateSession = (user: AdminUser | null) => {
    if (user) {
      const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
      const sessionData = { ...user, expiresAt: Date.now() + SESSION_TTL_MS };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      setAdminUser(sessionData);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setAdminUser(null);
    }
    window.dispatchEvent(new Event('admin-session-change'));
  };

  // Efeito para sincronizar sessões entre múltiplas instâncias do hook de forma reativa
  useEffect(() => {
    const syncSession = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setAdminUser(null);
          return;
        }
        const parsed = JSON.parse(stored) as AdminUser & { expiresAt?: number };
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(STORAGE_KEY);
          setAdminUser(null);
        } else {
          setAdminUser(parsed);
        }
      } catch {
        setAdminUser(null);
      }
    };

    window.addEventListener('admin-session-change', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener('admin-session-change', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const emailLower = identifier.trim().toLowerCase();

      // 1. Primeira ação: Autenticação nativa com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password: password,
      });

      if (authError || !authData.user) {
        let errorMessage = 'Falha na autenticação. Verifique suas credenciais.';
        if (authError?.message.includes('Invalid login credentials')) {
          errorMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
        } else if (authError?.message.includes('Email not confirmed')) {
          errorMessage = 'E-mail não confirmado ou conta bloqueada.';
        }

        toast({
          title: 'Acesso negado',
          description: errorMessage,
          variant: 'destructive',
        });
        return { success: false, error: errorMessage };
      }

      // 2. Consulta secundária na tabela administradores para checar privilégio
      const { data: adminData, error: fetchError } = await supabase
        .from('admin_user' as any)
        .select('id, nome, email, role')
        .eq('email', authData.user.email?.toLowerCase() || emailLower)
        .maybeSingle();

      // Validar se retornou algo e se a role é a esperada
      if (fetchError || !adminData || (adminData as any).role !== 'admin') {
        await supabase.auth.signOut();
        toast({
          title: 'Acesso negado',
          description: 'Sua conta não possui privilégios administrativos.',
          variant: 'destructive',
        });
        return { success: false, error: 'Sua conta não possui privilégios administrativos.' };
      }

      // 3. Sucesso: armazenar sessão
      const user: AdminUser = {
        id: (adminData as any).id,
        name: (adminData as any).nome || (adminData as any).email,
        isAdmin: true,
      };
      
      updateSession(user);
      
      toast({
        title: 'Sucesso',
        description: 'Acesso administrativo concedido!',
      });
      navigate('/admin/participantes');
      return { success: true };

    } catch (err) {
      console.error('Erro ao autenticar administrador:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar ao servidor de autenticação.',
        variant: 'destructive',
      });
      return { success: false, error: 'Erro interno ou de conexão.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erros de rede no signOut — sessão local já será limpa
    } finally {
      updateSession(null);
      navigate('/');
    }
  };

  return {
    adminUser,
    isAdmin: adminUser?.isAdmin === true,
    isLoading,
    login,
    logout,
  };
};
