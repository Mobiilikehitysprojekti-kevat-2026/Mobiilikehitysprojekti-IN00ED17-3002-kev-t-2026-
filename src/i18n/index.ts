import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import type { Locale } from '../types/api';
import { resources } from './resources';

const supportedLocales: Locale[] = ['en', 'fi'];

function normalizeLocale(language?: string | null): string {
    return language?.toLowerCase().split(/[-_]/)[0] ?? 'en';
}

export function resolveSupportedLocale(language?: string | null): Locale {
    const normalized = normalizeLocale(language);
    return supportedLocales.includes(normalized as Locale) ? (normalized as Locale) : 'en';
}

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
const initialLocale = resolveSupportedLocale(deviceLanguage);

I18nManager.allowRTL(true);

if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
        compatibilityJSON: 'v4',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        lng: initialLocale,
        resources,
    });
}

export { initialLocale };
export default i18n;
