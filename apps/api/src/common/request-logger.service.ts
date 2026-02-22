import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'logs', 'requests.log');

function ensureLogDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

@Injectable()
export class RequestLoggerService {
  private readonly stream: fs.WriteStream;

  constructor() {
    ensureLogDir();
    this.stream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf8' });
  }

  /**
   * Log a URL analyze request.
   * Format: TIMESTAMP | ANALYZE | account:ID | url
   */
  logAnalyze(accountId: string, url: string) {
    const line = `${new Date().toISOString()} | ANALYZE   | account:${accountId} | ${url}\n`;
    this.stream.write(line);
  }

  /**
   * Log a category discovery request.
   * Format: TIMESTAMP | DISCOVERY | account:ID | categoryId:N | rawInput
   */
  logDiscovery(accountId: string, categoryId: number, rawInput: string) {
    const line =
      `${new Date().toISOString()} | DISCOVERY | account:${accountId}` +
      ` | categoryId:${categoryId} | ${rawInput}\n`;
    this.stream.write(line);
  }
}
