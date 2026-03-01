import { Module } from '@nestjs/common';
import { DebitNoteController } from './debit-note.controller';
import { DebitNoteService } from './debit-note.service';

@Module({
  controllers: [DebitNoteController],
  providers: [DebitNoteService]
})
export class DebitNoteModule {}
