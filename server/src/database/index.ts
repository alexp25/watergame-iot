
import * as path from 'path';


export class DBIndex {

    static getModelPath() {
        let modelPath: string = path.join(__dirname, './models/');
        return modelPath;
    };

    // load models
    static models: string[] = [
        'sensor',
        'sensor_data',
        'topic'
    ];
}
