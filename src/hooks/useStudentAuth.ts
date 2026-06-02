import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isValidCPF } from '@/utils/cpfValidator';
import { getBackendUrl } from '../utils/backendUrl';

interface StudentUser {
  id: string;
  name: string;
  cpf: string;
  termos_aceitos?: boolean;
  bitcash?: number;
}

const STORAGE_KEY = 'bit_student_session';
const WEBHOOK_URL = `${getBackendUrl()}/api/student/register`;

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

  const [cpfValue, setCpfValue] = useState('');
  const [cpfError, setCpfError] = useState('');

  const handleCPFChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    setCpfValue(masked);

    if (digits.length === 11) {
      if (!isValidCPF(digits)) {
        setCpfError('CPF inválido');
      } else {
        setCpfError('');
      }
    } else {
      if (cpfError) setCpfError('');
    }
  };

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

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const emailLower = identifier.trim().toLowerCase();

      // 1. Autenticação nativa com Supabase Auth usando o e-mail
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password: password,
      });

      if (authError || !authData.user) {
        let errorMessage = 'Falha na autenticação. Verifique suas credenciais.';
        if (authError?.message.includes('Invalid login credentials')) {
          errorMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
        } else if (authError?.message.includes('Email not confirmed')) {
          errorMessage = 'Conta bloqueada ou não confirmada.';
        }

        toast({
          title: 'Acesso negado',
          description: errorMessage,
          variant: 'destructive',
        });
        return { success: false, error: errorMessage };
      }

      // 2. Consulta assíncrona na tabela estudantes após o login bem-sucedido
      const { data: estudante, error: fetchError } = await supabase
        .from('estudantes' as any)
        .select('id, nome_completo, cpf')
        .eq('email', emailLower)
        .maybeSingle();

      if (fetchError || !estudante) {
        await supabase.auth.signOut();
        toast({
          title: 'Usuário não encontrado',
          description: 'Sua conta não possui um perfil de estudante vinculado.',
          variant: 'destructive',
        });
        return { success: false, error: 'Sua conta não possui um perfil de estudante vinculado.' };
      }

      // 3. Sucesso absoluto: armazenar sessão
      const user: StudentUser = {
        id: (estudante as any).id || authData.user.id,
        name: (estudante as any).nome_completo || 'Aluno',
        cpf: (estudante as any).cpf,
      };
      
      setStudentUser(user);
      
      toast({
        title: 'Sucesso',
        description: 'Login realizado com sucesso!',
      });
      return { success: true };
      
    } catch (err) {
      console.error('Erro ao autenticar aluno:', err);
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

  const register = async (name: string, cpf: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({ title: 'Acesso negado', description: 'Sessão inválida. Por favor, faça login novamente.', variant: 'destructive' });
        return false;
      }

      const resposta = await axios.post(`${getBackendUrl()}/api/student/register`, {
        acao: 'Registro',
        nome: name.trim(),
        cpf: cleanCpf,
        email: email.trim().toLowerCase(),
        senha: password,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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

  const logout = () => {
    setStudentUser(null);
    window.location.href = '/';
  };

  return {
    studentUser,
    isAuthenticated: !!studentUser,
    isLoading,
    login,
    register,
    logout,
    cpfValue,
    cpfError,
    handleCPFChange,
    setCpfValue,
  };
};
