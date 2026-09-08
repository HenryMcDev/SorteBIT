import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmAuth } from '@/hooks/useAdmAuth';
import { Loader2 } from 'lucide-react';

interface AdminPrivateRouteProps {
  children: React.ReactNode;
}

const AdminPrivateRoute: React.FC<AdminPrivateRouteProps> = ({ children }) => {
  const { isAdmin, isLoading } = useAdmAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        <p className="text-zinc-400 text-sm font-medium animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default AdminPrivateRoute;
