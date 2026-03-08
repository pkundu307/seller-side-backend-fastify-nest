import { Test, TestingModule } from '@nestjs/testing';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';

describe('PartyController', () => {
  let controller: PartyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartyController],
      providers: [PartyService],
    }).compile();

    controller = module.get<PartyController>(PartyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
