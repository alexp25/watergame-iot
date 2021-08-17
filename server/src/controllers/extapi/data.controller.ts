import { Controller, Res, Get, Query } from '@nestjs/common';
import { ApiUseTags, ApiResponse, ApiModelProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { IGenericResponseWrapper } from '../../classes/generic/response';
import { GenericRequestService } from '../../services/generic-request.service';
import { IApiGenericRequest } from '../../classes/generic/request';
import { ExtApiAirlyDataService } from '../../services/extapi/airly.service';

export class IApiGetDataRequest extends IApiGenericRequest {
    @ApiModelProperty({
        example: 44.4567471,
        default: 44.4567471
    })
    lat: number;
    @ApiModelProperty({
        example: 26.080335,
        default: 26.080335,
        required: false
    })
    lng: number;
    @ApiModelProperty({
        example: 1800,
        default: 1800,
        required: false
    })
    tcache: number;
}

@ApiUseTags('extapi/data')
@Controller('extapi/data')
export class ExtApiDataController {
    constructor(
        private genericRequest: GenericRequestService,
        private airly: ExtApiAirlyDataService
    ) { }

    @Get('get-airly')
    @ApiResponse({
        status: 200,
        description: 'Get airly data',
        type: null,
    })
    async getAirlyData(@Res() res: Response, @Query() query: IApiGetDataRequest) {
        this.genericRequest.run(this.airly.getMeasurement(
            query.lat,
            query.lng,
            Number.parseInt(query.tcache as any)
        )).then((resp: IGenericResponseWrapper<any>) => {
            res.status(resp.status).json(resp.resp);
        }).catch((errorResp: IGenericResponseWrapper<any>) => {
            res.status(errorResp.status).json(errorResp.resp);
        });
    }
}
