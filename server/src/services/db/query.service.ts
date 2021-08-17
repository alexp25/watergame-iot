import { Injectable } from "@nestjs/common";
import { ISequelizeModel, IDBFindAndCountAll } from "../../classes/global/db";
import { IDBQueryPagination } from "../../classes/database/generic";
import { Order } from "sequelize";
import { DatabaseService } from "../database.service";

export interface IUpdateOrCreateResponse1 {
    item: any,
    created: boolean
}

@Injectable()
export class DBQueryService {

    constructor(
        private dbs: DatabaseService
    ) {

    }

    /**
     * only use as last operation,
     * do not chain other queries after calling this function
     */
    async updateOrCreateRaw(model: ISequelizeModel, where: any, newItem: any): Promise<IUpdateOrCreateResponse1> {
        // First try to find the record
        return model
            .findOne({
                where: where,
            })
            .then((foundItem: any) => {
                if (!foundItem) {
                    // Item not found, create a new one
                    return model
                        .create(newItem)
                        .then((item) => {
                            return {
                                item: JSON.parse(JSON.stringify(item)),
                                created: true
                            };
                        });
                }
                // Found an item, update it
                return model
                    .update(newItem, { where: where })
                    .then((item: any) => {
                        return {
                            item: JSON.parse(JSON.stringify(item)),
                            created: false
                        };
                    });
            });
    }


    /**
     * update or create
     * return the actual item (either updated or created)
     * @param model 
     * @param where 
     * @param newItem 
     */
    updateOrCreate(model: ISequelizeModel, where: any, newItem: any): Promise<any> {
        // First try to find the record
        let promise: Promise<any> = new Promise((resolve, reject) => {
            model.findOne({
                where: where,
            }).then((foundItem: any) => {
                if (!foundItem) {
                    model.create(newItem).then((createdItem) => {
                        resolve(JSON.parse(JSON.stringify(createdItem)));
                    }).catch((err: Error) => {
                        reject(err);
                    });
                } else {
                    model.update(newItem, {
                        where: where
                    }).then(() => {
                        model.findOne({
                            where: where,
                        }).then((updatedItemAck: any) => {
                            resolve(JSON.parse(JSON.stringify(updatedItemAck)));
                        }).catch((err: Error) => {
                            reject(err);
                        });
                    }).catch((err: Error) => {
                        reject(err);
                    });
                }
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }


    /**
     * check exists/create new item
     * return existing/created item
     * @param model 
     * @param where 
     * @param newItem 
     */
    checkExistsCreate(model: ISequelizeModel, where: any, newItem: any): Promise<any> {
        // First try to find the record
        let promise: Promise<any> = new Promise((resolve, reject) => {
            model.findOne({
                where: where,
            }).then((foundItem: any) => {
                if (!foundItem) {
                    model.create(newItem).then((createdItem) => {
                        resolve(JSON.parse(JSON.stringify(createdItem)));
                    }).catch((err: Error) => {
                        reject(err);
                    });
                } else {
                    resolve(foundItem);
                }
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }

    /**
     * check exists and create only if NOT existing
     */
    checkExistsCreateReturnBoolean(model: ISequelizeModel, where: any, newItem: any): Promise<boolean> {
        // First try to find the record
        let promise: Promise<boolean> = new Promise((resolve, reject) => {

            model.findOne({
                where: where
            }).then((foundItem: any) => {
                if (!foundItem) {
                    model.create(newItem).then(() => {
                        resolve(true);
                    }).catch((err: Error) => {
                        reject(err);
                    });
                } else {
                    resolve(false);
                }
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }

    /**
     * check exists
     */
    checkExists(model: ISequelizeModel, where: any): Promise<boolean> {
        let promise: Promise<boolean> = new Promise((resolve, reject) => {
            model.findOne({
                where: where
            }).then((foundItem: any) => {
                if (!foundItem) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }


    /**
     * get pagination info for page requests
     * @param limit set null for no pagination
     */
    getPagination(model: ISequelizeModel, where: any, page: number, limit: number, order: Order, group: any, attrs: string[]): Promise<IDBQueryPagination> {
        let result: IDBQueryPagination = {
            pages: 0,
            offset: 0
        };

        if (!order) {
            order = [
                ['id', 'ASC']
            ];
        }
        let promise: Promise<IDBQueryPagination> = new Promise((resolve, reject) => {
            if (page == null) {
                resolve(result);
            }
            model.findAndCountAll({
                where: where,
                order: order,
                group: group,
                attributes: attrs,
            }).then((data: IDBFindAndCountAll<any>) => {
                let pages: number = 0;
                let offset: number = 0;

                if (limit != null) {
                    pages = Math.ceil(data.count / limit);
                    if (limit > data.count) {
                        pages = 1;
                        // ignore requested page, because there is a single page
                        page = 0;
                    }
                    offset = limit * page; // page is zero based
                } else {
                    pages = 1;
                    page = 0;
                    offset = 0;
                }

                result.pages = pages;
                result.offset = offset;
                resolve(result);
            }).catch((err: Error) => {
                reject(err);
            });
        });
        return promise;
    }

    /**
     * perform bulk create
     * return created entries with ids (request created entries by key)
     * @param model 
     * @param data 
     * @param key 
     */
    bulkCreateReturnIds(model: ISequelizeModel, data: any[], key: string): Promise<any[]> {
        let promise: Promise<any[]> = new Promise((resolve, reject) => {
            if (key == null) {
                reject(new Error("null key"));
                return;
            }

            let keyVals: any[] = data.map(d => d[key]);

            let where = {

            };

            where[key] = keyVals;

            model.bulkCreate(data).then(() => {
                this.dbs.run(
                    model.findAll({
                        where: where
                    })).then((created: any[]) => {
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
}