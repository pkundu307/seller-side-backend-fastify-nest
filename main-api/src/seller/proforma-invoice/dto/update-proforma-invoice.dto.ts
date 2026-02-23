import { PartialType } from '@nestjs/swagger';
import { CreateProformaInvoiceDto } from './create-proforma-invoice.dto';

export class UpdateProformaInvoiceDto extends PartialType(CreateProformaInvoiceDto) {}