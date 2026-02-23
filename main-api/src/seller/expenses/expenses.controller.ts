import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Req, Query, ParseUUIDPipe, Inject, forwardRef 
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRequest } from 'src/auth/auth.types';
import { SellerService } from '../seller.service';

@ApiTags('Seller Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Record a new business expense' })
  async create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateExpenseDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.expensesService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses with pagination' })
  async findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: ExpenseQueryDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.expensesService.findAll(businessId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense details' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.expensesService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense metadata (Notes, Vendor, Date only)' })
  async update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.expensesService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense and reverse financial transaction' })
  async remove(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.expensesService.remove(businessId, id);
  }
}