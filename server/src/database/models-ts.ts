export interface IDBModelSensor {
  id?: number,
  sensorId?: number,
  sensorTypeCode?: number,
  logRate?: number,
  topicCode?: number,
  timestamp?: Date,
  lat?: number,
  lng?: number,
  online?: number,
  sensorDatas?: IDBModelSensorData[],
  topic?: IDBModelTopic
}

export interface IDBModelSensorData {
  id?: number,
  sensorId?: number,
  chan?: number,
  value?: number,
  timestamp?: Date,
  sensor?: IDBModelSensor
}

export interface IDBModelTopic {
  id?: number,
  code?: number,
  name?: string,
  logRate?: number,
  sensors?: IDBModelSensor[]
}

