import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
Deno.serve(async (req) => {
  // Trata a requisição OPTIONS para CORS para evitar bloqueios no navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nome, descricao } = await req.json();
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
      const errorData = await openRouterResponse.text();
      throw new Error(`Falha ao se comunicar com OpenRouter. Status: ${openRouterResponse.status}. ${errorData}`);
    }

    const data = await openRouterResponse.json();
    const textoRetornado = data.choices[0].message.content;
    const textoOtimizado = textoRetornado.trim();

    return new Response(
      JSON.stringify({ textoOtimizado }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
