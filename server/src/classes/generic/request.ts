import { ApiModelProperty } from "@nestjs/swagger";


export class IApiGenericRequest {
    @ApiModelProperty({
        example: false,
        default: false,
        required: false
    })
    testerMode: boolean;
}
