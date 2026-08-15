import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();
    const [language, setLangState] = useState(localStorage.getItem('app_language') ?? 'en');
    const isRTL = language === 'ar';

    const setLanguage = useCallback((lang: string) => {
        localStorage.setItem('app_language', lang);
        i18n.changeLanguage(lang);
        setLangState(lang);
    }, [i18n]);

    useEffect(() => {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
        if (isRTL) {
            document.documentElement.classList.add('rtl');
        } else {
            document.documentElement.classList.remove('rtl');
        }
    }, [isRTL, language]);

    const value = useMemo(() => ({ language, setLanguage, isRTL }), [language, setLanguage, isRTL]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
