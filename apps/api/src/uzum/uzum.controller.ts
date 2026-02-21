import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UzumService } from './uzum.service';

class AnalyzeUrlDto {
  @IsUrl()
  url: string;
}

@ApiTags('uzum')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uzum')
export class UzumController {
  constructor(private readonly uzumService: UzumService) {}

  @Post('analyze')
  analyzeUrl(@Body() dto: AnalyzeUrlDto) {
    return this.uzumService.analyzeUrl(dto.url);
  }
}
