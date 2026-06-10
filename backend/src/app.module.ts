import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ModelsModule } from './models/models.module';
import { SharesModule } from './shares/shares.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { Request, Response, NextFunction } from 'express';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    ModelsModule,
    SharesModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        console.log(`[Request] ${req.method} ${req.originalUrl}`);
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`[Response] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        });
        next();
      })
      .forRoutes('*');
  }
}
