import { ApiModelProperty } from "@nestjs/swagger";

export class IApiGenericRequest {
    @ApiModelProperty({
        example: false,
        default: false,
        required: false
    })
    testerMode: boolean;
}

export class IApiGenericRequestUserId extends IApiGenericRequest {
    @ApiModelProperty({
        example: 25,
        default: 25
    })
    userId: number;
}