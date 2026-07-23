import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  AlertCircle, 
  ArrowDown, 
  Copy, 
  Check, 
  Compass, 
  Chrome 
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface InstallPWAButtonProps {
  variant?: 'login' | 'navbar-desktop' | 'navbar-mobile';
  className?: string;
  onSuccess?: () => void;
}

export const InstallPWAButton = ({ variant = 'login', className = '', onSuccess }: InstallPWAButtonProps) => {
  const { showButton, isIOS, showInstallPrompt } = usePWAInstall();
  const [isIOSSheetOpen, setIsIOSSheetOpen] = useState(false);

  if (!showButton) return null;

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isIOS) {
      setIsIOSSheetOpen(true);
    } else {
      const installed = await showInstallPrompt();
      if (installed && onSuccess) {
        onSuccess();
      }
    }
  };

  // --- RENDERING VARIANTS ---

  // 1. Prominent login page card layout
  if (variant === 'login') {
    return (
      <div className={`w-full ${className}`}>
        <div className="rounded-2xl border border-school-blue-100 dark:border-zinc-800 bg-gradient-to-r from-school-blue-50/50 to-white dark:from-zinc-900/40 dark:to-zinc-900 shadow-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-school-blue-500/10 dark:bg-school-blue-500/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-school-blue-600 dark:text-school-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-school-blue-900 dark:text-white flex items-center gap-1.5">
                Uniforme Premiado no seu celular
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Instale nosso aplicativo PWA para acesso rápido aos sorteios e notificações instantâneas.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full md:w-auto px-5 h-10 rounded-xl bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Baixe o app</span>
          </button>
        </div>

        {/* Bottom Sheet para iOS */}
        <IOSInstallSheet open={isIOSSheetOpen} onOpenChange={setIsIOSSheetOpen} />
      </div>
    );
  }

  // 2. Desktop navbar action button
  if (variant === 'navbar-desktop') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-1.5 px-3 h-10 rounded-full bg-school-blue-500/10 border border-school-blue-500/20 text-school-blue-600 dark:text-school-blue-400 hover:bg-school-blue-500/20 active:scale-90 transition-all duration-200 shadow-sm shrink-0 font-bold text-xs ${className}`}
          title="Baixar Aplicativo"
        >
          <Download className="w-4 h-4" />
          <span>Baixar App</span>
        </button>

        <IOSInstallSheet open={isIOSSheetOpen} onOpenChange={setIsIOSSheetOpen} />
      </>
    );
  }

  // 3. Mobile navbar Sheet navigation list item
  if (variant === 'navbar-mobile') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-3 w-full h-11 py-2 px-3 rounded-lg bg-school-blue-500/10 text-school-blue-700 dark:text-school-blue-400 hover:bg-school-blue-500/20 font-medium transition-colors border border-school-blue-500/20 ${className}`}
        >
          <Download className="w-5 h-5 text-school-blue-500" />
          <span className="text-sm font-semibold">Baixe o app</span>
        </button>

        <IOSInstallSheet open={isIOSSheetOpen} onOpenChange={setIsIOSSheetOpen} />
      </>
    );
  }

  return null;
};

// --- iOS INSTRUCTIONS BOTTOM-SHEET COMPONENT ---

