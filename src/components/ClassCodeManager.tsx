
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save } from 'lucide-react';

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

const ClassCodeManager = () => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveCode = async () => {
    if (!selectedClass || !code.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione uma turma e digite o código.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Verificar se já existe código para esta turma hoje
      const { data: existingCode, error: checkError } = await supabase
        .from('class_codes')
        .select('id')
        .eq('class_name', selectedClass)
        .eq('date', today)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar código existente:', checkError);
        throw checkError;
      }

      if (existingCode) {
        // Atualizar código existente
        const { error: updateError } = await supabase
          .from('class_codes')
          .update({ 
            code: code.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCode.id);

        if (updateError) {
          console.error('Erro ao atualizar código:', updateError);
          throw updateError;
        }
      } else {
        // Inserir novo código
        const { error: insertError } = await supabase
          .from('class_codes')
          .insert({
            class_name: selectedClass,
            code: code.trim(),
            date: today
          });

        if (insertError) {
          console.error('Erro ao inserir código:', insertError);
          throw insertError;
        }
      }

      toast({
        title: "✅ Código atualizado com sucesso!",
        description: `Código para ${selectedClass} foi salvo para hoje.`,
        variant: "default"
      });

      setCode('');
    } catch (error) {
      console.error('Erro ao salvar código:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 mb-6 bg-school-blue-50 border-2 border-school-blue-200">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-school-blue-700" />
          <h3 className="text-lg font-bold text-school-blue-700">
            Gerenciar Códigos das Turmas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-school-blue-700 font-semibold">
              Selecionar Turma
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="border-2 border-gray-200 focus:border-school-blue-500">
                <SelectValue placeholder="Escolha uma turma" />
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

          <div className="space-y-2">
            <Label className="text-school-blue-700 font-semibold">
              Código Diário
            </Label>
            <Input
              type="text"
              placeholder="Ex: TM13#A9X4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border-2 border-gray-200 focus:border-school-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          onClick={handleSaveCode}
          disabled={isLoading || !selectedClass || !code.trim()}
          className="w-full bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 font-semibold"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-school-blue-800 mr-2"></div>
              Salvando...
            </div>
          ) : (
            <div className="flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Salvar Código
            </div>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default ClassCodeManager;
