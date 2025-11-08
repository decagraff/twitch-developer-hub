import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">{t('language.switchLanguage')}:</span>
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => changeLanguage('es')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            i18n.language === 'es'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('language.spanish')}
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            i18n.language === 'en'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('language.english')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;
