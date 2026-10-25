import { useSettings, type Language, type LanguageSetting } from '@/store/settings';

import { en, type Messages } from './en';
import { pl } from './pl';

export type { Messages };

export const LANGUAGES: readonly { id: Language; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'pl', name: 'Polski' },
];

const MESSAGES: Record<Language, Messages> = { en, pl };

/** The phone's language if the app has it, else English. */
export function deviceLanguage(): Language {
  let locale = '';
  try {
    locale =
      (typeof navigator !== 'undefined' && navigator.language) ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      '';
  } catch {
    // Some engines have no Intl; English is fine then.
  }
  return locale.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

export function resolveLanguage(setting: LanguageSetting): Language {
  return setting === 'system' ? deviceLanguage() : setting;
}

export function messagesFor(language: Language): Messages {
  return MESSAGES[language];
}

/** Texts in the language picked in Settings. Re-renders when it changes. */
export function useMessages(): Messages {
  const setting = useSettings((state) => state.language);
  return MESSAGES[resolveLanguage(setting)];
}

export function useLanguage(): Language {
  return resolveLanguage(useSettings((state) => state.language));
}

export type ErrorKind = keyof Messages['errors'];

/** An error that the UI shows in the player's language. `message` stays in English for logs. */
export class AppError extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly arg = '',
  ) {
    super(errorText(en, kind, arg));
  }
}

export function errorText(m: Messages, kind: ErrorKind, arg = ''): string {
  const text = m.errors[kind];
  return typeof text === 'function' ? text(arg) : text;
}

/** Text for any thrown error: AppError in the player's language, anything else as the generic message. */
export function describeError(m: Messages, error: unknown, fallback: ErrorKind = 'generic'): string {
  return error instanceof AppError ? errorText(m, error.kind, error.arg) : errorText(m, fallback);
}
