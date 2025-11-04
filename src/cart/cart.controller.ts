// src/cart/cart.controller.ts

import {
  Controller,
  Post,
  UseGuards,
  Req,
  BadRequestException,
  Get,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UserRequest } from 'src/auth/auth.types';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

    @Post('test-multipart')
  @ApiConsumes('multipart/form-data')
  async testMultipartParsing(@Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      return { error: 'Request is not multipart' };
    }

    console.log('--- HITTING /cart/test-multipart ---');
    const fields: any = {};
    let fileCount = 0;

    try {
      for await (const part of req.parts() as any) {
        if ("file" in part) {
          fileCount++;
          // We don't need to process the buffer for this test
          console.log(`Found file: fieldname='${part.fieldname}', filename='${part.filename}'`);
        } else if ("value" in part) {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (error) {
        console.error("Error during multipart parsing:", error);
        return { error: 'Failed to parse multipart data', message: error.message };
    }


    console.log('--- PARSED FIELDS ---');
    console.log(fields);
    console.log('--- FILE COUNT ---');
    console.log(fileCount);

    return {
      message: 'Parsing test successful. Check your NestJS console logs.',
      parsedFields: fields,
      filesFound: fileCount,
    };
  }

  @Post('add-item')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add an item to the cart, with optional customization files." })
  @ApiConsumes('multipart/form-data') // Crucial for Swagger UI
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      productId: { type: 'string', format: 'uuid' },
      variantId: { type: 'string', format: 'uuid' },
      quantity: { type: 'number', default: 1 },
      customizationDetails: {
        type: 'string',
        description: 'JSON string containing customization metadata',
        example: '{"instructions": "Add glitter text", "color": "blue"}',
      },
      customizationImages: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
      },
    },
    required: ['productId', 'quantity'],
  },
})

  async addItemToCart(@Req() req: UserRequest) {
    console.log(req.isMultipart(),req.multipart);
    
    if (!req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data.');
    }
console.log(req);

    const customerUserId = req.user.id;
    
    // 1. Parse the multipart data
    const { fields, files } = await this.parseMultipartCartData(req);

    // 2. Manually create and validate the DTO from the text fields
    const dtoData = {
      ...fields,
      // Ensure numeric fields are correctly typed
      quantity: fields.quantity ? parseInt(fields.quantity, 10) : undefined,
    };
    const dto = plainToInstance(AddToCartDto, dtoData);
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    // 3. Call the service with the DTO and the parsed files
    return this.cartService.addItem(customerUserId, dto, files);
  }

  private async parseMultipartCartData(req: FastifyRequest): Promise<{ fields: any; files: any[] }> {
    const fields: any = {};
    const files: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];

    for await (const part of req.parts() as any) {
      if ("file" in part) {
        // We only care about files for customization
        if (part.fieldname === 'customizationImages') {
          const buffer = await part.toBuffer();
          files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
        }
      } else if ("value" in part) {
        fields[part.fieldname] = part.value;
      }
    }
    return { fields, files };
  }
    @Get()
    
  @ApiOperation({ summary: 'Get all items in the authenticated user\'s cart' })
  async getCart(@Req() req: UserRequest) {
    return this.cartService.getCartItems(req.user.id);
  }

  // --- NEW API 2: Update Cart Item by ID ---
  @Patch(':id')
  @ApiOperation({ summary: 'Update the quantity or customization details of a cart item' })
  async updateCartItem(
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: UserRequest,
  ) {
    return this.cartService.updateCartItem(req.user.id, cartItemId, dto);
  }
}