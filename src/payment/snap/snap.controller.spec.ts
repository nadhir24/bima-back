import { Test, TestingModule } from '@nestjs/testing';
import { SnapController } from './snap.controller';

describe('SnapController', () => {
  let controller: SnapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnapController],
    }).compile();

    controller = module.get<SnapController>(SnapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
