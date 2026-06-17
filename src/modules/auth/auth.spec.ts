import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMockMe', () => {
    it('should return seed user if exists (Happy Path)', async () => {
      const mockUser = {
        id: '123',
        name: 'Seed User',
        email: 'john@example.com',
        role: 'owner',
        avatar: null,
      };
      mockPrismaService.user.findFirst.mockResolvedValueOnce(mockUser);
      const result = await service.getMockMe();
      expect(result).toEqual(mockUser);
    });

    it('should return fallback user if seed not found (Fallback Case)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValueOnce(null);
      const result = await service.getMockMe();
      expect(result.id).toBe('user-seeker-1');
    });
  });
});
