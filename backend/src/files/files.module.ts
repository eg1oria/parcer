import { Module } from '@nestjs/common';
import { ImportedImageStorageService } from './imported-image-storage.service';
import { TextExtractorService } from './text-extractor.service';

@Module({
  providers: [ImportedImageStorageService, TextExtractorService],
  exports: [ImportedImageStorageService, TextExtractorService],
})
export class FilesModule {}
