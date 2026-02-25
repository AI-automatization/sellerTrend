# CLAUDE_BACKEND.md — Backend Engineer Guide
# NestJS · Prisma · BullMQ · PostgreSQL · Redis · Claude API · Telegram
# Claude CLI bu faylni Backend dasturchi (Bekzod) tanlanganda o'qiydi

---

## ZONA

```
apps/api/        → Backend API (NestJS)
apps/worker/     → BullMQ processors
apps/bot/        → Telegram bot (grammY)
docker-compose.yml → Infra config
```

**TEGINMA:** `apps/web/` — bu Frontend zonasi.

---

## ARXITEKTURA QOIDALARI

### 1. NestJS Modul Tuzilishi

```typescript
// ✅ TO'G'RI — har bir modul o'z papkasida
apps/api/src/
  sourcing/
    sourcing.module.ts        // imports, providers, exports
    sourcing.controller.ts    // HTTP layer FAQAT — biznes logika YO'Q
    sourcing.service.ts       // biznes logika — DB, queue, AI
    dto/
      create-search.dto.ts    // input validation (class-validator)
    interfaces/
      platform.interface.ts   // TypeScript interfaces

// ❌ NOTO'G'RI — controller ichida DB chaqiruvi
@Get(':id')
async getResult(@Param('id') id: string) {
  return this.prisma.externalSearchJob.findUnique({ where: { id } }); // NO!
}

// ✅ TO'G'RI — service orqali
@Get(':id')
async getResult(@Param('id') id: string, @CurrentUser('account_id') accountId: string) {
  return this.sourcingService.getJobById(id, accountId);
}
```

### 2. Type-Safe — `any` TAQIQLANGAN

```typescript
// ❌ NOTO'G'RI
async function processResult(data: any) {
  return data.price * 1.2;
}

// ✅ TO'G'RI
interface CargoInput {
  readonly productPriceUSD: number;
  readonly weightKg: number;
  readonly route: CargoRoute;
  readonly customsRate: number;
  readonly vatRate: number;
}

interface LandedCostResult {
  readonly landedCostUSD: number;
  readonly perUnitUSD: number;
  readonly deliveryDays: number;
  readonly breakdown: {
    product: number;
    cargo: number;
    customs: number;
    vat: number;
  };
}

function calculateLandedCost(input: CargoInput): LandedCostResult { ... }
```

### 3. Error Handling — Explicit, NestJS Exception

```typescript
// ❌ NOTO'G'RI
try {
  const result = await this.serpApiClient.search(query);
  return result;
} catch (e) {
  console.log(e);
}

// ✅ TO'G'RI
try {
  const result = await this.serpApiClient.search1688(query);
  return result;
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  this.logger.error(`SerpAPI 1688 search failed: ${message}`, { query });
  return []; // yoki throw new InternalServerErrorException()
}
```

### 4. Logger — console.log EMAS, NestJS Logger

```typescript
// ❌ NOTO'G'RI
console.log('Job started');
console.error('Failed:', err);

// ✅ TO'G'RI
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SourcingService {
  private readonly logger = new Logger(SourcingService.name);

  async startSearch(jobId: string) {
    this.logger.log(`Starting sourcing job: ${jobId}`);
    this.logger.warn(`Low match results for job: ${jobId}`);
    this.logger.error(`Job failed: ${jobId}`, error.stack);
  }
}
```

### 5. DTO Validation — class-validator MAJBURIY

```typescript
import { IsString, IsArray, IsOptional, IsIn, Length } from 'class-validator';

export class CreateSourcingSearchDto {
  @IsString()
  @Length(1, 100)
  product_id!: string;

  @IsArray()
  @IsOptional()
  @IsIn(['alibaba', 'taobao', '1688', 'aliexpress', 'amazon_de'], { each: true })
  platforms?: string[];

  @IsOptional()
  weight_kg?: number;
}
```

### 6. BigInt — Prisma bilan MAJBURIY `.toString()`

