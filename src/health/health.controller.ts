import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/** Health check público (no requiere tenant). */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'operaciones', ts: new Date().toISOString() };
  }
}
