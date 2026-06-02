import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { getBackendUrl } from '../utils/backendUrl';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const AdminRegister = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const WEBHOOK_URL = `${getBackendUrl()}/api/admin/register`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName.trim() || !cpf.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF inválido',
        description: 'Digite um CPF completo com 11 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A senha e a confirmação de senha devem ser idênticas.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSubmissionState('submitting');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    try {
      const response = await fetch(
        WEBHOOK_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            acao: 'cadastro_adm',
            nome: fullName.trim(),
            cpf: cpf.replace(/\D/g, ''),
            email: email.trim().toLowerCase(),
            senha: password,
            codigo: adminCode.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && !data.status?.toLowerCase().includes('error')) {
        setSubmissionState('success');
        toast({
          title: 'Administrador cadastrado!',
          description: data.mensagem,
        });
        setTimeout(() => {
          navigate('/admin');
        }, 5000);
      } else {
        const errorMessage: string =
          data?.mensagem?.toString().trim() || 'Falha no cadastro.';
        setSubmissionState('error');
        toast({
          title: 'Erro no cadastro',
          description: errorMessage,
          variant: 'destructive',
        });
        setTimeout(() => setSubmissionState('idle'), 3000);
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setSubmissionState('error');
      toast({
        title: isAbort ? 'Operação expirou' : 'Erro de conexão',
        description: isAbort
          ? 'A operação demorou mais que o esperado. Por favor, tente novamente.'
          : 'Verifique sua conexão com a internet e tente novamente.',
        variant: 'destructive',
      });
      setTimeout(() => setSubmissionState('idle'), 3000);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const isSubmitting = submissionState === 'submitting';
  const isSuccess = submissionState === 'success';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10"
        style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" tabIndex={-1}>
            <img
              src="/img/logo.png"
              alt="BIT Educação e Negócios"
              className="h-14 w-auto object-contain block dark:hidden"
            />
            <img
              src="/img/logo_branca.png"
              alt="BIT Educação e Negócios"
              className="h-14 w-auto object-contain hidden dark:block"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            {/* Fallback: always-visible logo on zinc-950 background */}
            <img
              src="/img/logo_branca.png"
              alt="BIT Educação e Negócios"
              className="h-14 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-zinc-800 p-8 shadow-2xl"
          style={{ background: 'rgba(24,24,27,0.85)', backdropFilter: 'blur(16px)' }}
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-4">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cadastro Administrativo
            </h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Crie a conta principal que gerenciará o acesso ao sistema SorteBIT.
            </p>
          </div>

          {isSuccess ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Cadastro realizado!</h2>
              <p className="text-zinc-400 text-sm max-w-xs">
                Sua conta administrativa foi criada com sucesso. Você já pode acessar o painel de controle.
              </p>
              <Link
                to="/admin"
                className="mt-4 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
              >
                Ir para o Painel
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Nome completo */}
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300">
                  Nome completo <span className="text-blue-400">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ex.: João da Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <label htmlFor="cpf" className="block text-sm font-medium text-zinc-300">
                  CPF <span className="text-blue-400">*</span>
                </label>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  disabled={isSubmitting}
                  maxLength={14}
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                  E-mail <span className="text-blue-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@bit.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                  Senha <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 pr-12 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors duration-150 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmar senha */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300">
                  Confirmar senha <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 pr-12 text-white placeholder-zinc-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={isSubmitting}
                    aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors duration-150 disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Password match indicator */}
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-xs flex items-center gap-1 mt-1 ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'
                      }`}
                  >
                    {password === confirmPassword ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Senhas coincidem</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5" /> As senhas não coincidem</>
                    )}
                  </p>
                )}
              </div>

              {/* Código de Convite */}
              <div className="space-y-2">
                <label htmlFor="adminCode" className="block text-sm font-medium text-zinc-300">
                  Código de Convite <span className="text-blue-400">*</span>
                </label>
                <input
                  id="adminCode"
                  type="text"
                  autoComplete="off"
                  placeholder="Digite o código fornecido pelo administrador"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  maxLength={8}
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white placeholder-zinc-500 text-sm font-mono tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full h-12 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: isSubmitting
                    ? 'linear-gradient(135deg, #1d4ed8, #3730a3)'
                    : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  boxShadow: '0 0 24px rgba(59,130,246,0.25)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Criar conta administrativa
                  </>
                )}
              </button>

              <p className="text-center text-xs text-zinc-500 pt-1">
                Já possui acesso?{' '}
                <Link to="/admin" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
                  Entrar no painel
                </Link>
              </p>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          Esta conta terá acesso total à gestão do SorteBIT.
          <br />
          O acesso de futuros usuários será liberado por meio de códigos internos.
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;
