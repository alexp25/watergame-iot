


export interface IConfigEnv {
    db: {
        dbhost: string,
        dbuser: string,
        dbport: number,
        dbpassword: string,
        dbname: string
    },
    redis: {
        url: string,
        port: number,
        requirePassword: boolean,
        password: string
    },
    mqtt: {
        host: string,
        port: number,
        username: string,
        password: string,
        record: boolean,
        topics: {
            sub: IMQTTSubTopic[]
        }
    }
}


export interface IMQTTSubTopic {
    topic: string,
    record: boolean,
    cache: boolean
}

export interface IConfigData {
    [key: string]: IConfigEnv
}


export interface IRoute {
    in: string,
    out: string
}

export interface IService {
    url: string,
    enabled: boolean,
    routes: IRoute[]
}

export interface IServices {
    [key: string]: IService
}

export class Config {
    static jwtSecret: string = "gdashgh84/-=4-80-5648'i1oh22iureghn";
    static encryptionKeyAES: string = "546gdsi986e4rjiodh";
    static bypassRegister: boolean = false;
    static globalErrorTest: boolean = false;

    static nodeEnv: string = "";
    static env: IConfigEnv = {} as IConfigEnv;
    static services: IServices = {} as IServices;

    static production: boolean = false;
}
