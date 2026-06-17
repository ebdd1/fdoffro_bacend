import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    smartAlert: {
      findMany: jest.fn().mockResolvedValue([{ id: 'alert-1', seekerId: 'user-seeker-1', city: 'Jakarta', keywords: 'wifi' }]),
      create: jest.fn().mockResolvedValue({ id: 'alert-1', seekerId: 'user-seeker-1', city: 'Jakarta', keywords: 'wifi' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySeekerId', () => {
    it('should return smart alerts for seeker (Happy Path)', async () => {
      const result = await service.findBySeekerId('user-seeker-1');
      expect(result).toEqual([{ id: 'alert-1', seekerId: 'user-seeker-1', city: 'Jakarta', keywords: ['wifi'] }]);
    });
  });

  describe('create', () => {
    it('should create and return smart alert (Happy Path)', async () => {
      const result = await service.create({
        seekerId: 'user-seeker-1',
        city: 'Jakarta',
        maxPrice: 2000000,
        keywords: ['wifi'],
      });
      expect(result).toEqual({ id: 'alert-1', seekerId: 'user-seeker-1', city: 'Jakarta', keywords: ['wifi'] });
    });
  });
});
