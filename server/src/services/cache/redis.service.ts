import { Injectable } from "@nestjs/common";
import { Config } from "../../classes/global/config";
import { RAMCacheService } from "./ram.service";
import { CacheUtils } from "./utils";

const redis = require("redis");


export interface IRedisStatusReport {
    log: string;
    error: any;
    key: any;
    connected: boolean;
}

interface IRedisConfig {
    host: string,
    port: number,
    password?: string,
    no_ready_check: boolean,
    retry_strategy: (options) => any
}

export interface IRedisOptions {
    /** IP address of the Redis server */
    host: string,
    /** Port of the Redis server */
    port: number,
    /** The UNIX socket string of the Redis server */
    path: string,
    /** The URL of the Redis server. Format: [redis[s]:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]] */
    url: string,
    /** If set, client will run Redis auth command on connect */
    password: string
}

export enum ERedisCacheKeys {
    test = "watergame:test",
    topics = "watergame:mqtt_topics",
    airly = "watergame:airly"
}

@Injectable()
export class RedisCacheService {

    redisClient: any;
    useRAMCache: boolean = true; // dev
    // useRAMCache: boolean = false;
    skipCache: boolean = false;

    // use to override remote config and disable cache
    masterDisableCache: boolean = false;

    tempDisableCounter: number = 0;
    tempDisableTimeout: number = 0;

    options = {
        redisTimeoutRW: 1000,
        minRetryTime: 5000,
        retryDisableCounter: 3
    };

    fallbackTimeout: { [key: string]: any } = {

    };

    fallbackIndex: number = 0;

    useMultiRead: boolean = true;
    // there seems to be a bug, not saving multi keys with mset/multi
    // useMultiWrite: boolean = false;
    useMultiWrite: boolean = true;

    lastRedisStateLog: string = "";

    constructor(
        private ramCache: RAMCacheService
    ) {

    }

    updateSettings() {
        if (this.masterDisableCache) {
            this.skipCache = true;
        }
    }

    connectClient() {
        if (this.useRAMCache) {
            console.log("using ram cache, skip redis");
            return;
        }

        this.lastRedisStateLog = "connecting to redis";
        console.log(this.lastRedisStateLog);

        let redisConfig: IRedisConfig = {
            host: Config.env.redis.url,
            port: Config.env.redis.port,
            no_ready_check: true,
            retry_strategy: (options) => {
                console.error(options.error);
                this.fallbackFire();

                // if (options.error && options.error.code === "ECONNREFUSED") {
                //     // End reconnecting on a specific error and flush all commands with
                //     // a individual error
                //     // return new Error("The server refused the connection");
                // }
                // if (options.total_retry_time > 1000 * 60 * 60) {
                //     // End reconnecting after a specific timeout and flush all commands
                //     // with a individual error
                //     return new Error("Retry time exhausted");
                // }
                // if (options.attempt > 10) {
                //     // End reconnecting with built in error
                //     return undefined;
                // }
                // reconnect after

                let min: number = options.attempt <= 30 ? options.attempt : 30;
                console.log("retry in: " + min * 1000);

                return Math.min(min * 1000, 30000);
            }
        };

        if (Config.env.redis.requirePassword) {
            redisConfig.password = Config.env.redis.password;
        }

        this.redisClient = redis.createClient(redisConfig);

        this.redisClient.on('connect', () => {
            this.lastRedisStateLog = "redis > connected";
            console.log(this.lastRedisStateLog);
        });
        this.redisClient.on('ready', () => {
            this.lastRedisStateLog = "redis > ready";
            console.log(this.lastRedisStateLog);
        });
        this.redisClient.on('reconnecting', () => {
            this.lastRedisStateLog = "redis > reconnecting";
            console.log(this.lastRedisStateLog);
        });
        this.redisClient.on('end', () => {
            this.lastRedisStateLog = "redis > end";
            console.log(this.lastRedisStateLog);
        });
        this.redisClient.on("error", (error) => {
            this.lastRedisStateLog = "redis > error";
            console.warn(this.lastRedisStateLog);
            console.error(error);
        });
    }


    /**
     * test current connection state and error logs
     */
    testConnection(): Promise<IRedisStatusReport> {
        return new Promise((resolve) => {
            let report: IRedisStatusReport = {
                log: this.lastRedisStateLog,
                error: null,
                key: null,
                connected: false
            };
            if (this.redisClient.connected) {
                report.log = this.lastRedisStateLog;
                report.connected = true;
                resolve(report);
            } else {
                report.log = this.lastRedisStateLog;
                report.connected = false;
                resolve(report);
            }
        });
    }


