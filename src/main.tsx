import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Global listener for runtime errors on mobile
window.addEventListener('error', (event) => {
  const { message, filename, lineno, colno } = event;
  const file = filename ? filename.split('/').pop() : 'desconhecido';
  alert(`Erro Fatal!\n\nMensagem: ${message}\nArquivo: ${file}\nLinha: ${lineno}:${colno}\n\nO aplicativo interceptou o erro para evitar uma tela branca.`);
  event.preventDefault(); // Prevents default crash behavior if possible
});

// Global listener for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  alert(`Erro Fatal de Promessa!\n\nMotivo: ${reason?.message || reason}\n\nO aplicativo interceptou o erro para evitar uma tela branca.`);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
