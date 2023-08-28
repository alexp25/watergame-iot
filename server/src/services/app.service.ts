import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  counter: number = 0;
  getHello(): Promise<any> {
    let promise: Promise<any> = new Promise((resolve) => {
      let message: string = "Hello world! counter: " + this.counter;
      this.counter += 1;
      resolve({
        message: message
      });
    });
    return promise;
  }
}
