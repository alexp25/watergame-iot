import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database.service";
import { IDBModelSensor, IDBModelSensorData, IDBModelTopic } from "../../database/models-ts";
import { RedisCacheService, ERedisCacheKeys } from "../cache/redis.service";
import { DBQueryService } from "../db/query.service";


@Injectable()
export class SensorsManagerService {

    constructor(
        private dbs: DatabaseService,
        private query: DBQueryService,
        private redis: RedisCacheService
    ) {

    }

    /**
    * set lat, lng
    */
    setCoords(sensorId: number, lat: number, lng: number): Promise<boolean> {
        let promise: Promise<boolean> = new Promise((resolve, reject) => {
            let where: IDBModelSensor = {
                sensorId: sensorId
            };

            let up: IDBModelSensor = {
                lat: lat,
                lng: lng
            };

            this.dbs.db.sensor.update(up, {
                where: where as any
            }).then(() => {
                resolve(true);
            }).catch((err: Error) => {
                reject(err);
            });
        });

        return promise;
    }

    /**
     * get all users with pagination
     */
    getSensors(type: number): Promise<IDBModelSensor[]> {
        let promise: Promise<IDBModelSensor[]> = new Promise((resolve, reject) => {
            let where: IDBModelSensor = {

            };
            if (type != null && !Number.isNaN(type)) {
                where.sensorTypeCode = type;
            }
            this.dbs.run(
                this.dbs.db.sensor.findAll({
                    where: where as any,
                    include: [
                        {
                            model: this.dbs.db.topic
                        }
                    ]
                })).then((sensors: IDBModelSensor[]) => {
                    if (!sensors) {
                        reject(new Error("error loading data"));
                        return;
                    }
                    resolve(sensors);
                }).catch((err: Error) => {
                    reject(err);
                });
        });

        return promise;
    }

    /**
     * 
     * @param topic 
     * @param sensorId full sensor id 
     */
    checkCreateSensorAuto(topic: string, sensorType: number, sensorId: number) {
        let promise: Promise<IDBModelSensor> = new Promise((resolve, reject) => {
            let ts: Date = new Date();
            this.getTopicDefWCache(topic).then((topicDef: IDBModelTopic) => {
                let newSensor: IDBModelSensor = {
                    sensorTypeCode: sensorType,
                    sensorId: sensorId,
                    logRate: topicDef.logRate,
                    topicCode: topicDef.code,
                    timestamp: ts
                };

                let where: IDBModelSensor = {
                    sensorId: sensorId
                };

                this.query.checkExistsCreate(this.dbs.db.sensor, where, newSensor).then((created: IDBModelSensor) => {
                    resolve(created);
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        });
        return promise;
    }


    getTopics() {
        let promise: Promise<IDBModelSensorData[]> = new Promise((resolve, reject) => {
            this.dbs.run(
                this.dbs.db.topic.findAll({

                })).then((data: IDBModelTopic[]) => {
                    if (!data) {
                        reject(new Error("error loading data"));
                        return;
                    }
                    resolve(data);
                }).catch((err: Error) => {
                    reject(err);
                });
        });
        return promise;
    }

    getTopicsWCache() {
        let promise: Promise<IDBModelSensorData[]> = new Promise(async (resolve, reject) => {
            let topics: IDBModelTopic[] = null;
            try {
                topics = await this.redis.getKey(ERedisCacheKeys.topics, true);
            } catch (err) {
                console.error(err);
            }

            if (!topics) {
                this.getTopics().then(async (data: IDBModelTopic[]) => {
                    try {
                        await this.redis.setKey(ERedisCacheKeys.topics, data, null, true);
                    } catch (err) {
                        console.error(err);
                    }
                    resolve(data);
                }).catch((err) => {
                    reject(err);
                });
            } else {
                resolve(topics);
            }
        });
        return promise;
    }

    getTopicDefWCache(topic: string): Promise<IDBModelTopic> {
        let promise: Promise<IDBModelTopic> = new Promise(async (resolve) => {
            this.getTopicsWCache().then((topics: IDBModelTopic[]) => {
                let topicDef: IDBModelTopic = topics.find(t => t.name === topic);
                if (!topicDef) {
                    resolve(null);
                    return;
                }
                resolve(topicDef);
            }).catch(() => {
                resolve(null);
            });
        });
        return promise;
    }

    getTopicCodeWCache(topic: string): Promise<number> {
        let promise: Promise<number> = new Promise(async (resolve) => {
            this.getTopicDefWCache(topic).then((topicDef: IDBModelTopic) => {
                if (!topicDef) {
                    resolve(null);
                    return;
                }
                resolve(topicDef.code);
            }).catch(() => {
                resolve(null);
            });
        });
        return promise;
    }
};