import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermosCondicoesProps {
  children?: React.ReactNode;
}

export const TermosCondicoes = ({ children }: TermosCondicoesProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <button className="underline hover:text-school-blue-500 font-semibold transition-colors focus:outline-none">
            Termos e Condições
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh] flex flex-col p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-xl font-black text-zinc-900 dark:text-white flex items-center justify-between">
            <span>Termos e Condições de Uso</span>
            <span className="text-xs font-mono font-normal px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full">
              v1.0.1
            </span>
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Por favor, leia atentamente as regras e condições para uso do Uniforme Premiado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 py-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed overflow-y-auto">
          <div className="space-y-6">
            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">1. Aceitação dos Termos</h3>
              <p>
                Ao acessar e utilizar o Uniforme Premiado, você concorda em cumprir e estar vinculado a estes Termos e Condições de Uso. Este sistema destina-se a fins pedagógicos e de engajamento escolar da instituição.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">2. Cadastro e Acesso</h3>
              <p>
                O acesso à plataforma é restrito a alunos e colaboradores devidamente matriculados ou vinculados à instituição. Você se compromete a fornecer informações verdadeiras e atualizadas no ato do cadastro, sendo estritamente proibido o uso de dados de terceiros.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">3. Regras dos Sorteios</h3>
              <p>
                As participações nos sorteios diários e no Jackpot dependem do cumprimento de requisitos pedagógicos e de presença. É obrigatório estar fisicamente presente nas dependências da instituição (verificado via geolocalização) e portar a vestimenta escolar (verificado por validação de foto) para validar a participação. Tentativas de burlar esses requisitos resultarão na desqualificação imediata.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">4. Proteção de Dados e LGPD</h3>
              <p>
                Em conformidade com a Lei Geral de Proteção de Dados (LGPD), o Uniforme Premiado coleta apenas as informações estritamente necessárias para a prestação dos serviços (como nome completo, endereço de e-mail e registro de participação). Seus dados não serão compartilhados com terceiros sem consentimento prévio e serão tratados de forma confidencial.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">5. Cookies</h3>
              <p>
                Utilizamos cookies essenciais para manter a sua sessão ativa, salvar suas preferências de uso e garantir a segurança das suas transações. Você poderá configurar a sua aceitação no banner informativo inicial do aplicativo.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">6. Alterações nos Termos</h3>
              <p>
                Reservamo-nos o direito de modificar estes Termos a qualquer momento. Quaisquer atualizações relevantes serão comunicadas diretamente na plataforma e exigirão nova aceitação por parte dos usuários.
              </p>
            </section>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              Última modificação: 23 de Junho de 2026.
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
