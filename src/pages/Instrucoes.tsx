import React, { useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Sparkles, Smartphone, Shirt, MapPin, Gift } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

const Instrucoes = () => {
  const location = useLocation();
  const state = location.state as { deFormulario?: boolean } | null;
  const [passoAberto, setPassoAberto] = useState<number>(1);
  const [faqAberto, setFaqAberto] = useState<number | null>(1);

  if (!state || !state.deFormulario) {
    return <Navigate to="/" replace />;
  }

  const steps = [
    {
      number: 1,
      title: "Vista o Uniforme",
      text: (
        <>
          Esteja vestido com o seu uniforme oficial da BIT Educação Inteligente para garantir que você será devidamente identificado no ato da participação. Fique atento: <strong>caso não esteja utilizando a camiseta oficial, a sua participação não poderá ser validada pelo sistema de verificação</strong>!
        </>
      ),
      badge: "Passo 1",
      image: "/img/uniforme-bit.webp",
      icon: <Shirt className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
    {
      number: 2,
      title: "Abrir Câmera",
      text: (
        <>
          Já está vestindo o seu uniforme? Excelente! Agora, basta clicar no botão 'Abrir Câmera'. Lembramos que <strong>será estritamente necessário conceder a permissão de uso da câmera no seu dispositivo</strong> quando o navegador solicitar. Sem essa autorização, não será possível validar sua participação no Uniforme Premiado. Certifique-se de que o seu rosto e o uniforme estejam bem enquadrados e visíveis antes de prosseguir!
        </>
      ),
      badge: "Passo 2",
      image: "/img/passo_2.webp",
      icon: <Smartphone className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
    {
      number: 3,
      title: "Captura da Foto",
      text: (
        <>
          Agora que a câmera está ativa, posicione-se bem e clique no círculo amarelo para realizar a captura da sua selfie. Para questões de auditoria e validação no ato do sorteio, <strong>a sua foto será armazenada de forma segura em nosso banco de dados</strong>. Para entender melhor como protegemos as suas informações, sinta-se à vontade para consultar nossos Termos e Condições.
        </>
      ),
      badge: "Passo 3",
      image: "/img/passo_3.webp",
      icon: <MapPin className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
    {
      number: 4,
      title: "Participar do Sorteio",
      text: (
        <>
          Tudo pronto! Clique no botão 'Participar do Sorteio' e aguarde alguns instantes enquanto o sistema processa a validação inteligente do seu uniforme. <strong>Caso a verificação seja recusada, não se preocupe: você terá mais 2 tentativas adicionais</strong> para reenquadrar a foto. <strong>Se ultrapassar esse limite diário de tentativas, uma nova participação só será permitida no próximo dia.</strong>
        </>
      ),
      badge: "Passo 4",
      image: "/img/passo_4.webp",
      icon: <Gift className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
  ];

  const faqSteps = [
    {
      id: 1,
      pergunta: "O que é o Uniforme Premiado e como ele funciona?",
      resposta: "O Uniforme Premiado é uma iniciativa para recompensar os alunos que utilizam a camiseta oficial da BIT Educação Inteligente. Ao validar o seu uniforme pelo sistema, você ganha 10 CashBIT para acumular e concorrer a prêmios incríveis!"
    },
    {
      id: 2,
      pergunta: "Por que o aplicativo está pedindo permissão para acessar minha câmera?",
      resposta: "O acesso à câmera é estritamente necessário para que o sistema de inteligência artificial faça a validação visual do seu rosto e do seu uniforme em tempo real. Se você não conceder essa permissão nas configurações do navegador, não será possível concluir a sua participação."
    },
    {
      id: 3,
      pergunta: "Minha foto fica salva no sistema? Isso é seguro?",
      resposta: "Sim, para fins de auditoria, validação de segurança e garantia de que o sorteio seja justo, a sua foto de selfie é armazenada de forma segura em nosso banco de dados. Todo o processo respeita a privacidade dos dados, e você pode conferir mais detalhes em nossos Termos e Condições."
    },
    {
      id: 4,
      pergunta: "O sistema recusou minha foto. O que eu devo fazer?",
      resposta: "Não se preocupe! Certifique-se de que você está em um local bem iluminado, com o rosto totalmente visível e que a camiseta oficial da BIT apareça claramente na imagem. O sistema oferece mais 2 tentativas adicionais para você ajustar o enquadramento e tentar novamente."
    },
    {
      id: 5,
      pergunta: "O que acontece se eu errar todas as 3 tentativas de validação da foto?",
      resposta: "Caso você exceda o limite de 3 tentativas diárias (a primeira mais as 2 tentativas extras adicionais) e o sistema não consiga validar o uniforme, a sua participação será bloqueada por questões de segurança e você só poderá tentar novamente no próximo dia."
    },
    {
      id: 6,
      pergunta: "Posso participar se estiver vestindo outra camiseta parecida?",
      resposta: "Não. O sistema de inteligência artificial foi treinado especificamente para reconhecer os padrões, cores e a logomarca oficial da BIT Educação Inteligente. Se você não estiver com a camiseta oficial da instituição, a validação será recusada automaticamente."
    },
    {
      id: 7,
      pergunta: "Posso fazer a validação usando uma foto da galeria do meu celular?",
      resposta: "Não. Para evitar fraudes e garantir que você realmente está presente e vestindo o uniforme no momento, o sistema exige uma captura ao vivo utilizando a câmera do dispositivo através do processo de liveness detection."
    },
    {
      id: 8,
      pergunta: "Quantas vezes por dia posso validar meu uniforme para ganhar CashBIT?",
      resposta: "A validação do Uniforme Premiado é diária. Você pode registrar a sua presença de uniforme uma vez por dia para garantir os seus 10 CashBIT diários e acumular chances para os sorteios."
    },
    {
      id: 9,
      pergunta: "Cliquei em \"Participar do Sorteio\" e a tela ficou carregando. Devo fechar o app?",
      resposta: "Não feche o aplicativo. Após clicar no botão, o sistema está enviando a imagem para os servidores processarem a inteligência artificial. Aguarde alguns instantes até que a mensagem de sucesso ou de recusa apareça na tela."
    },
    {
      id: 10,
      pergunta: "Onde posso acompanhar os CashBITs que ganhei com o uniforme?",
      resposta: "Todos os seus pontos acumulados e o extrato de participações do Uniforme Premiado ficam visíveis diretamente no painel principal da sua conta do Uniforme Premiado assim que a validação é concluída com sucesso."
    }
  ];

  return (
    <div 
      className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 transition-colors duration-300"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      
      {/* Top Header Section */}
      <header className="relative py-16 md:py-24 text-center px-4 overflow-hidden bg-gradient-to-br from-school-blue-600 via-school-blue-700 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.15),transparent_45%)] pointer-events-none"></div>
        
        {/* Navigation Bar inside Header */}
        <div className="max-w-6xl mx-auto flex items-center justify-between absolute top-4 left-4 right-4 z-20">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/img/logo_branca.png" alt="SorteBIT" className="h-8 md:h-10 object-contain" />
          </Link>
          <ThemeToggle />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto mt-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs md:text-sm font-semibold tracking-wider text-yellow-300 mb-6 uppercase">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            Infográfico Uniforme Premiado
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black mb-6 tracking-tight leading-tight drop-shadow-sm">
            Como Funciona o <span className="text-school-yellow-400">Uniforme Premiado?</span>
          </h1>
          
          <p className="text-blue-100 text-base md:text-lg max-w-2xl mx-auto mb-8 font-medium">
            Vestir o seu uniforme te dá a chance de concorrer a prêmios incríveis! E também 10 CashBIT por participação! Siga os 4 passos rápidos abaixo para validar a sua participação.
          </p>

          <div className="animate-bounce flex justify-center mt-2">
            <ChevronDown className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </header>

      {/* Main Flow Content */}
      <main className="max-w-md mx-auto px-4 py-16 md:py-24 relative">
        <div className="relative z-10 space-y-4">
          {steps.map((step) => {
            return (
              <div 
                key={step.number} 
                className="flex flex-col items-stretch"
              >
                {/* Button Activator Header */}
                <button
                  type="button"
                  onClick={() => setPassoAberto(passoAberto === step.number ? 0 : step.number)}
                  className="w-full flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-school-blue-500/50"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full bg-school-yellow-400 text-yellow-950 font-black flex items-center justify-center shadow-md text-lg">
                      {step.number}
                    </span>
                    <div>
                      <span className="text-amber-600 dark:text-school-yellow-500 font-bold uppercase tracking-wider text-xs block mb-0.5">
                        PASSO {step.number}
                      </span>
                      <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-200/50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                      {step.icon}
                    </div>
                    <ChevronDown className={`w-6 h-6 text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ${
                      passoAberto === step.number ? 'rotate-180' : ''
                    }`} />
                  </div>
                </button>

                {/* Collapsible Content wrapper */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  passoAberto === step.number 
                    ? 'max-h-[1500px] opacity-100 mt-4 pointer-events-auto' 
                    : 'max-h-0 opacity-0 pointer-events-none'
                }`}>
                  <div className="space-y-6">
                    {/* Text/Instruction Card Section */}
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-md text-left">
                      <p className="text-zinc-600 dark:text-zinc-300 text-base md:text-lg [&_strong]:text-zinc-900 dark:[&_strong]:text-white [&_strong]:font-black leading-relaxed">
                        {step.text}
                      </p>
                    </div>

                    {/* Image Section */}
                    <div className={`relative group overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-zinc-200 dark:border-zinc-800/80 w-full p-6 ${
                      step.number === 1 ? 'bg-zinc-50 dark:bg-white' : 'bg-zinc-50 dark:bg-zinc-900'
                    }`}>
                      <div className="w-full aspect-[9/16] relative">
                        <img
                          src={step.image}
                          alt={step.title}
                          className="w-full h-full object-contain max-h-[70vh] transform group-hover:scale-102 transition-transform duration-500 rounded-3xl"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"></div>
                        
                        {/* Badge indicator inside image container */}
                        <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-school-yellow-400 text-yellow-950 font-black flex items-center justify-center shadow-md text-lg z-10">
                          {step.number}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 md:mt-24">
          <h2 className="text-2xl md:text-3xl font-black mb-8 text-zinc-900 dark:text-white text-center">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            {faqSteps.map((faq) => {
              const isOpen = faqAberto === faq.id;
              return (
                <div key={faq.id} className="flex flex-col items-stretch">
                  <button
                    type="button"
                    onClick={() => setFaqAberto(isOpen ? null : faq.id)}
                    className={`w-full flex items-center justify-between p-6 rounded-3xl border shadow-md hover:shadow-lg transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-school-blue-500/50 ${
                      isOpen 
                        ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700' 
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <span className="font-bold text-zinc-900 dark:text-white text-base pr-4">
                      {faq.pergunta}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-zinc-500 dark:text-zinc-400 transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen 
                      ? 'max-h-[500px] opacity-100 mt-3 pointer-events-auto' 
                      : 'max-h-0 opacity-0 pointer-events-none'
                  }`}>
                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-md text-left">
                      <p className="text-zinc-600 dark:text-zinc-300 text-sm md:text-base leading-relaxed">
                        {faq.resposta}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Call to Action Closing Section */}
      <section className="bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/60 py-16 md:py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 text-green-500 mb-6">
            <Gift className="w-8 h-8" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">
            Pronto para começar a ganhar?
          </h2>
          
          <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg mb-8 max-w-lg mx-auto">
            Acesse agora mesmo a sua conta Uniforme Premiado e registre a sua presença com o uniforme da BIT Educação Inteligente.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span>Acessar Uniforme Premiado</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-100 dark:border-zinc-900">
        <p>© {new Date().getFullYear()} BIT Educação & Negócios. Todos os direitos reservados.</p>
      </footer>

    </div>
  );
};

export default Instrucoes;
