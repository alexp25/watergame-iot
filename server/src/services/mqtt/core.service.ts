import { Injectable } from "@nestjs/common";
import { Config, IMQTTSubTopic } from "../../classes/global/config";
import { MQTTCacheService } from "./cache.service";
import { MQTTUtilsService, ICsvSensorData } from "./utils.service";
import { SensorsDataService } from "../sensors/data.service";

const mqtt = require('mqtt')

export interface IMQTTStatusReport {
    log: string;
    error: any;
    key: any;
    connected: boolean;
}

interface IMQTTConnect {
    host: string,
    port: number
}

interface MQTTOptions {
    //is the WebSocket connection options.Default is { }.It's specific for WebSockets. For possible options have a look at: https://github.com/websockets/ws/blob/master/doc/ws.md.
    wsOptions?: any,
    // 60 seconds, set to 0 to disable
    keepalive?: number,
    //reschedule ping messages after sending packets(default true)
    reschedulePings?: boolean,
    //'mqttjs_' + Math.random().toString(16).substr(2, 8)
    clientId?: string,
    //'MQTT'
    protocolId?: string,
    //4
    protocolVersion?: number,
    // set to false to receive QoS 1 and 2 messages while offline
    clean?: boolean,
    //1000 milliseconds, interval between two reconnections.Disable auto reconnect by setting to 0.
    reconnectPeriod?: number,
    //30 * 1000 milliseconds, time to wait before a CONNACK is received
    connectTimeout?: number,
    // the username required by your broker, if any
    username?: string,
    // the password required by your broker, if any
    password?: string,
    // a Store for the incoming packets
    incomingStore?: any,
    // a Store for the outgoing packets
    outgoingStore?: any,
    // if connection is broken, queue outgoing QoS zero messages(default true)
    queueQoSZero?: boolean,
    // MQTT 5 feature of custom handling puback and pubrec packets.Its callback:
    customHandleAcks?: any
}

@Injectable()
export class MQTTCoreService {

    client: any;

    debug: boolean = false;
    lastMQTTStateLog: string = "";
    connected: boolean = false;

    constructor(
        private cache: MQTTCacheService,
        private utils: MQTTUtilsService,
        public sd: SensorsDataService
    ) {

    }

    connect() {
        let options: MQTTOptions = {
            username: Config.env.mqtt.username,
            password: Config.env.mqtt.password
        };

        let conn: IMQTTConnect = {
            host: 'mqtt://' + Config.env.mqtt.host + ":" + Config.env.mqtt.port,
            port: Config.env.mqtt.port,
        };

        console.log(Config.env.mqtt.topics.sub);
        let subTopics: string[] = Config.env.mqtt.topics.sub.map(topic => topic.topic);

        this.client = mqtt.connect(conn.host, options);
        this.client.on('connect', () => {
            console.log("connected to mqtt broker");
            this.connected = true;
            for (let topic of subTopics) {
                console.log("unsubscribing topic: ", topic);
                this.client.unsubscribe(topic);
                console.log("subscribing topic: ", topic);
                this.client.subscribe(topic);
            }
        });

        this.client.on('message', (topic, message) => {
            message = message.toString();
            if (this.debug)
                console.log('received message via topic: ', topic, " - ", message);
            this.checkUpdateCache(topic, message);
            if (Config.env.mqtt.record) {
                this.checkRecorder(topic, message);
            }
        });

        this.client.on("error", (error) => {
            this.connected = false;
            console.error("Can't connect" + error);
        });
    }

    /**
    * test current connection state and error logs
    */
    testConnection(): Promise<IMQTTStatusReport> {
        return new Promise((resolve) => {
            let report: IMQTTStatusReport = {
                log: this.lastMQTTStateLog,
                error: null,
                key: null,
                connected: false
            };
            if (this.connected) {
                report.log = this.lastMQTTStateLog;
                report.connected = true;
                resolve(report);
            } else {
                report.log = this.lastMQTTStateLog;
                report.connected = false;
                resolve(report);
            }
        });
    }

    checkUpdateCache(topic: string, message: string) {
        let subTopics: IMQTTSubTopic[] = Config.env.mqtt.topics.sub;
        let subTopic: IMQTTSubTopic = subTopics.find(el => el.topic === topic);
        if (subTopic) {
            if (subTopic.cache) {
                if (this.debug)
                    console.log("caching data: ", message);
                let csv: ICsvSensorData = this.utils.getCsvData(message);
                if (csv != null) {
                    this.cache.updateStatus("" + csv.sensorId, csv.message);
                }
            }
        }
    }

    checkRecorder(topic: string, message: string) {
        let subTopics: IMQTTSubTopic[] = Config.env.mqtt.topics.sub;
        let subTopic: IMQTTSubTopic = subTopics.find(el => el.topic === topic);
        if (subTopic) {
            if (subTopic.record) {
                if (this.debug)
                    console.log("recording: ", message);
                let csv: ICsvSensorData = this.utils.getCsvData(message);
                if (csv != null) {
                    this.sd.registerSensorDataMQTT(topic, csv.sensorId, csv.message).then(() => {

                    }).catch((err) => {
                        console.error(err);
                    });
                }
            }
        }
    }
}; 