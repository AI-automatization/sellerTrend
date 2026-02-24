import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';
import { enqueueImportBatch } from './import.queue';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BillingGuard)
@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('products/export/csv')
  async exportCsv(
    @CurrentUser('account_id') accountId: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportTrackedCsv(accountId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=tracked-products.csv',
    );
    res.send(csv);
  }

  @Get('discovery/export/excel')
  async exportExcel(
    @CurrentUser('account_id') accountId: string,
    @Query('run_id') runId: string,
    @Res() res: Response,
  ) {
    if (!runId) throw new BadRequestException('run_id query param required');

    const buffer = await this.exportService.exportDiscoveryXlsx(
      accountId,
      runId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=discovery-${runId.slice(0, 8)}.xlsx`,
    );
    res.send(buffer);
  }

  @Post('products/import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @CurrentUser('account_id') accountId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('CSV file required');

    const content = file.buffer.toString('utf-8');
    const urls = this.exportService.parseCsvUrls(content);

    if (urls.length === 0) {
      throw new BadRequestException('No valid Uzum URLs found in CSV');
    }

    await enqueueImportBatch({
      accountId,
      urls,
    });

    return {
      message: `${urls.length} URLs queued for import`,
      count: urls.length,
    };
  }
}
