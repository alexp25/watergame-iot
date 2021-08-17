import { ApiModelProperty } from "@nestjs/swagger";


export class GenericResponseTest {
    @ApiModelProperty({
        example: 'Message',
        description: 'String message'
    })
    message: string;
}

export class IGenericResponse<T> {
    @ApiModelProperty({
        example: true,
        description: "Request status"
    })
    status: boolean;
    @ApiModelProperty()
    @ApiModelProperty({
        example: "ok",
        description: "Request message"
    })
    message: string;
    @ApiModelProperty({
        example: {},
        description: "Request data"
    })
    data?: T;
}

export class IGenericResponseWrapper<T> {
    @ApiModelProperty()
    resp: IGenericResponse<T>;
    @ApiModelProperty()
    verbose?: string;
    @ApiModelProperty()
    status: number;
}


export class IPaginationResponseGen {
    @ApiModelProperty()
    data: any;
    @ApiModelProperty()
    page: number;
    @ApiModelProperty()
    pages: number;
    // high level status
    @ApiModelProperty()
    status?: boolean;
    // high level message e.g. error messages aggregated
    @ApiModelProperty()
    message?: string;
    @ApiModelProperty()
    aux?: any
}

export class IPaginationResponseItems<T> extends IPaginationResponseGen {
    @ApiModelProperty()
    data: T[]
}

export class IPaginationResponseContainer<T> extends IPaginationResponseGen {
    @ApiModelProperty()
    data: T
}

