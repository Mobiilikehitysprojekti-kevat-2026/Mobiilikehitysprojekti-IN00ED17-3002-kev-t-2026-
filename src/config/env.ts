import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Locale } from '../types/api';
import { initialLocale } from '../i18n';

const simulatorHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

function extractHostname(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^[a-z]+:\/\//i, '');
  return normalized.split(/[/:]/)[0] ?? null;
}

const expoHost =
  extractHostname(Constants.expoConfig?.hostUri) ??
  extractHostname(Constants.linkingUri);

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${expoHost ?? simulatorHost}:3000/api/v1`;

export const DEFAULT_LOCALE: Locale = initialLocale;