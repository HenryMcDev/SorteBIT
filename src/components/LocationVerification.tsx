
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LocationVerificationProps {
  isLoading: boolean;
  isWithinRange: boolean | null;
  error: string | null;
  hasPermission: boolean | null;
  onRetry: () => void;
}

const LocationVerification = ({
  isLoading,
  isWithinRange,
  error,
  hasPermission,
  onRetry
}: LocationVerificationProps) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="text-center space-y-4">
            <MapPin className="w-12 h-12 text-school-blue-600 dark:text-school-blue-400 mx-auto animate-pulse" />
            <h3 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-school-blue-300">
              Verificando localização...
            </h3>
            <p className="text-base md:text-lg text-school-blue-600 dark:text-school-blue-400">
              Por favor, permita o acesso à sua localização para continuar.
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-blue-600"></div>
            </div>
            <div className="mt-6">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="mx-auto h-16 md:h-20 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="mx-auto h-16 md:h-20 w-auto object-contain hidden dark:block"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || hasPermission === false) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto" />
            <h3 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-school-blue-300">
              Erro de localização
            </h3>
            <p className="text-base md:text-lg text-school-blue-600 dark:text-school-blue-400">
              {error}
            </p>
            <Button
              onClick={onRetry}
              className="mt-4 bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 dark:text-school-blue-200 rounded-xl font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            <div className="mt-6">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="mx-auto h-16 md:h-20 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="mx-auto h-16 md:h-20 w-auto object-contain hidden dark:block"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Outside range state
  if (isWithinRange === false) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="text-center space-y-4">
            <MapPin className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto" />
            <h3 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-school-blue-300">
              👉 Você precisa estar na escola para participar do sorteio.
            </h3>
            <p className="text-base md:text-lg text-school-blue-600 dark:text-school-blue-400">
              O sorteio só está disponível para alunos que estejam fisicamente na escola.
            </p>
            <div className="bg-school-blue-50 dark:bg-slate-800 p-4 rounded-xl border border-school-blue-200 dark:border-slate-700">
              <p className="text-sm text-school-blue-700 dark:text-school-blue-300 font-semibold">
                📍 Endereço da escola:
              </p>
              <p className="text-sm text-school-blue-600 dark:text-school-blue-400">
                Rua Luiz Colombo 115, CEP 38183-252
              </p>
            </div>
            <Button
              onClick={onRetry}
              className="mt-4 bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 dark:text-school-blue-200 rounded-xl font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar novamente
            </Button>
            <div className="mt-6">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="mx-auto h-16 md:h-20 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="mx-auto h-16 md:h-20 w-auto object-contain hidden dark:block"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Se chegou aqui, está dentro do raio permitido - não renderiza nada
  return null;
};

export default LocationVerification;
