import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isValidCPF } from '@/utils/cpfValidator';

// ── Validação de complexidade de senha ───────────────────────────────────────
export interface PasswordStrength {
  valid: boolean;
  errors: string[];
}

export const validatePasswordStrength = (password: string): PasswordStrength => {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Mínimo de 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Pelo menos uma letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('Pelo menos uma letra minúscula');
  if (!/[0-9]/.test(password)) errors.push('Pelo menos um número');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Pelo menos um caractere especial (!@#$%)');
  return { valid: errors.length === 0, errors };
};

interface StudentUser {
  id: string;
  name: string;
  // CPF não é salvo em localStorage — buscado via sessão do Supabase Auth quando necessário
  cpf?: string;
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
      if (!studentUser?.id) return;

      try {
        // Busca usando id do estudante para evitar vazamento de CPF
        const { data, error } = await supabase
          .from('estudantes' as any)
          .select('nome_completo, termos_aceitos, bitcash')
          .eq('id', studentUser.id)
          .maybeSingle();

        if (error) throw error;
        
        const result = data as any;
        
        if (result && isMounted) {
          const updatedName = result.nome_completo || studentUser.name;
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
  }, [studentUser?.id]);

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
        .select('id, nome_completo')
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

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erros de rede no signOut — sessão local já será limpa
    } finally {
      setStudentUser(null);
      window.location.href = '/';
    }
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
