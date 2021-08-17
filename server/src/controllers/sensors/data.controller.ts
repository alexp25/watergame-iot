import { Controller, Body, Post, Res, Get, Query } from '@nestjs/common';
import { ApiUseTags, ApiResponse, ApiModelProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { IGenericResponseWrapper } from '../../classes/generic/response';
import { GenericRequestService } from '../../services/generic-request.service';
import { SensorsDataService } from '../../services/sensors/data.service';
import { IApiGenericRequest } from '../../classes/generic/request';
import { MQTTCacheService } from '../../services/mqtt/cache.service';

export class IApiGetDataRequest extends IApiGenericRequest {
    @ApiModelProperty({
        example: 1,
        default: 1
    })
    sensorId: number;
    @ApiModelProperty({
        example: 1,
        default: 1,
        required: false
    })
    chan: number;
    @ApiModelProperty({
        example: 1000,
        default: 1000
    })
    limit: number;
}

@ApiUseTags('sensors/data')
// @UseGuards(JWTAuthService)
// @ApiBearerAuth()
@Controller('sensors/data')
export class SensorsDataController {
    constructor(
        private sensors: SensorsDataService,
        private genericRequest: GenericRequestService,
        private mqttCache: MQTTCacheService
    ) { }


    @Post('get-stored-data')
    @ApiResponse({
        status: 200,
        description: 'Get sensor data',
        type: null,
    })
    async getDataWPost(@Res() res: Response, @Body() body: IApiGetDataRequest) {
        this.genericRequest.run(this.sensors.getSensorData(
            body.sensorId,
            body.chan,
            body.limit
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('get-stored-data')
    @ApiResponse({
        status: 200,
        description: 'Get sensor data',
        type: null,
    })
    async getDataWGet(@Res() res: Response, @Query() query: IApiGetDataRequest) {
        this.genericRequest.run(this.sensors.getSensorData(
            Number.parseInt(query.sensorId as any),
            Number.parseInt(query.chan as any),
            Number.parseInt(query.limit as any)
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('get-stored-data-processed')
    @ApiResponse({
        status: 200,
        description: 'Get sensor data in csv format',
        type: null,
    })
    async getDataProcessedWGet(@Res() res: Response, @Query() query: IApiGetDataRequest) {
        this.genericRequest.run(this.sensors.getSensorDataProcessed(
            Number.parseInt(query.sensorId as any),
            Number.parseInt(query.chan as any),
            Number.parseInt(query.limit as any)
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).send(resp.resp.data);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('get-stored-data-csv')
    @ApiResponse({
        status: 200,
        description: 'Get sensor data in csv format',
        type: null,
    })
    async getDataCsvWGet(@Res() res: Response, @Query() query: IApiGetDataRequest) {
        this.genericRequest.run(this.sensors.getSensorDataProcessedCsv(
            Number.parseInt(query.sensorId as any),
            Number.parseInt(query.chan as any),
            Number.parseInt(query.limit as any)
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=download.csv");
            res.status(resp.status).send(resp.resp.data);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }


    @Get('get-stored-data-csv-plain')
    @ApiResponse({
        status: 200,
        description: 'Get sensor data in csv format',
        type: null,
    })
    async getDataCsvPlainWGet(@Res() res: Response, @Query() query: IApiGetDataRequest) {
        this.genericRequest.run(this.sensors.getSensorDataProcessedCsv(
            Number.parseInt(query.sensorId as any),
            Number.parseInt(query.chan as any),
            Number.parseInt(query.limit as any)
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.setHeader("Content-Type", "text/plain");
            // res.setHeader("Content-Disposition", "attachment; filename=download.csv");
            res.status(resp.status).send(resp.resp.data);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }


    @Get('get-current-data-snapshot')
    @ApiResponse({
        status: 200,
        description: 'Get sensor cache data',
        type: null,
    })
    async getCacheDataWGet(@Res() res: Response, @Query() query: IApiGetDataRequest) {
        this.genericRequest.run(this.mqttCache.getStatus(Number.parseInt(query.sensorId as any))).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }
}