interface IOSInstallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom SVG para o ícone de compartilhar nativo da Apple (iOS)
const AppleShareIcon = () => (
  <svg 
    className="w-5 h-5 text-school-blue-600 dark:text-school-blue-400 shrink-0" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

// Custom SVG para o ícone de Adicionar à Tela de Início nativo da Apple (iOS)
const ApplePlusIcon = () => (
  <svg 
    className="w-5 h-5 text-school-blue-600 dark:text-school-blue-400 shrink-0" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const IOSInstallSheet = ({ open, onOpenChange }: IOSInstallSheetProps) => {
  const { isIOSChrome, isIOSWebView, isIOSSafari } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="w-full max-w-md mx-auto rounded-t-[28px] border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 shadow-2xl p-6 pb-8 outline-none backdrop-blur-xl transition-all duration-300"
      >
        {/* Cenário C — Navegadores Internos / WebViews */}
        {isIOSWebView && (
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Abra no Safari ou Chrome
              </SheetTitle>
              <SheetDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Navegadores internos (como Instagram, Facebook ou WhatsApp) não permitem a instalação de aplicativos.
              </SheetDescription>
            </SheetHeader>

            <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                Para instalar o app no seu iPhone, você precisa acessar este site usando o navegador padrão do seu celular.
              </p>
              
              <button
                onClick={handleCopyLink}
                className="w-full h-11 rounded-xl bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400">
              <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                !
              </div>
              <p className="text-xs leading-relaxed">
                Após copiar o link, abra o <strong className="text-zinc-900 dark:text-white">Safari</strong> ou <strong className="text-zinc-900 dark:text-white">Chrome</strong>, cole na barra de endereços e siga as instruções na tela.
              </p>
            </div>
          </div>
        )}

        {/* Cenário B — Google Chrome no iOS */}
        {isIOSChrome && !isIOSWebView && (
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Chrome className="w-5 h-5 text-school-blue-500" />
                Instalar com Google Chrome
              </SheetTitle>
              <SheetDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Siga as etapas abaixo para adicionar o Uniforme Premiado à sua tela inicial.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-school-blue-500/10 dark:bg-school-blue-500/20 flex items-center justify-center text-xs font-bold text-school-blue-600 dark:text-school-blue-400 shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Abra as opções do Chrome</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Toque no ícone de <strong className="text-zinc-700 dark:text-zinc-300">Compartilhar</strong> (quadrado com seta para cima) na barra de navegação, ou no menu de três pontos <strong className="text-zinc-700 dark:text-zinc-300">...</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-school-blue-500/10 dark:bg-school-blue-500/20 flex items-center justify-center text-xs font-bold text-school-blue-600 dark:text-school-blue-400 shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Selecione Adicionar à Tela de Início</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Role a lista para baixo e toque em <strong className="text-zinc-700 dark:text-zinc-300">Adicionar à Tela de Início</strong> (ícone <ApplePlusIcon />).
                  </p>
                </div>
              </div>
            </div>

            {/* Indicação visual apontando para a barra de navegação inferior */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1 text-school-blue-500 animate-bounce">
              <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">Toque abaixo</span>
              <ArrowDown className="w-5 h-5 mt-1" />
            </div>
          </div>
        )}

        {/* Cenário A — Safari (ou Fallback para qualquer outro fluxo iOS) */}
        {((isIOSSafari && !isIOSWebView) || (!isIOSChrome && !isIOSWebView && !isIOSSafari)) && (
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-school-blue-500" />
                Instalar no iPhone / iPad
              </SheetTitle>
              <SheetDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Adicione o Uniforme Premiado à sua tela de início usando o Safari.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-school-blue-500/10 dark:bg-school-blue-500/20 flex items-center justify-center text-xs font-bold text-school-blue-600 dark:text-school-blue-400 shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Abra o menu Compartilhar</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Toque no botão de <span>Compartilhar</span>
                    <AppleShareIcon />
                    <span>na barra inferior do Safari.</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-school-blue-500/10 dark:bg-school-blue-500/20 flex items-center justify-center text-xs font-bold text-school-blue-600 dark:text-school-blue-400 shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Adicione à Tela de Início</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Role a lista e selecione <span>Adicionar à Tela de Início</span>
                    <ApplePlusIcon />
                    <span>.</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-school-blue-500/10 dark:bg-school-blue-500/20 flex items-center justify-center text-xs font-bold text-school-blue-600 dark:text-school-blue-400 shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Confirme a Instalação</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Toque em <strong className="text-zinc-700 dark:text-zinc-300">Adicionar</strong> no canto superior direito para finalizar.
                  </p>
                </div>
              </div>
            </div>

            {/* Indicação visual apontando para a barra de navegação inferior */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1 text-school-blue-500 animate-bounce">
              <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">Toque abaixo</span>
              <ArrowDown className="w-5 h-5 mt-1" />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
