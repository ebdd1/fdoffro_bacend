import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { unlink } from 'fs/promises';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

// Hard multer ceiling; the admin-configured limit (max_upload_mb) is enforced
// per-request inside the handler and is always <= this value.
const MAX_UPLOAD_CEILING = 50 * 1024 * 1024;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private prisma: PrismaService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image, returns its absolute URL' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_UPLOAD_CEILING },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Hanya file gambar yang diperbolehkan'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('File tidak ditemukan');

    // Enforce the admin-configured size limit (defaults to 5MB).
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'max_upload_mb' } });
    const maxMb = cfg ? Number(cfg.value) || 5 : 5;
    if (file.size > maxMb * 1024 * 1024) {
      // Remove the file that multer already wrote to disk.
      await unlink(file.path).catch(() => {});
      throw new BadRequestException(`Ukuran file melebihi batas ${maxMb}MB`);
    }

    const base = `${req.protocol}://${req.get('host')}`;
    return { url: `${base}/uploads/${file.filename}` };
  }
}
