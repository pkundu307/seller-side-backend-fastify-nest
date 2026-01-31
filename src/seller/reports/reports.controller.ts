import { 
  Controller, 
  Get, 
  Param, 
  ParseUUIDPipe, 
  Req, 
  UseGuards,
  Inject,
  forwardRef,
  Post,
  Body,
  Delete
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserRequest } from 'src/auth/auth.types';
import { SellerService } from '../seller.service';
import { CreateCapitalDto, CreateFixedAssetDto, CreateInvestmentDto, CreateLoanAdvanceDto, CreateLoanDto, CreateLoanLiabilityDto, CreateTaxPayableDto } from './dto/balance-sheet-entry.dto';

@ApiTags('Seller Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller/:businessId/reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    // Inject SellerService to use the verifyOwnership method
    @Inject(forwardRef(() => SellerService))
    private readonly sellerService: SellerService
  ) {}

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get a live Balance Sheet for the business' })
  async getBalanceSheet(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Req() req: UserRequest,
  ) {
    // 1. Verify user owns this business
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    
    // 2. Call the new service to get data
    return this.reportsService.getBalanceSheet(businessId);
  }

    @Post('fixed-assets')
  @ApiOperation({ summary: 'Add a new Fixed Asset (e.g., Laptop, Machinery)' })
  async addFixedAsset(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateFixedAssetDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.reportsService.addFixedAsset(businessId, dto);
  }

  @Post('loans')
  @ApiOperation({ summary: 'Add a new Loan (Liability)' })
  async addLoan(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateLoanDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.reportsService.addLoan(businessId, dto);
  }

    @Post('loans-liability')
  @ApiOperation({ summary: 'Add a new Loan Taken (Liability)' })
  async addLoanLiability(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateLoanLiabilityDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.reportsService.addLoanLiability(businessId, dto);
  }

  @Post('loans-advance')
  @ApiOperation({ summary: 'Add a new Loan Given (Asset)' })
  async addLoanAdvance(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateLoanAdvanceDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.reportsService.addLoanAdvance(businessId, dto);
  }

  @Post('investments')
  @ApiOperation({ summary: 'Add a new Investment (Asset)' })
  async addInvestment(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateInvestmentDto,
    @Req() req: UserRequest
  ) {
    await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
    return this.reportsService.addInvestment(businessId, dto);
  }

    @Post('capital')
  @ApiOperation({ summary: 'Add Owner Capital to the business' })
  async addCapital(@Body() dto: CreateCapitalDto, @Param('businessId') businessId: string) {
    // Note: Ownership already verified by the main guard on the controller
    return this.reportsService.addCapital(businessId, dto);
  }

  @Post('tax-payable')
  @ApiOperation({ summary: 'Add a manual Tax Liability (TDS/TCS)' })
  async addTaxPayable(@Body() dto: CreateTaxPayableDto, @Param('businessId') businessId: string) {
    return this.reportsService.addTaxPayable(businessId, dto);
  }

  // --- UPDATE / DELETE APIs ---

  @Delete('fixed-assets/:assetId')
  @ApiOperation({ summary: 'Delete a Fixed Asset' })
  async deleteFixedAsset(
    @Param('businessId') businessId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.reportsService.deleteFixedAsset(businessId, assetId);
  }

  @Delete('loans/:loanName')
@ApiOperation({ summary: 'Delete a Loan account' })
async deleteLoan(
  @Param('businessId', ParseUUIDPipe) businessId: string,
  @Param('loanName') loanName: string,
  @Req() req: UserRequest
) {
  await this.sellerService.verifyBusinessOwnership(req.user.id, businessId);
  return this.reportsService.deleteLoan(businessId, loanName);
}
}