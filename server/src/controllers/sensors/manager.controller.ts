import { Controller, Body, Post, Res, Get, Query } from '@nestjs/common';
import { ApiUseTags, ApiResponse, ApiModelProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { IGenericResponseWrapper } from '../../classes/generic/response';
import { GenericRequestService } from '../../services/generic-request.service';
import { IApiGenericRequest } from '../../classes/generic/request';
import { SensorsManagerService } from '../../services/sensors/manager.service';


export class IApiGetAllSensorsRequest extends IApiGenericRequest {
    @ApiModelProperty({
        example: 1,
        default: 1
    })
    type: number;
}

export class IApiSetCoordsRequest extends IApiGenericRequest {
    @ApiModelProperty({
        example: 1
    })
    sensorId: number;
    @ApiModelProperty({
        example: null
    })
    lat: number;
    @ApiModelProperty({
        example: null
    })
    lng: number;
}

export class IApiCheckDataRequest extends IApiGenericRequest {
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
    @ApiModelProperty({
        example: "2021-10-09 19:50:00",
        default: "2021-10-09 19:50:00"
    })
    startDate: string;
    @ApiModelProperty({
        example: "2021-10-10 19:50:00",
        default: "2021-10-10 19:50:00"
    })
    endDate: string;
    @ApiModelProperty({
        example: 0,
        default: 0
    })
    batch: number;
    @ApiModelProperty({
        example: false,
        default: false
    })
    timeframe: boolean;
    @ApiModelProperty({
        example: 5000,
        default: 5000
    })
    timeout: number;
    @ApiModelProperty({
        example: 1000,
        default: 1000
    })
    batchSize: number;
    @ApiModelProperty({
        example: 10,
        default: 10
    })
    devFactor: number;
}

@ApiUseTags('sensors/manager')
// @UseGuards(JWTAuthService)
// @ApiBearerAuth()
@Controller('sensors/manager')
export class SensorsManagerController {
    constructor(
        private sensors: SensorsManagerService,
        private genericRequest: GenericRequestService
    ) { }


    @Post('get-registered-sensors')
    @ApiResponse({
        status: 200,
        description: 'Get all sensors',
        type: null,
    })
    async getAllSensors(@Res() res: Response, @Body() body: IApiGetAllSensorsRequest) {
        this.genericRequest.run(this.sensors.getSensors(body.type)).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('get-registered-sensors')
    @ApiResponse({
        status: 200,
        description: 'Get all sensors',
        type: null,
    })
    async getDataWGet(@Res() res: Response, @Query() query: IApiGetAllSensorsRequest) {
        this.genericRequest.run(this.sensors.getSensors(Number.parseInt(query.type as any))).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('get-registered-topics')
    @ApiResponse({
        status: 200,
        description: 'Get topics',
        type: null,
    })
    async getTopicsWGet(@Res() res: Response, @Query() query: IApiGenericRequest) {
        this.genericRequest.run(this.sensors.getTopics()).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Post('check-sensor-timeframes')
    @ApiResponse({
        status: 200,
        description: 'Check sensor timeframes',
        type: null,
    })
    async checkSensorTimeframes(@Res() res: Response, @Body() body: IApiCheckDataRequest) {
        this.genericRequest.run(this.sensors.checkSensorTimeframes(
            body.sensorId,
            body.chan,
            body.batchSize,
            body.limit,
            body.timeframe,
            body.timeout,
            body.startDate,
            body.endDate,
            body.devFactor
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Get('get-topics-wcache')
    @ApiResponse({
        status: 200,
        description: 'Get topics w/ cache',
        type: null,
    })
    async getTopicsWCacheWGet(@Res() res: Response, @Query() query: IApiGenericRequest) {
        this.genericRequest.run(this.sensors.getTopicsWCache()).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }

    @Post('set-coords')
    @ApiResponse({
        status: 200,
        description: 'Get all sensors',
        type: null,
    })
    async setCoords(@Res() res: Response, @Body() body: IApiSetCoordsRequest) {
        this.genericRequest.run(this.sensors.setCoords(body.sensorId, body.lat, body.lng)).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }
}
