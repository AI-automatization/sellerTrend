import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';

const CACHE_TTL_SECONDS = 86400; // 24 hours

export interface MlPredictPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

interface MlPredictResponse {
  predictions: MlPredictPoint[];
  model: string;       // ML service 'model' deb qaytaradi, 'model_name' emas
  mae: number | null;
  mape?: number | null;
}

interface MlRiskResponse {
  risk_score: number;
  risk_level: string;
}

export interface PredictionResult {
  predictions: MlPredictPoint[] | null;
  model_name: string;
  mae: number | null;
  horizon: number;
}

export interface RiskResult {
  risk_score: number;
  risk_level: string;
}

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private get mlServiceUrl(): string {
    return this.config.get<string>('ML_SERVICE_URL', 'http://ml-service:8000');
  }

  private async verifyOwnership(productId: bigint, accountId: string): Promise<void> {
    const tracked = await this.prisma.trackedProduct.findFirst({
      where: { product_id: productId, account_id: accountId },
    });
    if (!tracked) {
      throw new NotFoundException('Product not found or not tracked by this account');
    }
  }

  async getProductPrediction(
    productId: bigint,
    horizon: number,
    accountId: string,
  ): Promise<PredictionResult> {
    await this.verifyOwnership(productId, accountId);

    const cacheKey = `ml_pred:${productId.toString()}:${horizon}`;

    // Cache hit check
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached) as PredictionResult;
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Redis read error for ${cacheKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fetch last 90 days of snapshots
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const snapshots = await this.prisma.productSnapshot.findMany({
      where: {
        product_id: productId,
        snapshot_at: { gte: since },
      },
      orderBy: { snapshot_at: 'asc' },
      select: {
        snapshot_at: true,
        weekly_bought: true,
        score: true,
        orders_quantity: true,
      },
    });

    // Call ML service
    const errorFallback: PredictionResult = {
      predictions: null,
      model_name: 'error',
      mae: null,
      horizon,
    };

    let result: PredictionResult;

    try {
      const response = await fetch(`${this.mlServiceUrl}/predict/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId.toString(),
          horizon,
          snapshots: snapshots.map((s) => ({
            snapshot_at: s.snapshot_at.toISOString(),
            weekly_bought: s.weekly_bought,
            score: s.score !== null ? Number(s.score) : null,
            orders_quantity:
              s.orders_quantity !== null ? s.orders_quantity.toString() : null,
          })),
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `ML service responded with ${response.status} for product ${productId.toString()}`,
        );
        return errorFallback;
      }

      const mlData = (await response.json()) as MlPredictResponse;

      result = {
        predictions: mlData.predictions,
        model_name: mlData.model ?? 'unknown',
        mae: mlData.mae,
        horizon,
      };
    } catch (err: unknown) {
      this.logger.warn(
        `ML service call failed for product ${productId.toString()}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return errorFallback;
    }

    // Persist to MlPrediction table
    try {
      await this.prisma.mlPrediction.create({
        data: {
          product_id: productId,
          model_name: result.model_name,
          metric: 'weekly_bought',
          horizon_days: horizon,
          predictions: (result.predictions ?? []) as unknown as Parameters<typeof this.prisma.mlPrediction.create>[0]['data']['predictions'],
          mae: result.mae ?? undefined,
        },
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to save MlPrediction for product ${productId.toString()}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Cache result
    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    } catch (err: unknown) {
      this.logger.warn(
        `Redis write error for ${cacheKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return result;
  }

  async getRiskScore(
    productId: bigint,
    accountId: string,
  ): Promise<RiskResult | null> {
    await this.verifyOwnership(productId, accountId);

    const cacheKey = `ml_risk:${productId.toString()}`;

    // Cache hit check
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached) as RiskResult;
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Redis read error for ${cacheKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Call ML service
    try {
      const response = await fetch(`${this.mlServiceUrl}/predict/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId.toString() }),
      });

      if (!response.ok) {
        this.logger.warn(
          `ML risk service responded with ${response.status} for product ${productId.toString()}`,
        );
        return null;
      }

      const riskData = (await response.json()) as MlRiskResponse;
      const result: RiskResult = {
        risk_score: riskData.risk_score,
        risk_level: riskData.risk_level,
      };

      // Cache result
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
      } catch (cacheErr: unknown) {
        this.logger.warn(
          `Redis write error for ${cacheKey}: ${cacheErr instanceof Error ? cacheErr.message : String(cacheErr)}`,
        );
      }

      return result;
    } catch (err: unknown) {
      this.logger.warn(
        `ML risk service call failed for product ${productId.toString()}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
