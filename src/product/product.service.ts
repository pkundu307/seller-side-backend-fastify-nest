// src/products/products.service.ts
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './utils/S3Service'
import slugify from 'slugify';
import { randomUUID, randomInt } from 'crypto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /** Type‑guard: true if this part is a file */
  private isFile(part: any): part is MultipartFile {
    return typeof part.file === 'function';
  }

  /** Parse multipart & create product */
  async handleMultipart(
    req: FastifyRequest,
    businessId: string,
    ownerId: string,          //  kept in case you later check ownership
  ) {
    const body: Record<string, any> = {};
    const files: MultipartFile[] = [];

    for await (const part of req.parts()) {
      if (this.isFile(part)) files.push(part);
      else                   body[part.fieldname] = part.value;
    }

    // ----- basic validation -----
    const required = ['title', 'description', 'price', 'itemCategory'];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) throw new BadRequestException(
      `Missing required fields: ${missing.join(', ')}`,
    );

    // ----- upload images -----
    const imageUrls = await Promise.all(
      files.map(async (f) =>
        this.s3.uploadImage(await f.toBuffer(), f.filename, f.mimetype)),
    );

    // ----- slug & itemCode -----
    const slug =
      `${slugify(body.title, { lower: true })}-${randomInt(1000, 9999)}`;
    const itemCode = `IC-${randomUUID().slice(0, 8)}`;

    // ----- create product -----
    const product = await this.prisma.product.create({
      data: {
        businessId,
        title:          body.title,
        description:    body.description,
        price:          parseFloat(body.price),
        images:         imageUrls,
        slug,
        itemCategory:   body.itemCategory,
        itemType:       body.itemType       ?? null,
        sellingPrice:   body.sellingPrice   ? parseFloat(body.sellingPrice)   : null,
        mrp:            body.mrp            ? parseFloat(body.mrp)            : null,
        discountPercent:body.discountPercent? parseFloat(body.discountPercent): null,
        discountAmount: body.discountAmount ? parseFloat(body.discountAmount) : null,
        unit:           body.unit           ?? null,
        openingStock:   body.openingStock   ? parseFloat(body.openingStock)   : null,
        itemCode,
        variants: body.variants
          ? { createMany: { data: JSON.parse(body.variants) } }
          : undefined,
      },
    });

    return { message: 'Product created', product };
  }
}
