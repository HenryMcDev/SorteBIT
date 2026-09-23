import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface CameraViewfinderProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Photo: string) => void;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Desliga todas as faixas da câmera para poupar bateria e RAM
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
  }, []);

  // Limpeza no unmount ou quando o modal fecha
  useEffect(() => {
    if (!isOpen) {
      stopTracks();
      setHasPermissionError(false);
      setIsFlashing(false);
      setIsProcessing(false);
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, stopTracks]);

  const handleUserMedia = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    setHasPermissionError(false);

    // Ajuste suave de exposição via hardware se suportado pelo navegador
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
        const capabilities = videoTrack.getCapabilities() as any;
        if (capabilities?.exposureCompensation) {
          const min = capabilities.exposureCompensation.min ?? -2;
          const targetExp = Math.max(min, -0.5);
          (videoTrack as any).applyConstraints({
            advanced: [{ exposureCompensation: targetExp }]
          }).catch(() => {});
        }
      }
    } catch (_) {}
  }, []);

  const handleUserMediaError = useCallback(() => {
    setHasPermissionError(true);
  }, []);

  // Captura da foto em 1080x1920 (9:16 vertical) sem zoom artificial e com logo correto
  const takePhoto = useCallback(() => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Feedback visual imediato: Flash do obturador
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 140);

    // Feedback tátil: Vibração háptica suave
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([35]);
      } catch (_) {}
    }

    try {
      const video = webcamRef.current?.video;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        // Resolução exata exigida: 1080 x 1920 (9:16 vertical)
        const targetWidth = 1080;
        const targetHeight = 1920;
        const targetRatio = targetWidth / targetHeight; // 9 / 16 = 0.5625

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const vW = video.videoWidth;
        const vH = video.videoHeight;
        const vRatio = vW / vH;

        let sx = 0;
        let sy = 0;
        let sWidth = vW;
        let sHeight = vH;

        // Crop central proporcional correspondente ao enquadramento natural da tela
        if (vRatio > targetRatio) {
          sWidth = vH * targetRatio;
          sx = (vW - sWidth) / 2;
        } else {
          sHeight = vW / targetRatio;
          sy = (vH - sHeight) / 2;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Ajuste sutil de contraste e luminância para evitar rosto lavado
          ctx.filter = 'contrast(1.05) brightness(0.96)';

          // ORIENTAÇÃO CORRETA:
          // Sem scale(-1, 1). A estampa da camiseta sai perfeitamente legível como "BIT".
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
          stopTracks();
          onCapture(optimizedBase64);
          return;
        }
      }

      // Fallback seguro caso o elemento video não esteja disponível
      const fallbackSrc = webcamRef.current?.getScreenshot({
        width: 1080,
        height: 1920,
      });
      if (fallbackSrc) {
        stopTracks();
        onCapture(fallbackSrc);
      }
    } catch (err) {
      console.error('[CameraViewfinder] Erro ao processar frame da foto:', err);
      const fallbackSrc = webcamRef.current?.getScreenshot({
        width: 1080,
        height: 1920,
      });
      if (fallbackSrc) {
        stopTracks();
        onCapture(fallbackSrc);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onCapture, stopTracks]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Câmera de Selfie do Uniforme"
      className="fixed inset-0 z-[120] bg-black overflow-hidden select-none touch-none"
    >
      {/* Flash branco do obturador */}
      {isFlashing && (
        <div
          className="absolute inset-0 bg-white z-[150] pointer-events-none transition-opacity duration-150 opacity-90"
          aria-hidden="true"
        />
      )}

      {/* Tratamento de erro de permissão */}
      {hasPermissionError ? (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto text-white">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">Acesso à Câmera Bloqueado</h3>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            Habilite a permissão de câmera nas configurações do seu navegador para continuar.
          </p>
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopTracks();
                onClose();
              }}
              className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setHasPermissionError(false);
              }}
              className="flex-1 bg-school-blue-600 hover:bg-school-blue-700 text-white flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar de Novo
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Feed da Câmera em Tela Cheia - Ângulo Aberto e Natural (Sem Zoom Forçado) */}
          <Webcam
            audio={false}
            ref={webcamRef}
            mirrored={true}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.90}
            videoConstraints={{
              facingMode: 'user', // Câmera frontal sem forçar width/height que causam zoom digital no sensor
            }}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            style={{ filter: 'contrast(1.04) brightness(0.96)' }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Botão Fechar Discreto no Topo (Sem nenhuma outra poluição na tela) */}
          <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-6 pointer-events-none">
            <button
              type="button"
              onClick={() => {
                stopTracks();
                onClose();
              }}
              className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/20 shadow-lg pointer-events-auto"
              aria-label="Fechar Câmera"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-12" aria-hidden="true" />
          </header>

          {/* Botão Obturador Limpo na Base (Estilo Câmera Nativa) */}
          <footer className="absolute bottom-0 left-0 right-0 z-30 pb-12 pt-6 flex items-center justify-center pointer-events-none bg-gradient-to-t from-black/80 via-black/30 to-transparent">
            <button
              type="button"
              disabled={isProcessing}
              onClick={takePhoto}
              aria-label="Tirar Foto"
              className="group relative flex items-center justify-center w-20 h-20 rounded-full transition-transform active:scale-90 disabled:opacity-50 pointer-events-auto shadow-2xl"
            >
              {/* Anel Externo Branco */}
              <span className="absolute inset-0 rounded-full border-4 border-white transition-all group-hover:scale-105" />
              {/* Botão Central de Disparo */}
              <span className="w-16 h-16 rounded-full bg-white group-hover:bg-gray-100 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                <Camera className="w-7 h-7 text-gray-900 transition-colors" />
              </span>
            </button>
          </footer>
        </>
      )}
    </div>
  );
};

export default CameraViewfinder;
