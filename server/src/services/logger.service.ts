import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { isObject } from 'lodash';


@Injectable()
export class LoggerService {

    constructor() {

    }

    setup(production: boolean) {

        // Custom format of the logs
        const myFormat = winston.format.printf(info => {
            // let message = formatObject(info.message);
            let message = info.message;
            return `[${info.label}] ${info.timestamp} ${info.level}: ${message}`;
        });


        function formatArg(d: any) {
            if (d instanceof Error) {
                return `${d.message}\nstack trace: ${d.stack}`;
            }
            if (isObject(d)) {
                return JSON.stringify(d, null, 2);
            }
            return d;
        }

        const winstonLogger = winston.createLogger({
            level: production ? 'error' : 'info',
            format: winston.format.combine(
                // winston.format.errors({ stack: true }), // <-- use errors format
                winston.format.splat(), // add 'meta' property
                // errorStackTracerFormat(),
                winston.format.colorize(),
                winston.format.label({ label: "app" }),
                winston.format.align(),
                winston.format.timestamp(),
                // winston.format.simple()
                myFormat
            ),
            // defaultMeta: { service: 'user-service' },
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log` 
                // - Write all logs error (and below) to `error.log`.
                //
                // new winston.transports.File({ filename: 'error.log', level: 'error' }),
                // new winston.transports.File({ filename: 'combined.log' }),
                new winston.transports.Console()
            ]
        });

        //
        // If we're not in production then log to the `console` with the format:
        // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
        // 

        // logger.add(new winston.transports.Console({
        //     format: winston.format.simple()
        // }));

        // if (process.env.NODE_ENV !== 'production') {
        //   logger.add(new winston.transports.Console({
        //     format: winston.format.simple()
        //   }));
        // }


        const processArgs = (args) => {
            var argsList = Array.from(args);
            let string = "";
            argsList.forEach(arg => {
                let arg1 = formatArg(arg);
                string += arg1;
            });
            return string;
        };

        const wrapper = (original) => {
            return (...args) => original(processArgs(args));
        };


        winstonLogger.error = wrapper(winstonLogger.error);
        winstonLogger.warn = wrapper(winstonLogger.warn);
        winstonLogger.info = wrapper(winstonLogger.info);
        winstonLogger.verbose = wrapper(winstonLogger.verbose);
        winstonLogger.debug = wrapper(winstonLogger.debug);
        winstonLogger.silly = wrapper(winstonLogger.silly);

        // Override the base console log with winston
        console.log = function () {
            return winstonLogger.info.apply(winstonLogger, arguments);
        };
        console.error = function () {
            return winstonLogger.error.apply(winstonLogger, arguments);
        };
        console.info = function () {
            return winstonLogger.warn.apply(winstonLogger, arguments);
        };
    }
}
