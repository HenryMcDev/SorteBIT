import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, ShoppingBag, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface Premio {
  id: number;
  nome: string;
  descricao: string;
  valor: number;
  foto: string;
  estoque: number | null;
}

interface PremioCardProps {
  premio: Premio;
  studentBitcash: number;
  onResgatar: (id: number) => void;
  isOutsideWindow: boolean;
}

export const PremioCard = ({ premio, studentBitcash, onResgatar, isOutsideWindow }: PremioCardProps) => {
  const [imgError, setImgError] = useState(false);

  const isOutOfStock = !premio.estoque || premio.estoque <= 0;
  const isInsufficientFunds = studentBitcash < premio.valor;
  const isDisabled = isInsufficientFunds || isOutOfStock || isOutsideWindow;

  const cleanDescription = (desc: string) => {
    if (!desc) return "Nenhuma descrição disponível para este item.";
    return desc.replace(/[*_`#]/g, "");
  };

  let buttonText = "Resgatar";
  if (isOutOfStock) buttonText = "Esgotado";
  else if (isOutsideWindow) buttonText = "Período Encerrado";
  else if (isInsufficientFunds) {
    buttonText = `Faltam ${premio.valor - studentBitcash} CashBIT`;
  }

  return (
    <Card className="flex flex-row items-center gap-4 p-3.5 md:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full">
      {/* Imagem do Produto (Lado Esquerdo) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-1 flex items-center justify-center flex-shrink-0">
        {premio.foto && !imgError ? (
          <img
            src={premio.foto}
            alt={premio.nome}
            loading="lazy"
            className="w-full h-full object-contain p-0.5 mix-blend-multiply dark:mix-blend-normal"
            onError={() => setImgError(true)}
          />
        ) : (
          <Gift className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
        )}
      </div>

      {/* Informações e Ações (Lado Direito) */}
      <div className="min-w-0 flex-1 flex flex-col justify-between h-full self-stretch">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base truncate" title={premio.nome}>
            {premio.nome}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1">
            {cleanDescription(premio.descricao)}
          </p>
        </div>

        {/* Preço & Botão de Resgate (Rodapé do Card) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
          <div className="font-bold text-amber-600 dark:text-amber-400 text-sm shrink-0">
            🪙 {premio.valor} CashBIT
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <Button
                    onClick={() => onResgatar(premio.id)}
                    disabled={isDisabled}
                    className={`rounded-xl shadow-md transition-all px-3 py-1.5 h-auto text-xs font-semibold disabled:opacity-100 ${
                      isDisabled
                        ? 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700/50 dark:border cursor-not-allowed'
                        : 'bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-950 font-bold hover:scale-105'
                    }`}
                  >
                    <span>{buttonText}</span>
                  </Button>
                </div>
              </TooltipTrigger>
              {isDisabled && (
                <TooltipContent>
                  <p>
                    {isOutOfStock
                      ? 'Este prêmio está esgotado no momento.'
                      : `Você precisa de mais ${premio.valor - studentBitcash} CashBIT para resgatar.`}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
};
