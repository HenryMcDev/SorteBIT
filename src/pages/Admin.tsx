import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dice1, Crown, Lock, Key, LogOut, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck, Copy, CheckCheck, RefreshCw, MessageSquareWarning, Gift, User, Home, Users } from 'lucide-react';
import { useAdmAuth } from '@/hooks/useAdmAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import ClassCodeManager from '@/components/ClassCodeManager';
import { supabase } from '@/integrations/supabase/client';
import Participantes from '@/components/Participantes';
import FeedbackModeration from '@/components/FeedbackModeration';
import CadastroPremios from '@/components/CadastroPremios';
import { Link, Navigate } from 'react-router-dom';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const Admin = () => {
  const { adminUser, isAdmin, isLoading, login, logout } = useAdmAuth();

  // Auth screen mode
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');

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

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCode, setRegCode] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regState, setRegState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Admin Panel State
  const [activeTab, setActiveTab] = useState<'lottery' | 'codes' | 'moderacao' | 'premios'>('lottery');
  const { toast } = useToast();

  // Admin Code Generator State
  const [generatedAdminCode, setGeneratedAdminCode] = useState('');
  const [isGeneratingAdminCode, setIsGeneratingAdminCode] = useState(false);
  const [adminCodeCopied, setAdminCodeCopied] = useState(false);
  const [adminCodeDebugError, setAdminCodeDebugError] = useState<string | null>(null);

  const generateAdminCode = async () => {
    setIsGeneratingAdminCode(true);
    setAdminCodeDebugError(null);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const code = Array.from({ length: 8 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');

      const { error } = await supabase.from('code_adm').insert({ code });

      if (error) {
        const debugMsg = [
          `message: ${error.message}`,
          `code: ${error.code}`,
          error.details ? `details: ${error.details}` : null,
          error.hint ? `hint: ${error.hint}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        setAdminCodeDebugError(debugMsg);
        throw error;
      }

      setGeneratedAdminCode(code);
      toast({ title: 'Código gerado!', description: `Código "${code}" salvo com sucesso.` });
    } catch (err) {
      if (!adminCodeDebugError) {
        // Erro de rede ou inesperado (não veio do Supabase)
        const msg = err instanceof Error ? err.message : String(err);
        setAdminCodeDebugError(`Erro inesperado: ${msg}`);
      }
      toast({
        title: 'Erro ao gerar código',
        description: 'Não foi possível salvar o código. Veja o debug abaixo.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAdminCode(false);
    }
  };

  const copyAdminCode = () => {
    if (!generatedAdminCode) return;
    navigator.clipboard.writeText(generatedAdminCode);
    setAdminCodeCopied(true);
    setTimeout(() => setAdminCodeCopied(false), 2000);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotState('submitting');
    setForgotDebugError('');
    try {
      const cpfClean = forgotIdentifier.replace(/\D/g, '');
      let query = supabase.from('admin_user' as any).select('email');
      
      if (cpfClean.length === 11) {
        const cpfMasked = `${cpfClean.slice(0, 3)}.${cpfClean.slice(3, 6)}.${cpfClean.slice(6, 9)}-${cpfClean.slice(9, 11)}`;
        query = query.or(`cpf.eq.${cpfClean},cpf.eq.${cpfMasked}`);
      } else {
        query = query.eq('cpf', cpfClean);
      }

      const { data } = await query.maybeSingle();
      if (!data) {
        toast({ title: 'CPF não encontrado', description: 'Não localizamos um administrador com este CPF.', variant: 'destructive' });
        setForgotState('idle');
        return;
      }
      const email = (data as any).email || '';
      let maskedEmail = 'seu e-mail cadastrado';
      if (email && email.includes('@')) {
        const [username, domain] = email.split('@');
        maskedEmail = `${username.charAt(0)}***@${domain}`;
      }
      setForgotEmailMasked(maskedEmail);
      setForgotEmail(email);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) {
        console.error('Erro ao enviar email de reset:', resetError);
        toast({ title: 'Erro', description: 'Ocorreu um erro ao enviar o e-mail de recuperação. Tente novamente.', variant: 'destructive' });
        setForgotState('idle');
        return;
      }
      setForgotPhase(2);
      setTimeLeft(60);
      setForgotState('idle');
      toast({ title: 'Código enviado!', description: `Enviamos o código para ${maskedEmail}.` });
    } catch (err) {
      console.error(err);
      setForgotState('idle');
      toast({ title: 'Erro de conexão', description: 'Não foi possível enviar a solicitação.', variant: 'destructive' });
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
    } catch (err) {
      console.error(err);
      setForgotState('idle');
      toast({ title: 'Erro', description: 'Não foi possível atualizar a senha.', variant: 'destructive' });
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0) return;
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
    await handleForgotSubmit(fakeEvent);
  };

  const WEBHOOK_URL = 'https://bitn8n.infinityflowapp.com/webhook/admin-sortebit';

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!loginUsername.trim() || !loginPassword.trim()) {
      return;
    }
    setLoginError('');
    const result = await login(loginUsername, loginPassword);
    if (result.success) {
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError(result.error || 'Email ou senha incorretos. Tente novamente.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regCpf.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim() || !regCode.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos, incluindo o Código de Convite.', variant: 'destructive' });
      return;
    }
    if (regCpf.replace(/\D/g, '').length !== 11) {
      toast({ title: 'CPF inválido', description: 'Digite um CPF completo com 11 dígitos.', variant: 'destructive' });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast({ title: 'Senhas não coincidem', description: 'A senha e a confirmação devem ser idênticas.', variant: 'destructive' });
      return;
    }
    if (regPassword.length < 8) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter no mínimo 8 caracteres.', variant: 'destructive' });
      return;
    }

    // Lock the entire form immediately — no going back until the webhook responds
    setRegState('submitting');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s — período seguro de espera

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          Ação: 'Registro',
          nome: regFullName.trim(),
          cpf: regCpf.replace(/\D/g, ''),
          email: regEmail.trim().toLowerCase(),
          senha: regPassword,
          codigo: regCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && !data.status?.toLowerCase().includes('error')) {
        setRegState('success');
        toast({ title: 'Administrador cadastrado!', description: data.mensagem });
      } else {
        const msg: string = data?.mensagem?.toString().trim() || 'Falha no cadastro.';
        setRegState('idle');
        toast({ title: 'Erro no cadastro', description: msg, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setRegState('idle');
      toast({
        title: isAbort ? 'Operação expirou' : 'Erro de conexão',
        description: isAbort
          ? 'A operação demorou mais que o esperado. Por favor, tente novamente.'
          : 'Verifique sua conexão com a internet e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  if (!adminUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-all duration-300 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-30 dark:opacity-20" style={{ background: 'radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-20 dark:opacity-10" style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }} />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link to="/">
              <img src="/img/logo.png" alt="BIT Educação e Negócios" className="h-14 w-auto object-contain block dark:hidden" />
              <img src="/img/logo_branca.png" alt="BIT Educação e Negócios" className="h-14 w-auto object-contain hidden dark:block" style={{ filter: 'brightness(0) invert(1)' }} />
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-zinc-900/85 backdrop-blur-md">

            {/* Mode toggle tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => { setAuthMode('login'); setForgotPhase(1); }}
                className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'login' || authMode === 'forgot'
                  ? 'text-school-blue-600 dark:text-white border-b-2 border-school-blue-500 dark:border-blue-500 bg-zinc-50 dark:bg-zinc-900/50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
              >
                <Key className="w-4 h-4 inline mr-2 -mt-0.5" />
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'register'
                  ? 'text-school-blue-600 dark:text-white border-b-2 border-school-blue-500 dark:border-blue-500 bg-zinc-50 dark:bg-zinc-900/50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
              >
                <ShieldCheck className="w-4 h-4 inline mr-2 -mt-0.5" />
                Registrar-se
              </button>
            </div>

            <div className="p-8">
              {/* ── LOGIN FORM ── */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                       <Lock className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Acesso Administrativo</h1>
                    <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">Entre com suas credenciais de administrador.</p>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="loginUsername" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Email</label>
                    <input
                      id="loginUsername"
                      type="email"
                      placeholder="Digite o email cadastrado"
                      value={loginUsername}
                      onChange={(e) => { setLoginUsername(e.target.value); setLoginError(''); }}
                      disabled={isLoading}
                      className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="loginPassword" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Senha</label>
                      <button type="button" onClick={() => { setAuthMode('forgot'); setForgotPhase(1); setForgotState('idle'); setForgotIdentifier(''); }} className="text-xs font-semibold text-school-blue-600 dark:text-blue-400 hover:text-school-blue-700 dark:hover:text-blue-300 hover:underline">
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="loginPassword"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Digite a senha"
                        value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                        disabled={isLoading}
                        className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                      />
                      <button type="button" onClick={() => setShowLoginPassword(v => !v)} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors">
                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !loginUsername.trim() || !loginPassword.trim()}
                    className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>) : (<><Key className="w-4 h-4" /> Entrar</>)}
                  </button>

                  <p className="text-center text-xs text-zinc-500 pt-1">
                    <Link to="/" className="text-school-blue-600 dark:text-blue-400 hover:text-school-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors">Voltar para o site</Link>
                  </p>
                </form>
              )}

              {/* ── REGISTER FORM ── */}
              {authMode === 'register' && (
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                      <ShieldCheck className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Cadastro Administrativo</h1>
                    <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">Crie a conta principal que gerenciará o acesso ao Uniforme Premiado.</p>
                  </div>

                  {regState === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-school-blue-800 dark:text-white">Cadastro realizado!</h2>
                      <p className="text-school-blue-600 dark:text-zinc-400 text-sm max-w-xs">Sua conta foi criada. Clique em "Entrar" para acessar o painel.</p>
                      <button onClick={() => { setAuthMode('login'); setRegState('idle'); }} className="mt-2 text-sm text-school-blue-600 dark:text-blue-400 hover:underline underline-offset-2">Ir para o login</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <form
                        onSubmit={handleRegisterSubmit}
                        className="space-y-4"
                        noValidate
                      >
                        <div className="space-y-2">
                          <label htmlFor="regFullName" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Nome completo <span className="text-school-blue-500 dark:text-blue-400">*</span></label>
                          <input id="regFullName" type="text" autoComplete="name" placeholder="Ex.: João da Silva" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regCpf" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">CPF <span className="text-school-blue-500 dark:text-blue-400">*</span></label>
                          <input id="regCpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={regCpf} onChange={(e) => setRegCpf(formatCPF(e.target.value))} disabled={regState === 'submitting'} maxLength={14} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regEmail" className="block text-sm font-medium text-zinc-755 dark:text-zinc-300">E-mail <span className="text-school-blue-500 dark:text-blue-400">*</span></label>
                          <input id="regEmail" type="email" autoComplete="email" placeholder="admin@bit.com.br" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regPassword" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Senha <span className="text-school-blue-500 dark:text-blue-400">*</span></label>
                          <div className="relative">
                            <input id="regPassword" type={showRegPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                            <button type="button" onClick={() => setShowRegPassword(v => !v)} disabled={regState === 'submitting'} aria-label={showRegPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 transition-colors disabled:pointer-events-none">
                              {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regConfirmPassword" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Confirmar senha <span className="text-school-blue-500 dark:text-blue-400">*</span></label>
                          <div className="relative">
                            <input id="regConfirmPassword" type={showRegConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita a senha" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                            <button type="button" onClick={() => setShowRegConfirm(v => !v)} disabled={regState === 'submitting'} aria-label={showRegConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650 transition-colors disabled:pointer-events-none">
                              {showRegConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {regConfirmPassword.length > 0 && regState !== 'submitting' && (
                            <p className={`text-xs flex items-center gap-1 mt-1 ${regPassword === regConfirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {regPassword === regConfirmPassword
                                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Senhas coincidem</>
                                : <><XCircle className="w-3.5 h-3.5" /> As senhas não coincidem</>}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regCode" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Código de Convite <span className="text-school-blue-500 dark:text-blue-400">*</span></label>
                          <input id="regCode" type="text" autoComplete="off" placeholder="Codigo" value={regCode} onChange={(e) => setRegCode(e.target.value.toUpperCase())} disabled={regState === 'submitting'} maxLength={8} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm font-mono tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <button
                          type="submit"
                          disabled={regState === 'submitting'}
                          className="mt-2 w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
                        >
                          {regState === 'submitting'
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : 'Registrar'}
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

                  {forgotState === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-school-blue-800 dark:text-white">Senha atualizada!</h3>
                      <p className="text-school-blue-600 dark:text-zinc-400 text-sm max-w-xs">Você já pode realizar o login com sua nova senha.</p>
                      <button onClick={() => setAuthMode('login')} className="mt-4 w-full h-12 rounded-xl font-bold text-sm text-school-blue-600 bg-school-blue-50 dark:bg-zinc-800 dark:text-blue-400 hover:bg-school-blue-100 dark:hover:bg-zinc-700 border border-school-blue-200 dark:border-zinc-700 transition-colors">Voltar para o login</button>
                    </div>
                  ) : (
                    <form onSubmit={forgotPhase === 1 ? handleForgotSubmit : handlePhase2Submit} className="space-y-4">
                      {forgotPhase === 1 ? (
                        <div className="space-y-2">
                          <label htmlFor="forgotIdentifier" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">CPF</label>
                          <input
                            id="forgotIdentifier"
                            type="text"
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            value={forgotIdentifier}
                            onChange={(e) => setForgotIdentifier(formatCPF(e.target.value || ''))}
                            disabled={forgotState === 'submitting'}
                            maxLength={14}
                            className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label htmlFor="forgotCode" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Código de Segurança</label>
                            <input
                              id="forgotCode"
                              type="text"
                              inputMode="numeric"
                              placeholder="00000000"
                              value={forgotCode}
                              onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              disabled={forgotState === 'submitting'}
                              maxLength={8}
                              className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-center text-xl tracking-widest font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="forgotNewPassword" className="block text-sm font-medium text-zinc-750 dark:text-zinc-300">Nova Senha</label>
                            <input
                              id="forgotNewPassword"
                              type="password"
                              placeholder="Mínimo 8 caracteres"
                              value={forgotNewPassword}
                              onChange={(e) => setForgotNewPassword(e.target.value)}
                              disabled={forgotState === 'submitting'}
                              className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                            />
                          </div>
                        </>
                      )}
                      <button
                        type="submit"
                        disabled={forgotState === 'submitting' || (forgotPhase === 1 ? !forgotIdentifier.trim() : (forgotCode.length !== 8 || forgotNewPassword.length < 8))}
                        className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
                      >
                        {forgotState === 'submitting' ? (<><Loader2 className="w-4 h-4 animate-spin" /> {forgotPhase === 1 ? 'Processando...' : 'Verificando...'}</>) : (forgotPhase === 1 ? 'Recuperar Acesso' : 'Confirmar e Redefinir Senha')}
                      </button>

                      {forgotPhase === 2 && (
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={timeLeft > 0 || forgotState === 'submitting'}
                          className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 disabled:cursor-not-allowed ${timeLeft > 0
                              ? 'text-zinc-450 dark:text-zinc-500 cursor-not-allowed'
                              : 'bg-school-blue-100 text-school-blue-750 hover:bg-school-blue-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 border border-school-blue-200 dark:border-zinc-700 active:scale-[0.98]'
                            }`}
                        >
                          {timeLeft > 0 ? `Aguarde ${timeLeft}s para reenviar` : 'Reenviar Código'}
                        </button>
                      )}

                      <button type="button" onClick={() => { if (forgotPhase === 2) { setForgotPhase(1); setForgotState('idle'); } else { setAuthMode('login'); } }} className="w-full h-12 rounded-xl font-bold text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                        {forgotPhase === 2 ? 'Voltar' : 'Voltar para o login'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-600">
            Esta conta terá acesso total à gestão do Uniforme Premiado.<br />
            O acesso de futuros usuários será liberado por meio de códigos internos.
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to="/admin/participantes" replace />;
};

export default Admin;
