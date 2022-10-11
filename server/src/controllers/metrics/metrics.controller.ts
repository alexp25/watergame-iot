import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '../../classes/prometheus/metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  public metrics(): Promise<string> {
    return this.metricsService.metrics;
  }
}
