import { useState, useEffect } from 'react';

// Variáveis globais no escopo do módulo para garantir que o evento 'beforeinstallprompt'
// não seja perdido, mesmo se o componente/hook for montado após o evento ter ocorrido.
let globalDeferredPrompt: any = null;
let globalIsReadyToInstall = false;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previne o prompt padrão imediato do navegador/Android
    e.preventDefault();
    globalDeferredPrompt = e;
    globalIsReadyToInstall = true;
    // Notifica todos os hooks ativos sobre a mudança de estado
    listeners.forEach((listener) => listener());
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalIsReadyToInstall = false;
    listeners.forEach((listener) => listener());
  });
}

export const usePWAInstall = () => {
  const [isReady, setIsReady] = useState(globalIsReadyToInstall);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSChrome, setIsIOSChrome] = useState(false);
  const [isIOSWebView, setIsIOSWebView] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    const checkPWAStatus = () => {
      // 1. Detectar se já está rodando no modo instalado (standalone)
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone === true;
      
      setIsInstalled(isStandalone);

      // 2. Detectar se é um dispositivo iOS (iPhone, iPad, iPod)
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      setIsIOS(isIOSDevice);

      if (isIOSDevice) {
        const isChrome = /crios/i.test(userAgent);
        const isWebView = /instagram|fbav|whatsapp|messenger|wv/i.test(userAgent) || 
          (!/safari/i.test(userAgent) && !/crios/i.test(userAgent) && !/fxios/i.test(userAgent));
        const isSafari = !isChrome && !isWebView;

        setIsIOSChrome(isChrome);
        setIsIOSWebView(isWebView);
        setIsIOSSafari(isSafari);
      } else {
        setIsIOSChrome(false);
        setIsIOSWebView(false);
        setIsIOSSafari(false);
      }

      setIsReady(globalIsReadyToInstall);
    };

    checkPWAStatus();

    // Ouvinte para sincronizar o estado caso mude globalmente
    const handleStateChange = () => {
      setIsReady(globalIsReadyToInstall);
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    listeners.add(handleStateChange);
    return () => {
      listeners.delete(handleStateChange);
    };
  }, []);

  const showInstallPrompt = async (): Promise<boolean> => {
    if (!globalDeferredPrompt) {
      console.warn('O prompt nativo de instalação não está disponível no momento.');
      return false;
    }

    try {
      globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA.');
        globalDeferredPrompt = null;
        globalIsReadyToInstall = false;
        listeners.forEach((listener) => listener());
        return true;
      } else {
        console.log('Usuário recusou a instalação do PWA.');
      }
    } catch (err) {
      console.error('Erro ao disparar o prompt de instalação:', err);
    }
    
    return false;
  };

  // Regra de UX: só exibe o botão se:
  // - O app NÃO estiver instalado (não estiver em modo standalone)
  // - E (for dispositivo iOS para ver as instruções, OU o prompt nativo do Android/Chrome estiver pronto)
  const showButton = !isInstalled && (isIOS || isReady);

  return {
    isReady,
    isInstalled,
    isIOS,
    isIOSChrome,
    isIOSWebView,
    isIOSSafari,
    showButton,
    showInstallPrompt,
  };
};
