import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database.service";
import { IDBModelSensor, IDBModelSensorData, IDBModelTopic } from "../../database/models-ts";
import { RedisCacheService, ERedisCacheKeys } from "../cache/redis.service";
import { DBQueryService } from "../db/query.service";
import { Order } from "sequelize";
import { Op } from "sequelize";
import { IFindOptionsExt } from "../../classes/global/db";

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
    getSensors(type: number, online: boolean): Promise<IDBModelSensor[]> {
        let promise: Promise<IDBModelSensor[]> = new Promise((resolve, reject) => {
            let where: IDBModelSensor = {

            };
            if (type != null && !Number.isNaN(type)) {
                where.sensorTypeCode = type;
            }
            if (online) {
                where.online = 1;
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

    checkSensorTimeframes(sensorId: number, chan: number, batchSize: number, limit: number, timeframe: boolean, timeout: number, startDateString: string, endDateString: string, devFactor: number) {
        let promise: Promise<any> = new Promise(async (resolve, reject) => {
            let batchCount: number = limit / batchSize;
            if (batchCount < 1) {
                batchCount = 1;
            }
            let dateStart: Date;
            let dateEnd: Date = new Date();
            let timeEnd: number = dateEnd.getTime();
            let timeStart: number = dateStart != null ? dateStart.getTime() : null;

            let order: Order = [
                ["timestamp", "ASC"]
            ];

            let where: IDBModelSensorData = {
                sensorId: sensorId,
                chan: chan
            };

            dateStart = new Date(startDateString);
            dateEnd = new Date(endDateString);
            if (dateEnd <= dateStart) {
                reject(new Error("incorrect timeframe specification"));
                return;
            }
            timeStart = dateStart.getTime();
            timeEnd = dateEnd.getTime();

            let timedOut: boolean = false;

            if (timeframe) {
                where.timestamp = {
                    [Op.between]: [new Date(timeStart), new Date(timeEnd)]
                } as any;
            }

            let data: IDBModelSensorData[] = [];
            let bcRet: number = 0;
            for (let bc = 0; bc < batchCount; bc++) {
                console.log("query batch " + (bc + 1) + " of " + batchCount);
                let opts: IFindOptionsExt = {
                    where: where as any,
                    offset: bcRet * batchSize,
                    limit: batchSize,
                    order: order
                };
                bcRet += 1;
                const awaitTimeout = (delay, reason) =>
                    new Promise((resolve, reject) =>
                        setTimeout(
                            () => (reason === undefined ? resolve(true) : reject(reason)),
                            delay
                        )
                    );
                let data1: IDBModelSensorData[] = [];
                let promiseData = new Promise((resolve, reject) => {
                    this.dbs.run(
                        this.dbs.db.sensorData.findAll(opts)).then((data1p: IDBModelSensorData[]) => {
                            data1 = data1p;
                            resolve(true);
                        }).catch((err) => {
                            reject(err);
                        });
                });
                try {
                    await Promise.race([promiseData, awaitTimeout(timeout, 'Fetch timeout')]);
                    if (data1.length == 0) {
                        batchCount = bc + 1;
                        break;
                    }
                    data = data.concat(data1);
                } catch (err) {
                    bcRet = 0;
                    if (timeframe) {
                        console.log("rebuild timeframe");
                        // rebuild timeframe from last record, reset pagination
                        where.timestamp = {
                            [Op.between]: [new Date(data[data.length - 1].timestamp), new Date(timeEnd)]
                        } as any;
                    } else {
                        batchCount = bc + 1;
                        timedOut = true;
                        break;
                    }
                }
            }

            let timestamps = data.map(d => d.timestamp);
            let timestampsFormatted = timestamps.map(ts => new Date(ts).getTime());
            let avgTimeframe: number = 0, countTimeframe: number = 0;
            let cues: number[] = [];
            let cueTimeframes: number[] = [];
            let maxTimeframe: number = null;
            for (let i = 1; i < timestampsFormatted.length; i++) {
                let timeframe = timestampsFormatted[i] - timestampsFormatted[i - 1];
                if (maxTimeframe != null && (timeframe > (maxTimeframe * devFactor))) {
                    // anomaly
                } else {
                    if (maxTimeframe == null || timeframe > maxTimeframe) {
                        maxTimeframe = timeframe;
                    }
                    avgTimeframe += timeframe;
                    countTimeframe += 1;
                }

            }
            if (countTimeframe > 0) {
                avgTimeframe /= countTimeframe;
            }
            avgTimeframe = Math.floor(avgTimeframe);
            for (let i = 1; i < timestampsFormatted.length; i++) {
                let timeframe = timestampsFormatted[i] - timestampsFormatted[i - 1];
                if (timeframe > avgTimeframe * devFactor) {
                    cues.push(i - 1);
                    cueTimeframes.push(timeframe);
                }
            }
            let res = {
                avgTimeframe: avgTimeframe,
                timestampsPreview: timestamps.slice(0, 10),
                cues: cues,
                cueTimeframes: cueTimeframes,
                startTs: timestamps[0],
                endTs: timestamps[timestamps.length - 1],
                count: timestamps.length,
                batchCount: batchCount,
                timedOut: timedOut
            };
            resolve(res);
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