import { Injectable } from "@nestjs/common";

export interface ICsvSensorData {
    sensorType: number,
    sensorId: number,
    message: string,
    data: number[]
}

@Injectable()
export class MQTTUtilsService {

    constructor(

    ) {

    }

    getCsvData(message: string): ICsvSensorData {
        // node_type, node_id, cmd, data
        let csv: string[] = message.split(",");
        let csvdata: string[] = csv.slice(3);
        let data: ICsvSensorData = null;
        try {
            data = {
                sensorType: Number.parseInt(csv[0]),
                sensorId: Number.parseInt(csv[1]),
                message: message,
                data: csvdata.map(v => Number.parseInt(v))
            };
        } catch (err) {
            console.error(err);
        }
        return data;
    }

    getFullSensorId(topicCode: number, sensorId: number) {
        let sid: number = 0;
        sid = topicCode * 1000000 + sensorId;
        // console.log(topicCode, "\n", sensorId, "\n", topicCode * 1000000, "\n", sid);
        return sid;
    }

}; 