    ////////////////////////// watch keys //////////////////////////

    /**
     * check if keys exist (used as multiple-key lock)
     * wait until the lock is cleared (polling)
     * @param key 
     * @param itemKeys 
     */
    watchSpecKeysLockMulti(key: string, itemKeys: string[], retryTimeout?: number): Promise<boolean> {
        return new Promise((resolve) => {
            let check = () => {
                let clear: boolean = true;
                this.getSpecKeysMulti(key, itemKeys, false).then((data: any[]) => {
                    if (data) {
                        for (let i = 0; i < data.length; i++) {
                            if (data[i] != null) {
                                clear = false;
                                break;
                            }
                        }
                    }
                    if (clear) {
                        resolve(true);
                    } else {
                        setTimeout(() => {
                            check();
                        }, retryTimeout ? retryTimeout : 1000);
                    }
                });
            };
            check();
        });
    }


    ////////////////////////// spec keys //////////////////////////

    /**
     * get multiple keys from cache
     * @param key 
     * @param itemKeys 
     */
    getSpecKeysMulti(key: string, itemKeys: string[], strict: boolean): Promise<any[]> {
        let fullKeys: string[] = [];
        for (let itemKey of itemKeys) {
            fullKeys.push(key + ":" + itemKey);
        }
        return this.getKeysMulti(fullKeys, strict);
    }

    /**
     * get single key from cache
     * @param key 
     * @param itemKey 
     */
    getSpecKey(key: string, itemKey: string, strict: boolean): Promise<any> {
        return this.getKey(key + ":" + itemKey, strict);
    }

    /**
     * cache single key
     * @param key 
     * @param itemKey 
     * @param data 
     */
    setSpecKey(key: string, itemKey: string, data: any, expire: number, strict: boolean): Promise<boolean> {
        return this.setKey(key + ":" + itemKey, data, expire, strict);
    }

    /**
     * cache multiple keys
     * @param key 
     * @param itemKeys 
     * @param data 
     */
    setSpecKeysMulti(key: string, itemKeys: string[], data: any[], expire: number, strict: boolean): Promise<boolean> {
        let fullKeys: string[] = [];
        for (let itemKey of itemKeys) {
            fullKeys.push(key + ":" + itemKey);
        }
        return this.setKeysMulti(fullKeys, data, expire, strict);
    }

    /**
     * clear single key from cache
     * @param key 
     * @param itemKey 
     */
    clearSpecKey(key: string, itemKey: string): Promise<boolean> {
        return this.clearKey(key + ":" + itemKey, false);
    }

    /**
     * clear multiple keys from cache
     * @param key 
     * @param itemKey 
     */
    clearSpecKeysMulti(key: string, itemKeys: string[]): Promise<boolean> {
        let fullKeys: string[] = [];
        for (let itemKey of itemKeys) {
            fullKeys.push(key + ":" + itemKey);
        }
        return this.clearKeysMulti(fullKeys);
    }

    ////////////////////////// keys (core) //////////////////////////

