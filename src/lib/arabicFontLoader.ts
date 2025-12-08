/**
 * Arabic Font Loader for jsPDF
 * Loads Amiri font from Google Fonts and converts to base64 for PDF embedding
 */

let cachedFontData: string | null = null;
let loadingPromise: Promise<string> | null = null;

export const loadArabicFont = async (): Promise<string> => {
  // Return cached font if available
  if (cachedFontData) {
    return cachedFontData;
  }

  // Return existing promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Fetch Amiri Regular font from Google Fonts (supports Arabic)
      const fontUrl = 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf';
      
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch Arabic font');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      cachedFontData = base64;
      return base64;
    } catch (error) {
      console.error('Failed to load Arabic font:', error);
      throw error;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

/**
 * Reverse Arabic text for proper RTL display in jsPDF
 * jsPDF doesn't handle RTL natively, so we need to reverse the characters
 */
export const prepareArabicText = (text: string): string => {
  if (!text) return '';
  
  // Check if text contains Arabic characters
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  
  if (!hasArabic) {
    return text;
  }
  
  // Reverse the text for RTL display
  // Note: This is a simple reversal - complex Arabic text shaping may need additional handling
  return text.split('').reverse().join('');
};
