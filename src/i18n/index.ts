import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enResources from '../locales/en.json';
import viResources from '../locales/vi.json';

type LocaleModule = { default: Record<string, unknown> };

const languageAliases: Record<string, string> = {
  'en-us': 'en',
  'vi-vn': 'vi',
  'id-id': 'id',
};

export const supportedLanguages = [
  'en',
  'ja',
  'es',
  'de',
  'fr',
  'pt-br',
  'ru',
  'ko',
  'it',
  'tr',
  'pl',
  'cs',
  'vi',
  'ar',
  'id',
];

const localeLoaders: Record<string, () => Promise<LocaleModule>> = {
  ja: () => import('../locales/ja.json'),
  es: () => import('../locales/es.json'),
  de: () => import('../locales/de.json'),
  fr: () => import('../locales/fr.json'),
  'pt-br': () => import('../locales/pt-br.json'),
  ru: () => import('../locales/ru.json'),
  ko: () => import('../locales/ko.json'),
  it: () => import('../locales/it.json'),
  tr: () => import('../locales/tr.json'),
  pl: () => import('../locales/pl.json'),
  cs: () => import('../locales/cs.json'),
  ar: () => import('../locales/ar.json'),
  id: () => import('../locales/id.json'),
};

const loadedLanguages = new Set<string>();
let initPromise: Promise<void> | null = null;
let i18nBootstrapped = false;

export function normalizeLanguage(lang: string): string {
  const normalized = lang.trim().replace(/_/g, '-').toLowerCase();
  if (!normalized || normalized === 'zh' || normalized.startsWith('zh-')) {
    // Migrate previously saved Chinese locales to Vietnamese.
    return 'vi';
  }
  return languageAliases[normalized] || normalized;
}

function resolveSupportedLanguage(lang: string): string {
  const normalized = normalizeLanguage(lang);
  return supportedLanguages.includes(normalized) ? normalized : 'vi';
}

async function ensureLanguageResources(lang: string): Promise<string> {
  const resolved = resolveSupportedLanguage(lang);
  if (loadedLanguages.has(resolved)) {
    return resolved;
  }

  const loader = localeLoaders[resolved];
  if (!loader) {
    loadedLanguages.add(resolved);
    return resolved;
  }
  const module = await loader();
  i18n.addResourceBundle(resolved, 'translation', module.default, true, true);
  loadedLanguages.add(resolved);
  return resolved;
}

function getSavedLanguage(): string {
  try {
    return resolveSupportedLanguage(localStorage.getItem('app-language') || 'vi');
  } catch {
    return 'vi';
  }
}

function getBootstrapLanguage(savedLanguage: string): string {
  return savedLanguage === 'en' ? 'en' : 'vi';
}

function bootstrapI18n(savedLanguage: string): string {
  if (i18nBootstrapped) {
    return getBootstrapLanguage(savedLanguage);
  }

  const bootstrapLanguage = getBootstrapLanguage(savedLanguage);
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: enResources },
        vi: { translation: viResources },
      },
      lng: bootstrapLanguage,
      fallbackLng: ['vi', 'en'],
      supportedLngs: supportedLanguages,
      lowerCaseLng: true,
      load: 'currentOnly',
      initImmediate: false,
      interpolation: {
        escapeValue: false, // React escapes interpolated content
      },
    });

  loadedLanguages.add('en');
  loadedLanguages.add('vi');
  i18nBootstrapped = true;
  return bootstrapLanguage;
}

export async function initI18n(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  const savedLanguage = getSavedLanguage();
  const bootstrapLanguage = bootstrapI18n(savedLanguage);

  initPromise = (async () => {
    if (savedLanguage !== bootstrapLanguage) {
      await ensureLanguageResources(savedLanguage);
    }
    if (i18n.language !== savedLanguage) {
      await i18n.changeLanguage(savedLanguage);
    }
  })();

  return initPromise;
}

export async function syncLanguage(lang: string): Promise<string> {
  await initI18n();
  const resolved = await ensureLanguageResources(lang);
  if (i18n.language !== resolved) {
    await i18n.changeLanguage(resolved);
  }
  try {
    localStorage.setItem('app-language', resolved);
  } catch {
    // ignore localStorage write failures
  }
  return resolved;
}

/** Change the display language. */
export async function changeLanguage(lang: string): Promise<void> {
  await syncLanguage(lang);
}

/** Return the active language. */
export function getCurrentLanguage(): string {
  return normalizeLanguage(i18n.language || 'vi');
}

export default i18n;
