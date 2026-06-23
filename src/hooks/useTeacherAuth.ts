import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  name: string;
  isAdmin?: boolean;
}

const STORAGE_KEY = 'school_teacher_session';

// Rate limiting: máximo de 5 tentativas por 60 segundos por nome de usuário
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkLoginRateLimit(username: string): { allowed: boolean; secondsLeft: number } {
  const now = Date.now();
  const key = username.toLowerCase().trim();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, secondsLeft: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, secondsLeft: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, secondsLeft: 0 };
}

export const useTeacherAuth = () => {
  const [teacher, setTeacher] = useState<Teacher | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Teacher) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (teacher) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(teacher));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [teacher]);

  // Hash simples (mantido para compatibilidade com cadastros existentes)
  const hashPassword = (password: string): string => btoa(password);

  const login = async (name: string, password: string) => {
    setIsLoading(true);
    try {
      const trimmedName = name.trim();

      // ── Rate limiting ────────────────────────────────────────────────────
      const { allowed, secondsLeft } = checkLoginRateLimit(trimmedName);
      if (!allowed) {
        toast({
          title: 'Muitas tentativas',
          description: `Aguarde ${secondsLeft} segundos antes de tentar novamente.`,
          variant: 'destructive',
        });
        return false;
      }

      // ── Consulta à tabela teachers ───────────────────────────────────────
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, password_hash')
        .eq('name', trimmedName)
        .maybeSingle();

      if (error || !data) {
        toast({
          title: 'Erro',
          description: 'Professor não encontrado.',
          variant: 'destructive',
        });
        return false;
      }

      if (data.password_hash !== hashPassword(password)) {
        toast({
          title: 'Erro',
          description: 'Senha incorreta.',
          variant: 'destructive',
        });
        return false;
      }

      setTeacher({ id: data.id, name: data.name, isAdmin: false });
      toast({
        title: 'Sucesso',
        description: 'Login realizado com sucesso!',
      });
      return true;
    } catch (err) {
      console.error('Error logging in teacher:', err);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao fazer login.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => setTeacher(null);

  return {
    teacher,
    isAdmin: teacher?.isAdmin === true,
    isLoading,
    login,
    logout,
  };
};
