import type { AxiosError } from 'axios';

interface ApiErrorData {
  message?: string;
  code?: string;
}

/**
 * Extract user-friendly message from Axios error.
 * If the API returns a structured `code`, try i18n translation first.
 * @param err - caught error (unknown)
 * @param fallback - default message
 * @param t - optional i18n translate function from useI18n()
 */
export function getErrorMessage(
  err: unknown,
  fallback = 'Xato yuz berdi',
  t?: (key: string) => string,
): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axErr = err as AxiosError<ApiErrorData>;
    const data = axErr.response?.data;

    // Try i18n translation of error code
    if (data?.code && t) {
      const translated = t(`error.${data.code}`);
      // t() returns the key itself if no translation found
      if (translated !== `error.${data.code}`) return translated;
    }

    return data?.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
