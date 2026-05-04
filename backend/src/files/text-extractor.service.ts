import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { getPositiveIntConfig } from '../common/config/env-number';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from './files.constants';

@Injectable()
export class TextExtractorService {
  constructor(private readonly configService: ConfigService) {}

  async extractText(file: Express.Multer.File): Promise<string> {
    this.validateFile(file);

    const extension = this.getExtension(file.originalname);
    let extractedText = '';

    if (extension === '.txt') {
      extractedText = file.buffer.toString('utf8');
    }

    if (extension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value;
    }

    if (extension === '.pdf') {
      const parser = new PDFParse({ data: file.buffer });

      try {
        const result = await parser.getText();
        extractedText = result.text;
      } finally {
        await parser.destroy();
      }
    }

    const normalizedText = extractedText
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .trim();

    if (!normalizedText) {
      throw new BadRequestException('Could not extract text from file');
    }

    return normalizedText;
  }

  validateFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const maxUploadSizeBytes = this.maxUploadSizeBytes();

    if (file.size > maxUploadSizeBytes) {
      throw new BadRequestException(
        `File is too large. Max size is ${maxUploadSizeBytes} bytes`,
      );
    }

    const extension = this.getExtension(file.originalname);

    if (!SUPPORTED_FILE_EXTENSIONS.includes(extension as never)) {
      throw new BadRequestException('Unsupported file extension');
    }

    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype as never)) {
      throw new BadRequestException('Unsupported file mime type');
    }
  }

  private getExtension(originalName: string): string {
    return extname(originalName).toLowerCase();
  }

  private maxUploadSizeBytes(): number {
    return getPositiveIntConfig(
      this.configService,
      'MAX_UPLOAD_FILE_SIZE_BYTES',
      MAX_UPLOAD_FILE_SIZE_BYTES,
    );
  }
}
