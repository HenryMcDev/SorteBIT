
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminRegister from "./pages/AdminRegister";
import NotFound from "./pages/NotFound";
import Vitrine from "./pages/Vitrine";
import AdminPrivateRoute from "./components/AdminPrivateRoute";
import AdminJackpot from "@/pages/AdminJackpot";
import CookieBanner from "./components/CookieBanner";

const queryClient = new QueryClient();

/** Verifica sessão salva no localStorage sem depender de estado React */
const isSessionValid = (): boolean => {
  try {
    const stored = localStorage.getItem('school_admin_session');
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { isAdmin?: boolean; expiresAt?: number };
    if (!parsed.isAdmin) return false;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem('school_admin_session');
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/registro" element={<AdminRegister />} />
          <Route path="/admin/jackpot" element={
            <AdminPrivateRoute>
              <AdminJackpot />
            </AdminPrivateRoute>
          } />
          <Route path="/vitrine" element={<Vitrine />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <CookieBanner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
