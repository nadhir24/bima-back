import { forwardRef, Module } from '@nestjs/common';
import { SnapService } from './snap.service';
import { SnapController } from './snap.controller';
import { PrismaService } from 'prisma/prisma.service';
import { CartModule } from 'src/cart/cart.module';
import { CatalogModule } from 'src/catalog/catalog.module';



@Module({
  controllers: [SnapController],
  providers: [SnapService, PrismaService],
  imports: [
    forwardRef(() => CartModule),   
    forwardRef(() => CatalogModule),  
  ],
  exports: [SnapService], 
})
export class SnapModule {}
