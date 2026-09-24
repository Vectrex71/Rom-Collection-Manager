import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from './locales/en.json';
import deTranslations from './locales/de.json';

export type Language = 'en' | 'de';

type Translations = typeof enTranslations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<Language, any> = {
  en: enTranslations,
  de: deTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // English is the default language as requested
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('rom_app_lang');
    if (saved === 'en' || saved === 'de') {
      return saved;
    }
    return 'en'; // Default to English
  });

  useEffect(() => {
    localStorage.setItem('rom_app_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (keyPath: string, variables?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    let current = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English if missing in German
        let fallback = translations['en'];
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return keyPath;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return keyPath;
    }

    let result = current;
    if (variables) {
      for (const [varKey, val] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${varKey}}}`, 'g'), String(val));
      }
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
