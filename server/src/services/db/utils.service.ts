import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';


@Injectable()
export class DBUtilsService {
    constructor(
        public dbs: DatabaseService
    ) {

    }


    /**
     * retry loading data from db until returned
     * use for very important data e.g. config loading
     * @param loadFn 
     * @param maxRetry 
     * @param interval 
     */
    retryLoad(loadFn: () => Promise<any>, maxRetry: number, interval: number) {
        let promise = new Promise((resolve, reject) => {
            let fn = () => {
                loadFn().then((data) => {
                    resolve(data);
                }).catch((err: Error) => {
                    console.error(err);
                    if (maxRetry > 0) {
                        maxRetry -= 1;
                        setTimeout(() => {
                            fn();
                        }, interval);
                    } else {
                        reject(err);
                    }
                });
            };
            fn();
        });
        return promise;
    }

}
