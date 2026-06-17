import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async findBySeekerId(seekerId: string) {
    const alerts = await this.prisma.smartAlert.findMany({
      where: { seekerId },
      include: { keywords: true }
    });
    return alerts.map(a => ({
      ...a,
      keywords: a.keywords ? a.keywords.map(k => k.word) : [],
    }));
  }

  async create(dto: CreateAlertDto) {
    const keywordOps = dto.keywords && dto.keywords.length > 0 
      ? dto.keywords.map(kw => ({ where: { word: kw }, create: { word: kw } }))
      : [];

    const created = await this.prisma.smartAlert.create({
      data: {
        seekerId: dto.seekerId,
        city: dto.city,
        maxPrice: dto.maxPrice,
        keywords: {
          connectOrCreate: keywordOps
        }
      },
      include: { keywords: true }
    });
    return {
      ...created,
      keywords: created.keywords ? created.keywords.map(k => k.word) : [],
    };
  }
}
