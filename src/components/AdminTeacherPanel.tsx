
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

const AdminTeacherPanel = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [className, setClassName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Simple hash function for password (in production, use proper bcrypt)
  const hashPassword = (password: string): string => {
    return btoa(password); // Basic base64 encoding - replace with proper hashing in production
  };

  // Fetch teachers list
  const { data: teachers = [], refetch } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleRegisterTeacher = async () => {
    if (!name.trim() || !username.trim() || !password.trim() || !className) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if teacher already exists
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', username.trim())
        .maybeSingle();

      if (existingTeacher) {
        toast({
          title: "Erro",
          description: "Já existe um professor com este usuário.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('teachers')
        .insert({
          name: username.trim(), // Using username as the login name
          password_hash: hashPassword(password)
        });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao cadastrar professor.",
          variant: "destructive"
        });
        return;
      }

      // Clear form
      setName('');
      setUsername('');
      setPassword('');
      setClassName('');

      // Refresh teachers list
      refetch();

      toast({
        title: "Sucesso",
        description: `Professor ${name} cadastrado com sucesso!`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error registering teacher:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao cadastrar professor.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o professor ${teacherName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacherId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir professor.",
          variant: "destructive"
        });
        return;
      }

      refetch();
      toast({
        title: "Sucesso",
        description: "Professor excluído com sucesso!",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir professor.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-6 md:p-8 shadow-xl border-0 bg-white dark:bg-slate-900 rounded-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Users className="w-12 h-12 text-school-blue-600 dark:text-school-blue-400 mx-auto" />
          <h2 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-school-blue-300">
            Gerenciar Professores
          </h2>
          <p className="text-school-blue-600 dark:text-school-blue-400">
            Cadastre professores autorizados para acessar o sistema
          </p>
        </div>

        {/* Registration Form */}
        <div className="space-y-4 border-b border-gray-200 dark:border-slate-700 pb-6">
          <h3 className="text-lg font-semibold text-school-blue-700 dark:text-school-blue-300">
            Cadastrar Novo Professor
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-school-blue-700 dark:text-school-blue-300 font-semibold">
                Nome completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Nome completo do professor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 border-2 border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-school-blue-700 dark:text-school-blue-300 font-semibold">
                Usuário (login)
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Nome de usuário para login"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 border-2 border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-school-blue-700 dark:text-school-blue-300 font-semibold">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha do professor"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-2 border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class" className="text-school-blue-700 dark:text-school-blue-300 font-semibold">
                Turma principal
              </Label>
              <Select value={className} onValueChange={setClassName} disabled={isLoading}>
                <SelectTrigger className="h-12 border-2 border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleRegisterTeacher}
            disabled={isLoading || !name.trim() || !username.trim() || !password.trim() || !className}
            className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 dark:text-school-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                Cadastrando...
              </div>
            ) : (
              <div className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Cadastrar Professor
              </div>
            )}
          </Button>
        </div>

        {/* Teachers List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-school-blue-700 dark:text-school-blue-300">
            Professores Cadastrados ({teachers.length})
          </h3>

          {teachers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum professor cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-school-blue-700 dark:text-school-blue-300">{teacher.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Cadastrado em: {new Date(teacher.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AdminTeacherPanel;
