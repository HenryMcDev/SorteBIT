import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// @ts-ignore
Deno.serve(async (req) => {
  // Tratar requisição OPTIONS para CORS (preflight check de navegadores móveis/desktop)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Cabeçalho de autorização ausente.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Inicializa o cliente do Supabase usando a chave de administrador (Service Role)
    // para podermos verificar o usuário e realizar a busca segura
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas no servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      }
    });

    // Extrair o token do cabeçalho
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Token JWT inválido ou expirado.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Verificar na tabela admin_user se o usuário autenticado é de fato um admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_user' as any)
      .select('role')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();

    if (adminError || !adminData || (adminData as any).role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Sua conta não possui privilégios de administrador.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Se a requisição for GET, busca e retorna os participantes
    if (req.method === 'GET') {
      const { data: participations, error: queryError } = await supabaseAdmin
        .from('lottery_participations')
        .select('*')
        .order('participation_date', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return new Response(
        JSON.stringify({ success: true, data: participations }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não permitido.' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no servidor.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
