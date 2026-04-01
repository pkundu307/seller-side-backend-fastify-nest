import {
  Controller, Post, Body, Get, UseGuards,
  Req, HttpCode, HttpStatus, Patch, Param, BadRequestException, Query,
} from '@nestjs/common';
import { BusinessService }    from './business.service';
import { JwtAuthGuard }       from 'src/auth/jwt-auth.guard';
import { CreateBusinessDto }  from './dto/create-business.dto';
import { UpdateBusinessDto }  from './dto/update-business.dto';
import { FastifyRequest }     from 'fastify';
import { ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

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

  const ALWAYS_STRING_FIELDS = new Set([
    'phone', 'postalCode', 'panNumber', 'gstNumber',
    'bankAccountNo', 'bankIfscCode', 'upiId', 'slug',
  ]);

  const JSON_FIELDS = new Set([
    'socialLinks', 'invoiceConfig', 'businessConfig',
  ]);

  const KYC_FILE_FIELDS = new Set([
    'kyc_PAN', 'kyc_GST_CERTIFICATE', 'kyc_BANK_PROOF', 'kyc_ADDRESS_PROOF',
  ]);

  const dto: UpdateBusinessDto = {} as UpdateBusinessDto;
  let logoBuffer:      Buffer | undefined;
  let bannerBuffer:    Buffer | undefined;
  let signatureBuffer: Buffer | undefined;

  const kycBuffers: Partial<Record<
    'PAN' | 'GST_CERTIFICATE' | 'BANK_PROOF' | 'ADDRESS_PROOF',
    { buffer: Buffer; mimetype: string; originalname: string }
  >> = {};

  try {
    for await (const part of req.parts()) {

      // ── File Fields ──
      if ('file' in part && part.file) {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        if (part.fieldname === 'logo')           logoBuffer      = buffer;
        else if (part.fieldname === 'banner')    bannerBuffer    = buffer;
        else if (part.fieldname === 'signature') signatureBuffer = buffer;
        else if (KYC_FILE_FIELDS.has(part.fieldname)) {
          const kycType = part.fieldname.replace('kyc_', '') as keyof typeof kycBuffers;
          kycBuffers[kycType] = {
            buffer,
            mimetype:     part.mimetype,
            originalname: part.filename ?? 'document',
          };
        }

      // ── Text Fields ──
      } else if ('value' in part) {
        const key   = part.fieldname as string;
        const value = part.value     as string;

        if (JSON_FIELDS.has(key)) {
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
          !ALWAYS_STRING_FIELDS.has(key) &&
          !isNaN(Number(value)) &&
          value.trim() !== ''
        ) {
          (dto as any)[key] = Number(value);
        } else {
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
    {
      logo:      logoBuffer,
      banner:    bannerBuffer,
      signature: signatureBuffer,
      kycFiles:  Object.keys(kycBuffers).length > 0 ? kycBuffers : undefined,
    },
  );
}

@Get(':businessId/products')
@ApiOperation({ summary: 'Public: Fetch all products of a business by business ID' })
@ApiParam({ name: 'businessId', example: 'uuid-here', description: 'Business ID' })
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
@ApiResponse({ status: 200, description: 'Returns business products with pagination' })
@ApiResponse({ status: 404, description: 'Business not found' })
async getBusinessProducts(
  @Param('businessId') businessId: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.businessService.getBusinessProducts(businessId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 12,
  });
}
}