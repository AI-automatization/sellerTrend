import { browserPool } from '../browser-pool';
import { logJobInfo, logJobError } from '../logger';

const LOG_CTX = 'TokenManager';
const TOKEN_TTL_MS = 5 * 60 * 60 * 1000; // 5 soat

class TokenManager {
  private static instance: TokenManager;
  private token: string | null = null;
  private expiresAt: number = 0;
  private refreshing: Promise<string | null> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /** Cached token qaytaradi. Muddati o'tgan bo'lsa yangilaydi. */
  async getToken(): Promise<string | null> {
    if (this.token && Date.now() < this.expiresAt) {
      return this.token;
    }
    return this.refreshToken();
  }

  /** Chromium orqali uzum.uz ga kirib yangi JWT token oladi. */
  async refreshToken(): Promise<string | null> {
    // Concurrent refresh larni birlashtiramiz
    if (this.refreshing) {
      return this.refreshing;
    }

    this.refreshing = this._doRefresh();
    try {
      return await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  private async _doRefresh(): Promise<string | null> {
    logJobInfo(LOG_CTX, '-', 'refresh', 'Uzum.uz dan yangi token olinmoqda...');
    const browser = await browserPool.getBrowser();
    const context = await browser.newContext({
      locale: 'ru-RU',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    try {
      const page = await context.newPage();
      await page.goto('https://uzum.uz', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // Auth so'rovi uchun kutish
      await page.waitForTimeout(3000);

      const cookies = await context.cookies('https://uzum.uz');
      const tokenCookie = cookies.find((c) => c.name === 'access_token');

      if (!tokenCookie?.value) {
        logJobError(LOG_CTX, '-', 'refresh', new Error('access_token cookie topilmadi'));
        return null;
      }

      this.token = tokenCookie.value;
      this.expiresAt = Date.now() + TOKEN_TTL_MS;
      logJobInfo(LOG_CTX, '-', 'refresh', 'Token muvaffaqiyatli olindi (5 soat keshda)');
      return this.token;
    } catch (err) {
      logJobError(LOG_CTX, '-', 'refresh', err);
      return null;
    } finally {
      await context.close();
      await browserPool.release();
    }
  }

  /** Token ni majburiy tozalash (test uchun) */
  clearToken(): void {
    this.token = null;
    this.expiresAt = 0;
  }
}

export const tokenManager = TokenManager.getInstance();
