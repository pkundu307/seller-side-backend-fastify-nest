import { Module, forwardRef } from '@nestjs/common';
import { SellerModule } from '../seller.module';
import { ProformaInvoiceController } from './proforma-invoice.controller';
import { ProformaInvoiceService } from './proforma-invoice.service';

@Module({
  imports: [
    forwardRef(() => SellerModule),
  ],
  controllers: [ProformaInvoiceController],
  providers: [ProformaInvoiceService],
  exports: [ProformaInvoiceService],
})
export class ProformaInvoiceModule {}