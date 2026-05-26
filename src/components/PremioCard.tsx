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
}

export const PremioCard = ({ premio, studentBitcash, onResgatar }: PremioCardProps) => {
  const [imgError, setImgError] = useState(false);

  const isOutOfStock = !premio.estoque || premio.estoque <= 0;
  const isInsufficientFunds = studentBitcash < premio.valor;
  const isDisabled = isInsufficientFunds || isOutOfStock;

  let buttonText = "Resgatar Prêmio";
  if (isOutOfStock) buttonText = "Esgotado";
  else if (isInsufficientFunds) buttonText = "Saldo Insuficiente";

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl">
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden group">
        {premio.foto && !imgError ? (
          <img
            src={premio.foto}
            alt={premio.nome}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <Gift className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
        )}

        {/* Stock badge overlay */}
        <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-sm ${
          isOutOfStock
            ? 'bg-red-600/90 text-white'
            : 'bg-emerald-500/90 text-white'
        }`}>
          <Package className="w-3 h-3" />
          {isOutOfStock ? 'Esgotado' : `${premio.estoque} restante${premio.estoque === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="flex flex-col flex-grow p-5 space-y-4">
        <div className="flex-grow space-y-1">
          <h3 className="text-lg font-bold text-school-blue-900 dark:text-zinc-100 line-clamp-2">
            {premio.nome}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {premio.descricao || "Nenhuma descrição disponível para este item."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Custo</span>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-school-yellow-500 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-black text-school-yellow-950">B</span>
              </div>
              <span className={`text-xl font-black ${isInsufficientFunds ? 'text-red-500 dark:text-red-400' : 'text-school-blue-800 dark:text-school-blue-400'}`}>
                {premio.valor}
              </span>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <Button
                    onClick={() => onResgatar(premio.id)}
                    disabled={isDisabled}
                    className={`rounded-xl shadow-md transition-all ${
                      isOutOfStock
                        ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 cursor-not-allowed'
                        : isInsufficientFunds 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' 
                          : 'bg-school-blue-600 hover:bg-school-blue-700 text-white hover:scale-105'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    {buttonText}
                  </Button>
                </div>
              </TooltipTrigger>
              {isDisabled && (
                <TooltipContent>
                  <p>
                    {isOutOfStock
                      ? 'Este prêmio está esgotado no momento.'
                      : 'Você precisa acumular mais BITCash para resgatar.'}
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
