import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  name: string;
  isAdmin?: boolean;
}

const STORAGE_KEY = 'school_admin_session';
const WEBHOOK_URL = 'https://bitn8n.infinityflowapp.com/webhook/admin-sortebit';

export const useAdmAuth = () => {
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

  useEffect(() => {
    if (adminUser) {
      const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...adminUser, expiresAt: Date.now() + SESSION_TTL_MS })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [adminUser]);

  const login = async (name: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const trimmedName = name.trim();

      const resposta = await axios.post(WEBHOOK_URL, {
        Ação: 'Login',
        email: trimmedName,
        senha: password,
      });

      if (resposta.data?.status && !resposta.data.status.toLowerCase().includes('error')) {
        const user: AdminUser = {
          id: resposta.data?.id ?? `adm-${trimmedName}`,
          name: trimmedName,
          isAdmin: true,
        };
        setAdminUser(user);
        toast({
          title: 'Sucesso',
          description: 'Acesso administrativo concedido!',
        });
        return true;
      }

      const mensagem: string =
        resposta.data?.mensagem?.toString().trim() || 'Falha na autenticação';
      toast({
        title: 'Acesso negado',
        description: mensagem,
        variant: 'destructive',
      });
      return false;
    } catch (err) {
      console.error('Erro ao autenticar administrador:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar ao servidor de autenticação.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => setAdminUser(null);

  return {
    adminUser,
    isAdmin: adminUser?.isAdmin === true,
    isLoading,
    login,
    logout,
  };
};
