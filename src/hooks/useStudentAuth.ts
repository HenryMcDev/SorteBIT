import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isValidCPF } from '@/utils/cpfValidator';
import { getBackendUrl } from '@/utils/backendUrl';

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
const REGISTER_URL = getBackendUrl() + '/api/student/register';

export const useStudentAuth = () => {
  const navigate = useNavigate();
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
      // Inicializa com o bitcash zerado / limpo
      return { ...parsed, bitcash: 0 };
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

  // Efeito para carregar a sessão e os dados do estudante de forma segura direto do banco de dados na montagem
  useEffect(() => {
    let isMounted = true;

    const loadSessionAndData = async () => {
      // 1. Pega o usuário autenticado direto da sessão segura do Supabase (não do localStorage)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 2. Busca o saldo REAL direto do banco de dados usando o e-mail cadastrado
        const { data, error } = await supabase
          .from('estudantes' as any)
          .select('id, nome_completo, bitcash, termos_aceitos')
          .eq('email', session.user.email)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar dados seguros do estudante:", error);
          return;
        }

        if (data && isMounted) {
          const result = data as any;
          const user: StudentUser = {
            id: result.id,
            name: result.nome_completo || 'Aluno',
            bitcash: result.bitcash || 0,
            termos_aceitos: result.termos_aceitos,
          };
          
          setStudentUser(user);
          
          // Atualiza também o objeto do localStorage com o valor real do bitcash vindo do servidor
          const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...user, expiresAt: Date.now() + SESSION_TTL_MS })
          );
        }
      } else {
        // Se não há sessão no Supabase, limpa o estado
        if (isMounted) {
          setStudentUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    loadSessionAndData();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string; role?: string }> => {
    setIsLoading(true);
    try {
      const emailLower = identifier.trim().toLowerCase();

      // Chamada unificada para o backend
      const response = await axios.post(getBackendUrl() + '/api/auth/login', {
        email: emailLower,
        password: password,
      });

      const data = response.data;
      if (data.sucesso) {
        // Define a sessão no Supabase para requisições subsequentes
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (data.role === 'PROFESSOR') {
          // É um professor! Salvar na sessionStorage
          sessionStorage.setItem('school_teacher_session', JSON.stringify({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: 'PROFESSOR'
          }));
          return { success: true, role: 'PROFESSOR' };
        } else {
          // É um estudante! Salvar na localStorage
          const user = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
          };
          setStudentUser(user);
          return { success: true, role: 'STUDENT' };
        }
      } else {
        const errorMsg = data.erro || 'Falha na autenticação. Verifique suas credenciais.';
        toast({
          title: 'Acesso negado',
          description: errorMsg,
          variant: 'destructive',
        });
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('Erro ao autenticar:', err);
      const errorMsg = err.response?.data?.erro || 'Não foi possível conectar ao servidor de autenticação.';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      });
      return { success: false, error: 'Erro de conexão ou credenciais inválidas.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, cpf: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');

      const resposta = await axios.post(REGISTER_URL, {
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
    } catch (error: any) {
      console.error('Erro ao registrar aluno:', error);
      const errorMessage = error.response?.data?.message || 'Falha no cadastro! Tente novamente.';
      toast({
        title: 'Erro no cadastro',
        description: errorMessage,
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
      navigate('/');
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
