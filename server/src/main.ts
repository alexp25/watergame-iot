import { NestFactory, NestApplication } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder, SwaggerDocument, SwaggerBaseConfig } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import * as fs from 'fs';
var sourceMapSupport = require('source-map-support');
var Swagger2Postman = require("swagger2-postman-generator");


async function bootstrap() {
  const app: NestApplication = await NestFactory.create(AppModule);

  // stack traces from ts sources instead of compiled js files
  sourceMapSupport.install();

  let templatesFolder: string = path.join(__dirname, "templates");
  console.log("templates folder: ", templatesFolder);

  app.useStaticAssets(templatesFolder);
  // the next two lines did the trick
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const corsOptions: CorsOptions = {
    origin: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204 
  };

  app.enableCors(corsOptions);

  // setup swagger
  const options: SwaggerBaseConfig = new DocumentBuilder()
    .setTitle('Watergame IoT')
    .setDescription('')
    .setVersion('1.0')
    .addBearerAuth("Authorization", "header")
    // .addTag('news')
    .build();
  const document: SwaggerDocument = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
  const document2: SwaggerDocument = SwaggerModule.createDocument(app, options, {
    include: [
      AppModule
    ]
  });
  SwaggerModule.setup('api/ext', app, document2);

  const writeSwag: boolean = false;

  if (writeSwag) {
    const swaggerFile = "./swagger-spec.json";
    fs.writeFileSync(swaggerFile, JSON.stringify(document));

    Swagger2Postman
      .convertSwagger()
      .fromFile(swaggerFile)
      .toPostmanCollectionFile("postman_collection.json");
  }

  const port = 8081;
  var server = app.listen(port, () => {
    console.log('Listening at http://localhost:' + port + '/');
  });

  await server;
}
bootstrap();
