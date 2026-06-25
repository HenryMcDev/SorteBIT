
import React, { useState, useEffect } from 'react';

const Header = () => {
  const fullText = "Veio de uniforme? Envie sua foto e concorra a prêmios! Não fique de fora!";
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(70);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const handleType = () => {
      if (!isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        setTypingSpeed(70);
        
        if (displayText === fullText) {
          // Pausa no final antes de começar a apagar
          timer = setTimeout(() => setIsDeleting(true), 2500);
          return;
        }
      } else {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        setTypingSpeed(30); // Apaga mais rápido
        
        if (displayText === '') {
          setIsDeleting(false);
          // Pausa antes de reiniciar a digitação
          timer = setTimeout(() => {}, 500);
        }
      }
      
      timer = setTimeout(handleType, typingSpeed);
    };

    timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, typingSpeed]);

  return (
    <header className="text-center py-6 md:py-8 px-4 dark:bg-zinc-950 border-b border-transparent dark:border-zinc-800/50">
      <div className="flex justify-center items-center mb-6">
        <img 
          src="/img/uniforme-premiado.webp" 
          alt="Uniforme Premiado" 
          className="h-36 md:h-48 w-auto object-contain mx-auto drop-shadow-md animate-float"
        />
      </div>
      
      <div className="max-w-2xl mx-auto px-2">
        <div className="min-h-[70px] md:min-h-[80px] flex items-center justify-center">
          <h1 className="text-xl md:text-2xl font-black mb-4 tracking-tight leading-snug text-school-blue-600 dark:text-white text-center">
            {displayText}
            <span className="animate-pulse border-r-2 border-school-blue-600 dark:border-white ml-1"></span>
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
