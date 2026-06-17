import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    conversation: {
      findMany: jest.fn().mockResolvedValue([{ id: 'c-1', seekerId: 'seeker-1', ownerId: 'owner-1' }]),
      findUnique: jest.fn().mockResolvedValue({ id: 'c-1', seekerId: 'seeker-1', ownerId: 'owner-1' }),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'msg-1', content: 'test message' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should return conversations for user (Happy Path)', async () => {
      const result = await service.findByUserId('seeker-1');
      expect(result).toEqual([{ id: 'c-1', seekerId: 'seeker-1', ownerId: 'owner-1' }]);
    });
  });

  describe('createMessage', () => {
    it('should create message and update conversation (Happy Path)', async () => {
      const result = await service.createMessage('c-1', {
        senderId: 'seeker-1',
        content: 'test message',
      });
      expect(result).toEqual({ id: 'msg-1', content: 'test message' });
      expect(prisma.conversation.update).toHaveBeenCalledTimes(1);
    });
  });
});
