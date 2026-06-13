import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { childId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch child's activity data
    const { data: activities, error: activityError } = await supabase
      .from("child_activity")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (activityError) {
      throw new Error(`Failed to fetch activities: ${activityError.message}`);
    }

    // Fetch child's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", childId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // Fetch user progress
    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", childId)
      .single();

    // Fetch recent monitoring requests (last 30)
    const { data: monitoring } = await supabase
      .from("monitoring_requests")
      .select("request_type, status, created_at, result_data")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(30);

    const monStats = (monitoring || []).reduce(
      (acc: Record<string, { total: number; ok: number; failed: number }>, m: any) => {
        const t = m.request_type;
        if (!acc[t]) acc[t] = { total: 0, ok: 0, failed: 0 };
        acc[t].total++;
        if (m.status === "fulfilled") acc[t].ok++;
        if (m.status === "failed") acc[t].failed++;
        return acc;
      },
      {}
    );

    const aiConcerns = (monitoring || [])
      .map((m: any) => m.result_data?.ai_analysis)
      .filter((a: any) => a && Array.isArray(a.concerns) && a.concerns.length > 0)
      .flatMap((a: any) => a.concerns)
      .slice(0, 10);

    // Prepare analysis prompt
    const activitySummary = activities?.reduce((acc: Record<string, { correct: number; wrong: number }>, act) => {
      const category = act.page_path?.split("/")[1] || "other";
      if (!acc[category]) {
        acc[category] = { correct: 0, wrong: 0 };
      }
      if (act.activity_type === "answer_correct") {
        acc[category].correct++;
      } else if (act.activity_type === "answer_wrong") {
        acc[category].wrong++;
      }
      return acc;
    }, {});

    const prompt = `Ты - педагогический ИИ-ассистент для детского образовательного приложения "Умный Лисенок".

Проанализируй данные о занятиях ребёнка ${profile?.first_name || "Ученик"} и дай рекомендации родителям.

Данные о прогрессе:
- Уровень: ${progress?.level || 1}
- Звёзд: ${progress?.stars || 0}
- Опыт: ${progress?.experience || 0}
- Ежедневная серия: ${progress?.daily_streak || 0} дней

Статистика по разделам (правильных/неправильных ответов):
${JSON.stringify(activitySummary, null, 2)}

Статистика родительских проверок (мониторинг):
${JSON.stringify(monStats, null, 2)}

${aiConcerns.length > 0 ? `Замечания ИИ по фото окружения ребёнка:\n${aiConcerns.map((c: string) => "- " + c).join("\n")}` : "Замечаний по фото нет."}

Последние активности:
${activities?.slice(0, 20).map(a => `- ${a.activity_type} на ${a.page_path}: ${JSON.stringify(a.details)}`).join("\n")}

Дай анализ в следующем формате JSON:
{
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "weaknesses": ["область для улучшения 1", "область для улучшения 2"],
  "recommendations": "Подробные рекомендации для родителей на русском языке (2-3 абзаца). Учти данные мониторинга и замечания ИИ по окружению, если они есть."
}

Отвечай ТОЛЬКО JSON без дополнительного текста.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Ты педагогический ИИ-ассистент. Отвечай только валидным JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Требуется пополнение баланса." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    let analysis;
    try {
      // Clean potential markdown code blocks
      const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
      analysis = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      analysis = {
        strengths: ["Активно занимается"],
        weaknesses: ["Требуется больше данных для анализа"],
        recommendations: "Продолжайте регулярные занятия для получения более точного анализа.",
      };
    }

    // Save analysis to database
    const { error: upsertError } = await supabase
      .from("child_analysis")
      .upsert({
        child_id: childId,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "child_id" });

    if (upsertError) {
      console.error("Failed to save analysis:", upsertError);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
