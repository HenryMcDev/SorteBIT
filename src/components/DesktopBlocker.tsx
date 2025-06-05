
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Lock, User, Eye, EyeOff } from 'lucide-react';

interface DesktopBlockerProps {
  onAdminAccess: () => void;
}

const DesktopBlocker = ({ onAdminAccess }: DesktopBlockerProps) => {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simular um pequeno delay para parecer mais real
    setTimeout(() => {
      if (password === 'admin753951') {
        onAdminAccess();
      } else {
        setError('Usuário ou senha incorretos');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-blue-50 via-white to-school-yellow-50 flex flex-col">
      {/* Botão Administrativo no topo */}
      <div className="w-full p-4 flex justify-end">
        <Button
          onClick={() => setShowAdminForm(!showAdminForm)}
          variant="outline"
          className="border-school-blue-600 text-school-blue-600 hover:bg-school-blue-50"
        >
          <Lock className="w-4 h-4 mr-2" />
          Administrativo
        </Button>
      </div>

      {/* Formulário administrativo */}
      {showAdminForm && (
        <div className="w-full max-w-md mx-auto px-4 mb-8">
          <Card className="p-6 shadow-lg border-2 border-school-blue-200">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-school-blue-700">Acesso Administrativo</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-username" className="text-school-blue-700 font-semibold flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Usuário
                </Label>
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="Digite o usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-2 border-gray-200 focus:border-school-blue-500 rounded-lg"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-school-blue-700 font-semibold flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite a senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 border-gray-200 focus:border-school-blue-500 rounded-lg pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="w-full bg-school-blue-600 hover:bg-school-blue-700 text-white rounded-lg"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </div>
                ) : (
                  'Acessar'
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Mensagem principal de bloqueio */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="p-8 max-w-lg mx-auto shadow-xl border-0 bg-white rounded-2xl text-center">
          <div className="space-y-6">
            <Smartphone className="w-16 h-16 text-school-blue-600 mx-auto" />
            
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-school-blue-700">
                ⚠️ Este site é exclusivo para dispositivos móveis
              </h2>
              
              <p className="text-lg text-school-blue-600 leading-relaxed">
                Acesse pelo <strong>celular</strong> para participar do sorteio.
              </p>
              
              <div className="bg-school-yellow-50 border-2 border-school-yellow-200 rounded-xl p-4 mt-6">
                <p className="text-school-blue-700 font-semibold">
                  📱 Escaneie o QR Code ou digite o endereço no seu celular
                </p>
              </div>
            </div>

            {/* Logo da escola */}
            <div className="pt-6">
              <img 
                src="https://i.imgur.com/RONu0Cc.png" 
                alt="Logo da Escola" 
                className="mx-auto h-16 w-auto object-contain"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DesktopBlocker;
