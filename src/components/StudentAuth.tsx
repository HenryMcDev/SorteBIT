import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Key, ShieldCheck, Lock, Loader2, EyeOff, Eye, XCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

interface StudentAuthProps {
  isLoading: boolean;
  login: (cpf: string, pass: string) => Promise<boolean>;
  register: (name: string, cpf: string, email: string, pass: string) => Promise<boolean>;
}

const StudentAuth = ({ isLoading, login, register }: StudentAuthProps) => {
  const { toast } = useToast();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login State
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regState, setRegState] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleLoginSubmit = async () => {
    try {
      if (!loginCpf.trim() || !loginPassword.trim()) {
        return;
      }
      setLoginError('');
      const success = await login(loginCpf, loginPassword);
      if (!success) {
        setLoginError('CPF ou senha incorretos. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Ocorreu um erro inesperado. Tente novamente.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!regFullName.trim() || !regCpf.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
        toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos para se registrar.', variant: 'destructive' });
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

      setRegState('submitting');

      const success = await register(regFullName, regCpf, regEmail, regPassword);
      
      if (success) {
        setRegState('success');
      } else {
        setRegState('idle');
      }
    } catch (err) {
      console.error(err);
      setRegState('idle');
      toast({ title: 'Erro', description: 'Ocorreu um erro inesperado no formulário.', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 w-full notranslate">
      <Card className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-zinc-900/85 backdrop-blur-xl">
        {/* Mode toggle tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${authMode === 'login'
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
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                  <Lock className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Acesso do Aluno</h2>
                <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">Entre com seu CPF e senha cadastrados.</p>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="loginCpf" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">CPF</label>
                <input
                  id="loginCpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={loginCpf}
                  onChange={(e) => { setLoginCpf(formatCPF(e.target.value || '')); setLoginError(''); }}
                  disabled={isLoading}
                  maxLength={14}
                  className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="loginPassword" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Senha</label>
                <div className="relative">
                  <input
                    id="loginPassword"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Digite a senha"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value || ''); setLoginError(''); }}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()}
                    className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowLoginPassword(v => !v)} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLoginSubmit}
                disabled={isLoading || !loginCpf.trim() || !loginPassword.trim()}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] bg-school-blue-600 notranslate"
                style={{ boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}
              >
                {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>) : (<><Key className="w-4 h-4" /> Entrar</>)}
              </button>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {authMode === 'register' && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-school-blue-50 dark:bg-blue-600/20 border border-school-blue-100 dark:border-blue-500/30 mb-3">
                  <ShieldCheck className="w-6 h-6 text-school-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-school-blue-800 dark:text-white tracking-tight">Novo Cadastro</h2>
                <p className="mt-1 text-sm text-school-blue-600 dark:text-zinc-400">Crie sua conta de acesso ao SorteBIT.</p>
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
                    <div className="space-y-2">
                      <label htmlFor="regCpf" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">CPF <span className="text-red-500">*</span></label>
                      <input id="regCpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={regCpf} onChange={(e) => setRegCpf(formatCPF(e.target.value || ''))} disabled={regState === 'submitting'} maxLength={14} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="regEmail" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">E-mail <span className="text-red-500">*</span></label>
                      <input id="regEmail" type="email" autoComplete="email" placeholder="aluno@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value || '')} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="regPassword" className="block text-sm font-medium text-school-blue-700 dark:text-zinc-300">Senha <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input id="regPassword" type={showRegPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value || '')} disabled={regState === 'submitting'} className="w-full h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 pr-12 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 focus:border-school-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <button type="button" onClick={() => setShowRegPassword(v => !v)} disabled={regState === 'submitting'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:pointer-events-none">
                          {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
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
        </div>
      </Card>
    </div>
  );
};

export default StudentAuth;
