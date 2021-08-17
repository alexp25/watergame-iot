import { Module, HttpModule } from '@nestjs/common';
import { SensorsDataController } from './controllers/sensors/data.controller';
import { AppService } from './services/app.service';
import { AdminGuardService } from './services/auth/admin.service';
import { JWTAuthService } from './services/auth/jwt.service';
import { ConfigService } from './services/config/config.service';
import { DatabaseService } from './services/database.service';
import { DBQueryService } from './services/db/query.service';
import { DBUtilsService } from './services/db/utils.service';
import { GenericRequestService } from './services/generic-request.service';
import { LoggerService } from './services/logger.service';
import { RAMCacheService } from './services/cache/ram.service';
import { RedisCacheService } from './services/cache/redis.service';
import { ContextService } from './services/auth/context.service';
import { SensorsDataService } from './services/sensors/data.service';
import { SensorsManagerService } from './services/sensors/manager.service';
import { SensorsManagerController } from './controllers/sensors/manager.controller';
import { MQTTCoreService } from './services/mqtt/core.service';
import { MQTTCacheService } from './services/mqtt/cache.service';
import { MQTTUtilsService } from './services/mqtt/utils.service';
import { AdminServerController } from './controllers/admin/server.controller';
import { ExtApiAirlyDataService } from './services/extapi/airly.service';
import { ExtApiDataController } from './controllers/extapi/data.controller';

@Module({
  imports: [
    HttpModule
  ],
  controllers: [
    SensorsDataController,
    SensorsManagerController,
    AdminServerController,
    ExtApiDataController
  ],
  providers: [
    AppService,
    AdminGuardService,
    ContextService,
    JWTAuthService,
    ConfigService,
    DatabaseService,
    DBQueryService,
    DBUtilsService,
    GenericRequestService,
    LoggerService,
    RAMCacheService,
    RedisCacheService,
    SensorsDataService,
    SensorsManagerService,
    ExtApiAirlyDataService,
    MQTTCoreService,
    MQTTCacheService,
    MQTTUtilsService
  ],
})
export class AppModule {
  constructor(
    private logger: LoggerService,
    private config: ConfigService,
    private dbs: DatabaseService,
    private redis: RedisCacheService,
    private mqtt: MQTTCoreService
  ) {

    this.logger.setup(this.config.checkProd());
    console.log("winston logger enabled");

    // load config def
    this.config.loadEnvConfig();
    // load services definitions (local)
    this.config.loadLocalConfig();
    console.log("env config loaded");

    let awaitLoader = () => {
      let promise = new Promise(async (resolve, reject) => {
        try {
          // load services definitions (remote)
          await this.dbs.connectSequelize();
          console.log("established connection to database");
          this.redis.updateSettings();
          this.redis.connectClient();
          // mqtt
          this.mqtt.connect();
          resolve(true);
        } catch (e) {
          console.error(e);
          reject(e);
        }
      });
      return promise;
    };

    awaitLoader().then(() => {
      console.log("app init complete");
    }).catch((err: Error) => {
      console.warn("app init failed");
    });
  }
}
