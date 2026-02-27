import { toast } from 'react-toastify';
import { getErrorMessage } from './getErrorMessage';

/** Log error silently — dev console only. Use for background data fetching in useEffect. */
export function logError(err: unknown): void {
  if (import.meta.env.DEV) {
    console.error('[API]', err);
  }
}

/** Show error toast. Use for user-triggered actions (button clicks, form submits). */
export function toastError(err: unknown, fallback?: string): void {
  toast.error(getErrorMessage(err, fallback));
}
