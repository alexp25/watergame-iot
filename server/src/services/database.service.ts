// edited: migrate raw nest
// edited: migrate raw nest
// edited: migrate raw nest
// edited: migrate raw nest

import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../classes/global/config';
import { DBIndex } from '../database';
import { DBIndexWithAssociations } from '../database/associations';
import { IDBCollection } from '../classes/global/db-collection';


@Injectable()
export class DatabaseService {
    conn: Sequelize;
    db: IDBCollection = {} as IDBCollection;
    static db: IDBCollection = {} as IDBCollection;

    constructor() {

    }

    /**
     * wrapper for db query with result in json format
     * @param query 
     */
    run(query: Promise<any>): Promise<any> {
        let promise: Promise<any> = new Promise((resolve, reject) => {
            query.then((res: any) => {
                resolve(JSON.parse(JSON.stringify(res)));
            }).catch((err: Error) => {
                reject(err);
            })
        });
        return promise;
    }


    connectSequelize() {
        let promise = new Promise((resolve, reject) => {
            try {
                console.log("establishing connection to database");
                console.log("dbname: " + Config.env.db.dbname);

                this.conn = new Sequelize(
                    Config.env.db.dbname,
                    Config.env.db.dbuser,
                    Config.env.db.dbpassword,
                    { 
                        dialect: 'mysql',
                        host: Config.env.db.dbhost,
                        database: Config.env.db.dbname,
                        username: Config.env.db.dbuser,
                        port: Config.env.db.dbport,
                        password: Config.env.db.dbpassword,
                        
                        pool: {
                            // Never have more than N open connections
                            max: 10,
                            // At a minimum, have zero open connections
                            min: 0,
                            // Remove a connection from the pool after the connection has been idle
                            idle: 20000,
                            // timeout: 30000

                            acquire: 10000,
                            evict: 60000,
                            // handleDisconnects: true
                        },
                        define: {
                            timestamps: false,
                            underscored: true,
                            // freezeTableName: true
                        },
                        // logging: console.log,
                        logging: function (str: string) {
                            console.log(str);
                        }
                    }
                );

                console.log("connection created");

                let modelPath: string = DBIndex.getModelPath();
                console.log("model path: " + modelPath);

                let models: string[] = [];

                fs
                    .readdirSync(modelPath)
                    .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
                    .forEach((file) => {
                        // console.log(file);
                        let model = this.conn.import(path.join(modelPath, file));
                        models.push(model.name);
                        this.db[model.name] = model;
                    });

                console.log("models loaded: ", models);

                DBIndexWithAssociations.init(this.db as any);

                DatabaseService.db = this.db;

                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
        return promise;
    }
}
