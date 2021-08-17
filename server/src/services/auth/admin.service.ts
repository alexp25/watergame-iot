
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Request } from 'express';
import { ContextService, IApiContextData } from "./context.service";


@Injectable()
export class AdminGuardService implements CanActivate {
    constructor(
        private context: ContextService
    ) {

    }

    canActivate(context: ExecutionContext): Promise<boolean> {
        let promise: Promise<boolean> = new Promise((resolve, reject) => {
            const req: Request = context.switchToHttp().getRequest();
            let cd: IApiContextData = this.context.getContext(req.body);
            this.isAdmin(cd).then((res: boolean) => {
                resolve(res);
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }

    /**
    * check admin rights
    * demo: using tester mode flag
    * normally should check db user admin rights
    * @param cd 
    */
    isAdmin(cd: IApiContextData): Promise<boolean> {
        let promise: Promise<boolean> = new Promise((resolve, reject) => {
            resolve(cd.testerMode);
        });
        return promise;
    }
}