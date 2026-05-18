import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dice1, Crown, User, Lock, Key, LogOut, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { useAdmAuth } from '@/hooks/useAdmAuth';
import { useToast } from '@/hooks/use-toast';
import ClassCodeManager from '@/components/ClassCodeManager';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

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
  const [activeTab, setActiveTab] = useState<'lottery' | 'codes'>('lottery');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submissionState, setSubmissionState] = useState<'idle' | 'enviando' | 'processando' | 'erro' | 'sucesso'>('idle');
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

  const WEBHOOK_URL = 'https://bitn8n.infinityflowapp.com/webhook/admin-sortebit';

  const handleLoginSubmit = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      return;
    }
    setLoginError('');
    const success = await login(loginUsername, loginPassword);
    if (success) {
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Email ou senha incorretos. Tente novamente.');
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, preencha o nome e um telefone válido.",
        variant: "destructive"
      });
      return;
    }

    setSubmissionState('enviando');

    try {
      const luckyNumber = Math.floor(Math.random() * 9000) + 1000;

      const { data, error } = await supabase
        .from('lottery_participations')
        .insert([
          {
            name: name.trim(),
            phone: phone.replace(/\D/g, ''),
            class_name: 'Desconhecida',
            teacher_code: 'ADMIN',
            lucky_number: luckyNumber
          }
        ])
        .select('lucky_number')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Participação já registrada",
            description: "Este telefone já foi registrado.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        setSubmissionState('erro');
        return;
      }

      toast({
        title: "Sucesso!",
        description: `Participação registrada. Bilhete: SORTEBIT#${data.lucky_number}`,
      });

      setName('');
      setPhone('');
      setSubmissionState('sucesso');

      setTimeout(() => {
        setSubmissionState('idle');
      }, 3000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmissionState('erro');
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (!adminUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }} />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link to="/">
              <img src="/img/logo_branca.png" alt="BIT Educação e Negócios" className="h-14 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden" style={{ background: 'rgba(24,24,27,0.85)', backdropFilter: 'blur(16px)' }}>

            {/* Mode toggle tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'login'
                  ? 'text-white border-b-2 border-blue-500 bg-zinc-900/50'
                  : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                <Key className="w-4 h-4 inline mr-2 -mt-0.5" />
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'register'
                  ? 'text-white border-b-2 border-blue-500 bg-zinc-900/50'
                  : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                <ShieldCheck className="w-4 h-4 inline mr-2 -mt-0.5" />
                Registrar-se
              </button>
            </div>

            <div className="p-8">
              {/* ── LOGIN FORM ── */}
              {authMode === 'login' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-3">
                      <Lock className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Acesso Administrativo</h1>
                    <p className="mt-1 text-sm text-zinc-400">Entre com suas credenciais de administrador.</p>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">{loginError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="loginUsername" className="block text-sm font-medium text-zinc-300">Email</label>
                    <input
                      id="loginUsername"
                      type="email"
                      placeholder="Digite o email cadastrado"
                      value={loginUsername}
                      onChange={(e) => { setLoginUsername(e.target.value); setLoginError(''); }}
                      disabled={isLoading}
                      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="loginPassword" className="block text-sm font-medium text-zinc-300">Senha</label>
                    <div className="relative">
                      <input
                        id="loginPassword"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Digite a senha"
                        value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()}
                        className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 pr-12 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                      />
                      <button type="button" onClick={() => setShowLoginPassword(v => !v)} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors">
                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleLoginSubmit}
                    disabled={isLoading || !loginUsername.trim() || !loginPassword.trim()}
                    className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 0 24px rgba(59,130,246,0.25)' }}
                  >
                    {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>) : (<><Key className="w-4 h-4" /> Entrar</>)}
                  </button>

                  <p className="text-center text-xs text-zinc-500 pt-1">
                    <Link to="/" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">Voltar para o site</Link>
                  </p>
                </div>
              )}

              {/* ── REGISTER FORM ── */}
              {authMode === 'register' && (
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-3">
                      <ShieldCheck className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Cadastro Administrativo</h1>
                    <p className="mt-1 text-sm text-zinc-400">Crie a conta principal que gerenciará o acesso ao SorteBIT.</p>
                  </div>

                  {regState === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">Cadastro realizado!</h2>
                      <p className="text-zinc-400 text-sm max-w-xs">Sua conta foi criada. Clique em "Entrar" para acessar o painel.</p>
                      <button onClick={() => { setAuthMode('login'); setRegState('idle'); }} className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2">Ir para o login</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <form
                        onSubmit={handleRegisterSubmit}
                        className="space-y-4"
                        noValidate
                      >
                        <div className="space-y-2">
                          <label htmlFor="regFullName" className="block text-sm font-medium text-zinc-300">Nome completo <span className="text-blue-400">*</span></label>
                          <input id="regFullName" type="text" autoComplete="name" placeholder="Ex.: João da Silva" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regCpf" className="block text-sm font-medium text-zinc-300">CPF <span className="text-blue-400">*</span></label>
                          <input id="regCpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={regCpf} onChange={(e) => setRegCpf(formatCPF(e.target.value))} disabled={regState === 'submitting'} maxLength={14} className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regEmail" className="block text-sm font-medium text-zinc-300">E-mail <span className="text-blue-400">*</span></label>
                          <input id="regEmail" type="email" autoComplete="email" placeholder="admin@bit.com.br" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regPassword" className="block text-sm font-medium text-zinc-300">Senha <span className="text-blue-400">*</span></label>
                          <div className="relative">
                            <input id="regPassword" type={showRegPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 pr-12 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                            <button type="button" onClick={() => setShowRegPassword(v => !v)} disabled={regState === 'submitting'} aria-label={showRegPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors disabled:pointer-events-none">
                              {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regConfirmPassword" className="block text-sm font-medium text-zinc-300">Confirmar senha <span className="text-blue-400">*</span></label>
                          <div className="relative">
                            <input id="regConfirmPassword" type={showRegConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita a senha" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 pr-12 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                            <button type="button" onClick={() => setShowRegConfirm(v => !v)} disabled={regState === 'submitting'} aria-label={showRegConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors disabled:pointer-events-none">
                              {showRegConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {regConfirmPassword.length > 0 && regState !== 'submitting' && (
                            <p className={`text-xs flex items-center gap-1 mt-1 ${regPassword === regConfirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                              {regPassword === regConfirmPassword
                                ? <><CheckCircle2 className="w-3.5 h-3.5" /> Senhas coincidem</>
                                : <><XCircle className="w-3.5 h-3.5" /> As senhas não coincidem</>}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="regCode" className="block text-sm font-medium text-zinc-300">Código de Convite <span className="text-blue-400">*</span></label>
                          <input id="regCode" type="text" autoComplete="off" placeholder="Codigo" value={regCode} onChange={(e) => setRegCode(e.target.value.toUpperCase())} disabled={regState === 'submitting'} maxLength={8} className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm font-mono tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <button
                          type="submit"
                          disabled={regState === 'submitting'}
                          className="mt-2 w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 0 24px rgba(59,130,246,0.25)' }}
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
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Esta conta terá acesso total à gestão do SorteBIT.<br />
            O acesso de futuros usuários será liberado por meio de códigos internos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-blue-50 via-white to-school-yellow-50 dark:bg-zinc-950 dark:bg-none py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Cabeçalho Administrativo */}
        <div className="flex justify-between items-center mb-8 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="h-10 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="h-10 w-auto object-contain hidden dark:block"
              />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-school-blue-800 dark:text-white">Painel Master</h1>
              <p className="text-sm text-school-blue-600 dark:text-zinc-400">Acesso Restrito</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="border-school-blue-600 text-school-blue-600 dark:text-zinc-400 dark:border-zinc-700 hover:bg-school-blue-50 dark:hover:bg-zinc-800 dark:bg-zinc-900"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-white dark:bg-zinc-950 rounded-lg p-2 shadow-lg">
            <Button
              onClick={() => setActiveTab('lottery')}
              variant={activeTab === 'lottery' ? 'default' : 'outline'}
              className={`flex-1 min-w-32 transition-none ${activeTab === 'lottery'
                ? 'bg-school-blue-600 text-white hover:bg-school-blue-600 hover:text-white'
                : 'border-school-blue-600 text-school-blue-600 dark:text-zinc-400 bg-transparent hover:bg-transparent dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-school-blue-600 dark:hover:text-zinc-400'
                }`}
            >
              <Dice1 className="w-4 h-4 mr-2" />
              Sorteio
            </Button>
            <Button
              onClick={() => setActiveTab('codes')}
              variant={activeTab === 'codes' ? 'default' : 'outline'}
              className={`flex-1 min-w-32 transition-none ${activeTab === 'codes'
                ? 'bg-school-blue-600 text-white hover:bg-school-blue-600 hover:text-white'
                : 'border-school-blue-600 text-school-blue-600 dark:text-zinc-400 bg-transparent hover:bg-transparent dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-school-blue-600 dark:hover:text-zinc-400'
                }`}
            >
              <Crown className="w-4 h-4 mr-2" />
              Códigos
            </Button>
          </div>
        </div>

        {activeTab === 'codes' && (
          <div className="space-y-4">
            {/* Admin Invite Code Generator */}
            <Card className="p-6 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-school-blue-700 dark:text-white text-sm">Código de Convite Administrativo</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Gere e compartilhe com quem deve se registrar como administrador.</p>
                  </div>
                </div>

                <button
                  onClick={generateAdminCode}
                  disabled={isGeneratingAdminCode}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                >
                  {isGeneratingAdminCode
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    : <><RefreshCw className="w-4 h-4" /> Gerar Novo Código</>}
                </button>

                {/* 🔍 DEBUG PANEL — visível apenas para o desenvolvedor em caso de erro */}
                {adminCodeDebugError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-1">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">⚠ Debug — Erro do Supabase</p>
                    {adminCodeDebugError.split('\n').map((line, i) => (
                      <p key={i} className="text-xs font-mono text-red-300 break-all">{line}</p>
                    ))}
                  </div>
                )}

                {generatedAdminCode && (
                  <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 mt-2">
                    <code className="flex-1 text-lg font-mono font-bold tracking-[0.2em] text-blue-400 select-all">
                      {generatedAdminCode}
                    </code>
                    <button
                      onClick={copyAdminCode}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${adminCodeCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700'
                        }`}
                    >
                      {adminCodeCopied
                        ? <><CheckCheck className="w-3.5 h-3.5" /> Copiado!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <ClassCodeManager />
          </div>
        )}

        {activeTab === 'lottery' && (
          <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Crown className="w-8 h-8 text-school-yellow-500 dark:text-school-yellow-400" />
                  <Dice1 className="w-12 h-12 text-school-blue-600 dark:text-zinc-400" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-white">
                  Sorteio - Modo Administrativo
                </h2>
                <p className="text-school-blue-600 dark:text-zinc-400">
                  Registre participações sem validação de localização
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                    Nome completo *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-school-blue-500 dark:bg-zinc-900 dark:border-school-blue-500 dark:text-white rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                    Telefone *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-school-blue-500 dark:bg-zinc-900 dark:border-school-blue-500 dark:text-white rounded-xl"
                    maxLength={15}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submissionState === 'enviando' || submissionState === 'processando'}
                  className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 dark:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {(submissionState === 'enviando' || submissionState === 'processando') ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                      Processando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Dice1 className="w-5 h-5 mr-2" />
                      Participar do Sorteio
                    </div>
                  )}
                </Button>
              </form>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;
