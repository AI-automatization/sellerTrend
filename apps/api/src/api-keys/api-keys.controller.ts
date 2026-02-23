import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';

class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  createKey(
    @CurrentUser('account_id') accountId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.createKey(accountId, dto.name);
  }

  @Get()
  listKeys(@CurrentUser('account_id') accountId: string) {
    return this.apiKeysService.listKeys(accountId);
  }

  @Delete(':id')
  deleteKey(
    @CurrentUser('account_id') accountId: string,
    @Param('id') keyId: string,
  ) {
    return this.apiKeysService.deleteKey(accountId, keyId);
  }
}
