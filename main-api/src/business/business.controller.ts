import {
  Controller, Post, Body, Get, UseGuards,
  Req, HttpCode, HttpStatus, Patch, Param, BadRequestException,
} from '@nestjs/common';
import { BusinessService }    from './business.service';
import { JwtAuthGuard }       from 'src/auth/jwt-auth.guard';
import { CreateBusinessDto }  from './dto/create-business.dto';
import { UpdateBusinessDto }  from './dto/update-business.dto';
import { FastifyRequest }     from 'fastify';
import { ApiConsumes }        from '@nestjs/swagger';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBusinessDto, @Req() req: FastifyRequest) {
    const user = req.user as any;
    return this.businessService.createBusiness(dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/mine')
  async getAll(@Req() req: FastifyRequest) {
    const user = req.user as any;
    return this.businessService.getAllBusinesses(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settingpage/:id')
  async getBusiness(@Param('id') id: string, @Req() req: FastifyRequest) {
    const user = req.user as any;
    return this.businessService.getBusinessForSettingById(id, user.id);
  }

 @UseGuards(JwtAuthGuard)
@Patch(':id')
@ApiConsumes('multipart/form-data')
async update(@Param('id') businessId: string, @Req() req: FastifyRequest) {
  const user = req.user as any;

  if (!req.isMultipart()) {
    throw new BadRequestException('Request must be multipart/form-data.');
  }

  // Fields that are strings in DB but look numeric — never auto-convert these
  const ALWAYS_STRING_FIELDS = new Set([
    'phone', 'postalCode', 'panNumber', 'gstNumber',
    'bankAccountNo', 'bankIfscCode', 'upiId', 'slug',
  ]);

  // Fields sent as JSON strings from frontend
  const JSON_FIELDS = new Set([
    'socialLinks', 'invoiceConfig', 'businessConfig',
  ]);

  const dto: UpdateBusinessDto = {} as UpdateBusinessDto;
  let logoBuffer:      Buffer | undefined;
  let bannerBuffer:    Buffer | undefined;
  let signatureBuffer: Buffer | undefined;

  try {
    for await (const part of req.parts()) {

      // ── File Fields ──
      if ('file' in part && part.file) {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        if (part.fieldname === 'logo')      logoBuffer      = buffer;
        if (part.fieldname === 'banner')    bannerBuffer    = buffer;
        if (part.fieldname === 'signature') signatureBuffer = buffer;

      // ── Text Fields ──
      } else if ('value' in part) {
        const key   = part.fieldname as string;
        const value = part.value     as string;

        if (JSON_FIELDS.has(key)) {
          // Parse JSON objects
          try {
            (dto as any)[key] = JSON.parse(value);
          } catch {
            throw new BadRequestException(`Invalid JSON for field "${key}"`);
          }
        } else if (value === 'true') {
          (dto as any)[key] = true;
        } else if (value === 'false') {
          (dto as any)[key] = false;
        } else if (
          !ALWAYS_STRING_FIELDS.has(key) &&  // Skip known string fields
          !isNaN(Number(value)) &&
          value.trim() !== ''
        ) {
          // Safe to convert to number (e.g. invoiceStartNumber)
          (dto as any)[key] = Number(value);
        } else {
          // Default: keep as string
          (dto as any)[key] = value;
        }
      }
    }
  } catch (error: any) {
    if (error instanceof BadRequestException) throw error;
    console.error('[BUSINESS UPDATE] Multipart parse error:', error);
    throw new BadRequestException(`Failed to parse request: ${error.message}`);
  }

  return this.businessService.updateBusiness(
    businessId,
    user.id,
    dto,
    { logo: logoBuffer, banner: bannerBuffer, signature: signatureBuffer },
  );
}
}