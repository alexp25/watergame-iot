import { Injectable, HttpStatus } from "@nestjs/common";
import { IGenericResponse, IGenericResponseWrapper } from "../classes/generic/response";
import { Config } from "../classes/global/config";


@Injectable()
export class GenericRequestService {

    verbose: boolean = true;

    static getOkMessageFormat(): IGenericResponseWrapper<any> {
        let resp: IGenericResponse<any> = {
            status: true,
            message: "ok",
            data: null
        };
        let respGen: IGenericResponseWrapper<any> = {
            resp: resp,
            status: HttpStatus.OK
        };
        return respGen;
    }

    static getErrorMessageFormat(): IGenericResponseWrapper<any> {
        let resp: IGenericResponse<any> = {
            status: false,
            message: "error"
        };
        let respGen: IGenericResponseWrapper<any> = {
            resp: resp,
            verbose: null,
            status: HttpStatus.BAD_REQUEST
        };
        return respGen;
    }

    static getUnauthorizedMessageFormat(): IGenericResponseWrapper<any> {
        let resp: IGenericResponse<any> = {
            status: false,
            message: "unauthorized request"
        };
        let respGen: IGenericResponseWrapper<any> = {
            resp: resp,
            verbose: null,
            status: HttpStatus.UNAUTHORIZED
        };
        return respGen;
    }

    /**
     * run promise call 
     * return reponse format
     * @param call 
     */
    run(call: Promise<any>): Promise<IGenericResponseWrapper<any>> {
        let promise: Promise<IGenericResponseWrapper<any>> = new Promise((resolve, reject) => {
            call.then((data) => {
                if (Config.globalErrorTest) {
                    throw new Error("test error");
                }
                let respGen = GenericRequestService.getOkMessageFormat();
                respGen.resp.data = data;

                if (Config.globalErrorTest) {
                    throw new Error("test error");
                }

                resolve(respGen);
            }).catch((err: Error) => {
                let respGen = GenericRequestService.getErrorMessageFormat();
                respGen.resp.message = err.message;
                respGen.verbose = err.stack;
                if (this.verbose) {
                    console.error(err);
                }
                reject(respGen);
            });
        });
        return promise;
    }

    /**
     * run simple method
     * promise wrapper with exception handling
     * @param fn 
     */
    runFunction(fn: () => any): Promise<IGenericResponseWrapper<any>> {
        return this.run(new Promise((resolve, reject) => {
            try {
                resolve(fn());
            } catch (e) {
                reject(e);
            }
        }))
    }
}
