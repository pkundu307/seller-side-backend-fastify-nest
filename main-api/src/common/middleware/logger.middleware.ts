import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'http';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const { method, url } = req;
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const { statusCode } = res;

      // Color by status range
      const color =
        statusCode >= 500
          ? '\x1b[31m' // red
          : statusCode >= 400
            ? '\x1b[33m' // yellow
            : '\x1b[32m'; // green
      const reset = '\x1b[0m';

      this.logger.log(
        `${method} ${url} ${color}${statusCode}${reset} +${ms}ms`,
      );
    });

    next();
  }
}
