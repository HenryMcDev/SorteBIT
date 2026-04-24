import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  name: string;
  isAdmin?: boolean;
}

// Credenciais fixas do administrador master
const ADMIN_USERNAME = 'henrydev';
const ADMIN_PASSWORD = '123321@';
const STORAGE_KEY = 'school_teacher_session';

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

      // 1) Credencial fixa de administrador (acesso total, ignora geo/desktop)
      if (trimmedName === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const adminTeacher: Teacher = {
          id: 'admin-henrydev',
          name: ADMIN_USERNAME,
          isAdmin: true,
        };
        setTeacher(adminTeacher);
        toast({
          title: 'Sucesso',
          description: 'Acesso administrativo concedido!',
        });
        return true;
      }

      // 2) Professores cadastrados pelo admin
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
