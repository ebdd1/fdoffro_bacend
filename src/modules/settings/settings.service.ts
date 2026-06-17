import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteConfigItemDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Public config — readable by anyone (used to render site name across the app)
  async getPublic() {
    return this.prisma.siteConfig.findMany({ where: { isPublic: true } });
  }

  // All config — admin only
  async getAll() {
    return this.prisma.siteConfig.findMany();
  }

  async upsertMany(items: SiteConfigItemDto[]) {
    const ops = items.map((item) =>
      this.prisma.siteConfig.upsert({
        where: { key: item.key },
        update: {
          value: item.value,
          ...(item.type ? { type: item.type } : {}),
          ...(item.isPublic !== undefined ? { isPublic: item.isPublic } : {}),
        },
        create: {
          key: item.key,
          value: item.value,
          type: item.type ?? 'string',
          isPublic: item.isPublic ?? true,
        },
      }),
    );
    await this.prisma.$transaction(ops);
    return this.getAll();
  }
}
