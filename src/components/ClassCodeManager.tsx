import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, RefreshCw, Trash2 } from 'lucide-react';

interface StudentCodeRow {
  id: string;
  code: string;
  student_name: string;
  class_name: string;
  teacher_name: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

const ClassCodeManager = () => {
  const [codes, setCodes] = useState<StudentCodeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('student_codes')
        .select('id, code, student_name, class_name, teacher_name, is_used, used_at, created_at')
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Erro ao carregar códigos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os códigos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este código?')) return;
    const { error } = await supabase.from('student_codes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir código.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Código excluído.' });
    loadCodes();
  };

  return (
    <Card className="p-6 mb-6 bg-school-blue-50 border-2 border-school-blue-200">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-school-blue-700" />
            <h3 className="text-lg font-bold text-school-blue-700">
              Códigos de Alunos (Hoje)
            </h3>
          </div>
          <Button
            onClick={loadCodes}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="border-school-blue-300 text-school-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {codes.length === 0 ? (
          <p className="text-center text-school-blue-600 py-6">
            Nenhum código gerado hoje.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {codes.map((c) => (
              <div
                key={c.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border-2 ${
                  c.is_used ? 'bg-gray-50 border-gray-200' : 'bg-white border-school-yellow-200'
                }`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-school-blue-700">{c.student_name}</p>
                  <p className="text-xs text-gray-600">
                    {c.class_name} • Prof. {c.teacher_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    c.is_used ? 'bg-gray-200 text-gray-600' : 'bg-school-yellow-100 text-school-blue-700'
                  }`}>
                    {c.code}
                  </span>
                  <span className={`text-xs ${c.is_used ? 'text-gray-500' : 'text-green-600'}`}>
                    {c.is_used ? 'Usado' : 'Disponível'}
                  </span>
                  <Button
                    onClick={() => handleDelete(c.id)}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ClassCodeManager;
