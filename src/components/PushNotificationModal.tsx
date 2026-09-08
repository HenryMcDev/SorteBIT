import React from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
  success
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9999] backdrop-blur-md bg-zinc-950/70 flex items-center justify-center p-4">
      <div className="bg-zinc-900/95 border border-school-blue-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-school-blue-500/10 rounded-full flex items-center justify-center mb-2">
          <Bell className="w-8 h-8 text-school-blue-500 animate-bounce" />
        </div>
        
        <h3 className="text-xl font-bold text-white">
          Ativar Notificações
        </h3>
        
        <p className="text-zinc-300 text-sm leading-relaxed">
          Deseja receber notificações do SorteBIT para lembrá-lo do check-in do uniforme diário? Não perca os sorteios!
        </p>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-xs text-left w-full border border-red-500/20 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full pt-2">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || success}
            className="w-full h-12 bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Ativando...</span>
              </>
            ) : success ? (
              'Ativado com sucesso!'
            ) : (
              'Sim, quero receber'
            )}
          </Button>

          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full h-12 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold rounded-xl transition-all"
          >
            Não, obrigado
          </Button>
        </div>
      </div>
    </div>
  );
};
