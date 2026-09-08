import React, { useState, useEffect } from "react";

const BotaoFlutuanteWhatsapp = () => {
  const words = ["Problemas?", "Dúvidas?", "Suporte?"];
  const [mensagemAtual, setMensagemAtual] = useState(0);
  const [mostrarBalao, setMostrarBalao] = useState(false);

  const message = "Olá, boa tarde. estou com problema com o Uniforme Premiado, gostaria de falar com o Henry.";
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/5534998843601?text=${encodedMessage}`;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const intervalId = setInterval(() => {
      setMostrarBalao(true);
      setMensagemAtual((prev) => (prev + 1) % words.length);

      timeoutId = setTimeout(() => {
        setMostrarBalao(false);
      }, 5000);
    }, 30000);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[99] flex flex-col items-center">
      <style>{`
        @keyframes tooltipFade {
          0% { opacity: 0; transform: translateY(8px) scale(0.95); }
          10% { opacity: 1; transform: translateY(0) scale(1); }
          90% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(8px) scale(0.95); }
        }
        .animate-tooltip-fade {
          animation: tooltipFade 5s ease-in-out forwards;
        }
      `}</style>

      {mostrarBalao && (
        <div className="absolute bottom-16 mb-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs px-3 py-1.5 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 whitespace-nowrap animate-tooltip-fade">
          {words[mensagemAtual]}
          {/* Seta apontando para o botão */}
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700 rotate-45"></div>
        </div>
      )}

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out"
        title="Falar com o Henry no WhatsApp"
        aria-label="Falar com o Henry no WhatsApp"
      >
        <img
          src="/img/icon-whatsapp.png"
          alt="WhatsApp"
          className="w-8 h-8 object-contain"
        />
      </a>
    </div>
  );
};

export default BotaoFlutuanteWhatsapp;
