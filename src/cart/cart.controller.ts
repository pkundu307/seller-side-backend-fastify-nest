import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Req,
  BadRequestException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRequest } from 'src/auth/auth.types';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** -------------------------------
   * 🧪 Test multipart parsing (debug)
   * ------------------------------- */
@Post('test-multipart')
@ApiConsumes('multipart/form-data')
async testMultipart(@Req() req: FastifyRequest) {
  console.log(req.body); // ✅ fields + files available here directly
  return { message: 'Parsed!', bodyKeys: Object.keys(req) };
}


  /** -------------------------------
   * 🛒 Add item to cart
   * ------------------------------- */
  @Post('add-item')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add an item to the cart (with optional customization)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', format: 'uuid' },
        variantId: { type: 'string', format: 'uuid' },
        quantity: { type: 'number', default: 1 },
        customizationDetails: {
          type: 'string',
          example: '{"instructions":"Add logo to front"}',
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
    if (!req.isMultipart())
      throw new BadRequestException('Request must be multipart/form-data.');

    const customerUserId = req.user.id;
    const { fields, files } = await this.parseMultipartData(req);

    const dto = plainToInstance(AddToCartDto, {
      ...fields,
      quantity: fields.quantity ? parseInt(fields.quantity, 10) : 1,
    });
    const errors = await validate(dto);
    if (errors.length > 0) throw new BadRequestException(errors);

    return this.cartService.addItem(customerUserId, dto, files);
  }

  /** -------------------------------
   * 📦 Get all cart items for user
   * ------------------------------- */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all cart items for logged-in user' })
  async getCart(@Req() req: UserRequest) {
    return this.cartService.getCartItems(req.user.id);
  }

  /** -------------------------------
   * ✏️ Update cart item by ID
   * ------------------------------- */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item (quantity/details/images)' })
  async updateCartItem(
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: UserRequest,
  ) {
    return this.cartService.updateCartItem(req.user.id, cartItemId, dto);
  }

  /** -------------------------------
   * 🧩 Helper: Parse multipart
   * ------------------------------- */
  private async parseMultipartData(
    req: FastifyRequest,
  ): Promise<{ fields: any; files: any[] }> {
    const fields: Record<string, string> = {};
    const files: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];

    for await (const part of req.parts() as any) {
      if ('file' in part && part.fieldname === 'customizationImages') {
        const buffer = await part.toBuffer();
        files.push({ buffer, filename: part.filename, mimetype: part.mimetype });
      } else if ('value' in part) {
        fields[part.fieldname] = part.value;
      }
    }

    return { fields, files };
  }
}
