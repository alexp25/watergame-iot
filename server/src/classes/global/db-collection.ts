import { ISequelizeModel } from "./db";

export interface IDBCollection {
	sensor: ISequelizeModel,
	sensorData: ISequelizeModel,
	topic: ISequelizeModel
}