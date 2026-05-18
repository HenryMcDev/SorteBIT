
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { User, Lock, GraduationCap, Key, LogOut } from 'lucide-react';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';
import TeacherCodeManager from './TeacherCodeManager';

const CLASS_OPTIONS = [
  { value: 'TM11', label: 'TM11 - Técnico em Meio Ambiente' },
  { value: 'TM12', label: 'TM12 - Técnico em Meio Ambiente' },
  { value: 'TM13', label: 'TM13 - Técnico em Meio Ambiente' },
  { value: 'TI25', label: 'TI25 - Técnico em Informática' },
  { value: 'TI26', label: 'TI26 - Técnico em Informática' },
  { value: 'TI27', label: 'TI27 - Técnico em Informática' },
  { value: 'TI28', label: 'TI28 - Técnico em Informática' },
  { value: 'TL16', label: 'TL16 - Técnico em Logística' },
  { value: 'TL17', label: 'TL17 - Técnico em Logística' },
  { value: 'TL18', label: 'TL18 - Técnico em Logística' },
  { value: 'TL19', label: 'TL19 - Técnico em Logística' },
  { value: 'TL20', label: 'TL20 - Técnico em Logística' },
  { value: 'TL21', label: 'TL21 - Técnico em Logística' },
  { value: 'TS', label: 'TS - Técnico em Segurança' }
];

const TeacherPortal = () => {
  const { teacher, isLoading, login, logout } = useTeacherAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !password.trim()) {
      return;
    }

    const success = await login(name, password);

    if (success) {
      setName('');
      setPassword('');
    }
  };

  // If teacher is logged in, show the dashboard
  if (teacher) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="space-y-6">
            {/* Header with teacher info and logout */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-school-blue-300">
                  Painel do Professor
                </h2>
                <p className="text-school-blue-600 dark:text-school-blue-400">
                  Bem-vindo, {teacher.name}
                </p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                className="border-school-blue-600 text-school-blue-600 dark:text-school-blue-400 hover:bg-school-blue-50 dark:bg-slate-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Deslogar
              </Button>
            </div>

            {/* Teacher Code Manager Component */}
            <TeacherCodeManager teacher={teacher} classOptions={CLASS_OPTIONS} />

            {/* Logo da escola */}
            <div className="text-center pt-4">
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

  // Login form only (removed registration option)
  return (
    <div className="max-w-lg mx-auto px-4">
      <Card className="p-6 md:p-8 shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <GraduationCap className="w-12 h-12 text-school-blue-600 dark:text-school-blue-400 mx-auto" />
            <h2 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-school-blue-300">
              Login do Professor
            </h2>
            <p className="text-school-blue-600 dark:text-school-blue-400">
              Acesse o painel de gerenciamento
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-school-blue-700 dark:text-school-blue-300 font-semibold flex items-center text-sm md:text-base">
                <User className="w-4 h-4 mr-2" />
                Usuário
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Digite seu usuário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-school-blue-700 dark:text-school-blue-300 font-semibold flex items-center text-sm md:text-base">
                <Lock className="w-4 h-4 mr-2" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl"
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || !name.trim() || !password.trim()}
              className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 dark:text-school-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Entrar
                </div>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Apenas professores autorizados podem acessar o sistema.
              </p>
            </div>
          </div>

          {/* Logo da escola */}
          <div className="text-center pt-4">
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
};

export default TeacherPortal;
