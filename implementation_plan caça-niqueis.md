# Planejamento: Página de Jackpot e Middleware de Segurança no SorteBIT

Este plano descreve o design e as modificações necessárias para criar a página de sorteio de Jackpot no SorteBIT, integrando-a ao Painel Master, implementando um destaque visual de alta prioridade na navegação e garantindo a segurança de ponta a ponta com proteção de rotas no frontend e um middleware estrito de token no backend.

---

## User Review Required

> [!IMPORTANT]
> A rota dedicada do sorteio será `/admin/jackpot`. Para acessá-la, o administrador precisará de uma sessão válida. Caso contrário, será redirecionado para a página de login em `/admin`.
> No backend, protegeremos a rota da tabela `lottery_participations` através de uma Supabase Edge Function chamada `lottery-participations` que realiza a decodificação do JWT e verificação direta do privilégio de `admin` contra o banco com `SUPABASE_SERVICE_ROLE_KEY`.

---

## Proposed Changes

### 1. Backend: Middleware de Token Estrito

#### [NEW] [index.ts](file:///c:/Users/henry/Documents/Projects%20BIT/SorteBIT%20Backup/SorteBIT%20v2.2.0/supabase/functions/lottery-participations/index.ts)
Criaremos uma Supabase Edge Function em TypeScript para atuar como o middleware de token e API restrita para `lottery_participations`:
- Verifica a presença do cabeçalho `Authorization`.
- Invoca `supabase.auth.getUser(token)` para validar o JWT.
- Consulta a tabela `admin_user` para confirmar se o usuário autenticado possui a role `admin`.
- Retorna `401 Unauthorized` se qualquer validação falhar.
- Caso seja um `GET` válido, retorna todos os registros de `lottery_participations`.

---

### 2. Frontend: Proteção de Rotas e Barra de Navegação

#### [NEW] [AdminPrivateRoute.tsx](file:///c:/Users/henry/Documents/Projects%20BIT/SorteBIT%20Backup/SorteBIT%20v2.2.0/src/components/AdminPrivateRoute.tsx)
Criaremos um componente de rota privada em React (`AdminPrivateRoute`) que:
- Utiliza o hook `useAdmAuth` para verificar se `isAdmin` é verdadeiro.
- Exibe uma tela de carregamento durante a validação.
- Redireciona imediatamente usuários anônimos para a rota `/admin` (que renderiza a tela de login).

#### [MODIFY] [App.tsx](file:///c:/Users/henry/Documents/Projects%20BIT/SorteBIT%20Backup/SorteBIT%20v2.2.0/src/App.tsx)
- Importa a nova página `AdminJackpot` e o componente `AdminPrivateRoute`.
- Registra a rota `/admin/jackpot` embrulhada no `AdminPrivateRoute`.

#### [MODIFY] [Admin.tsx](file:///c:/Users/henry/Documents/Projects%20BIT/SorteBIT%20Backup/SorteBIT%20v2.2.0/src/pages/Admin.tsx)
- No menu de abas principal (onde estão Participantes, Códigos, etc.), adicionaremos o novo link para a página de Jackpot.
- Este link será estilizado com classes do Tailwind CSS para destacar-se completamente dos botões padrão:
  - Borda amarela brilhante (`border-2 border-yellow-400 dark:border-school-yellow`).
  - Cor de fundo em gradiente chamativo (`bg-gradient-to-r from-yellow-500 to-amber-600 dark:from-yellow-400 dark:to-yellow-600 text-zinc-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)]`).
  - Efeito pulsante sutil (`animate-pulse-subtle` ou `animate-pulse` leve).
  - Distinção clara em relação aos botões padrão.

---

### 3. Frontend: Página de Jackpot

#### [NEW] [AdminJackpot.tsx](file:///c:/Users/henry/Documents/Projects%20BIT/SorteBIT%20Backup/SorteBIT%20v2.2.0/src/pages/AdminJackpot.tsx)
Criaremos a página `/admin/jackpot` no design escuro do painel administrativo (`bg-zinc-950`):
- **Barra Superior**: Botão de voltar para o Painel Master (`/admin`), Título SorteBIT Jackpot e informações do admin logado.
- **Componente Slot Machine**:
  - Layout centralizado no formato de máquina de slots clássica de cassino em design escuro e dourado/neon.
  - Alavanca lateral 3D/CSS animada que rotaciona para baixo ao puxar/clicar e retorna com efeito de mola.
  - Cinco slots numéricos independentes. Cada slot possui seu próprio estado de rotação isolado para ótima performance de renderização.
  - Os slots exibem os dígitos do Número da Sorte vencedor de forma sequencial (ex.: Slot 1 para após 2s, Slot 2 após 2.5s, ..., até o Slot 5 após 4s) criando suspense.
- **Painel de Controle e Histórico**:
  - Exibição da quantidade total de participantes elegíveis.
  - Lista de últimos ganhadores do sorteio salvos em cache/estado local.
  - Botão "Sortear!" destacado.
- **Fluxo de Sorteio**:
  1. O admin puxa a alavanca ou clica em "Sortear".
  2. A página faz uma chamada segura ao Edge Function `lottery-participations` para obter a lista de participantes autenticada.
  3. Sorteia aleatoriamente um participante da lista.
  4. Extrai o `lucky_number` (número da sorte) do vencedor e formata-o com preenchimento para 5 dígitos (ex.: `String(luckyNumber).padStart(5, '0')`).
  5. Inicia as animações isoladas de rotação dos 5 slots.
  6. Para cada slot individualmente exibindo os números do sorteado.
  7. Dispara uma animação de comemoração (com o componente `Celebration` ou confetes nativos) e exibe um modal ou banner com o vencedor (Nome, Telefone, Código, Número da Sorte).

---

## Verification Plan

### Automated/Manual Verification
1. **Verificação de Rota Anônima**: Tentar acessar diretamente `http://localhost:5173/admin/jackpot` sem login. Deve redirecionar instantaneamente para `http://localhost:5173/admin`.
2. **Verificação do Link da Navbar**: Acessar o Painel Master após o login e verificar se o link do Jackpot está presente com o gradiente chamativo, borda amarela e animação pulsante.
3. **Verificação do Middleware Backend**:
   - Tentar fazer uma requisição GET HTTP direta para `https://tawhebqohhpqtvijcdvj.supabase.co/functions/v1/lottery-participations` sem cabeçalhos de autorização ou com um token inválido. O servidor deve responder com `401 Unauthorized` e JSON de erro.
   - Testar o carregamento da lista de participantes dentro da página de Jackpot. O console de rede do navegador deve mostrar uma requisição GET bem-sucedida (status `200 OK`) enviando o JWT válido do administrador logado.
4. **Desempenho e Efeitos Visuais**:
   - Puxar a alavanca e garantir que os slots numéricos girem de forma isolada, fluida e parem um a um.
   - Verificar se não há travamentos na tela durante a rotação (ótima performance).
   - Validar a abertura do banner de celebração do ganhador após os slots pararem.
