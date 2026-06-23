import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TermosCondicoes } from './TermosCondicoes';
import { ShieldCheck } from 'lucide-react';

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isAccepted = localStorage.getItem('lgpd_accepted');
    if (!isAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('lgpd_accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-[9999] animate-in slide-in-from-bottom-5 duration-300">
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl rounded-2xl p-5">
        <CardContent className="p-0 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-school-blue-500/10 border border-school-blue-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-school-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                Privacidade e Cookies
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                Usamos cookies para melhorar sua experiência. Ao continuar utilizando a plataforma, você concorda com nossos{' '}
                <TermosCondicoes>
                  <button className="text-school-blue-500 hover:text-school-blue-600 underline font-semibold focus:outline-none transition-colors">
                    Termos e Condições
                  </button>
                </TermosCondicoes>.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              onClick={handleAccept}
              className="h-10 px-6 font-bold text-xs bg-school-blue-600 hover:bg-school-blue-700 text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Aceitar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default CookieBanner;
