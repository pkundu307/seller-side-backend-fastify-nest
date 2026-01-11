import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [PrismaModule],
  providers: [PdfService],
  exports: [PdfService], // Export the service so other modules can use it
})
export class PdfModule {}