import React, { useState, useEffect } from 'react';

interface HeaderAdministrativoProps {
  abaAtivaNome: string;
}

export default function HeaderAdministrativo({ abaAtivaNome }: HeaderAdministrativoProps) {
  const [horaLocal, setHoraLocal] = useState('');
  const [dataLocal, setDataLocal] = useState('');

  useEffect(() => {
    const atualizarHorario = () => {
      const agora = new Date();
      
      // Formatação do Relógio no fuso de São Paulo
      const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Formatação da Data no fuso de São Paulo
      const formatadorData = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      setHoraLocal(formatadorHora.format(agora));
      setDataLocal(formatadorData.format(agora));
    };

    // Executa imediatamente e define o intervalo de atualização a cada segundo
    atualizarHorario();
    const intervalo = setInterval(atualizarHorario, 1000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <header className="w-full h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-200">
      
      {/* Lado Esquerdo: Título dinâmico baseado no botão selecionado no Sidebar */}
      <div className="flex items-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {abaAtivaNome || 'Painel'}
        </h1>
      </div>

      {/* Lado Direito: Data atual e Relógio em tempo real (Fuso de São Paulo) */}
      <div className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
        <span className="capitalize">{dataLocal}</span>
        <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
        <span className="bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-md font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm">
          {horaLocal || '00:00:00'}
        </span>
      </div>

    </header>
  );
}
