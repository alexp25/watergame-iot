import * as jwt from "jsonwebtoken";

import { Injectable, CanActivate, ExecutionContext, HttpException } from "@nestjs/common";
import { Config } from "../../classes/global/config";

import { Request, Response, NextFunction } from 'express';
import { GenericRequestService } from "../generic-request.service";


export interface IJwtVerifyStatus {
    status: boolean,
    decoded: any
}

@Injectable()
export class JWTAuthService implements CanActivate {
    constructor(

    ) {

    }

    /**
     * check if requested url can be activated (JWT auth)
     * @param context 
     */
    canActivate(context: ExecutionContext): Promise<boolean> {
        let promise: Promise<boolean> = new Promise((resolve, reject) => {
            const req: Request = context.switchToHttp().getRequest();
            let token: string = this.getRequestToken(req);
            let jwtSecret: string = this.getJwtSecret(req);
            this.verifyResolve(token, jwtSecret).then((res) => {
                if (res.status) {
                    resolve(res.status);
                } else {
                    let respGen = GenericRequestService.getUnauthorizedMessageFormat();
                    reject(new HttpException(respGen.resp, respGen.status));
                }
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }

    /**
     * create jwt token
     * @param data 
     * @param jwtSecret 
     */
    createToken(data: string, jwtSecret: string): string {
        let timestamp: string = new Date().toUTCString();

        if (!jwtSecret) {
            jwtSecret = Config.jwtSecret;
        }

        let token = jwt.sign(data + timestamp, jwtSecret, {
            //expiresIn: 1440 // expires in 1 hour
        });

        return token;
    }

    /**
     * verify token method middleware
     * @param req 
     * @param res 
     * @param next 
     */
    verifyToken(req: Request, res: Response, next: NextFunction) {
        let token: string = this.getRequestToken(req);
        let jwtSecret: string = this.getJwtSecret(req);
        // console.log("token: ", token);
        if (token) {
            // verifies secret and checks exp
            this.verifyResolve(token, jwtSecret).then((v) => {
                if (v.status) {
                    next(); // no error, proceed
                    // proceed to the route that required authorization
                } else {
                    // failed verification
                    let respGen = GenericRequestService.getUnauthorizedMessageFormat();
                    return res.status(respGen.status).json(respGen.resp);
                }
            });
        } else {
            // forbidden without token
            let respGen = GenericRequestService.getUnauthorizedMessageFormat();
            respGen.resp.message = "missing auth token";
            return res.status(respGen.status).json(respGen.resp);
        }
    }


    /**
     * verify core token via jwt
     * @param token 
     * @param jwtSecret 
     */
    private verifyCoreResolve(token: string, jwtSecret: string): Promise<IJwtVerifyStatus> {
        let promise: Promise<IJwtVerifyStatus> = new Promise((resolve) => {

            let v: IJwtVerifyStatus = {
                status: false,
                decoded: null
            };

            if (!jwtSecret) {
                jwtSecret = Config.jwtSecret;
            }

            jwt.verify(token, jwtSecret, (err: jwt.VerifyErrors, decoded: any) => {
                if (err) {
                    v.status = false;
                    // failed verification.
                    resolve(v);
                } else {
                    v.status = true;
                    v.decoded = decoded;
                    resolve(v);
                }
            });
        });
        return promise;
    }

    /**
     * verify token check secret/default secret
     * @param token 
     * @param jwtSecret 
     */
    private verifyResolve(token: string, jwtSecret: string): Promise<IJwtVerifyStatus> {
        let promise: Promise<IJwtVerifyStatus> = new Promise((resolve) => {
            this.verifyCoreResolve(token, jwtSecret).then((v) => {
                if (v.status) {
                    resolve(v);
                } else {
                    // check default jwt secret
                    // console.log("failed with default jwt: " + jwtSecret);
                    if (jwtSecret !== Config.jwtSecret) {
                        this.verifyCoreResolve(token, Config.jwtSecret).then((v) => {
                            // console.log("failed with custom jwt");
                            resolve(v);
                        });
                    } else {
                        // console.log("failed with default jwt 2");
                        resolve(v);
                    }
                }
            });
        });
        return promise;
    }


    /**
     * get request token
     * @param req 
     */
    private getRequestToken(req: Request): string {
        let token: string = req.headers.authorization;
        if (token) {
            let tokens: string[] = token.split(" ");
            token = tokens[1];
        }
        return token;
    }

    /**
     * check url and use the correct jwt secret
     * there may be specific jwt keys for different base urls
     * @param req 
     */
    private getJwtSecret(_req: Request): string {
        let jwtSecret = Config.jwtSecret;
        return jwtSecret;
    }
}