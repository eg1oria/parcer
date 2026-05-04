import { Module } from '@nestjs/common';
import { TextExtractorService } from './text-extractor.service';

@Module({
  providers: [TextExtractorService],
  exports: [TextExtractorService],
})
export class FilesModule {}
