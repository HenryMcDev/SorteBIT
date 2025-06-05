
import { useState, useEffect } from 'react';

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // Detectar dispositivos móveis através do user agent
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      // Também verificar o tamanho da tela como fallback
      const screenWidth = window.innerWidth;
      const isMobileUserAgent = mobileRegex.test(userAgent);
      const isMobileScreen = screenWidth <= 768;
      
      setIsMobile(isMobileUserAgent || isMobileScreen);
    };

    checkIfMobile();
    
    // Recheck on window resize
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  return isMobile;
};
