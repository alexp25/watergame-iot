import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(id: number): Promise<any> {
    let promise: Promise<any> = new Promise((resolve, reject) => {
      resolve({
        message: "Hello world! id: " + id
      });
    });
    return promise;
  }
}
