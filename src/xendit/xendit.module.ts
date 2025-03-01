import { Module } from '@nestjs/common';
import { XenditService } from './xendit.service';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule

@Module({
  imports: [HttpModule], // Import HttpModule
  providers: [XenditService],
  exports: [XenditService], // Export XenditService agar bisa digunakan di module lain
})
export class XenditModule {}