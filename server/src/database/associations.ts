
export interface IDBAssociationModels {

    [key: string]: IDBAssociationModel
}

export interface IDBAssociationModel {
    hasMany?(model: any, a: {
        foreignKey: string,
        sourceKey?: string
    }): void;
    belongsTo?(model: any, a: {
        foreignKey: string,
        targetKey?: string
    }): void;
}

export class DBIndexWithAssociations {
    static init(m: IDBAssociationModels) {

        m.topic.hasMany(m.sensor, {
            foreignKey: "topicCode",
            sourceKey: "code"
        });
        m.sensor.belongsTo(m.topic, {
            foreignKey: "topicCode",
            targetKey: "code"
        });

        m.sensor.hasMany(m.sensorData, {
            foreignKey: "sensorId",
            sourceKey: "id"
        });
        m.sensorData.belongsTo(m.sensor, {
            foreignKey: "sensorId",
            targetKey: "id"
        });

        return m;
    }
};

