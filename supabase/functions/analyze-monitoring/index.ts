import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY missing');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'Missing request_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: r, error } = await admin
      .from('monitoring_requests').select('*')
      .eq('id', request_id).eq('parent_id', user.id).maybeSingle();
    if (error || !r) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (r.request_type !== 'photo' || !r.result_path) {
      return new Response(JSON.stringify({ error: 'Only photos can be analyzed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signed } = await admin.storage
      .from('monitoring').createSignedUrl(r.result_path, 60 * 10);
    if (!signed?.signedUrl) throw new Error('Cannot sign URL');

    const prompt = `Ты ассистент родителя. Кратко опиши, что видно на фото с устройства ребёнка (комната, улица, люди, занятие). 
Оцени уровень безопасности окружения по шкале 1-5 (5 = полностью безопасно). 
Отметь любые тревожные признаки (опасные объекты, незнакомцы, плохое освещение, ребёнок один на улице и т.п.) или укажи, что всё в порядке.
Отвечай только валидным JSON без markdown:
{
  "scene": "краткое описание сцены (1-2 предложения)",
  "safety_score": число 1-5,
  "concerns": ["проблема 1", "проблема 2"],
  "summary": "итоговый вывод для родителя (1 предложение)"
}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Отвечай только валидным JSON.' },
          { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: signed.signedUrl } },
          ]},
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Слишком много запросов. Попробуйте позже.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Требуется пополнение баланса.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const txt = await aiRes.text();
      console.error('AI gateway', aiRes.status, txt);
      throw new Error('AI gateway error');
    }

    const ai = await aiRes.json();
    const content = ai.choices?.[0]?.message?.content || '';
    let parsed: any;
    try {
      parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      parsed = { scene: content, safety_score: null, concerns: [], summary: content };
    }

    await admin.from('monitoring_requests').update({
      result_data: { ...(r.result_data || {}), ai_analysis: parsed, ai_analyzed_at: new Date().toISOString() },
    }).eq('id', request_id);

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('analyze-monitoring error', e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
