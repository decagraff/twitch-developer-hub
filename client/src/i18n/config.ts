import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

// Get saved language from localStorage or default to Spanish
const savedLanguage = localStorage.getItem('language') || 'es';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: savedLanguage, // Default language (Spanish)
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
