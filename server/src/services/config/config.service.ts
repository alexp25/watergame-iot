import { Injectable } from '@nestjs/common';
import { Config, IConfigData, IServices } from '../../classes/global/config';
import * as fs from "fs";
import * as path from 'path';
import { DBUtilsService } from '../db/utils.service';
import { DatabaseService } from '../database.service';
import { RedisCacheService } from '../cache/redis.service';


@Injectable()
export class ConfigService {
    constructor(
        public dbUtils: DBUtilsService,
        public dbs: DatabaseService,
        private redis: RedisCacheService
    ) {

    }

    /**
     * load json file from assets
     * @param name 
     */
    loadJsonFile(name: string) {
        let configPath: string = path.join(__dirname, '../../assets/' + name);
        console.log("config path: " + configPath);
        let env: string = fs.readFileSync(configPath).toString();
        return JSON.parse(env);
    }

    /**
     * check production environment
     */
    checkProd() {
        let env: string = process.env.NODE_ENV || 'development';
        if (env === "development") {
            return false;
        } else {
            return true;
        }
    }

    /**
     * load env config (local store)
     */
    loadEnvConfig() {
        console.log("load env config");
        let envData: IConfigData = this.loadJsonFile("env.json");
        Config.production = process.env.NODE_ENV === "production";
        Config.nodeEnv = process.env.NODE_ENV || 'development';
        console.log("environment: ", Config.nodeEnv);
        Config.env = envData[Config.nodeEnv];
        Config.env = Object.assign(Config.env, envData.any);
        // console.log(envData[Config.node_env]);
        console.log(Config.env);
        return envData[Config.nodeEnv];
    }

    /**
     * load local config (fallback)
     */
    loadLocalConfig() {
        let servicesData: IServices;
        Config.nodeEnv = process.env.NODE_ENV || 'development';
    };
}
