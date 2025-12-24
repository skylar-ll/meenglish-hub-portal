import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage = 'ar' } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Please provide an array of texts to translate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Translation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetLang = targetLanguage === 'ar' ? 'Arabic' : 'English';
    const sourceLang = targetLanguage === 'ar' ? 'English' : 'Arabic';

    // Create numbered list for better parsing
    const textList = texts.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n');

    const systemPrompt = targetLanguage === 'ar' 
      ? `You are a professional translator specializing in English to Modern Standard Arabic translation.
         Translate the following texts to natural, commonly used Arabic (فصحى حديثة) that Arabs use today.
         For financial terms and dates, use standard Arabic equivalents:
         - "SAR" or "SR" → "ريال سعودي"
         - "Total Fee" → "الرسوم الإجمالية"
         - "Discount" → "الخصم"
         - "Amount Paid" → "المبلغ المدفوع"
         - "Amount Remaining" → "المبلغ المتبقي"
         - "Registration Date" → "تاريخ التسجيل"
         - "Course Start Date" → "تاريخ بدء الدورة"
         - "Payment Deadline" → "موعد السداد"
         - "Student Name" → "اسم الطالب"
         
         Rules:
         - Maintain the exact same numbering format
         - Keep any numbers, dates, and special characters as-is
         - Return ONLY the translations in the same numbered format, nothing else
         - Each translation should be on its own line with its number`
      : `You are a professional translator. Translate the following texts to ${targetLang}.
         Maintain the exact same numbering format.
         Return ONLY the translations in the same numbered format, nothing else.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate these texts to ${targetLang}:\n\n${textList}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Translation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content || '';

    // Parse the numbered translations
    const lines = translatedContent.split('\n').filter((line: string) => line.trim());
    const translations: string[] = [];
    
    for (const line of lines) {
      // Match pattern like "1. translated text" or "1- translated text"
      const match = line.match(/^\d+[\.\-\)]\s*(.+)$/);
      if (match) {
        translations.push(match[1].trim());
      }
    }

    // If parsing fails, try alternate method
    if (translations.length !== texts.length) {
      console.warn('Translation parsing mismatch, trying alternate method');
      const splitTranslations = translatedContent.split(/\d+[\.\-\)]\s*/).filter((t: string) => t.trim());
      if (splitTranslations.length === texts.length) {
        return new Response(
          JSON.stringify({ translations: splitTranslations.map((t: string) => t.trim()) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Successfully translated ${translations.length} texts`);

    return new Response(
      JSON.stringify({ translations: translations.length === texts.length ? translations : texts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Translation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
