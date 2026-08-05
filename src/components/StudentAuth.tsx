import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, ShieldCheck, Lock, Loader2, EyeOff, Eye, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { validatePasswordStrength } from '@/hooks/useStudentAuth';
import { InstallPWAButton } from './InstallPWAButton';
import axios from 'axios';
import { getBackendUrl } from '@/utils/backendUrl';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

interface StudentAuthProps {
  isLoading: boolean;
  login: (cpf: string, pass: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  register: (name: string, cpf: string, email: string, pass: string) => Promise<boolean>;
  cpfValue: string;
  cpfError: string;
  handleCPFChange: (value: string) => void;
  setCpfValue: (value: string) => void;
  defaultMode?: 'login' | 'register';
}

const StudentAuth = ({ isLoading, login, register, cpfValue, cpfError, handleCPFChange, setCpfValue, defaultMode = 'login' }: StudentAuthProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regState, setRegState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [regRole, setRegRole] = useState<'student' | 'professor'>('student');
  const [regAdminCode, setRegAdminCode] = useState('');

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotState, setForgotState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [forgotPhase, setForgotPhase] = useState(1);
  const [forgotEmailMasked, setForgotEmailMasked] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [forgotDebugError, setForgotDebugError] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    try {
      if (!loginEmail.trim() || !loginPassword.trim()) {
        return;
      }
      setLoginError('');
      const result = await login(loginEmail, loginPassword);
      if (result.success) {
        if (result.role === 'PROFESSOR') {
          navigate('/professor/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setLoginError(result.error || 'E-mail ou senha incorretos. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Ocorreu um erro inesperado. Tente novamente.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotState('submitting');
    setForgotDebugError('');
    try {
      // 1. Sanitizar o CPF (remover caracteres não numéricos)
      const cpfLimpo = forgotIdentifier.replace(/\D/g, '');
      const cpfFormatado = formatCPF(forgotIdentifier);

      if (!cpfLimpo || cpfLimpo.length !== 11) {
        throw new Error('Por favor, informe um CPF válido com 11 dígitos.');
      }

      // 2. Buscar no Supabase por CPF limpo ou mascarado
      const { data: participante, error } = await (supabase as any)
        .from('estudantes')
        .select('*')
        .or(`cpf.eq.${cpfLimpo},cpf.eq.${cpfFormatado}`)
        .maybeSingle();

      if (error) {
        console.error('[Supabase Error]:', error);
        throw new Error('Erro ao consultar o banco de dados. Tente novamente.');
      }

      if (!participante) {
        throw new Error('CPF não encontrado. Não localizamos um cadastro com este CPF.');
      }

      // 3. Disparar redefinição de senha via Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(participante.email);

      if (resetError) {
        console.error('[Supabase Auth Error]:', resetError);
        throw new Error(`Erro ao disparar e-mail de recuperação: ${resetError.message}`);
      }

      const email = participante.email || '';
      let maskedEmail = 'seu e-mail cadastrado';
      if (email && email.includes('@')) {
        const [username, domain] = email.split('@');
        maskedEmail = `${username.charAt(0)}***@${domain}`;
      }
      setForgotEmailMasked(maskedEmail);
      setForgotEmail(email);
      setForgotPhase(2);
      setTimeLeft(60);
      setForgotState('idle');
      toast({ title: 'Código enviado!', description: `Enviamos o código para ${maskedEmail}.` });
    } catch (err: any) {
      console.error('Erro na recuperação de senha por CPF:', err);
      const errorMsg = err.message || 'Não localizamos um cadastro com este CPF.';
      toast({ title: 'Erro', description: errorMsg, variant: 'destructive' });
      setForgotState('idle');
    }
  };

  const handlePhase2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotCode.length !== 8) {
      toast({ title: 'Código inválido', description: 'Digite o código de 8 dígitos.', variant: 'destructive' });
      return;
    }
    if (forgotNewPassword.length < 8) {
      toast({ title: 'Senha curta', description: 'A nova senha deve ter pelo menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    setForgotState('submitting');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotEmail,
        token: forgotCode,
        type: 'recovery'
      });
      if (verifyError) {
        toast({ title: 'Código incorreto ou expirado', description: 'O código inserido é inválido ou já expirou.', variant: 'destructive' });
        setForgotState('idle');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: forgotNewPassword });
      
      if (updateError) throw updateError;
      
      setForgotState('success');
    } catch (err: any) {
      console.error(err);
      setForgotState('idle');
      
      let errorMessage = err?.message || 'Não foi possível atualizar a senha.';
      if (typeof errorMessage === 'string' && errorMessage.includes('Password should contain at least one character of each')) {
        errorMessage = 'Sua nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.';
      }
      toast({ title: 'Erro ao atualizar', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0) return;
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleForgotSubmit(fakeEvent);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (regRole === 'student') {
        if (!regFullName.trim() || !cpfValue.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
          toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos para se registrar.', variant: 'destructive' });
          return;
        }
        if (cpfValue.replace(/\D/g, '').length !== 11) {
          toast({ title: 'CPF inválido', description: 'Digite um CPF completo com 11 dígitos.', variant: 'destructive' });
          return;
        }
        if (cpfError) {
          toast({ title: 'CPF inválido', description: 'Corrija o erro no CPF antes de enviar.', variant: 'destructive' });
          return;
        }
      } else {
        if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim() || !regAdminCode.trim()) {
          toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos para se registrar.', variant: 'destructive' });
          return;
        }
        if (regAdminCode.trim().length !== 5) {
          toast({ title: 'Código inválido', description: 'O código administrativo deve ter 5 dígitos.', variant: 'destructive' });
          return;
        }
      }

      if (regPassword !== regConfirmPassword) {
        toast({ title: 'Senhas não coincidem', description: 'A senha e a confirmação devem ser idênticas.', variant: 'destructive' });
        return;
      }
      if (regPassword.length < 8) {
        toast({ title: 'Senha muito curta', description: 'A senha deve ter no mínimo 8 caracteres.', variant: 'destructive' });
        return;
      }
      const pwStrength = validatePasswordStrength(regPassword);
      if (!pwStrength.valid) {
        toast({
          title: 'Senha fraca',
          description: pwStrength.errors.join(' • '),
          variant: 'destructive',
        });
        return;
      }

      setRegState('submitting');

      if (regRole === 'student') {
        const success = await register(regFullName, cpfValue, regEmail, regPassword);
        if (success) {
          setRegState('success');
        } else {
          setRegState('idle');
        }
      } else {
        // Professor Registration via Backend API
        const REGISTER_PROF_URL = getBackendUrl() + '/api/auth/register-professor';
        
        try {
          const resposta = await axios.post(REGISTER_PROF_URL, {
            nome: regFullName.trim(),
            email: regEmail.trim().toLowerCase(),
            senha: regPassword,
            admin_code: regAdminCode.trim()
          });

          if (resposta.data?.sucesso) {
            toast({
              title: 'Cadastro realizado!',
              description: resposta.data?.mensagem || 'Sua conta de professor foi criada com sucesso.',
            });
            setRegState('success');
          } else {
            toast({
              title: 'Erro no cadastro',
              description: resposta.data?.erro || 'Falha no cadastro de professor.',
              variant: 'destructive',
            });
            setRegState('idle');
          }
        } catch (error: any) {
          console.error('Erro ao registrar professor:', error);
          const errorMessage = error.response?.data?.erro || 'Falha no cadastro! Tente novamente.';
          toast({
            title: 'Erro no cadastro',
            description: errorMessage,
            variant: 'destructive',
          });
          setRegState('idle');
        }
      }
    } catch (err) {
      console.error(err);
      setRegState('idle');
      toast({ title: 'Erro', description: 'Ocorreu um erro inesperado no formulário.', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 w-full notranslate flex flex-col gap-4">
      <InstallPWAButton variant="login" />
      <Card className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-zinc-900/85 backdrop-blur-xl">
        {/* Mode toggle tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => { setAuthMode('login'); setForgotPhase(1); }}
            className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'login' || authMode === 'forgot'
              ? 'text-school-blue-600 dark:text-white border-b-2 border-school-blue-500 bg-zinc-50 dark:bg-zinc-900/50'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            <Key className="w-4 h-4 inline mr-2 -mt-0.5" />
            Entrar
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'register'
              ? 'text-school-blue-600 dark:text-white border-b-2 border-school-blue-500 bg-zinc-50 dark:bg-zinc-900/50'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            <ShieldCheck className="w-4 h-4 inline mr-2 -mt-0.5" />
            Registrar-se
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* ── LOGIN FORM ── */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                  <Lock className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Acesso ao Uniforme Premiado</h2>
                <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">Entre com seu e-mail e senha cadastrados.</p>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="loginEmail" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">E-mail</label>
                <input
                  id="loginEmail"
                  type="email"
                  placeholder="aluno@email.com"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value || ''); setLoginError(''); }}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="loginPassword" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Senha</label>
                  <button type="button" onClick={() => { setAuthMode('forgot'); setForgotPhase(1); setForgotState('idle'); setForgotIdentifier(''); }} className="text-xs font-semibold text-school-blue-600 dark:text-school-blue-400 hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="loginPassword"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Digite a senha"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value || ''); setLoginError(''); }}
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowLoginPassword(v => !v)} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !loginEmail.trim() || !loginPassword.trim()}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-school-blue-600 notranslate"
                style={{ boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
              >
                {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>) : (<><Key className="w-4 h-4" /> Entrar</>)}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {authMode === 'register' && (
            <div>
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                  <ShieldCheck className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Novo Cadastro</h2>
                <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">Crie sua conta de acesso ao Uniforme Premiado.</p>
              </div>

              {/* Toggle de Aluno / Professor */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-4 border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setRegRole('student')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                    regRole === 'student'
                      ? 'bg-white dark:bg-zinc-750 text-school-blue-600 dark:text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Aluno
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('professor')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                    regRole === 'professor'
                      ? 'bg-white dark:bg-zinc-750 text-school-blue-600 dark:text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Professor
                </button>
              </div>

              {regState === 'success' ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-school-blue-800 dark:text-white">Cadastro realizado!</h3>
                  <p className="text-school-blue-600 dark:text-zinc-400 text-sm max-w-xs">Sua conta foi criada. Clique em "Entrar" para acessar e participar dos sorteios.</p>
                  <button onClick={() => { setAuthMode('login'); setRegState('idle'); }} className="mt-2 text-sm font-semibold text-school-blue-600 hover:text-school-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2">Ir para o login</button>
                </div>
              ) : (
                <div className="relative">
                  <form onSubmit={handleRegisterSubmit} className="space-y-4 notranslate" noValidate>
                    <div className="space-y-2">
                      <label htmlFor="regFullName" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Nome completo <span className="text-red-500">*</span></label>
                      <input id="regFullName" type="text" autoComplete="name" placeholder="Ex.: João da Silva" value={regFullName} onChange={(e) => setRegFullName(e.target.value || '')} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    {regRole === 'student' ? (
                      <div className="space-y-2">
                        <label htmlFor="regCpf" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">CPF <span className="text-red-500">*</span></label>
                        <input id="regCpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpfValue} onChange={(e) => handleCPFChange(e.target.value)} disabled={regState === 'submitting'} maxLength={14} className={`w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border ${cpfError ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : 'border-zinc-200 dark:border-zinc-700 focus:ring-school-blue-500/50 focus:border-school-blue-500'} px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`} />
                        {cpfError && (
                          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">{cpfError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label htmlFor="regAdminCode" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Código Administrativo (5 dígitos) <span className="text-red-500">*</span></label>
                        <input id="regAdminCode" type="text" placeholder="Digite o código de 5 dígitos" value={regAdminCode} onChange={(e) => setRegAdminCode(e.target.value.replace(/\D/g, '').slice(0, 5))} disabled={regState === 'submitting'} maxLength={5} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-center tracking-widest text-lg" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="regEmail" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">E-mail <span className="text-red-500">*</span></label>
                      <input id="regEmail" type="email" autoComplete="email" placeholder="aluno@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value || '')} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="regPassword" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Senha <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input id="regPassword" type={showRegPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mín. 8 chars, maiúsc., número e símbolo" value={regPassword} onChange={(e) => setRegPassword(e.target.value || '')} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <button type="button" onClick={() => setShowRegPassword(v => !v)} disabled={regState === 'submitting'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:pointer-events-none">
                          {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {/* Indicador de força de senha */}
                      {regPassword.length > 0 && (() => {
                        const { valid, errors } = validatePasswordStrength(regPassword);
                        return (
                          <div className={`text-xs rounded-lg px-3 py-2 mt-1 flex flex-col gap-1 ${valid ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}` }>
                            {valid ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Senha forte</span>
                            ) : (
                              errors.map((err, i) => (
                                <span key={i} className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}</span>
                              ))
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="regConfirmPassword" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Confirmar senha <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input id="regConfirmPassword" type={showRegConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita a senha" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value || '')} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <button type="button" onClick={() => setShowRegConfirm(v => !v)} disabled={regState === 'submitting'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:pointer-events-none">
                          {showRegConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {regConfirmPassword.length > 0 && regState !== 'submitting' && regConfirmPassword.length >= regPassword.length && (
                        <p className={`text-xs flex items-center gap-1 mt-1 ${regPassword === regConfirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {regPassword === regConfirmPassword
                            ? <span className="flex items-center gap-1 notranslate"><CheckCircle2 className="w-3.5 h-3.5" /> Senhas coincidem</span>
                            : <span className="flex items-center gap-1 notranslate"><XCircle className="w-3.5 h-3.5" /> As senhas não coincidem</span>}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={regState === 'submitting'}
                      className="mt-4 w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-school-blue-600 notranslate"
                      style={{ boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
                    >
                      {regState === 'submitting'
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : 'Registrar e Entrar'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {authMode === 'forgot' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                  <Lock className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Recuperar Senha</h2>
                <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">{forgotPhase === 1 ? 'Informe seu CPF para iniciar.' : `Código enviado para ${forgotEmailMasked}`}</p>
              </div>

              {forgotDebugError && (
                <div className="bg-red-600 text-white p-4 rounded-xl mb-6 overflow-auto max-h-64 text-xs font-mono whitespace-pre-wrap break-words shadow-lg border-2 border-red-800">
                  <strong className="text-sm">Falha Supabase Auth (Debug):</strong>
                  <div className="mt-2">{forgotDebugError}</div>
                </div>
              )}

              {forgotState === 'success' ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-school-blue-800 dark:text-white">Senha atualizada!</h3>
                  <p className="text-school-blue-600 dark:text-zinc-400 text-sm max-w-xs">Você já pode realizar o login com sua nova senha.</p>
                  <button onClick={() => setAuthMode('login')} className="mt-4 w-full h-12 rounded-xl font-bold text-sm text-school-blue-600 bg-school-blue-50 dark:bg-zinc-800 dark:text-blue-400 hover:bg-school-blue-100 transition-colors">Voltar para o login</button>
                </div>
              ) : (
                <form onSubmit={forgotPhase === 1 ? handleForgotSubmit : handlePhase2Submit} className="space-y-4">
                  {forgotPhase === 1 ? (
                    <div className="space-y-2">
                      <label htmlFor="forgotIdentifier" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">CPF</label>
                      <input
                        id="forgotIdentifier"
                        type="text"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(formatCPF(e.target.value || ''))}
                        disabled={forgotState === 'submitting'}
                        maxLength={14}
                        className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label htmlFor="forgotCode" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Código de Segurança</label>
                        <input
                          id="forgotCode"
                          type="text"
                          inputMode="numeric"
                          placeholder="00000000"
                          value={forgotCode}
                          onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          disabled={forgotState === 'submitting'}
                          maxLength={8}
                          className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-center text-xl tracking-widest font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="forgotNewPassword" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Nova Senha</label>
                        <input
                          id="forgotNewPassword"
                          type="password"
                          placeholder="Mínimo 8 caracteres"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          disabled={forgotState === 'submitting'}
                          className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                        />
                        {/* Indicador de força de senha para recuperação */}
                        {forgotNewPassword.length > 0 && (() => {
                          const { valid, errors } = validatePasswordStrength(forgotNewPassword);
                          return (
                            <div className={`text-xs rounded-lg px-3 py-2 mt-1 flex flex-col gap-1 ${valid ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}` }>
                              {valid ? (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Senha forte</span>
                              ) : (
                                errors.map((err, i) => (
                                  <span key={i} className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}</span>
                                ))
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={forgotState === 'submitting' || (forgotPhase === 1 ? !forgotIdentifier.trim() : (forgotCode.length !== 8 || forgotNewPassword.length < 8 || !validatePasswordStrength(forgotNewPassword).valid))}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-school-blue-600"
                  >
                    {forgotState === 'submitting' ? (<><Loader2 className="w-4 h-4 animate-spin" /> {forgotPhase === 1 ? 'Processando...' : 'Verificando...'}</>) : (forgotPhase === 1 ? 'Recuperar Acesso' : 'Confirmar e Redefinir Senha')}
                  </button>
                  
                  {forgotPhase === 2 && (
                    <button 
                      type="button" 
                      onClick={handleResendCode}
                      disabled={timeLeft > 0 || forgotState === 'submitting'}
                      className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 disabled:cursor-not-allowed ${
                        timeLeft > 0 
                          ? 'text-school-blue-600/50 dark:text-school-blue-400/50 cursor-not-allowed' 
                          : 'bg-school-blue-100 text-school-blue-700 hover:bg-school-blue-200 dark:bg-school-blue-900/50 dark:text-school-blue-300 dark:hover:bg-school-blue-900 active:scale-[0.98]'
                      }`}
                    >
                      {timeLeft > 0 ? `Aguarde ${timeLeft}s para reenviar` : 'Reenviar Código'}
                    </button>
                  )}

                  <button type="button" onClick={() => { if (forgotPhase === 2) { setForgotPhase(1); setForgotState('idle'); } else { setAuthMode('login'); } }} className="w-full h-12 rounded-xl font-bold text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                    {forgotPhase === 2 ? 'Voltar' : 'Cancelar'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentAuth;
