import { SUPPORTED_LANGUAGES, TRANSLATIONS, type Language } from './translations';

const FALLBACK_LANGUAGE: Language = 'en';

export function detectLanguage(locale: string | undefined): Language {
  if (!locale) {
    return FALLBACK_LANGUAGE;
  }

  const normalized = locale.toLowerCase();
  if (normalized.startsWith('pt')) {
    return 'pt-BR';
  }

  if (normalized.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

export function t(language: Language, key: string): string {
  return TRANSLATIONS[language][key] ?? TRANSLATIONS[FALLBACK_LANGUAGE][key] ?? key;
}

export type { Language };
