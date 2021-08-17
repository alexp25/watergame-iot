import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database.service";
import { RedisCacheService } from "../cache/redis.service";


@Injectable()
export class MQTTCacheService {

    constructor(
        private dbs: DatabaseService,
        private redis: RedisCacheService
    ) {

    }

    getStatus(sensorId: number) {
        return new Promise((resolve, reject) => {
            if (sensorId != null && !Number.isNaN(sensorId)) {
                this.redis.getKey("watergame:sensor:" + sensorId, true).then((res: string) => {
                    if (res == null) {
                        resolve(null);
                    } else {
                        resolve([res]);
                    }
                }).catch((err) => {
                    reject(err);
                });
            } else {
                this.redis.scanKeys("watergame:sensor:").then((res: string[]) => {
                    resolve(res);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    updateStatus(sensorId: string, message: string) {
        this.redis.setKey("watergame:sensor:" + sensorId, message, 300, true).then(() => {

        }).catch((err) => {
            console.error(err);
        });
    }
}; 