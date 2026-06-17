import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { AuthModule } from './modules/auth/auth.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { OwnerModule } from './modules/owner/owner.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
    PrismaModule,
    PropertiesModule,
    AuthModule,
    WatchlistModule,
    AlertsModule,
    ConversationsModule,
    OwnerModule,
    SettingsModule,
    AdminModule,
    OrdersModule,
    UploadsModule,
    RealtimeModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
