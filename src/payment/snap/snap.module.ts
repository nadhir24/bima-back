import { forwardRef, Module } from '@nestjs/common';
import { SnapService } from './snap.service';
import { SnapController } from './snap.controller';
import { PrismaService } from 'prisma/prisma.service';
import { CartModule } from 'src/cart/cart.module';
import { CatalogModule } from 'src/catalog/catalog.module';

console.log('Initializing SnapModule');

@Module({
  controllers: [SnapController],
  providers: [SnapService, PrismaService],
  imports: [
    forwardRef(() => CartModule),   // Resolve circular dependency with CartModule
    forwardRef(() => CatalogModule),  // Resolve circular dependency with CatalogModule
  ],
  exports: [SnapService], // Export SnapService for use by modules that import SnapModule
})
export class SnapModule {}
