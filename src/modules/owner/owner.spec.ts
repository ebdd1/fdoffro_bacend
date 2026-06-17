import { Test, TestingModule } from '@nestjs/testing';
import { OwnerService } from './owner.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OwnerService', () => {
  let service: OwnerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    property: {
      findMany: jest.fn().mockResolvedValue([{ id: 'prop-1', name: 'Owner Kost' }]),
    },
    room: {
      findMany: jest.fn().mockResolvedValue([{ id: 'room-1', status: 'available' }]),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OwnerService>(OwnerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardData', () => {
    it('should return properties and rooms for dashboard (Happy Path)', async () => {
      const result = await service.getDashboardData('user-owner-1');
      expect(result).toEqual({
        properties: [{ id: 'prop-1', name: 'Owner Kost' }],
        rooms: [{ id: 'room-1', status: 'available' }],
      });
    });
  });

  describe('updateRoomStatus', () => {
    it('should return null if room not found (Error Case)', async () => {
      mockPrismaService.room.findUnique.mockResolvedValueOnce(null);
      const result = await service.updateRoomStatus('invalid-room', 'occupied');
      expect(result).toBeNull();
    });

    it('should update and return updated room (Happy Path)', async () => {
      mockPrismaService.room.findUnique.mockResolvedValueOnce({ id: 'room-1' });
      mockPrismaService.room.update.mockResolvedValueOnce({ id: 'room-1', status: 'occupied' });
      const result = await service.updateRoomStatus('room-1', 'occupied');
      expect(result).toEqual({ id: 'room-1', status: 'occupied' });
    });
  });
});
