
const Header = () => {
  return (
    <header className="text-center py-6 md:py-8 px-4 dark:bg-zinc-950 border-b border-transparent dark:border-zinc-800/50">
      <div className="flex justify-center items-center mb-4 md:mb-6">
        <img src="/img/logo.png" alt="Logo BIT" className="h-10 md:h-14 w-auto object-contain mr-3 block dark:hidden" />
        <img src="/img/logo_branca.png" alt="Logo BIT" className="h-10 md:h-14 w-auto object-contain mr-3 hidden dark:block" />
        <div className="text-black dark:text-white transition-colors text-lg md:text-2xl font-bold">BIT EDUCAÇÃO & NEGÓCIOS</div>
      </div>
      
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white transition-colors mb-3 md:mb-4 leading-tight px-2">
        SorteBIT eu visto o UNIFORME
      </h1>
      
      <p className="text-sm md:text-lg lg:text-xl text-black dark:text-white transition-colors max-w-2xl mx-auto leading-relaxed px-2">
        Preencha seu nome, número de telefone e o codigo do sorteio para gerar automaticamente seu número da sorte. 
        O sorteio será realizado todo final de mês na BIT!
      </p>
    </header>
  );
};

export default Header;
