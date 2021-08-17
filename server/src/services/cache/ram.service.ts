import { Injectable } from "@nestjs/common";

export interface IRAMCacheContainer {
    [key: string]: any
}

export enum ERAMCacheKeys {
    test = "test"
}

@Injectable()
export class RAMCacheService {

    cache = {

    }

    constructor() {

    }

    getCachedItemKey(key: string, itemKey: string) {
        let res = null;
        if (this.cache[key] && this.cache[key][itemKey]) {
            try {
                res = JSON.parse(JSON.stringify(this.cache[key][itemKey]));
            } catch (err) {
                console.error(err);
            }
        }
        return res;
    }

    setCachedItemKey(key: string, itemKey: string, data: any) {
        if (!this.cache[key]) {
            this.cache[key] = {};
        }
        try {
            this.cache[key][itemKey] = JSON.parse(JSON.stringify(data));
        } catch (err) {
            console.error(err);
        }
    }

    getKey(key: string) {
        let res = null;
        if (!this.cache[key]) {
            return null;
        }
        try {
            res = JSON.parse(JSON.stringify(this.cache[key]));
        } catch (err) {
            console.error(err);
        }
        return res;
    }

    getKeysMulti(keys: string[]): any[] {
        let vals: any[] = [];
        for (let key of keys) {
            vals.push(this.getKey(key));
        }
        return vals;
    }

    setKey(key: string, data: any) {
        try {
            this.cache[key] = JSON.parse(JSON.stringify(data));
        } catch (err) {
            console.error(err);
        }
    }

    setKeysMulti(keys: string[], data: any[]) {
        for (let i = 0; i < keys.length; i++) {
            this.setKey(keys[i], data[i]);
        }
    }

    addToBuffer(key: string, data: any) {
        if (!this.cache[key]) {
            this.cache[key] = [data];
        } else {
            this.cache[key].push(data);
        }
    }

    popFromBuffer(key: string) {
        if (!(this.cache[key] && this.cache[key].length > 0)) {
            return null;
        } else {
            return this.cache[key].pop();
        }
    }

    clearKey(key: string) {
        this.cache[key] = null;
    }

    clearKeysMulti(keys: string[]) {
        for (let key of keys) {
            this.clearKey(key);
        }
    }

    scanKeys(pattern: string) {
        let keys: string[] = Object.keys(this.cache);
        let matches: any[] = [];
        for (let key of keys) {
            if (key.startsWith(pattern)) {
                matches.push(this.cache[key]);
            }
        }
        return matches;
    }

    clearAll(keys: string[]): void {
        console.log("clear cache");
        let cacheKeys: string[] = Object.keys(this.cache);
        for (let key of cacheKeys) {
            if (keys != null) {
                // clear only requested keys
                if (keys.indexOf(key) !== -1) {
                    this.cache[key] = null;
                }
            } else {
                this.cache[key] = null;
            }
        }
    }
}