import { forwardRef, Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PrismaService } from 'prisma/prisma.service';
import { SnapModule } from 'src/payment/snap/snap.module';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, PrismaService],
  imports: [
    forwardRef(() => SnapModule), // Resolve circular dependency with SnapModule
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
