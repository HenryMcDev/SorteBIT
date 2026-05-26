import React, { useEffect } from 'react';
import { Coins } from 'lucide-react';

interface CelebrationProps {
  nome: string;
  onClose?: () => void;
}

const Celebration = ({ nome, onClose }: CelebrationProps) => {
  useEffect(() => {
    // Carrega o script de confete via CDN dinamicamente
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    script.async = true;

    script.onload = () => {
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;

      const frame = () => {
        // @ts-ignore
        if (window.confetti) {
          // @ts-ignore
          window.confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 }, // Disparo da Esquerda
            colors: ['#26ccff', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d']
          });
          // @ts-ignore
          window.confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 }, // Disparo da Direita
            colors: ['#26ccff', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d']
          });
        }

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    };

    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  return (
    <div className="success-overlay" onClick={onClose}>
      {/* Balões subindo - CSS Puro */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="balao-container"
          style={{
            left: `${i * 18}%`,
            animation: `subirBalao ${4 + i}s linear infinite`,
            animationDelay: `${i * 0.5}s`
          }}
        >
          🎈
        </div>
      ))}

      <div className="success-card dark:bg-zinc-950 dark:border-zinc-700" onClick={(e) => e.stopPropagation()}>
        <h1 className="success-title dark:text-white">🥳 BOA SORTE!</h1>
        <p className="success-text dark:text-zinc-300">
          Participação confirmada, <strong>{nome}</strong>!<br />
          A Equipe BIT te deseja sorte no sorteio
        </p>
        <p className="success-highlight dark:text-school-blue-300">
          A BIA já validou tudo por aqui! ✨
        </p>

        {/* Aviso visual BITCash */}
        <div className="mt-6 mb-4 mx-auto w-full max-w-[280px] p-3 rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-200 flex items-center gap-3 animate-in zoom-in duration-500 delay-300">
          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center shrink-0 shadow-inner">
            <Coins className="w-6 h-6 text-yellow-900" />
          </div>
          <div className="text-left flex-1">
            <p className="text-xs font-bold text-yellow-900/70 uppercase tracking-wide leading-none">Você ganhou</p>
            <p className="text-lg font-black text-yellow-950 leading-tight">+10 BITCash</p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="success-button dark:bg-school-yellow-400 dark:text-school-blue-950"> SAIR </button>
        )}
      </div>
    </div>
  );
};

export default Celebration;
