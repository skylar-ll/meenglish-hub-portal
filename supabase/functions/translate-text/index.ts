import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage } = await req.json();
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide an array of texts to translate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const targetLang = targetLanguage === "ar" ? "Arabic" : "English";
    const sourceLang = targetLanguage === "ar" ? "English" : "Arabic";

    // Create numbered list for better parsing
    const textList = texts.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in education-related content. Translate the following texts from ${sourceLang} to ${targetLang}. 
            
Rules:
- Maintain the exact same numbering format
- Keep any special characters, numbers, or technical terms as-is
- Preserve any HTML tags or placeholders
- For Arabic: use Modern Standard Arabic appropriate for educational contexts
- Return ONLY the translations in the same numbered format, nothing else
- Each translation should be on its own line with its number`
          },
          {
            role: "user",
            content: `Translate these texts to ${targetLang}:\n\n${textList}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content || "";

    // Parse the numbered translations
    const lines = translatedContent.split("\n").filter((line: string) => line.trim());
    const translations: string[] = [];
    
    for (const line of lines) {
      // Match pattern like "1. translated text" or "1- translated text"
      const match = line.match(/^\d+[\.\-\)]\s*(.+)$/);
      if (match) {
        translations.push(match[1].trim());
      }
    }

    // If parsing fails, return the original texts
    if (translations.length !== texts.length) {
      console.warn("Translation parsing mismatch, returning processed content");
      // Try to extract translations by splitting
      const splitTranslations = translatedContent.split(/\d+[\.\-\)]\s*/).filter((t: string) => t.trim());
      if (splitTranslations.length === texts.length) {
        return new Response(
          JSON.stringify({ translations: splitTranslations.map((t: string) => t.trim()) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ translations: translations.length === texts.length ? translations : texts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Translation error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
