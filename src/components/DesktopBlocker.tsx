import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Smartphone, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const DesktopBlocker = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-school-blue-50 via-white to-school-yellow-50 dark:bg-zinc-950 dark:bg-none flex flex-col">
      {/* Botão Administrativo no topo */}
      <div className="w-full p-4 flex justify-end">
        <Link to="/admin">
          <Button
            variant="outline"
            className="border-school-blue-600 text-school-blue-600 dark:text-school-blue-400 dark:bg-slate-800"
          >
            <Lock className="w-4 h-4 mr-2" />
            Administrativo
          </Button>
        </Link>
      </div>

      {/* Mensagem principal de bloqueio */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="p-8 max-w-lg mx-auto shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl text-center">
          <div className="space-y-6">
            <Smartphone className="w-16 h-16 text-school-blue-600 dark:text-blue-400 mx-auto" />

            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-school-blue-700 dark:text-blue-400">
                ⚠️ Este site é exclusivo para dispositivos móveis
              </h2>

              <p className="text-lg text-school-blue-600 dark:text-blue-400 leading-relaxed">
                Acesse pelo <strong>celular</strong> para participar do sorteio.
              </p>

              <div className="bg-school-yellow-50 border-2 border-school-yellow-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl p-4 mt-6">
                <p className="text-school-blue-700 dark:text-blue-500 font-semibold">
                  📱 Escaneie o QR Code ou digite o endereço no seu celular
                </p>
                <img
                  src="/img/QRCode.png"
                  alt="QR Code para acessar o SorteBIT pelo celular"
                  className="mx-auto mt-4 w-44 h-44 object-contain rounded-xl shadow-md"
                />
              </div>
            </div>

            {/* Logo da escola */}
            <div className="pt-6">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="mx-auto h-16 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="mx-auto h-16 w-auto object-contain hidden dark:block"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DesktopBlocker;
