import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    property: {
      findMany: jest.fn().mockResolvedValue([{ id: 'prop-1', name: 'Kost Mawar', facilities: 'WiFi,AC' }]),
      findUnique: jest.fn(),
    },
    room: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of properties (Happy Path)', async () => {
      const result = await service.findAll();
      expect(result).toEqual([{ id: 'prop-1', name: 'Kost Mawar', facilities: ['WiFi', 'AC'] }]);
      expect(prisma.property.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return null if property not found (Error Case)', async () => {
      mockPrismaService.property.findUnique.mockResolvedValueOnce(null);
      const result = await service.findOne('invalid-id');
      expect(result).toBeNull();
    });
  });
});
