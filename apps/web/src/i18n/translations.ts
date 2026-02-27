import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';

export type Lang = 'uz' | 'ru' | 'en';

export const translations: Record<Lang, Record<string, string>> = { uz, ru, en };