    /**
     * get single key from cache (core)
     * @param key 
     */
    getKey(key: string, strict: boolean): Promise<any> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(null);
                return;
            }
            if (this.useRAMCache) {
                resolve(this.ramCache.getKey(key));
            } else {
                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    this.redisClient.get(key, (err, r) => {
                        if (err) {
                            console.error("getKey");
                            console.error(err);
                        }
                        this.fallbackClear(index);
                        resolve(CacheUtils.parseJSONRobust(r, strict));
                    });
                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }

    /**
     * get multiple keys from cache (core)
     * @param keys 
     */
    getKeysMulti(keys: string[], strict: boolean): Promise<any[]> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(null);
                return;
            }
            if (this.useRAMCache) {
                resolve(this.ramCache.getKeysMulti(keys));
            } else {
                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, async () => {
                    if (this.useMultiRead) {
                        this.redisClient.mget(keys, (err, r) => {
                            if (err) {
                                console.error("getKeysMulti/mget");
                                console.error(err);
                            }
                            this.fallbackClear(index);
                            if (!r) {
                                resolve([]);
                            } else {
                                resolve(r.map((r1: any) => {
                                    let res: any = CacheUtils.parseJSONRobust(r1, strict);
                                    return res;
                                }));
                            }
                        });
                        // let getCommands: Array<string[]> = new Array<string[]>(keys.length);
                        // for (let i = 0; i < keys.length; i++) {
                        //     getCommands[i] = ["get", keys[i]];
                        // }
                        // this.redisClient.multi(getCommands).exec((err, r) => {
                        //     if (err) {
                        //         console.error("getKeysMulti");
                        //         console.error(err);
                        //     }
                        //     this.fallbackClear(index);
                        //     if (!r) {
                        //         resolve([]);
                        //     } else {
                        //         resolve(r.map((r1: any) => {
                        //             let res: any = CacheUtils.parseJSONRobust(r1, strict);
                        //             return res;
                        //         }));
                        //     }
                        // });
                    } else {
                        let res: any[] = [];
                        for (let i = 0; i < keys.length; i++) {
                            let r1: any = await this.getKey(keys[i], strict);
                            res.push(CacheUtils.parseJSONRobust(r1, strict));
                        }
                        this.fallbackClear(index);
                        resolve(res);
                    }
                }, () => {
                    console.error("redis > fallback fired");
                    resolve([]);
                });
            }
        });
    }



    /**
     * cache single key (core)
     * @param key 
     * @param data 
     * @param expire seconds
     */
    setKey(key: string, data: any, expire: number, strict: boolean): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }
            if (this.useRAMCache) {
                this.ramCache.setKey(key, data);
                resolve(true);
            } else {
                let sdata: string = CacheUtils.stringifyJSONRobust(data, strict);
                if (sdata == null) {
                    resolve(false);
                    return;
                }

                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    if (expire != null) {
                        this.redisClient.set(key, sdata, "EX", "" + expire, (err, res) => {
                            if (err) {
                                console.error("setKeyEx");
                                console.error(err);
                            }
                            this.fallbackClear(index);
                            resolve(true);
                        });
                    } else {
                        this.redisClient.set(key, sdata, (err, res) => {
                            if (err) {
                                console.error("setKey");
                                console.error(err);
                            }
                            this.fallbackClear(index);
                            resolve(true);
                        });
                    }
                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }

    /**
     * cache multiple keys (core)
     * @param keys 
     * @param data 
     */
    setKeysMulti(keys: string[], data: any[], expire: number, strict: boolean): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }

            if (!(keys && keys.length > 0)) {
                resolve(false);
                return;
            }

            if (this.useRAMCache) {
                this.ramCache.setKeysMulti(keys, data);
                resolve(true);
            } else {
                let input: any[] = [];
                let dataString: string[] = [];
                try {
                    for (let i = 0; i < keys.length; i++) {
                        input.push(keys[i]);
                        let ds: string = JSON.stringify(data[i]);
                        dataString.push(ds);
                        input.push(ds);
                    }
                } catch (err) {
                    if (strict) {
                        // skip if there were any serialization errors
                        console.error(err);
                        resolve(false);
                        return;
                    } else {
                        // allow non-json data
                        input = [];
                        for (let i = 0; i < keys.length; i++) {
                            input.push(keys[i]);
                            let ds: string = data[i];
                            dataString.push(ds);
                            input.push(ds);
                        }
                    }
                }

                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    let batchExpire: boolean = true;

                    let setKeysPromise: Promise<boolean> = new Promise(async (resolve) => {
                        if (this.useMultiWrite) {
                            // let setCommands: Array<string[]> = new Array<string[]>(keys.length);
                            // for (let i = 0; i < keys.length; i++) {
                            //     setCommands[i] = ["set", keys[i], dataString[i]];
                            // }
                            // // console.log(setCommands);
                            // this.redisClient.multi(setCommands).exec((err, res) => {
                            //     if (err) {
                            //         console.error("setKeysMulti");
                            //         console.error(err);
                            //     }
                            //     resolve(true);
                            // });
                            this.redisClient.mset(input, (err, res) => {
                                if (err) {
                                    console.error("setKeysMulti/mset");
                                    console.error(err);
                                }
                                resolve(true);
                            });
                        } else {
                            batchExpire = false;
                            for (let i = 0; i < keys.length; i++) {
                                await this.setKey(keys[i], data[i], expire, strict);
                            }
                            resolve(true);
                        }
                    });

                    setKeysPromise.then(() => {
                        if (expire != null && batchExpire) {
                            let expireCommands: Array<string[]> = new Array<string[]>(keys.length);
                            for (let i = 0; i < keys.length; i++) {
                                expireCommands[i] = ["expire", keys[i], "" + expire];
                            }
                            this.redisClient.multi(expireCommands).exec((err, res) => {
                                if (err) {
                                    console.error("setKeysMultiEx");
                                    console.error(err);
                                }
                                this.fallbackClear(index);
                                resolve(true);
                            });
                        } else {
                            this.fallbackClear(index);
                            resolve(true);
                        }
                    });

                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }


    /**
     * clear redis key/matching keys with prefix (using redis scan)
     * @param key 
     * @param withPrefix 
     */
    clearKey(key: string, withPrefix: boolean): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }
            if (key == null) {
                resolve(false);
                return;
            }

            if (this.useRAMCache) {
                this.ramCache.clearKey(key);
                resolve(true);
            } else {
                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    if (withPrefix) {
                        this.scanKeys(key + "*").then((keys: string[]) => {
                            let promises: Promise<boolean>[] = [];
                            for (let row of keys) {
                                promises.push(new Promise((resolve) => {
                                    this.redisClient.del(row, (err, res) => {
                                        resolve(true);
                                    });
                                }));
                            }
                            promises.push(Promise.resolve(true));
                            Promise.all(promises).then(() => {
                                this.fallbackClear(index);
                                resolve(true);
                            });
                        });
                    } else {
                        this.redisClient.del(key, (err, res) => {
                            this.fallbackClear(index);
                            resolve(true);
                        });
                    }
                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }

    /**
     * clear multiple redis keys at once
     * @param keys 
     */
    clearKeysMulti(keys: string[]): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }

            if (!(keys && keys.length > 0)) {
                resolve(false);
                return;
            }

            if (this.useRAMCache) {
                this.ramCache.clearKeysMulti(keys);
                resolve(true);
            } else {
                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    this.redisClient.del(keys, (err, res) => {
                        if (err) {
                            console.error("clearKeysMulti");
                            console.error(err);
                        }
                        this.fallbackClear(index);
                        resolve(true);
                    });
                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }


    ////////////////////////// list buffers //////////////////////////

    /**
     * push new item into redis list buffer
     * @param key 
     * @param data 
     */
    addToBuffer(key: string, data: any): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }
            if (this.useRAMCache) {
                this.ramCache.addToBuffer(key, data);
                resolve(true);
            } else {
                let sdata: string = CacheUtils.stringifyJSONRobust(data, true);
                // console.log(sdata);
                if (sdata == null) {
                    resolve(false);
                    return;
                }

                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    this.redisClient.rpush(key, sdata, (err, res) => {
                        if (err) {
                            console.error("addToBuffer");
                            console.error(err);
                        }
                        this.fallbackClear(index);
                        resolve(true);
                    });
                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }

    /**
     * pop item from redis list buffer
     * @param key 
     */
    popFromBuffer(key: string): Promise<any> {
        return new Promise((resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }
            if (this.useRAMCache) {
                this.ramCache.popFromBuffer(key);
                resolve(true);
            } else {
                let index: number = this.fallbackIndex;
                this.fallbackIndex += 1;
                this.fallbackTick(index, () => {
                    this.redisClient.lpop(key, (err, r) => {
                        if (err) {
                            console.error("popFromBuffer");
                            console.error(err);
                        }
                        this.fallbackClear(index);
                        resolve(CacheUtils.parseJSONRobust(r, true));
                    });
                }, () => {
                    console.error("redis > fallback fired");
                    resolve(null);
                });
            }
        });
    }

    /**
     * pop all items from redis list buffer
     * @param key 
     */
    popAllFromBuffer(key: string): Promise<any[]> {
        return new Promise(async (resolve) => {
            let items = [];
            while (true) {
                let item = await this.popFromBuffer(key);
                if (item == null) {
                    break;
                } else {
                    items.push(item);
                }
            }
            resolve(items);
        });
    }

    ////////////////////////// others //////////////////////////


    /**
     * clear all registered keys
     * use prefix to scan for all keys that are actually registered in redis (e.g. user stats for category)
     * @param keys 
     */
    clearAll(keys: string[]): Promise<boolean> {
        return new Promise(async (resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }
            console.log("redis > clear cache");
            if (this.useRAMCache) {
                this.ramCache.clearAll(keys);
                resolve(true);
            } else {
                let cacheKeys: string[] = Object.keys(ERedisCacheKeys);
                console.log("clear cache keys: ", cacheKeys);
                for (let key of cacheKeys) {
                    if (keys != null) {
                        // clear only requested keys
                        if (keys.indexOf(key) !== -1) {
                            await this.clearKey(key, true);
                        }
                    } else {
                        await this.clearKey(key, true);
                    }
                }
                resolve(true);
            }
        });
    }

    /**
     * clear all redis cache
     * or spec keys
     * @param keys 
     */
    clearAllExtra(keys: string[]): Promise<boolean> {
        return new Promise(async (resolve) => {
            if (this.skipCache) {
                resolve(false);
                return;
            }
            console.log("redis > clear cache");
            if (this.useRAMCache) {
                this.ramCache.clearAll(keys);
                resolve(true);
            } else {
                console.log("clear cache keys extra: ", keys);
                if (keys) {
                    for (let key of keys) {
                        await this.clearKey(key, true);
                    }
                } else {
                    await this.clearKey("", true);
                }
                resolve(true);
            }
        });
    }


    /**
    * scan for keys matching the pattern
    * @param pattern 
    */
    scanKeys(pattern: string): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            let useScan: boolean = true;

            if (this.useRAMCache) {
                resolve(this.ramCache.scanKeys(pattern));
                return;
            }

            if (useScan) {
                let cursor = '0';
                let foundKeys: string[] = [];
                let scan = (pattern, callback) => {
                    this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '1000', (err, reply) => {
                        if (err) {
                            return callback(false);
                        }
                        cursor = reply[0];
                        if (cursor === '0') {
                            let keys: string[] = reply[1];
                            foundKeys = foundKeys.concat(keys);
                            return callback(true);
                        } else {
                            let keys: string[] = reply[1];
                            foundKeys = foundKeys.concat(keys);
                            return scan(pattern, callback);
                        }
                    });
                }

                scan(pattern, (ok: boolean) => {
                    if (ok) {
                        // console.log('Scan Complete: ', foundKeys);
                    } else {
                        console.error("redis > scan error: ", foundKeys);
                    }
                    resolve(foundKeys);
                });
            } else {
                this.redisClient.keys(pattern, (err, keys) => {
                    // console.log('Scan Complete: ', keys);
                    resolve(keys);
                });
            }
        });
    }

    ////////////////////////// fault tolerant addons //////////////////////////

    /**
    * fault tolerant addon
    * @param onTick 
    */
    fallbackTick(index: number, onTick: () => any, onTimeout: () => any) {
        let ts: number = new Date().getTime();

        // check for time since last fallback tick
        if ((ts - this.tempDisableTimeout) < this.options.minRetryTime) {
            // skip redis
            onTimeout();
            return;
        }

        // check for number of calls (w/ timeout)
        if (this.tempDisableCounter > 0) {
            this.tempDisableCounter -= 1;
            // skip redis
            onTimeout();
            return;
        }

        this.fallbackTimeout[index.toString()] = setTimeout(() => {
            // skip next N requests to redis (after timeout)
            this.fallbackFire();
            // skip redis
            onTimeout();
        }, this.options.redisTimeoutRW);

        // call redis
        onTick();
    }

    /**
     * fault tolerant addon
     */
    fallbackFire() {
        this.tempDisableCounter = this.options.retryDisableCounter;
        this.tempDisableTimeout = new Date().getTime();
        console.error("redis > fallback timeout fired");
    }

    /**
     * fault tolerant addon
     */
    fallbackClear(index: number) {
        let indexString: string = index.toString();
        if (this.fallbackTimeout[indexString]) {
            clearTimeout(this.fallbackTimeout[indexString]);
        }
        this.fallbackTimeout[indexString] = null;
        // check empty dict clear
        let emptyDict: boolean = true;
        for (let key of Object.keys(this.fallbackTimeout)) {
            if (this.fallbackTimeout[key] !== null) {
                emptyDict = false;
                break;
            }
        }
        if (emptyDict) {
            // clear dict from RAM
            this.fallbackTimeout = {};
            // console.error("redis > fallback dict cleared");
        }

        this.tempDisableCounter = 0;
        this.tempDisableTimeout = 0;
        // console.error("redis > fallback cleared");
    }
}