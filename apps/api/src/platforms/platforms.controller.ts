import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';

@ApiTags('platforms')
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  /** Public endpoint — no auth required */
  @Get()
  findAll() {
    return this.platformsService.findAll();
  }
}
