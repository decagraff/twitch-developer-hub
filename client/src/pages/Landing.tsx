import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import LanguageSelector from '../components/LanguageSelector';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-twitch-dark flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Logo />
        <LanguageSelector />
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {t('landing.title')}
            <span className="text-twitch-purple"> {t('landing.titleHighlight')}</span>
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            {t('landing.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-3"
            >
              {t('landing.getStarted')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-3"
            >
              {t('landing.signIn')}
            </Button>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-twitch-dark-light rounded-lg border border-twitch-gray-dark">
              <div className="text-twitch-purple text-4xl mb-4">🔑</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('landing.tokenManager')}
              </h3>
              <p className="text-gray-400">
                {t('landing.tokenManagerDesc')}
              </p>
            </div>

            <div className="p-6 bg-twitch-dark-light rounded-lg border border-twitch-gray-dark">
              <div className="text-twitch-purple text-4xl mb-4">🪝</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('landing.webhookManager')}
              </h3>
              <p className="text-gray-400">
                {t('landing.webhookManagerDesc')}
              </p>
            </div>

            <div className="p-6 bg-twitch-dark-light rounded-lg border border-twitch-gray-dark">
              <div className="text-twitch-purple text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('landing.secureStorage')}
              </h3>
              <p className="text-gray-400">
                {t('landing.secureStorageDesc')}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>{t('landing.footer')}</p>
      </footer>
    </div>
  );
};
