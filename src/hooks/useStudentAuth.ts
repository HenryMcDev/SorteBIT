import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudentUser {
  id: string;
  name: string;
  cpf: string;
  termos_aceitos?: boolean;
  bitcash?: number;
}

const STORAGE_KEY = 'bit_student_session';
const WEBHOOK_URL = 'https://bitn8n.infinityflowapp.com/webhook/student-sortebit';

export const useStudentAuth = () => {
  const [studentUser, setStudentUser] = useState<StudentUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as StudentUser & { expiresAt?: number };
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
    if (studentUser) {
      const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas para aluno
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...studentUser, expiresAt: Date.now() + SESSION_TTL_MS })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [studentUser]);

  // Efeito independente para buscar o nome real no Supabase quando logado
  useEffect(() => {
    let isMounted = true;

    const fetchRealName = async () => {
      if (!studentUser?.cpf) return;

      try {
        // Alterado de 'nome' para 'nome_completo' para bater com o banco de dados e adicionado 'bitcash'
        const { data, error } = await supabase
          .from('estudantes' as any)
          .select('nome_completo, termos_aceitos, bitcash')
          .eq('cpf', studentUser.cpf)
          .maybeSingle();

        if (error) throw error;
        
        const result = data as any;
        
        // Ajustado para ler a propriedade correta do resultado da consulta
        if (result && isMounted) {
          const updatedName = result.nome_completo || studentUser.name;
          // Atualizamos apenas se houve mudança no nome, termos ou bitcash
          if (updatedName !== studentUser.name || result.termos_aceitos !== studentUser.termos_aceitos || result.bitcash !== studentUser.bitcash) {
            setStudentUser(prev => prev ? { ...prev, name: updatedName, termos_aceitos: result.termos_aceitos, bitcash: result.bitcash } : null);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar o nome real do estudante:', err);
      }
    };

    fetchRealName();

    return () => {
      isMounted = false;
    };
  }, [studentUser?.cpf]);

  const login = async (cpf: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');

      const resposta = await axios.post(WEBHOOK_URL, {
        Ação: 'Login',
        cpf: cleanCpf,
        senha: password,
      });

      if (resposta.data?.autenticado === true && resposta.data?.status === 'aprovado') {
        const user: StudentUser = {
          id: resposta.data?.id ?? `student-${cleanCpf}`,
          name: resposta.data?.nome ?? 'Aluno',
          cpf: cleanCpf,
        };
        setStudentUser(user);
        toast({
          title: 'Sucesso',
          description: 'Login realizado com sucesso!',
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
      console.error('Erro ao autenticar aluno:', err);
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

  const register = async (name: string, cpf: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');

      const resposta = await axios.post(WEBHOOK_URL, {
        Ação: 'Registro',
        nome: name.trim(),
        cpf: cleanCpf,
        email: email.trim().toLowerCase(),
        senha: password,
      });

      if (resposta.data?.status && !String(resposta.data.status).toLowerCase().includes('error')) {
        toast({
          title: 'Cadastro realizado!',
          description: resposta.data?.mensagem || 'Sua conta foi criada com sucesso.',
        });
        return true;
      }

      const mensagem: string =
        resposta.data?.mensagem?.toString().trim() || 'Falha no cadastro.';
      toast({
        title: 'Erro no cadastro',
        description: mensagem,
        variant: 'destructive',
      });
      return false;
    } catch (err) {
      console.error('Erro ao registrar aluno:', err);
      toast({
        title: 'Erro de conexão',
        description: 'Verifique sua conexão com a internet e tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => setStudentUser(null);

  return {
    studentUser,
    isAuthenticated: !!studentUser,
    isLoading,
    login,
    register,
    logout,
  };
};
