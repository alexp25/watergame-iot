

import { Injectable } from "@nestjs/common";
import fetch from 'node-fetch';
import { RequestInfo, RequestInit, Response } from 'node-fetch'
import { RedisCacheService, ERedisCacheKeys } from "../cache/redis.service";

@Injectable()
export class ExtApiAirlyDataService {

    constructor(
        private redis: RedisCacheService
    ) {

    }

    // https://airapi.airly.eu/v2/measurements/point?indexType=AIRLY_CAQI&lat=44.4567471&lng=26.080335&maxResults=1
    getMeasurement(lat: number | string, lng: number | string, tcache: number): Promise<any> {
        return new Promise(async (resolve, reject) => {

            let data = null;
            let ts: number = new Date().getTime();

            if (tcache != null && tcache > 0) {
                try {
                    data = await this.redis.getKey(ERedisCacheKeys.airly, true);
                } catch (err) {
                    console.error(err);
                }

                if (data && ((ts - data.ts) <= (tcache * 1000))) {
                    data.fromCache = true;
                    resolve(data);
                    return;
                }
            }

            let url: RequestInfo = 'https://airapi.airly.eu/v2/measurements/point?indexType=AIRLY_CAQI&lat=' + lat + '&lng=' + lng + '&maxResults=1';

            let options: RequestInit = {
                method: 'GET',
                body: null,
                headers: {
                    'Content-Type': 'application/json',
                    'apiKey': 'CSCpT2iBwJvqsAnts1C6dMQc76gIWWXP'
                }
            };

            fetch(url, options).then(async (res: Response) => {
                let data: any = await res.json();
                let conv = {
                    "timestamp": data.current.tillDateTime,
                    "index": Math.floor(data.current.indexes[0].value),
                    "ts": ts,
                    "fromCache": false
                };
                try {
                    await this.redis.setKey(ERedisCacheKeys.airly, conv, null, true);
                } catch (err) {
                    console.error(err);
                }
                resolve(conv);
            }).catch((err: Error) => {
                reject(err);
            });
        });
    }
};

