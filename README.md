<div align="center">

  # 👕 Uniforme Premiado
  ### Plataforma Digital de Auditoria e Premiações Escolares
  
  [![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![n8n](https://img.shields.io/badge/n8n-Automation-FF6F59?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io/)
</div>

---

## 🔍 Sobre a Plataforma

O **Uniforme Premiado** é uma aplicação completa de engajamento e auditoria digital estudantil. O ecossistema foi projetado para gerenciar e validar a participação ativa de alunos em programas de incentivo escolar, automatizando a concessão de saldos virtuais (CashBIT) e cupons eletrônicos para sorteios.

Com uma interface moderna, responsiva e otimizada para o dia a dia da moderação escolar, a plataforma foca em entregar usabilidade aliada a uma arquitetura de segurança rígida e integrada.

---

## 🛡️ Principais Funcionalidades & Arquitetura

### ⚡ Painel Administrativo Dinâmico
*   **Busca Global Avançada**: Filtragem dinâmica de participantes por nome em tempo real.
*   **Segmentação Inteligente**: Filtros rápidos baseados em balanços de saldo (com saldo vs. sem saldo).
*   **Galeria sob Demanda**: Carregamento assíncrono de comprovantes e fotos de validação diretamente da infraestrutura em nuvem.

### 🔒 Camadas de Proteção e Privacidade
*   **Mascaramento de Recursos**: Utilização de Blobs locais temporários em memória para exibição de mídias, ocultando os links de armazenamento em nuvem do inspetor do navegador.
*   **Segurança Anti-Cópia**: Bloqueio completo de clique direito, arrasto de imagem (`drag-and-drop`) e atalhos de desenvolvedor (F12, inspect e visualização de código-fonte).
*   **Congelamento por Debugger**: Loop contínuo integrado nas rotas administrativas para pausar e paralisar instantaneamente a depuração do site em ferramentas externas.
*   **Contingência Elegante**: Máscara visual de erro estilizada (`<noscript>`) exibida caso o interpretador Javascript do navegador seja desativado.

---

## 💻 Estrutura Tecnológica

*   **Frontend**: React (Vite) + TypeScript + Tailwind CSS.
*   **Componentes**: Biblioteca de design acessível e componentes Shadcn UI.
*   **Backend & Storage**: Integração dinâmica com APIs e serviços de banco de dados e nuvem.
*   **Automações**: Orquestração assíncrona baseada em eventos conectada via webhooks.