```typescript
// ❌ NOTO'G'RI — BigInt JSON serialize bo'lmaydi
return { product_id: product.id };

// ✅ TO'G'RI — explicit conversion
return {
  product_id: product.id.toString(),               // ID uchun string
  orders_quantity: Number(product.orders_quantity),  // count uchun number
  price: product.sell_price?.toString() ?? null,     // pul uchun string
};
```

### 7. Prisma Query — Select Faqat Keraklilarni

```typescript
// ❌ NOTO'G'RI — barcha fieldlarni olish
const products = await this.prisma.product.findMany();

// ✅ TO'G'RI — faqat keraklilarni
const products = await this.prisma.product.findMany({
  where: { is_active: true },
  select: {
    id: true,
    title: true,
    rating: true,
    orders_quantity: true,
  },
  orderBy: { orders_quantity: 'desc' },
  take: 100,
});
```

### 8. Multi-tenant — account_id HAR DOIM filter

```typescript
// ❌ NOTO'G'RI — account filter yo'q
async getJobs() {
  return this.prisma.externalSearchJob.findMany();
}

// ✅ TO'G'RI — account scoped
async getJobs(accountId: string) {
  return this.prisma.externalSearchJob.findMany({
    where: { account_id: accountId },
    orderBy: { created_at: 'desc' },
  });
}
```

### 9. BullMQ Job — Typed Interface

```typescript
// ❌ NOTO'G'RI
await queue.add('job', { id: jobId, acc: accountId });

// ✅ TO'G'RI — typed interface
interface SourcingJobData {
  readonly jobId: string;
  readonly accountId: string;
  readonly productId: string;
  readonly platforms: readonly string[];
  readonly weightKg?: number;
}

await sourcingQueue.add('external-search', jobData satisfies SourcingJobData, {
  attempts: 2,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 },
});
```

### 10. Async/Await — Promise.allSettled

```typescript
// ❌ NOTO'G'RI — ketma-ket, sekin
const alibaba = await serpApi.searchAlibaba(query);
const taobao  = await serpApi.searchTaobao(query);
const amazon  = await rainforest.searchAmazonDE(query);

// ✅ TO'G'RI — parallel
const [alibabaResult, taobaoResult, amazonResult] = await Promise.allSettled([
  serpApi.searchAlibaba(query),
  serpApi.searchTaobao(query),
  rainforest.searchAmazonDE(query),
]);

const results = [alibabaResult, taobaoResult, amazonResult]
  .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === 'fulfilled')
  .flatMap(r => r.value);
```

---

## XAVFSIZLIK QOIDALARI

```
1. SQL Injection: Prisma parameterized query ishlatish (raw query taqiqlangan)
2. Auth: Har endpoint @UseGuards(JwtAuthGuard) — public endpoint'lar alohida belgilanadi
3. RBAC: @Roles('ADMIN') + RolesGuard — Super Admin billing dan exempt
4. Rate Limit: ThrottlerModule (60 req/min per IP)
5. CORS: faqat ruxsat berilgan origin'lar
6. Input: class-validator DTO — hech qachon raw body ishlatma
7. Secrets: .env faylda, kodda hardcoded YO'Q
8. BigInt: toString() — prototype pollution EMAS, explicit approach
```

---

## UZUM API ESLATMALAR

```
- Product detail: api.uzum.uz/api/v2/product/{id} — ISHLAYDI
- Category: /api/v2/main/search/product?categoryId=... — ba'zan 500
- weekly_bought = ordersAmount snapshot DELTA (rOrdersAmount EMAS!)
- sku.availableAmount = per-order limit (5), NOT real stock
- totalAvailableAmount = haqiqiy ombor stoki (2659)
- actions.text = Uzum API dan O'CHIRILGAN (undefined)
- Narxlar SO'M da (tiyin emas)
```

---

## TAQIQLANGAN HARAKATLAR

```
❌ apps/web/ papkasiga TEGINMA
❌ prisma migrate reset — data yo'qoladi
❌ main branch'ga to'g'ridan push
❌ .env faylni commit qilma
❌ console.log → Logger ishlatish
❌ any type → TypeScript strict
❌ Raw SQL query → Prisma ORM
```

---

*CLAUDE_BACKEND.md | VENTRA Analytics Platform | 2026-02-26*
