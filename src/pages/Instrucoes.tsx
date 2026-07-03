import React from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Sparkles, Smartphone, Shirt, MapPin, Gift } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

const Instrucoes = () => {
  const location = useLocation();
  const state = location.state as { deFormulario?: boolean } | null;

  if (!state || !state.deFormulario) {
    return <Navigate to="/" replace />;
  }

  const steps = [
    {
      number: 1,
      title: "Vista o Uniforme",
      text: "Esteja com a camiseta oficial da BIT Educação & Negócios para garantir que você está identificado.",
      badge: "Passo 1",
      image: "/img/aluno-bit.webp",
      icon: <Shirt className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
    {
      number: 2,
      title: "Abra o Aplicativo",
      text: "Acesse a plataforma SorteBIT diretamente do navegador do seu celular ou dispositivo móvel.",
      badge: "Passo 2",
      image: "/img/passo2.png",
      icon: <Smartphone className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
    {
      number: 3,
      title: "Valide a Localização",
      text: "Confirme que você está fisicamente nas dependências da escola usando o validador do aplicativo.",
      badge: "Passo 3",
      image: "/img/passo3.png",
      icon: <MapPin className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
    {
      number: 4,
      title: "Participe e Ganhe!",
      text: "Pronto, agora é só tirar a sua foto e torcer muito nos sorteios da vitrine de prêmios!",
      badge: "Passo 4",
      image: "/img/passo4.png",
      icon: <Gift className="w-6 h-6 text-school-blue-500 dark:text-school-blue-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 transition-colors duration-300">
      
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
            Vestir o seu uniforme te dá CashBIT para concorrer a prêmios incríveis! Siga os 4 passos rápidos abaixo para validar a sua participação.
          </p>

          <div className="animate-bounce flex justify-center mt-2">
            <ChevronDown className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </header>

      {/* Main Flow Content */}
      <main className="max-w-md mx-auto px-4 py-16 md:py-24 relative">
        <div className="relative z-10 space-y-20 md:space-y-28">
          {steps.map((step) => {
            return (
              <div 
                key={step.number} 
                className="flex flex-col items-stretch space-y-6"
              >
                {/* Text/Instruction Card Section */}
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 relative text-left">
                  {/* Floating step icon decoration in the top right corner, half out of the border */}
                  <div className="absolute -top-5 -right-3 w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center border border-zinc-200 z-20">
                    {step.icon}
                  </div>

                  <span className="text-school-yellow-500 font-bold uppercase tracking-wider text-xs block mb-2">
                    PASSO {step.number}
                  </span>

                  <h3 className="text-2xl font-black text-white mb-3 leading-tight">
                    {step.title}
                  </h3>
                  
                  <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                    {step.text}
                  </p>
                </div>

                {/* Image Section */}
                <div className="relative group overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900 w-full">
                  <div className="w-full aspect-[9/16] relative">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-contain max-h-[70vh] transform group-hover:scale-102 transition-transform duration-500 rounded-3xl"
                      onError={(e) => {
                        // Fallback rendering in case image is missing
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
            );
          })}
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
            Acesse agora mesmo a sua conta SorteBIT e registre a sua presença de uniforme escolar!
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span>Acessar SorteBIT</span>
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
