import { useState, useEffect, useRef } from 'react';
import { Lock, Smartphone, Sparkles, Copy, Check, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getBackendUrl } from '@/utils/backendUrl';

interface MfaActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ============================================================================
// SUB-COMPONENTE: ACCORDION COLAPSÁVEL PARA O QR CODE
// ============================================================================
const CollapsibleAccordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden mt-3 shadow-sm transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors font-semibold text-xs text-zinc-700 dark:text-zinc-300"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-school-blue-500 animate-pulse" />
          {title}
        </span>
        <span className={`transform transition-transform duration-300 text-[10px] ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[300px] border-t border-zinc-200 dark:border-zinc-800 p-4 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        } overflow-hidden bg-white dark:bg-zinc-950 flex justify-center items-center`}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTE: INPUT DE CÓDIGO OTP SEGMENTADO (6 DÍGITOS)
// ============================================================================
const OTPInput = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));

  const handleChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    onChange(newDigits.join(''));

    if (cleanVal && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
        inputsRef.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setDigits(newDigits);
      onChange(newDigits.join(''));
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputsRef.current[lastIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-2.5 justify-center my-6">
      {Array(6).fill(0).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          maxLength={1}
          inputMode="numeric"
          pattern="[0-9]*"
          value={digits[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-white focus:outline-none focus:border-school-blue-500 focus:ring-4 focus:ring-school-blue-500/10 transition-all duration-150"
        />
      ))}
    </div>
  );
};

