import type { AxiosError } from 'axios';

/** Extract user-friendly message from Axios error or fallback to default */
export function getErrorMessage(err: unknown, fallback = 'Xato yuz berdi'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axErr = err as AxiosError<{ message?: string }>;
    return axErr.response?.data?.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
