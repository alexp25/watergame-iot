import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database.service";
import { Order } from "sequelize";
import { IDBModelSensorData } from "../../database/models-ts";
import { MQTTUtilsService, ICsvSensorData } from "../mqtt/utils.service";
import { SensorsManagerService } from "./manager.service";
import { Op } from "sequelize";
import { IFindOptionsExt } from "../../classes/global/db";

const converter = require('json-2-csv');
export interface ISensorDataPacked {
    data: any[],
    keys: string[]
}

export enum ESensorDataQueryMode {
    lastCount = 1,
    lastTimeSecond = 2,
    lastTimeHour = 3,
    timeFrame = 4
}

@Injectable()
export class SensorsDataService {

    constructor(
        private dbs: DatabaseService,
        private mqttUtils: MQTTUtilsService,
        private manager: SensorsManagerService
    ) {

    }

    getSensorDataProcessedCsv(sensorId: number, chan: number, mode: number, limit: number, startDateString: string, endDateString: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.getSensorDataProcessed(sensorId, chan, mode, limit, startDateString, endDateString).then((packedData: ISensorDataPacked) => {

                // already sorted
                let opts = {
                    keys: packedData.keys
                };

                converter.json2csv(packedData.data, (err, csv) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(csv);
                }, opts);
            }).catch((err) => {
                reject(err);
            });
        });
    }


    getSensorDataProcessed(sensorId: number, chan: number, mode: number, limit: number, startDateString: string, endDateString: string): Promise<ISensorDataPacked> {
        return new Promise((resolve, reject) => {
            this.getSensorData(sensorId, chan, mode, limit, startDateString, endDateString).then((data: IDBModelSensorData[]) => {

                let packedData = [];
                let tsCrt = null;
                let pack = true;

                if (!chan && pack) {
                    // pack channels, group by timestamp
                    for (let d of data) {
                        if (tsCrt != d.timestamp) {
                            tsCrt = d.timestamp;
                            d["chan_" + d.chan] = d.value;
                            delete d.value;
                            delete d.chan;
                            packedData.push(d);
                        } else {
                            packedData[packedData.length - 1]["chan_" + d.chan] = d.value;
                        }
                    }
                } else {
                    packedData = data;
                }

                let keys: string[] = Object.keys(packedData[packedData.length - 1]);

                // sort chans
                let normalKeys: string[] = [];
                let chanKeys: string[] = [];
                for (let key of keys) {
                    if (key.startsWith("chan_")) {
                        chanKeys.push(key);
                    } else {
                        normalKeys.push(key);
                    }
                }

                let sortedKeys: string[] = normalKeys;
                chanKeys.sort();
                sortedKeys = sortedKeys.concat(chanKeys);

                for (let pd of packedData) {
                    pd["data"] = [];
                    for (let chan of chanKeys) {
                        pd["data"].push(pd[chan]);
                    }
                }

                resolve({
                    data: packedData,
                    keys: sortedKeys
                });
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * get all users with pagination
     */
    getSensorData(sensorId: number, chan: number, mode: number, limit: number, startDateString: string, endDateString: string): Promise<IDBModelSensorData[]> {
        let promise: Promise<IDBModelSensorData[]> = new Promise((resolve, reject) => {
            if (!sensorId) {
                reject("unexpected request parameter");
                return;
            }
            // let offset: number = 0;
            let dateStart: Date;
            let dateEnd: Date = new Date();
            let timeEnd: number = dateEnd.getTime();
            let timeStart: number = dateStart != null ? dateStart.getTime() : null;

            let order: Order = [
                ["timestamp", "DESC"]
            ];

            let where: IDBModelSensorData = {
                sensorId: sensorId
            };

            if (chan != null && !Number.isNaN(chan)) {
                where.chan = chan;
            }

            let withInterval: boolean = false;

            if (mode != null && !Number.isNaN(mode)) {
                switch (mode) {
                    case ESensorDataQueryMode.lastTimeSecond:
                        if (!timeStart) {
                            timeStart = timeEnd - limit * 1000;
                        }
                        withInterval = true;
                        break;
                    case ESensorDataQueryMode.lastTimeHour:
                        if (!timeStart) {
                            timeStart = timeEnd - limit * 3600 * 1000;
                        }
                        withInterval = true;
                        break;
                    case ESensorDataQueryMode.timeFrame:
                        dateStart = new Date(startDateString);
                        dateEnd = new Date(endDateString);
                        if (dateEnd <= dateStart) {
                            reject(new Error("incorrect timeframe specification"));
                            return;
                        }
                        timeStart = dateStart.getTime();
                        timeEnd = dateEnd.getTime();
                        withInterval = true;
                        break;
                }
            }

            if (withInterval) {
                where.timestamp = {
                    [Op.between]: [new Date(timeStart), new Date(timeEnd)]
                } as any;
            }

            let opts: IFindOptionsExt = {
                where: where as any,
                // offset: offset,
                order: order
            };

            if (!withInterval) {
                if (limit != null && !Number.isNaN(limit)) {
                    opts.limit = limit;
                }
            }

            this.dbs.run(
                this.dbs.db.sensorData.findAll(opts)).then((data: IDBModelSensorData[]) => {
                    if (!data) {
                        reject(new Error("error loading data"));
                        return;
                    }
                    // reorder by timestamp asc
                    data.sort((a, b) => {
                        if (a.timestamp > b.timestamp) {
                            return 1;
                        }
                        if (a.timestamp < b.timestamp) {
                            return -1;
                        }
                        return 0;
                    });
                    resolve(data);
                }).catch((err: Error) => {
                    reject(err);
                });
        });

        return promise;
    }


    registerSensorDataMQTT(topic: string, sensorId: number, message: string) {
        let promise: Promise<boolean> = new Promise((resolve, reject) => {
            if (!sensorId) {
                reject("unexpected request parameter");
                return;
            }

            let sd: IDBModelSensorData[] = [];
            let csv: ICsvSensorData = this.mqttUtils.getCsvData(message);
            let ts: Date = new Date();

            if (!csv) {
                reject(new Error("bad request / could not extract csv data"));
                return;
            }

            this.manager.getTopicCodeWCache(topic).then((topicCode: number) => {
                if (!topicCode) {
                    reject(new Error("unknown topic: " + topic));
                    return;
                }

                for (let i = 0; i < csv.data.length; i++) {
                    sd.push({
                        sensorId: csv.sensorId,
                        chan: i,
                        value: csv.data[i],
                        timestamp: ts
                    });
                }

                this.dbs.run(
                    this.dbs.db.sensorData.bulkCreate(sd)).then(() => {
                        resolve(true);
                    }).catch(() => {
                        // check exists / create sensor
                        this.manager.checkCreateSensorAuto(topic, csv.sensorType, csv.sensorId).then(() => {
                            // retry add data
                            this.dbs.run(
                                this.dbs.db.sensorData.bulkCreate(sd)).then(() => {
                                    resolve(true);
                                }).catch((err) => {
                                    // other error, reject
                                    reject(err);
                                });
                        }).catch((err) => {
                            reject(err);
                        });
                    });
            }).catch((err) => {
                reject(err);
            });
        });

        return promise;
    }
};