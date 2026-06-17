import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistService } from './watchlist.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let prisma: PrismaService;

  const mockPrismaService = {
    watchlist: {
      findMany: jest.fn().mockResolvedValue([{ id: 'wl-1', seekerId: 'user-seeker-1', propertyId: 'prop-1' }]),
      upsert: jest.fn().mockResolvedValue({ id: 'wl-1', seekerId: 'user-seeker-1', propertyId: 'prop-1' }),
      delete: jest.fn().mockResolvedValue({ id: 'wl-1' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WatchlistService>(WatchlistService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySeekerId', () => {
    it('should return watchlist items for seeker (Happy Path)', async () => {
      const result = await service.findBySeekerId('user-seeker-1');
      expect(result).toEqual([{ id: 'wl-1', seekerId: 'user-seeker-1', propertyId: 'prop-1' }]);
    });
  });

  describe('remove', () => {
    it('should delete and return deleted watchlist item (Happy Path)', async () => {
      const result = await service.remove('wl-1');
      expect(result).toEqual({ id: 'wl-1' });
    });
  });
});
