import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { ApiUseTags } from '@nestjs/swagger';

@ApiUseTags('server')
@Controller('server')
export class ServerController {
  constructor(
    private appService: AppService
  ) { }

  @Get('hello')
  async getHello(): Promise<any> {
    return this.appService.getHello();
  }

}
