// src/seller/dto/update-pos-sale.dto.ts
import { CreatePosSaleDto } from './create-pos-sale.dto';

// We reuse the Create DTO because replacing the whole state is safer 
// for consistency than patching individual fields in a complex POS system.
export class UpdatePosSaleDto extends CreatePosSaleDto {}