import { Controller } from '@nestjs/common';
import { CustomerUserService } from './customer-user.service';

@Controller('customer-user')
export class CustomerUserController {
  constructor(private readonly customerUserService: CustomerUserService) {}
}
