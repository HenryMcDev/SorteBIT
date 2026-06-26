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
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">1. OBJETIVO DO PROGRAMA</h3>
              <div className="space-y-2">
                <p>1.1 O Programa Uniforme Premiado é uma iniciativa educacional e institucional da BIT, criada com o objetivo de incentivar o uso adequado do uniforme escolar, fortalecer o sentimento de pertencimento à comunidade escolar e estimular a participação dos alunos nas atividades da instituição.</p>
                <p>1.2 O programa possui caráter exclusivamente educativo, não comercial e sem finalidade lucrativa.</p>
              </div>
            </section>
            
            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">2. ACEITAÇÃO DOS TERMOS</h3>
              <div className="space-y-2">
                <p>2.1 Ao participar do Programa Uniforme Premiado, o aluno e seus responsáveis legais declaram estar cientes e de acordo com as disposições deste regulamento.</p>
                <p>2.2 A participação no programa é gratuita, facultativa e não constitui condição para matrícula, permanência ou participação do aluno nas atividades escolares.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">3. ELEGIBILIDADE E CRITÉRIOS DE PARTICIPAÇÃO</h3>
              <div className="space-y-2">
                <p>3.1 Poderão participar do Programa Uniforme Premiado os alunos regularmente matriculados e com vínculo ativo junto à instituição.</p>
                <p>3.2 O participante compromete-se a fornecer informações verdadeiras e atualizadas sempre que necessário para sua correta identificação e registro no programa.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">4. PARTICIPAÇÃO E REGISTRO</h3>
              <div className="space-y-2">
                <p>4.1 Para participar, o aluno deverá comparecer à escola utilizando o uniforme oficial da BIT.</p>
                <p>4.2 O registro da participação será realizado por meio do endereço eletrônico: https://campanha.bitaraxa.com.br</p>
                <p>4.3 Após realizar seu cadastro, o aluno deverá enviar uma fotografia nítida e atual, que permita a visualização de seu rosto e da logomarca da BIT presente no uniforme.</p>
                <p>4.4 Para que o check-in seja validado, o aluno deverá estar fisicamente nas dependências da escola e manter a localização (GPS) de seu dispositivo móvel ativada, permitindo a correta identificação de sua presença no local.</p>
                <p>4.5 A validação da participação será realizada por sistema automatizado de reconhecimento de imagem e geolocalização, podendo ser revisada manualmente pela instituição quando necessário.</p>
                <p>4.6 A validação do uniforme é diária, sendo permitido apenas 1 (um) check-in por aluno em cada dia letivo.</p>
                <p>4.7 Tentativas de realização de múltiplos check-ins no mesmo dia não gerarão cupons ou CashBits adicionais.</p>
                <p>4.8 Após a validação da participação, o aluno receberá:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>1 (um) cupom para participação na premiação mensal promovida pela instituição;</li>
                  <li>10 (dez) CashBits para utilização no programa.</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">5. CASHBITS</h3>
              <div className="space-y-2">
                <p>5.1 CashBits são pontos de recompensa criados exclusivamente para utilização no Programa Uniforme Premiado. Os CashBits:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Não possuem valor monetário;</li>
                  <li>Não podem ser convertidos em dinheiro;</li>
                  <li>Não podem ser vendidos, negociados ou transferidos a terceiros;</li>
                  <li>Não geram qualquer direito de crédito ou indenização.</li>
                </ul>
                <p>5.2 Os CashBits possuem caráter cumulativo e poderão ser acumulados ao longo da participação do aluno no programa.</p>
                <p>5.3 Os CashBits acumulados poderão ser utilizados exclusivamente para o resgate de brindes, benefícios e premiações disponibilizados pela instituição.</p>
                <p>5.4 As solicitações de resgate deverão ser realizadas entre os dias 01 e 10 de cada mês.</p>
                <p>5.5 Solicitações realizadas fora desse período não poderão ser processadas, devendo o participante aguardar o próximo período de resgate.</p>
                <p>5.6 Os brindes e premiações resgatados poderão ser retirados na recepção da escola a partir do dia 15 do respectivo mês, mediante identificação do participante.</p>
                <p>5.7 Salvo comunicação em contrário, os CashBits permanecerão válidos até o encerramento do ano letivo vigente.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">6. CUPONS E PREMIAÇÃO MENSAL</h3>
              <div className="space-y-2">
                <p>6.1 Cada participação validada gerará 1 (um) cupom para o aluno.</p>
                <p>6.2 Os cupons acumulados durante determinado mês habilitarão o participante a concorrer à premiação mensal promovida pela instituição.</p>
                <p>6.3 Cada cupom corresponde a uma chance adicional de participação.</p>
                <p>6.4 Os cupons possuem validade exclusivamente para o mês em que forem obtidos, não sendo cumulativos para meses posteriores.</p>
                <p>6.5 Ao final de cada período mensal, todos os cupons serão automaticamente encerrados para fins de participação na premiação daquele mês.</p>
                <p>6.6 A forma de realização da premiação, a data e os brindes disponibilizados serão divulgados previamente pelos canais oficiais da instituição.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">7. CONDUTA E INTEGRIDADE DO PROGRAMA</h3>
              <div className="space-y-2">
                <p>7.1 O Programa Uniforme Premiado baseia-se nos princípios de honestidade, responsabilidade, respeito e participação consciente.</p>
                <p>7.2 Será considerada irregular qualquer tentativa de obtenção indevida de benefícios e qualquer prática que comprometa a integridade do programa.</p>
                <p>7.3 A instituição poderá, a seu exclusivo critério, aplicar as seguintes medidas:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Cancelamento dos CashBits acumulados;</li>
                  <li>Cancelamento dos cupons obtidos;</li>
                  <li>Suspensão temporária da participação;</li>
                  <li>Exclusão definitiva do programa.</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">8. PROTEÇÃO DE DADOS E PRIVACIDADE</h3>
              <div className="space-y-2">
                <p>8.1 A instituição compromete-se a tratar os dados pessoais dos participantes em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).</p>
                <p>8.2 Serão coletadas apenas as informações necessárias para a execução do programa, incluindo:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dados de identificação do participante;</li>
                  <li>Fotografias enviadas para validação;</li>
                  <li>Registros de participação;</li>
                  <li>Dados de geolocalização utilizados para validação do check-in;</li>
                  <li>Saldo de CashBits;</li>
                  <li>Histórico de premiações.</li>
                </ul>
                <p>8.3 As fotografias enviadas serão utilizadas exclusivamente para validação da participação no programa e não serão compartilhadas com terceiros ou utilizadas para fins publicitários, promocionais ou comerciais sem a devida autorização dos responsáveis legais, quando aplicável.</p>
                <p>8.4 Os dados coletados serão utilizados exclusivamente para operacionalização, controle, auditoria e segurança do Programa Uniforme Premiado.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">9. NATUREZA DO PROGRAMA</h3>
              <div className="space-y-2">
                <p>9.1 O Programa Uniforme Premiado constitui ação interna de incentivo educacional destinada exclusivamente à comunidade escolar da BIT.</p>
                <p>9.2 O programa não envolve compra de produtos, pagamento para participação, modalidade de aposta ou qualquer atividade com finalidade comercial.</p>
                <p>9.3 As premiações distribuídas possuem caráter exclusivamente institucional e educativo.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">10. ALTERAÇÕES DO REGULAMENTO</h3>
              <div className="space-y-2">
                <p>10.1 A instituição reserva-se o direito de alterar, atualizar ou aperfeiçoar este regulamento sempre que necessário para aprimoramento do programa.</p>
                <p>10.2 As alterações relevantes serão comunicadas aos participantes por meio dos canais oficiais da escola.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">11. CLÁUSULA DE DIVULGAÇÃO DE PARTICIPANTES</h3>
              <div className="space-y-2">
                <p>11.1 Os participantes do Programa Uniforme Premiado, quando premiados ou contemplados em ações vinculadas ao programa, poderão ter seu nome, imagem e/ou resultado divulgado nos canais oficiais da instituição, incluindo, mas não se limitando, à página oficial da escola no Instagram e demais redes sociais institucionais.</p>
                <p>11.2 Essa divulgação terá finalidade exclusivamente institucional, educativa e de transparência dos resultados do programa, não implicando qualquer tipo de exploração comercial da imagem do participante.</p>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">12. DISPOSIÇÕES FINAIS</h3>
              <div className="space-y-2">
                <p>12.1 Os casos omissos ou situações não previstas neste regulamento serão analisados e decididos pela Direção e Coordenação da instituição.</p>
                <p>12.2 A participação no Programa Uniforme Premiado implica na leitura, compreensão e aceitação integral das regras aqui estabelecidas.</p>
                <p>12.3 A instituição poderá suspender, alterar ou encerrar o programa a qualquer momento, mediante comunicação prévia à comunidade escolar, sem que isso gere qualquer direito de indenização ou compensação aos participantes.</p>
              </div>
            </section>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              Última modificação: 26 de Junho de 2026.
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
