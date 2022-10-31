import { Controller, Res, Post, Body } from '@nestjs/common';
import { ApiResponse, ApiModelProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { IGenericResponseWrapper } from '../../classes/generic/response';
import { GenericRequestService } from '../../services/generic-request.service';
import { Config } from '../../classes/global/config';
import { IApiGenericRequest } from '../../classes/generic/request';
import { title } from 'process';
import { Bool } from 'aws-sdk/clients/clouddirectory';

const axios = require('axios').default

const SUMMARY_ANNOTATION = "summary"
const DESCRIPTION_ANNOTATION = "description"
const NOTIFICATIONS_COLLECTION = "notifications"
const ALERT_PREFIX = "[SYS ALERT] "

enum Status {
    FIRING = "firing",
    RESOLVED = "resolved"
}

class Alert {
    status: Status;
    labels: Object;
    annotations: Object;
}

enum NotificationType {
    SENSOR_REQUEST,
    SERVICE_REQUEST,
    COMPLAINT
}

class NotificationBody {
    customerCode: String;
    date: String;
    message: String;
    notificationId: String;
    read: Bool;
    subject: String;
    type: NotificationType
}

export class IApiPostAlertRequest extends IApiGenericRequest {
    @ApiModelProperty({
        enum: Object.values(Status)
    })
    status: Status;
    groupLabels: Object;
    commonLabels: Object;
    commonAnnotations: Object;
    alerts: Array<Alert>;
}

function sendNotification(summary: String, body: String) {
    var id = Math.floor(Date.now())
    var url = `${Config.env.firebaseUrl}/${NOTIFICATIONS_COLLECTION}/${id}.json`
    var data = {
        "customerCode": "0",
        "message": body + `\n\n${Date().toLocaleUpperCase()}\n`,
        "read": false,
        "subject": `${ALERT_PREFIX}${summary}`,
        "notificationId": id,
        "type": "SENSOR_REQUEST"
    }
    if(Config.env.firebaseUrl)
        axios.put(url, data)
    console.log(`[NOTIF_SEND] URL: ${url}, Data: ${JSON.stringify(data)}`)
}

interface NotificationBodyMap { [key: string]: NotificationBody; }

function resolveNotification(summary: String) {
    var url = `${Config.env.firebaseUrl}/${NOTIFICATIONS_COLLECTION}.json`
    if(Config.env.firebaseUrl)
        axios.get(url).then(resp => {
            var data: NotificationBodyMap = resp.data
            for (const [id, notifBody] of Object.entries(data)) {
                if(notifBody.subject === `${ALERT_PREFIX}${summary}`){
                    var deleteUrl = `${Config.env.firebaseUrl}/${NOTIFICATIONS_COLLECTION}/${id}.json`
                    if(Config.env.firebaseUrl)
                        axios.delete(deleteUrl)
                    console.log(`[NOTIF_DELETE] URL: ${deleteUrl}`)
                }
            }
        })
}

@Controller('alerts')
export class AlertsController {

    @Post('handler')
    @ApiResponse({
        status: 200,
        type: null,
    })
    handleAlert(@Res() res: Response, @Body() body: IApiPostAlertRequest) {
        body.alerts.forEach(alert => {
            var summary = alert.annotations[SUMMARY_ANNOTATION]
            var description = alert.annotations[DESCRIPTION_ANNOTATION]
            console.log(`Received alert: ${JSON.stringify(alert)}`)
            if(alert.status == Status.FIRING) {
                sendNotification(
                    summary,
                    description
                )
            } else {
                resolveNotification(summary)
            }
        })
        res.status(200).send()
    }
}
