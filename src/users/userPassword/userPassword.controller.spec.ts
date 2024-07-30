import { Test, TestingModule } from '@nestjs/testing';
import { UserPasswordController } from './userPassword.controller';

describe('UserPasswordController', () => {
  let controller: UserPasswordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPasswordController],
    }).compile();

    controller = module.get<UserPasswordController>(UserPasswordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
