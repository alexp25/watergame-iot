import { Controller, Res, Get, Query } from '@nestjs/common';
import { ApiUseTags, ApiResponse, ApiModelProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { IGenericResponseWrapper } from '../../classes/generic/response';
import { GenericRequestService } from '../../services/generic-request.service';
import { IApiGenericRequest } from '../../classes/generic/request';
import { RedisCacheService } from '../../services/cache/redis.service';
import { MQTTCoreService } from '../../services/mqtt/core.service';
import { PrometheusService } from '../../classes/prometheus/prometheus.service';
import { Gauge } from 'prom-client';

export class IApiGetKeyRequest extends IApiGenericRequest {
    @ApiModelProperty({
        example: "watergame:sensor:1",
        default: "watergame:sensor:1"
    })
    key: string
}

@ApiUseTags('admin/server')
// @UseGuards(JWTAuthService)
// @ApiBearerAuth()
@Controller('admin/server')
export class AdminServerController {
    private testGauge: Gauge;

    constructor(
        private genericRequest: GenericRequestService,
        private redisCache: RedisCacheService,
        private mqtt: MQTTCoreService,
        private prometheusService: PrometheusService
    ) { 
        this.testGauge = prometheusService.registerGauge("number_accessed", "this represents access number of this endpoint", ["endpoint"]);
        this.testGauge.set(0)
    }


    @Get('check-redis-connection')
    @ApiResponse({
        status: 200,
        description: 'Check redis connection',
        type: null,
    })
    async checkRedisConnection(@Res() res: Response) {
        this.genericRequest.run(this.redisCache.testConnection()).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('check-redis-key')
    @ApiResponse({
        status: 200,
        description: 'Get redis key',
        type: null,
    })
    async checkRedisKey(@Res() res: Response, @Query() query: IApiGetKeyRequest) {
        this.genericRequest.run(this.redisCache.getKey(query.key, true)).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('check-mqtt-connection')
    @ApiResponse({
        status: 200,
        description: 'Check MQTT connection',
        type: null,
    })
    async checkMQTTConnection(@Res() res: Response) {
        this.testGauge.inc({endpoint: 'check-mqtt-connection'})
        this.genericRequest.run(this.mqtt.testConnection()).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }
}
