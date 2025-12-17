import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface TranslatedTextProps {
  text: string;
  className?: string;
  showLoading?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export const TranslatedText = ({ 
  text, 
  className = '', 
  showLoading = false,
  as: Component = 'span' 
}: TranslatedTextProps) => {
  const { language, translateText } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (language === 'en') {
      setTranslatedText(text);
      return;
    }

    const translate = async () => {
      setLoading(true);
      try {
        const result = await translateText(text);
        setTranslatedText(result);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedText(text);
      } finally {
        setLoading(false);
      }
    };

    translate();
  }, [text, language, translateText]);

  if (loading && showLoading) {
    return (
      <Component className={className}>
        <Loader2 className="h-4 w-4 animate-spin inline-block" />
      </Component>
    );
  }

  return <Component className={className}>{translatedText}</Component>;
};

// Hook for translating text with state management
export const useTranslation = (initialText: string) => {
  const { language, translateText } = useLanguage();
  const [translatedText, setTranslatedText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (language === 'en') {
      setTranslatedText(initialText);
      return;
    }

    const translate = async () => {
      setIsLoading(true);
      try {
        const result = await translateText(initialText);
        setTranslatedText(result);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedText(initialText);
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [initialText, language, translateText]);

  return { translatedText, isLoading };
};

// Hook for translating arrays of text
export const useBatchTranslation = (texts: string[]) => {
  const { language, translateBatch } = useLanguage();
  const [translatedTexts, setTranslatedTexts] = useState<string[]>(texts);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (language === 'en' || texts.length === 0) {
      setTranslatedTexts(texts);
      return;
    }

    const translate = async () => {
      setIsLoading(true);
      try {
        const results = await translateBatch(texts);
        setTranslatedTexts(results);
      } catch (error) {
        console.error('Batch translation error:', error);
        setTranslatedTexts(texts);
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [texts.join('|'), language, translateBatch]);

  return { translatedTexts, isLoading };
};

export default TranslatedText;
