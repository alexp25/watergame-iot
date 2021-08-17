
import { Injectable } from "@nestjs/common";

export interface IApiContextData {
    appId: number,
    appVersionCode: number,
    testerMode: boolean,
    userId?: number
}

export interface IApiFlatGenericRequest extends IApiContextData {
    [key: string]: any
}


@Injectable()
export class ContextService {
    constructor(

    ) {

    }

    getContext(data: IApiFlatGenericRequest): IApiContextData {
        if (!data) {
            return null;
        }
        let cd: IApiContextData = {
            appId: data.appId,
            appVersionCode: data.appVersionCode,
            testerMode: data.testerMode,
            userId: data.userId
        };
        return cd;
    }
}