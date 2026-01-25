import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Req, ParseUUIDPipe 
} from '@nestjs/common';
import { BankCashChequeService } from './bank-cash-cheque.service';
import { CreateBankAccountDto, TransferMoneyDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

@ApiTags('Finance & Banking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business/:businessId/accounts')
export class BankCashChequeController {
  constructor(private readonly bankService: BankCashChequeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Bank, Cash, or UPI Account' })
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateBankAccountDto,
    @Req() req: FastifyRequest
  ) {
    const user = req.user as any;
    return this.bankService.create(businessId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts for this business' })
  findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: FastifyRequest
  ) {
    const user = req.user as any;
    return this.bankService.findAll(businessId, user.id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Internal Money Transfer between accounts' })
  transfer(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: TransferMoneyDto,
    @Req() req: FastifyRequest
  ) {
    const user = req.user as any;
    return this.bankService.transferMoney(businessId, user.id, dto);
  }

  @Patch(':accountId')
  @ApiOperation({ summary: 'Update account details' })
  update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: UpdateBankAccountDto,
    @Req() req: FastifyRequest
  ) {
    const user = req.user as any;
    return this.bankService.update(businessId, accountId, user.id, dto);
  }

  @Delete(':accountId')
  @ApiOperation({ summary: 'Delete or Disable an account' })
  remove(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Req() req: FastifyRequest
  ) {
    const user = req.user as any;
    return this.bankService.remove(businessId, accountId, user.id);
  }
}