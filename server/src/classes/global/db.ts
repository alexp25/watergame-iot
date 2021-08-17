
import { Model, BuildOptions, FindOptions, UpdateOptions, CreateOptions, DestroyOptions, FindAndCountOptions, Order, BulkCreateOptions } from "sequelize/types";
// import { Model, BuildOptions, FindOptions, UpdateOptions, CreateOptions, DestroyOptions, FindAndCountOptions, Order } from "@types/sequelize";
import { CountOptions } from "sequelize";
import { Fn, Literal } from "sequelize/types/lib/utils";


export type ModelStatic = typeof Model & {
    new(values?: object, options?: BuildOptions): Model;
}

export interface IFindOptionsExt extends FindOptions {
    raw?: boolean,
    nest?: boolean,
    // order: any[],
    include?: IIncludeOptions[]
}

export interface IFindAndCountOptionsExt extends FindAndCountOptions {
    raw?: boolean,
    nest?: boolean,
    include?: IIncludeOptions[]
}

export interface ICountOptionsExt extends CountOptions {

}

export interface IIncludeOptions {
    model: any,
    where?: any
    required?: boolean,
    include?: IIncludeOptions[],
    as?: string,
    limit?: number,
    order?: Order,
    // attributes?: any[],
    attributes?: (string | [string | Literal | Fn, string])[],
    all?: boolean
}

export interface ICreateOptionsExt extends CreateOptions {
    include?: any[]    
}

export interface IBulkCreateOptionsExt extends BulkCreateOptions {
    include?: any[],
    // ignoreDuplicates?: boolean
    // individualHooks?: boolean
    ignoreDuplicates?: boolean
    individualHooks?: boolean,
    /** bulkCreate([...], { updateOnDuplicate: ["name"] } */
    updateOnDuplicate?: string[]
}

export interface IDBGenericData {
    // get json object
    // toJSON: () => any
    _com: boolean;
}

export interface IDBFindAndCountAll<T> {
    rows: T[];
    count: number;
}

export interface IDestroyOptions extends DestroyOptions {

}

export interface IUpdateOptions extends UpdateOptions {

}

export interface ISequelizeModel {
    count?: (opts: ICountOptionsExt) => Promise<number>,
    findAll?: (opts: IFindOptionsExt) => Promise<IDBGenericData[]>,
    findAndCountAll?: (opts: IFindAndCountOptionsExt) => Promise<IDBFindAndCountAll<IDBGenericData>>,
    // find?: (opts: IFindOptionsExt) => Promise<any>,
    findOne?: (opts: IFindOptionsExt) => Promise<IDBGenericData>,
    create?: (model: any, opts?: ICreateOptionsExt) => Promise<IDBGenericData>,
    bulkCreate?: (model: any, opts?: IBulkCreateOptionsExt) => Promise<IDBGenericData[]>,
    update?: (model: any, opts: IUpdateOptions) => Promise<[number, IDBGenericData[]]>
    destroy?: (opts: IDestroyOptions) => Promise<number>,
    // [key: string]: any
}