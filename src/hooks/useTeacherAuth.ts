
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  name: string;
}

export const useTeacherAuth = () => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simple hash function for password (in production, use proper bcrypt)
  const hashPassword = (password: string): string => {
    return btoa(password); // Basic base64 encoding - replace with proper hashing in production
  };

  const login = async (name: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, password_hash')
        .eq('name', name.trim())
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Erro",
          description: "Professor não encontrado.",
          variant: "destructive"
        });
        return false;
      }

      if (data.password_hash !== hashPassword(password)) {
        toast({
          title: "Erro",
          description: "Senha incorreta.",
          variant: "destructive"
        });
        return false;
      }

      setTeacher({ id: data.id, name: data.name });
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
        variant: "default"
      });
      return true;
    } catch (error) {
      console.error('Error logging in teacher:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer login.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setTeacher(null);
  };

  return {
    teacher,
    isLoading,
    login,
    logout
  };
};