// ============================================================================
// COMPONENTE EXPORTADO: MFA ACTIVATION DIALOG
// ============================================================================
export const MfaActivationDialog = ({ open, onOpenChange, onSuccess }: MfaActivationDialogProps) => {
  const { toast } = useToast();
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string; backupCode: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Carrega os dados de configuração ao abrir o modal
  useEffect(() => {
    if (open && !setupData) {
      const handleStartMfaSetup = async () => {
        setSetupLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session || !session.access_token) {
            toast({
              title: 'Erro de autenticação',
              description: 'Sessão ativa ou token de acesso não encontrado. Faça login novamente.',
              variant: 'destructive'
            });
            onOpenChange(false);
            return;
          }

          const token = session.access_token.trim();
          const response = await fetch(`${getBackendUrl()}/api/mfa/setup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            data = { erro: responseText };
          }

          if (response.ok && data.sucesso) {
            setSetupData({
              secret: data.secret,
              qrCode: data.qrCode,
              backupCode: data.backupCode
            });
          } else {
            toast({
              title: 'Falha na inicialização',
              description: data.erro || 'Não foi possível configurar a autenticação multifator.',
              variant: 'destructive'
            });
            onOpenChange(false);
          }
        } catch (err) {
          console.error('Erro ao iniciar setup do MFA:', err);
          toast({
            title: 'Erro de conexão',
            description: 'Erro de comunicação com o servidor de autenticação.',
            variant: 'destructive'
          });
          onOpenChange(false);
        } finally {
          setSetupLoading(false);
        }
      };

      handleStartMfaSetup();
    }
  }, [open, setupData, onOpenChange, toast]);

  // Limpa estados ao fechar
  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setSetupData(null);
      setTotpCode('');
    }
  };

  // Copia chave secreta
  const handleCopySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    toast({
      title: 'Chave copiada!',
      description: 'A chave secreta foi salva na área de transferência com sucesso.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  // Envia código de 6 dígitos para validação
  const handleVerifyMfa = async () => {
    if (totpCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Por favor, insira o token de 6 dígitos gerado pelo aplicativo.',
        variant: 'destructive'
      });
      return;
    }

    setVerificationLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        toast({
          title: 'Erro de autenticação',
          description: 'Sessão ou token de acesso não encontrado.',
          variant: 'destructive'
        });
        setVerificationLoading(false);
        return;
      }

      const token = session.access_token.trim();
      const response = await fetch(`${getBackendUrl()}/api/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: totpCode })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { erro: responseText };
      }

      if (response.ok && data.sucesso) {
        toast({
          title: 'MFA Ativado!',
          description: 'Sua conta agora está protegida com a autenticação em duas etapas.',
        });
        onSuccess();
        handleClose(false);
      } else {
        toast({
          title: 'Verificação falhou',
          description: data.erro || 'O código inserido é inválido ou expirou. Tente novamente.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Erro ao verificar MFA:', err);
      toast({
        title: 'Erro de validação',
        description: 'Ocorreu um erro interno de rede ao validar o código.',
        variant: 'destructive'
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[420px] w-[92%] max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl focus:outline-none scrollbar-thin">
        <DialogHeader className="text-center pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
          <DialogTitle className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-school-blue-500" />
            Duas Etapas (MFA)
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Proteja sua conta adicionando uma camada extra de segurança baseada em TOTP.
          </DialogDescription>
        </DialogHeader>

        {setupLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-school-blue-500 animate-spin" />
            <span className="text-xs text-zinc-500">Gerando chaves de segurança...</span>
          </div>
        )}

        {!setupLoading && setupData && (
          <div className="mt-4 flex flex-col gap-4">
            
            {/* Passo 1: Instruções */}
            <div className="flex gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <Smartphone className="w-4.5 h-4.5 text-school-blue-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Como configurar seu app:</span>
                <p>1. Baixe o app <span className="font-semibold text-zinc-800 dark:text-zinc-200">Google Authenticator</span> no celular.</p>
                <p>2. Abre o app, clique em <span className="font-semibold text-zinc-800 dark:text-zinc-200">"+"</span> e em <span className="font-semibold text-zinc-800 dark:text-zinc-200">"Inserir chave"</span>.</p>
                <p>3. Insira o nome da conta <span className="font-semibold text-zinc-800 dark:text-zinc-200">SorteBIT</span> e cole a chave secreta.</p>
              </div>
            </div>

            {/* Chave Secreta com Máximo Destaque */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/60 rounded-xl p-4 flex flex-col items-center gap-3">
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                Chave Secreta de Texto
              </span>
              <span className="font-mono text-base font-extrabold tracking-wider bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 px-4 rounded-lg select-all break-all text-center w-full shadow-inner text-zinc-800 dark:text-zinc-200">
                {setupData.secret}
              </span>
              
              <Button
                type="button"
                onClick={handleCopySecret}
                className="w-full h-11 bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-200 hover:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-95 shadow-md"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Chave Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Chave Secreta
                  </>
                )}
              </Button>
            </div>

            {/* Accordion do QR Code */}
            <CollapsibleAccordion title="Prefere escanear o código QR?">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-inner">
                  <img
                    src={setupData.qrCode}
                    alt="Código QR para MFA"
                    className="w-44 h-44 rounded-xl object-contain dark:filter dark:invert dark:hue-rotate-180"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center max-w-[220px]">
                  Escaneie este código QR usando a câmera dentro do app de autenticação.
                </span>
              </div>
            </CollapsibleAccordion>

            {/* Banner Destacado com Código de Recuperação */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex gap-3 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 w-full">
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  CÓDIGO DE RECUPERAÇÃO ÚNICO
                </span>
                <span className="font-mono text-base font-black tracking-widest bg-white dark:bg-zinc-900 border border-amber-300/40 py-1 px-3 rounded-lg select-all block text-center dark:border-amber-900/30 text-amber-800 dark:text-amber-200 shadow-sm">
                  {setupData.backupCode}
                </span>
                <span className="text-[10px] leading-relaxed text-amber-700/90 dark:text-amber-400/90 mt-1">
                  ATENÇÃO: Salve este código em local seguro. Ele será necessário para recuperar o acesso caso você perca seu celular.
                </span>
              </div>
            </div>

            {/* Entrada de dados OTP */}
            <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 flex flex-col items-center">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Digite o código de 6 dígitos do app:
              </span>
              
              <OTPInput value={totpCode} onChange={setTotpCode} />

              {/* Botão de Confirmação Final */}
              <Button
                onClick={handleVerifyMfa}
                disabled={verificationLoading || totpCode.length !== 6}
                className="w-full h-12 bg-school-blue-500 hover:bg-school-blue-600 dark:bg-school-blue-600 dark:hover:bg-school-blue-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-school-blue-500/10 dark:hover:shadow-school-blue-600/10 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 mt-4"
              >
                {verificationLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validando Token...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Confirmar e Ativar MFA
                  </>
                )}
              </Button>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
