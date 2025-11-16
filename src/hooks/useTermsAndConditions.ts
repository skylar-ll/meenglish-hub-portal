import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export const useTermsAndConditions = () => {
  const [terms, setTerms] = useState<{ en: string; ar: string }>({ en: "", ar: "" });
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("terms_and_conditions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTerms({
          en: data.content_en || "",
          ar: data.content_ar || "",
        });
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    } finally {
      setLoading(false);
    }
  };

  // Return the terms in the current language
  const currentTerms = language === "ar" ? terms.ar : terms.en;

  return { terms: currentTerms, allTerms: terms, loading };
};
