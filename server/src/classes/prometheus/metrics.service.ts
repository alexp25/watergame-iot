
import { Injectable } from '@nestjs/common';
// import { PrometheusService } from "../prometheus/prometheus.service";

@Injectable()
export class MetricsService {
  public get metrics(): Promise<string> {
    // return this.promClientService.metrics;
    return Promise.resolve("metrics disabled");
  }

  constructor(
    // private promClientService: PrometheusService
  ) { }
}
