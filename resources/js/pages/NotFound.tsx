import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="text-center space-y-4">
                <h1 className="text-7xl font-bold text-gray-300 dark:text-gray-700">404</h1>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('page_not_found')}</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{t('page_not_found_sub')}</p>
                <div className="flex gap-3 justify-center pt-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        {t('go_back')}
                    </Button>
                    <Button onClick={() => navigate('/login')}>
                        {t('go_home')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
