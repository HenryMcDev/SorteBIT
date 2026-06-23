import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: máximo de 10 requisições por IP por minuto
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// @ts-ignore
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── 1. Verificação de JWT obrigatória ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado: token JWT ausente.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado: token JWT inválido ou expirado.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. Rate limiting por usuário (user.id) ─────────────────────────────────
  if (!checkRateLimit(user.id)) {
    return new Response(
      JSON.stringify({ error: 'Muitas requisições. Aguarde 1 minuto e tente novamente.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── 3. Processamento da requisição ─────────────────────────────────────────
  try {
    const body = await req.json();
    const nome = String(body?.nome ?? '').trim().slice(0, 200);
    const descricao = String(body?.descricao ?? '').trim().slice(0, 1000);

    if (!nome || !descricao) {
      return new Response(
        JSON.stringify({ error: 'Campos "nome" e "descricao" são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // @ts-ignore
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error("A chave da API do OpenRouter não está configurada no ambiente.");
    }

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5-8b",
        messages: [
          {
            role: "system",
            content: "Você é um assistente de redação inteligente para a plataforma SorteBIT. Seu objetivo é pegar o nome do prêmio e uma descrição simples ou incompleta escrita pelo usuário e transformá-la em uma descrição altamente atraente, profissional e engajadora para os alunos, usando no máximo duas frases curtas e mantendo o tom animado. Retorne estritamente o texto final otimizado, sem introduções, saudações, aspas ou comentários extras."
          },
          {
            role: "user",
            content: `Nome do prêmio: ${nome}\nDescrição atual: ${descricao}`
          }
        ]
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`Falha ao comunicar com OpenRouter. Status: ${openRouterResponse.status}`);
    }

    const data = await openRouterResponse.json();
    const textoOtimizado = data.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(
      JSON.stringify({ textoOtimizado }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar a requisição.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
