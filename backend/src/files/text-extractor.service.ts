/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import sharp from 'sharp';
import WordExtractor from 'word-extractor';
import { getPositiveIntConfig } from '../common/config/env-number';
import {
  IMPORTED_IMAGE_ROUTE_PREFIX,
  IMPORTED_IMAGE_STORAGE_PATH,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from './files.constants';

const execFileAsync = promisify(execFile);

const DOCX_IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.dib': 'image/bmp',
  '.emf': 'image/emf',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.ico': 'image/x-icon',
  '.jfif': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
  '.wmf': 'image/wmf',
};

const WEB_SAFE_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
]);

const ALWAYS_CONVERT_TO_PNG_EXTENSIONS = new Set([
  '.dib',
  '.emf',
  '.heic',
  '.heif',
  '.ico',
  '.tif',
  '.tiff',
  '.wmf',
]);

const PDF_IMAGE_MIN_SIZE_PX = 10;
const PDF_LINE_Y_THRESHOLD = 5;
const PDF_SAME_ROW_THRESHOLD = 8;
const PDF_TEXT_GAP_THRESHOLD = 2;
const DEFAULT_PDF_IMAGE_EXTRACTION_TIMEOUT_MS = 15_000;
const EXTERNAL_IMAGE_CONVERSION_TIMEOUT_MS = 20_000;
const LEGACY_DOC_CONVERSION_TIMEOUT_MS = 30_000;

type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
};

type PdfLine = {
  text: string;
  baseline: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type PdfImagePlacement = {
  url: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type ResolvedPdfImage = {
  name: string;
  width: number;
  height: number;
  kind: number;
  data: Uint8Array;
};

type StructuredDocxText = {
  text: string;
  imageCount: number;
  mathCount: number;
};

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

@Injectable()
export class TextExtractorService {
  private readonly logger = new Logger(TextExtractorService.name);
  private pdfJsPromise: Promise<PdfJsModule> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async extractText(file: Express.Multer.File): Promise<string> {
    this.validateFile(file);

    const extension = this.getExtension(file.originalname);
    let extractedText = '';

    switch (extension) {
      case '.txt':
        extractedText = file.buffer.toString('utf8');
        break;
      case '.docx':
        extractedText = await this.extractDocxText(file.buffer);
        break;
      case '.doc':
        extractedText = await this.extractDocText(file.buffer);
        break;
      case '.pdf':
        extractedText = await this.extractPdfText(file.buffer);
        break;
      default:
        extractedText = '';
        break;
    }

    const normalizedText = this.normalizeExtractedText(extractedText);

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

  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      const structuredText = await this.extractDocxStructuredText(buffer);

      if (structuredText.text.trim().length > 0) {
        return structuredText.text;
      }
    } catch (error) {
      this.logger.warn(
        `Structured DOCX extraction failed, falling back to Mammoth: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    const fallback = await mammoth.convertToHtml({ buffer });

    return this.htmlToTextWithImages(fallback.value);
  }

  private async extractDocxStructuredText(
    buffer: Buffer,
  ): Promise<StructuredDocxText> {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      return { text: '', imageCount: 0, mathCount: 0 };
    }

    const imageMarkers = await this.extractDocxImageMarkers(
      zip,
      'word/document.xml',
      'word/_rels/document.xml.rels',
    );

    return this.docxXmlToText(documentXml, imageMarkers);
  }

  private async extractDocText(buffer: Buffer): Promise<string> {
    const convertedDocxBuffer = await this.tryConvertLegacyDocToDocx(buffer);

    if (convertedDocxBuffer) {
      return this.extractDocxText(convertedDocxBuffer);
    }

    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);

    return [
      document.getBody(),
      document.getTextboxes({ includeHeadersAndFooters: false }),
    ]
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  private async tryConvertLegacyDocToDocx(
    buffer: Buffer,
  ): Promise<Buffer | null> {
    const tempDir = await mkdtemp(join(tmpdir(), 'legacy-doc-import-'));
    const inputPath = join(tempDir, 'source.doc');
    const outputDir = join(tempDir, 'converted');
    const outputPath = join(outputDir, 'source.docx');

    await mkdir(outputDir, { recursive: true });

    try {
      await writeFile(inputPath, buffer);

      const commandSucceeded = await this.tryRunCommand(
        'soffice',
        [
          '--headless',
          '--convert-to',
          'docx',
          '--outdir',
          outputDir,
          inputPath,
        ],
        LEGACY_DOC_CONVERSION_TIMEOUT_MS,
      );

      if (!commandSucceeded || !(await this.fileExists(outputPath))) {
        return null;
      }

      return readFile(outputPath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const richPdfExtractionEnabled = this.isRichPdfExtractionEnabled();

    if (richPdfExtractionEnabled) {
      try {
        return await this.extractRichPdfText(buffer);
      } catch (error) {
        this.logger.warn(
          `rich PDF extraction failed, falling back to text extraction: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    try {
      return await this.extractPdfTextWithPoppler(buffer);
    } catch (error) {
      this.logger.warn(
        `pdftotext extraction failed, falling back to JS extraction: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    try {
      return await this.extractTextOnlyPdfText(buffer);
    } catch (error) {
      this.logger.warn(
        `text-only PDF extraction failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new BadRequestException('Could not extract text from PDF');
    }
  }

  private async extractPdfTextWithPoppler(buffer: Buffer): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'pdf-import-'));
    const inputPath = join(tempDir, 'source.pdf');

    try {
      await writeFile(inputPath, buffer);
      const { stdout } = await execFileAsync(
        'pdftotext',
        ['-enc', 'UTF-8', '-layout', '-nopgbrk', inputPath, '-'],
        {
          timeout: this.pdfTextExtractionTimeoutMs(),
          windowsHide: true,
          maxBuffer: 20 * 1024 * 1024,
        },
      );

      return stdout;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async extractRichPdfText(buffer: Buffer): Promise<string> {
    const pdfjs = await this.getPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      verbosity: pdfjs.VerbosityLevel.ERRORS,
    });

    const doc = await loadingTask.promise;
    const pdfImageCache = new Map<string, string>();
    const pages: string[] = [];
    const imageExtractionTimeoutMs = this.pdfImageExtractionTimeoutMs();

    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);

        try {
          const textItems = await this.extractPdfPageTextItems(page);
          const lines = this.groupPdfTextItemsIntoLines(textItems);
          const images = await this.extractPdfPageImagesSafely(
            pdfjs,
            doc,
            page,
            pdfImageCache,
            imageExtractionTimeoutMs,
          );

          pages.push(this.mergePdfPageContent(lines, images));
        } finally {
          page.cleanup();
        }
      }
    } finally {
      await doc.destroy();
      await loadingTask.destroy();
    }

    return pages.filter(Boolean).join('\n\n');
  }

  private async extractTextOnlyPdfText(buffer: Buffer): Promise<string> {
    const pdfjs = await this.getPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
    });
    const doc = await loadingTask.promise;
    const pages: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);

        try {
          const textItems = await this.extractPdfPageTextItems(page);
          const lines = this.groupPdfTextItemsIntoLines(textItems);
          const pageText = lines.map((line) => line.text).join('\n').trim();

          if (pageText) {
            pages.push(pageText);
          }
        } finally {
          page.cleanup();
        }
      }
    } finally {
      await doc.destroy();
      await loadingTask.destroy();
    }

    return pages.join('\n\n');
  }

  private async extractPdfPageImagesSafely(
    pdfjs: PdfJsModule,
    doc: any,
    page: any,
    pdfImageCache: Map<string, string>,
    imageExtractionTimeoutMs: number,
  ): Promise<PdfImagePlacement[]> {
    if (imageExtractionTimeoutMs <= 0) {
      return [];
    }

    try {
      return await this.withTimeout(
        this.extractPdfPageImages(pdfjs, doc, page, pdfImageCache),
        imageExtractionTimeoutMs,
        [],
      );
    } catch (error) {
      this.logger.warn(
        `PDF image extraction failed for page ${page.pageNumber ?? 'unknown'}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return [];
    }
  }

  private async extractPdfPageTextItems(page: any): Promise<PdfTextItem[]> {
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent({
      includeMarkedContent: false,
      disableNormalization: false,
    });
    const items: PdfTextItem[] = [];

    for (const item of textContent.items as Array<Record<string, unknown>>) {
      if (!('str' in item) || typeof item.str !== 'string') {
        continue;
      }

      const transform = Array.isArray(item.transform)
        ? (item.transform as number[])
        : [1, 0, 0, 1, 0, 0];
      const [x, y] = viewport.convertToViewportPoint(
        transform[4] ?? 0,
        transform[5] ?? 0,
      );
      const width =
        typeof item.width === 'number' ? Math.abs(item.width) : item.str.length;
      const height =
        typeof item.height === 'number'
          ? Math.abs(item.height)
          : PDF_LINE_Y_THRESHOLD;

      items.push({
        text: item.str,
        x,
        y,
        width,
        height,
        hasEOL: Boolean(item.hasEOL),
      });
    }

    return items;
  }

  private groupPdfTextItemsIntoLines(items: PdfTextItem[]): PdfLine[] {
    const lines: PdfLine[] = [];
    let forceBreakNext = false;

    for (const item of items) {
      const lastLine = lines.at(-1);
      const lineThreshold = Math.max(
        PDF_LINE_Y_THRESHOLD,
        Math.min(item.height, 12),
      );
      const startsNewLine =
        forceBreakNext ||
        !lastLine ||
        Math.abs(lastLine.baseline - item.y) > lineThreshold;

      if (startsNewLine) {
        lines.push({
          text: item.text,
          baseline: item.y,
          left: item.x,
          right: item.x + item.width,
          top: item.y - item.height,
          bottom: item.y,
        });
      } else {
        lastLine.text += this.getPdfTextJoiner(
          lastLine.text,
          item.text,
          item.x - lastLine.right,
        );
        lastLine.text += item.text;
        lastLine.right = Math.max(lastLine.right, item.x + item.width);
        lastLine.top = Math.min(lastLine.top, item.y - item.height);
        lastLine.bottom = Math.max(lastLine.bottom, item.y);
      }

      forceBreakNext = item.hasEOL || item.text.endsWith('\n');
    }

    return lines
      .map((line) => ({
        ...line,
        text: line.text.replace(/\s+\n/g, '\n').trim(),
      }))
      .filter((line) => line.text.length > 0);
  }

  private getPdfTextJoiner(
    previousText: string,
    nextText: string,
    gap: number,
  ): string {
    if (
      gap <= PDF_TEXT_GAP_THRESHOLD ||
      previousText.length === 0 ||
      nextText.length === 0
    ) {
      return '';
    }

    if (
      /\s$/.test(previousText) ||
      /^\s/.test(nextText) ||
      /^[,.;:!?)}\]]/.test(nextText) ||
      /[([{/-]$/.test(previousText)
    ) {
      return '';
    }

    return ' ';
  }

  private async extractPdfPageImages(
    pdfjs: PdfJsModule,
    doc: any,
    page: any,
    pdfImageCache: Map<string, string>,
  ): Promise<PdfImagePlacement[]> {
    const viewport = page.getViewport({ scale: 1 });
    const operatorList = await page.getOperatorList();
    let transformMatrix = [1, 0, 0, 1, 0, 0];
    const transformStack: Array<number[]> = [];
    const images: PdfImagePlacement[] = [];

    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      const fn = operatorList.fnArray[index];
      const args = operatorList.argsArray[index];

      if (fn === pdfjs.OPS.save) {
        transformStack.push([...transformMatrix]);
        continue;
      }

      if (fn === pdfjs.OPS.restore) {
        const restoredMatrix = transformStack.pop();

        if (restoredMatrix) {
          transformMatrix = restoredMatrix;
        }

        continue;
      }

      if (fn === pdfjs.OPS.transform) {
        transformMatrix = pdfjs.Util.transform(transformMatrix, args);
        continue;
      }

      if (fn === pdfjs.OPS.paintInlineImageXObject) {
        const image = this.normalizeResolvedPdfImage(
          `inline-${index}`,
          args?.[0],
        );

        if (!image) {
          continue;
        }

        try {
          const placement = await this.buildPdfImagePlacement(
            pdfjs,
            image,
            transformMatrix,
            viewport,
            pdfImageCache,
          );

          if (placement) {
            images.push(placement);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to process inline image at index ${index}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }

        continue;
      }

      const isXObjectOp =
        fn === pdfjs.OPS.paintImageXObject ||
        fn === pdfjs.OPS.paintJpegXObject;

      if (isXObjectOp) {
        const name = args?.[0];

        if (typeof name !== 'string') {
          continue;
        }

        const image =
          (await this.resolvePdfEmbeddedImage(page.objs, name)) ??
          this.resolvePdfEmbeddedCommonImage(page.commonObjs, name);

        if (!image) {
          continue;
        }

        try {
          const placement = await this.buildPdfImagePlacement(
            pdfjs,
            image,
            transformMatrix,
            viewport,
            pdfImageCache,
          );

          if (placement) {
            images.push(placement);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to process XObject image "${name}": ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }

        continue;
      }

      if (fn === pdfjs.OPS.paintImageXObjectRepeat) {
        const name = args?.[0];
        const scaleX = args?.[1];
        const scaleY = args?.[2];
        const positions = args?.[3];

        if (
          typeof name !== 'string' ||
          typeof scaleX !== 'number' ||
          typeof scaleY !== 'number' ||
          !Array.isArray(positions)
        ) {
          continue;
        }

        const image =
          (await this.resolvePdfEmbeddedImage(page.objs, name)) ??
          this.resolvePdfEmbeddedCommonImage(page.commonObjs, name);

        if (!image) {
          continue;
        }

        for (
          let positionIndex = 0;
          positionIndex < positions.length;
          positionIndex += 2
        ) {
          const repeatTransform = pdfjs.Util.transform(transformMatrix, [
            scaleX,
            0,
            0,
            scaleY,
            positions[positionIndex] ?? 0,
            positions[positionIndex + 1] ?? 0,
          ]);

          try {
            const placement = await this.buildPdfImagePlacement(
              pdfjs,
              image,
              repeatTransform,
              viewport,
              pdfImageCache,
            );

            if (placement) {
              images.push(placement);
            }
          } catch (error) {
            this.logger.warn(
              `Failed to process repeated XObject image "${name}" at position ${positionIndex}: ${error instanceof Error ? error.message : 'unknown error'}`,
            );
          }
        }
      }
    }

    return images;
  }

  private async buildPdfImagePlacement(
    pdfjs: PdfJsModule,
    image: ResolvedPdfImage,
    transformMatrix: number[],
    viewport: any,
    pdfImageCache: Map<string, string>,
  ): Promise<PdfImagePlacement | null> {
    if (
      image.width < PDF_IMAGE_MIN_SIZE_PX ||
      image.height < PDF_IMAGE_MIN_SIZE_PX
    ) {
      return null;
    }

    const cacheKey = `${image.name}:${createHash('sha1')
      .update(image.data)
      .digest('hex')}`;
    let imageUrl = pdfImageCache.get(cacheKey);

    if (!imageUrl) {
      const imageBuffer = await this.convertPdfImageToPngBuffer(pdfjs, image);
      const storedImageUrl = await this.storeExtractedImage(imageBuffer, {
        mimeType: 'image/png',
        suggestedExtension: '.png',
      });

      if (!storedImageUrl) {
        return null;
      }

      imageUrl = storedImageUrl;
      pdfImageCache.set(cacheKey, storedImageUrl);
    }

    const rect = this.buildPdfImageRect(
      pdfjs,
      transformMatrix,
      viewport.transform,
    );

    return {
      url: imageUrl,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    };
  }

  private buildPdfImageRect(
    pdfjs: PdfJsModule,
    transformMatrix: number[],
    viewportTransform: number[],
  ): { left: number; right: number; top: number; bottom: number } {
    const combinedTransform = pdfjs.Util.transform(
      viewportTransform,
      transformMatrix,
    );
    const points: Array<[number, number]> = [
      this.transformPdfPoint(combinedTransform, 0, 0),
      this.transformPdfPoint(combinedTransform, 1, 0),
      this.transformPdfPoint(combinedTransform, 0, 1),
      this.transformPdfPoint(combinedTransform, 1, 1),
    ];
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);

    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  }

  private transformPdfPoint(
    matrix: number[],
    x: number,
    y: number,
  ): [number, number] {
    return [
      matrix[0] * x + matrix[2] * y + matrix[4],
      matrix[1] * x + matrix[3] * y + matrix[5],
    ];
  }

  private async resolvePdfEmbeddedImage(
    objectStore: any,
    name: string,
  ): Promise<ResolvedPdfImage | null> {
    if (!objectStore || typeof objectStore.get !== 'function') {
      return null;
    }

    if (typeof objectStore.has === 'function' && objectStore.has(name)) {
      return this.normalizeResolvedPdfImage(name, objectStore.get(name));
    }

    return new Promise((resolve) => {
      objectStore.get(name, (image: unknown) => {
        resolve(this.normalizeResolvedPdfImage(name, image));
      });
    });
  }

  private resolvePdfEmbeddedCommonImage(
    objectStore: any,
    name: string,
  ): ResolvedPdfImage | null {
    if (
      !objectStore ||
      typeof objectStore.get !== 'function' ||
      typeof objectStore.has !== 'function' ||
      !objectStore.has(name)
    ) {
      return null;
    }

    return this.normalizeResolvedPdfImage(name, objectStore.get(name));
  }

  private normalizeResolvedPdfImage(
    name: string,
    rawImage: unknown,
  ): ResolvedPdfImage | null {
    if (!rawImage || typeof rawImage !== 'object') {
      return null;
    }

    const image = rawImage as Record<string, unknown>;
    const width = typeof image.width === 'number' ? image.width : null;
    const height = typeof image.height === 'number' ? image.height : null;
    const kind = typeof image.kind === 'number' ? image.kind : null;

    if (!width || !height || kind === null) {
      return null;
    }

    const data = image.data;
    let normalizedData: Uint8Array | null = null;

    if (data instanceof Uint8Array) {
      normalizedData = data;
    } else if (data instanceof Uint8ClampedArray) {
      normalizedData = new Uint8Array(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
    } else if (ArrayBuffer.isView(data)) {
      normalizedData = new Uint8Array(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
    }

    if (!normalizedData || normalizedData.length === 0) {
      return null;
    }

    return {
      name,
      width,
      height,
      kind,
      data: normalizedData,
    };
  }

  private async convertPdfImageToPngBuffer(
    pdfjs: PdfJsModule,
    image: ResolvedPdfImage,
  ): Promise<Buffer> {
    if (image.kind === pdfjs.ImageKind.RGBA_32BPP) {
      return sharp(Buffer.from(image.data), {
        raw: { width: image.width, height: image.height, channels: 4 },
      })
        .png()
        .toBuffer();
    }

    if (
      image.kind === pdfjs.ImageKind.RGB_24BPP ||
      image.kind === pdfjs.ImageKind.GRAYSCALE_1BPP
    ) {
      const rgbaBuffer = Buffer.from(
        this.convertPdfPixelsToRgba({
          pdfjs,
          width: image.width,
          height: image.height,
          kind: image.kind,
          src: image.data,
        }),
      );

      return sharp(rgbaBuffer, {
        raw: { width: image.width, height: image.height, channels: 4 },
      })
        .png()
        .toBuffer();
    }

    // Unknown kind — try to decode raw data directly with sharp as a last resort
    this.logger.warn(
      `Unknown PDF image kind ${image.kind} for "${image.name}", attempting raw sharp decode`,
    );

    return sharp(Buffer.from(image.data)).png().toBuffer();
  }

  private convertPdfPixelsToRgba({
    pdfjs,
    width,
    height,
    kind,
    src,
  }: {
    pdfjs: PdfJsModule;
    width: number;
    height: number;
    kind: number;
    src: Uint8Array;
  }): Uint8Array {
    const dest = new Uint8Array(width * height * 4);

    if (kind === pdfjs.ImageKind.RGB_24BPP) {
      for (
        let sourceIndex = 0, targetIndex = 0;
        sourceIndex < src.length;
        sourceIndex += 3, targetIndex += 4
      ) {
        dest[targetIndex] = src[sourceIndex];
        dest[targetIndex + 1] = src[sourceIndex + 1];
        dest[targetIndex + 2] = src[sourceIndex + 2];
        dest[targetIndex + 3] = 255;
      }

      return dest;
    }

    if (kind === pdfjs.ImageKind.GRAYSCALE_1BPP) {
      let pixelIndex = 0;

      for (const byte of src) {
        for (let bit = 7; bit >= 0; bit -= 1) {
          if (pixelIndex >= width * height) {
            return dest;
          }

          const isWhite = ((byte >> bit) & 1) === 1;
          const gray = isWhite ? 255 : 0;
          const targetIndex = pixelIndex * 4;

          dest[targetIndex] = gray;
          dest[targetIndex + 1] = gray;
          dest[targetIndex + 2] = gray;
          dest[targetIndex + 3] = 255;
          pixelIndex += 1;
        }
      }

      return dest;
    }

    throw new Error(`Unsupported PDF image kind: ${kind}`);
  }

  private mergePdfPageContent(
    lines: PdfLine[],
    images: PdfImagePlacement[],
  ): string {
    const lineEntries = lines.map((line) => ({
      sortY: line.bottom,
      left: line.left,
      kind: 'line' as const,
      text: line.text,
      height: line.bottom - line.top,
    }));

    const imageEntries = images.map((image) => ({
      sortY: image.bottom,
      left: image.left,
      kind: 'image' as const,
      text: this.toImageMarker(image.url),
      height: image.bottom - image.top,
    }));

    const entries = [...lineEntries, ...imageEntries]
      .filter((entry) => entry.text.trim().length > 0)
      .sort((a, b) => {
        const rowThreshold = Math.max(
          PDF_SAME_ROW_THRESHOLD,
          Math.min(a.height, b.height) * 0.5,
        );
        const verticalDelta = a.sortY - b.sortY;

        if (Math.abs(verticalDelta) > rowThreshold) {
          return verticalDelta;
        }

        if (Math.abs(a.left - b.left) > 1) {
          return a.left - b.left;
        }

        if (a.kind === b.kind) {
          return 0;
        }

        return a.kind === 'line' ? -1 : 1;
      });

    return entries
      .map((entry) => entry.text)
      .join('\n')
      .trim();
  }

  private async extractDocxImageMarkers(
    zip: JSZip,
    documentPath: string,
    relationshipsPath: string,
  ): Promise<Map<string, string>> {
    const imageMarkers = new Map<string, string>();
    const relationshipsXml = await zip.file(relationshipsPath)?.async('string');

    if (!relationshipsXml) {
      return imageMarkers;
    }

    for (const match of relationshipsXml.matchAll(
      /<Relationship\b([^>]*)\/?>/giu,
    )) {
      const attributes = match[1] ?? '';
      const relationshipId = this.getXmlAttribute(attributes, 'Id');
      const target = this.getXmlAttribute(attributes, 'Target');
      const type = this.getXmlAttribute(attributes, 'Type');

      if (!relationshipId || !target || !type || !/\/image$/i.test(type)) {
        continue;
      }

      const targetPath = this.resolveDocxRelationshipTarget(
        documentPath,
        target,
      );

      if (!targetPath) {
        continue;
      }

      const extension = extname(targetPath).toLowerCase();
      const mimeType = DOCX_IMAGE_MIME_BY_EXTENSION[extension];
      const imageFile = zip.file(targetPath);

      if (!mimeType || !imageFile) {
        continue;
      }

      const imageBuffer = Buffer.from(await imageFile.async('arraybuffer'));
      const storedImageUrl = await this.storeExtractedImage(imageBuffer, {
        mimeType,
        suggestedExtension: extension,
      });

      if (!storedImageUrl) {
        continue;
      }

      imageMarkers.set(relationshipId, this.toImageMarker(storedImageUrl));
    }

    return imageMarkers;
  }

  private docxXmlToText(
    xml: string,
    imageMarkers = new Map<string, string>(),
  ): StructuredDocxText {
    const tokenPattern =
      /<m:oMathPara\b[\s\S]*?<\/m:oMathPara>|<m:oMath\b[\s\S]*?<\/m:oMath>|<a:blip\b[^>]*\/?>|<v:imagedata\b[^>]*\/?>|<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<w:cr\b[^>]*\/>|<\/w:p>|<\/w:tr>|<\/w:tbl>/giu;
    let text = '';
    let imageCount = 0;
    let mathCount = 0;

    for (const match of xml.matchAll(tokenPattern)) {
      const token = match[0];

      if (/^<m:oMath/i.test(token)) {
        const mathText = this.linearizeOmmlMath(token);

        if (mathText) {
          text += ` ${mathText} `;
          mathCount += 1;
        }

        continue;
      }

      if (/^<(?:a:blip|v:imagedata)\b/i.test(token)) {
        const relationshipId =
          this.getXmlAttribute(token, 'r:embed') ??
          this.getXmlAttribute(token, 'r:id');
        const imageMarker = relationshipId
          ? imageMarkers.get(relationshipId)
          : undefined;

        if (imageMarker) {
          text += `\n${imageMarker}\n`;
          imageCount += 1;
        }

        continue;
      }

      if (/^<w:t\b/i.test(token)) {
        text += this.decodeXmlEntities(
          token.replace(/^<w:t\b[^>]*>/iu, '').replace(/<\/w:t>$/iu, ''),
        );
        continue;
      }

      if (/^<w:tab\b/i.test(token)) {
        text += '\t';
        continue;
      }

      text += '\n';
    }

    return {
      text: this.normalizeExtractedText(text),
      imageCount,
      mathCount,
    };
  }

  private linearizeOmmlMath(xml: string): string {
    const fractions: string[] = [];
    const xmlWithFractionTokens = xml.replace(
      /<m:f\b[\s\S]*?<m:num\b[^>]*>([\s\S]*?)<\/m:num>[\s\S]*?<m:den\b[^>]*>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/giu,
      (_match, numeratorXml: string, denominatorXml: string) => {
        const token = `@@MATH_FRACTION_${fractions.length}@@`;
        const numerator = this.linearizeOmmlText(numeratorXml);
        const denominator = this.linearizeOmmlText(denominatorXml);

        fractions.push(`(${numerator})/(${denominator})`);

        return token;
      },
    );

    const parts = Array.from(
      xmlWithFractionTokens.matchAll(
        /@@MATH_FRACTION_(\d+)@@|<m:t\b[^>]*>([\s\S]*?)<\/m:t>/giu,
      ),
    )
      .map((match) =>
        match[1]
          ? fractions[Number(match[1])]
          : this.decodeXmlEntities(match[2] ?? ''),
      )
      .filter(Boolean);

    return this.normalizeFormulaText(parts.join(''));
  }

  private linearizeOmmlText(xml: string): string {
    const text = Array.from(xml.matchAll(/<m:t\b[^>]*>([\s\S]*?)<\/m:t>/giu))
      .map((match) => this.decodeXmlEntities(match[1] ?? ''))
      .join('');

    return this.normalizeFormulaText(text);
  }

  private htmlToTextWithImages(html: string): string {
    return this.normalizeExtractedText(
      this.decodeHtmlEntities(
        html
          .replace(
            /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/giu,
            (_match, doubleQuotedSrc, singleQuotedSrc, unquotedSrc) =>
              `\n[[image:${doubleQuotedSrc ?? singleQuotedSrc ?? unquotedSrc ?? ''}]]\n`,
          )
          .replace(/<br\s*\/?>/giu, '\n')
          .replace(/<\/(?:p|div|li|h[1-6]|td|th|tr)>/giu, '\n')
          .replace(/<[^>]+>/g, ' '),
      ),
    );
  }

  private async storeExtractedImage(
    buffer: Buffer,
    options: {
      mimeType: string;
      suggestedExtension?: string;
    },
  ): Promise<string | null> {
    const normalizedMimeType = options.mimeType.toLowerCase();
    const normalizedExtension = (
      options.suggestedExtension ??
      this.extensionFromMimeType(normalizedMimeType)
    ).toLowerCase();
    const shouldConvertToPng =
      ALWAYS_CONVERT_TO_PNG_EXTENSIONS.has(normalizedExtension) ||
      !WEB_SAFE_IMAGE_MIME_TYPES.has(normalizedMimeType);
    let nextBuffer = buffer;
    let nextExtension = normalizedExtension || '.png';
    let nextMimeType = normalizedMimeType;

    if (shouldConvertToPng) {
      const convertedBuffer = await this.convertImageToPng(
        buffer,
        normalizedMimeType,
        normalizedExtension,
      );

      if (!convertedBuffer) {
        return null;
      }

      nextBuffer = convertedBuffer;
      nextExtension = '.png';
      nextMimeType = 'image/png';
    }

    if (!WEB_SAFE_IMAGE_MIME_TYPES.has(nextMimeType)) {
      return null;
    }

    await mkdir(IMPORTED_IMAGE_STORAGE_PATH, { recursive: true });

    const fileHash = createHash('sha256').update(nextBuffer).digest('hex');
    const nestedDir = join(IMPORTED_IMAGE_STORAGE_PATH, fileHash.slice(0, 2));
    const fileName = `${fileHash}${nextExtension}`;
    const filePath = join(nestedDir, fileName);

    await mkdir(nestedDir, { recursive: true });

    try {
      await access(filePath);
    } catch {
      await writeFile(filePath, nextBuffer);
    }

    return `${IMPORTED_IMAGE_ROUTE_PREFIX}/${fileHash.slice(0, 2)}/${fileName}`;
  }

  private async convertImageToPng(
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<Buffer | null> {
    if (extension === '.wmf' || extension === '.emf') {
      return this.convertVectorImageToPng(buffer, extension);
    }

    try {
      return await sharp(buffer).png().toBuffer();
    } catch (error) {
      this.logger.warn(
        `Sharp could not convert ${mimeType} to PNG: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    return this.convertVectorImageToPng(buffer, extension);
  }

  private async convertVectorImageToPng(
    buffer: Buffer,
    extension: string,
  ): Promise<Buffer | null> {
    const tempDir = await mkdtemp(join(tmpdir(), 'image-convert-'));
    const inputPath = join(tempDir, `source${extension || '.img'}`);
    const outputPath = join(tempDir, 'converted.png');

    try {
      await writeFile(inputPath, buffer);

      const converted = await this.tryRunCommand(
        'magick',
        [inputPath, outputPath],
        EXTERNAL_IMAGE_CONVERSION_TIMEOUT_MS,
      );

      if (!converted || !(await this.fileExists(outputPath))) {
        return null;
      }

      return readFile(outputPath);
    } finally {
      await Promise.allSettled([unlink(inputPath), unlink(outputPath)]);
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async tryRunCommand(
    command: string,
    args: string[],
    timeoutMs: number,
  ): Promise<boolean> {
    try {
      await execFileAsync(command, args, {
        timeout: timeoutMs,
        windowsHide: true,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Command "${command}" failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private extensionFromMimeType(mimeType: string): string {
    const normalizedMimeType = mimeType.toLowerCase();
    const match = Object.entries(DOCX_IMAGE_MIME_BY_EXTENSION).find(
      ([, value]) => value === normalizedMimeType,
    );

    return match?.[0] ?? '.png';
  }

  private resolveDocxRelationshipTarget(
    sourcePath: string,
    target: string,
  ): string | null {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      return null;
    }

    const targetParts = target.replace(/\\/g, '/').split('/');
    const pathParts = target.startsWith('/')
      ? []
      : sourcePath.replace(/\\/g, '/').split('/').slice(0, -1);

    for (const part of targetParts) {
      if (!part || part === '.') {
        continue;
      }

      if (part === '..') {
        pathParts.pop();
        continue;
      }

      pathParts.push(part);
    }

    return pathParts.join('/');
  }

  private getXmlAttribute(attributes: string, name: string): string | null {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = attributes.match(
      new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]+)"|'([^']+)')`, 'iu'),
    );

    return match ? this.decodeXmlEntities(match[1] ?? match[2] ?? '') : null;
  }

  private toImageMarker(url: string): string {
    return `[[image:${url}]]`;
  }

  private normalizeFormulaText(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:)\]])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\[\s+/g, '[')
      .trim();
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&');
  }

  private decodeXmlEntities(value: string): string {
    return this.decodeHtmlEntities(value)
      .replace(/&apos;/gi, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) =>
        String.fromCodePoint(Number.parseInt(codePoint, 16)),
      )
      .replace(/&#(\d+);/g, (_match, codePoint: string) =>
        String.fromCodePoint(Number.parseInt(codePoint, 10)),
      );
  }

  private normalizeExtractedText(value: string): string {
    return value
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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

  private pdfImageExtractionTimeoutMs(): number {
    return getPositiveIntConfig(
      this.configService,
      'PDF_IMAGE_EXTRACTION_TIMEOUT_MS',
      DEFAULT_PDF_IMAGE_EXTRACTION_TIMEOUT_MS,
    );
  }

  private pdfTextExtractionTimeoutMs(): number {
    return getPositiveIntConfig(
      this.configService,
      'PDF_TEXT_EXTRACTION_TIMEOUT_MS',
      30_000,
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallbackValue: T,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private getPdfJs(): Promise<PdfJsModule> {
    if (!this.pdfJsPromise) {
      this.pdfJsPromise = this.importPdfJsWithoutCanvas();
    }

    return this.pdfJsPromise;
  }

  private async importPdfJsWithoutCanvas(): Promise<PdfJsModule> {
    this.ensurePdfJsDomPolyfills();

    const originalGetBuiltinModule = process.getBuiltinModule?.bind(process);
    const moduleBuiltin = originalGetBuiltinModule?.('module') as
      | {
          createRequire?: (filename: string | URL) => NodeRequire;
        }
      | undefined;
    const originalCreateRequire = moduleBuiltin?.createRequire?.bind(
      moduleBuiltin,
    );

    if (moduleBuiltin && originalCreateRequire) {
      moduleBuiltin.createRequire = ((filename: string | URL) => {
        const require = originalCreateRequire(filename);
        const wrappedRequire = ((id: string) => {
          if (id === '@napi-rs/canvas') {
            throw new Error(
              'Skipping @napi-rs/canvas to avoid native canvas loading',
            );
          }

          return require(id);
        }) as NodeRequire;

        wrappedRequire.resolve = require.resolve.bind(require);
        wrappedRequire.cache = require.cache;
        wrappedRequire.extensions = require.extensions;
        wrappedRequire.main = require.main;

        return wrappedRequire;
      }) as (filename: string | URL) => NodeRequire;
    }

    try {
      return await import('pdfjs-dist/legacy/build/pdf.mjs');
    } finally {
      if (moduleBuiltin && originalCreateRequire) {
        moduleBuiltin.createRequire = originalCreateRequire;
      }
    }
  }

  private ensurePdfJsDomPolyfills(): void {
    const globalScope = globalThis as typeof globalThis & {
      DOMMatrix?: typeof DOMMatrix;
      ImageData?: typeof ImageData;
      Path2D?: typeof Path2D;
    };

    if (!globalScope.DOMMatrix) {
      class SimpleDOMMatrix {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;

        constructor(init?: Iterable<number> | { a?: number; b?: number; c?: number; d?: number; e?: number; f?: number }) {
          if (!init) {
            return;
          }

          if (Symbol.iterator in Object(init)) {
            const values = Array.from(init as Iterable<number>);

            if (values.length >= 6) {
              [this.a, this.b, this.c, this.d, this.e, this.f] = values;
            }

            return;
          }

          const matrix = init as {
            a?: number;
            b?: number;
            c?: number;
            d?: number;
            e?: number;
            f?: number;
          };

          this.a = matrix.a ?? this.a;
          this.b = matrix.b ?? this.b;
          this.c = matrix.c ?? this.c;
          this.d = matrix.d ?? this.d;
          this.e = matrix.e ?? this.e;
          this.f = matrix.f ?? this.f;
        }

        multiplySelf(other: {
          a: number;
          b: number;
          c: number;
          d: number;
          e: number;
          f: number;
        }): this {
          const nextA = this.a * other.a + this.c * other.b;
          const nextB = this.b * other.a + this.d * other.b;
          const nextC = this.a * other.c + this.c * other.d;
          const nextD = this.b * other.c + this.d * other.d;
          const nextE = this.a * other.e + this.c * other.f + this.e;
          const nextF = this.b * other.e + this.d * other.f + this.f;

          this.a = nextA;
          this.b = nextB;
          this.c = nextC;
          this.d = nextD;
          this.e = nextE;
          this.f = nextF;

          return this;
        }

        preMultiplySelf(other: {
          a: number;
          b: number;
          c: number;
          d: number;
          e: number;
          f: number;
        }): this {
          const nextA = other.a * this.a + other.c * this.b;
          const nextB = other.b * this.a + other.d * this.b;
          const nextC = other.a * this.c + other.c * this.d;
          const nextD = other.b * this.c + other.d * this.d;
          const nextE = other.a * this.e + other.c * this.f + other.e;
          const nextF = other.b * this.e + other.d * this.f + other.f;

          this.a = nextA;
          this.b = nextB;
          this.c = nextC;
          this.d = nextD;
          this.e = nextE;
          this.f = nextF;

          return this;
        }

        translate(tx = 0, ty = 0): this {
          return this.multiplySelf(
            new SimpleDOMMatrix([1, 0, 0, 1, tx, ty]) as SimpleDOMMatrix,
          );
        }

        scale(scaleX = 1, scaleY = scaleX): this {
          return this.multiplySelf(
            new SimpleDOMMatrix([scaleX, 0, 0, scaleY, 0, 0]) as SimpleDOMMatrix,
          );
        }

        invertSelf(): this {
          const determinant = this.a * this.d - this.b * this.c;

          if (!determinant) {
            this.a = Number.NaN;
            this.b = Number.NaN;
            this.c = Number.NaN;
            this.d = Number.NaN;
            this.e = Number.NaN;
            this.f = Number.NaN;
            return this;
          }

          const nextA = this.d / determinant;
          const nextB = -this.b / determinant;
          const nextC = -this.c / determinant;
          const nextD = this.a / determinant;
          const nextE = (this.c * this.f - this.d * this.e) / determinant;
          const nextF = (this.b * this.e - this.a * this.f) / determinant;

          this.a = nextA;
          this.b = nextB;
          this.c = nextC;
          this.d = nextD;
          this.e = nextE;
          this.f = nextF;

          return this;
        }
      }

      globalScope.DOMMatrix = SimpleDOMMatrix as unknown as typeof DOMMatrix;
    }

    if (!globalScope.ImageData) {
      class SimpleImageData {
        readonly data: Uint8ClampedArray;
        readonly width: number;
        readonly height: number;

        constructor(
          dataOrWidth: Uint8ClampedArray | number,
          width?: number,
          height?: number,
        ) {
          if (typeof dataOrWidth === 'number') {
            this.width = dataOrWidth;
            this.height = width ?? 0;
            this.data = new Uint8ClampedArray(this.width * this.height * 4);
            return;
          }

          this.data = dataOrWidth;
          this.width = width ?? 0;
          this.height = height ?? 0;
        }
      }

      globalScope.ImageData = SimpleImageData as unknown as typeof ImageData;
    }

    if (!globalScope.Path2D) {
      class SimplePath2D {
        addPath(): void {}
        arc(): void {}
        arcTo(): void {}
        bezierCurveTo(): void {}
        closePath(): void {}
        ellipse(): void {}
        lineTo(): void {}
        moveTo(): void {}
        quadraticCurveTo(): void {}
        rect(): void {}
        roundRect(): void {}
      }

      globalScope.Path2D = SimplePath2D as unknown as typeof Path2D;
    }
  }

  private isRichPdfExtractionEnabled(): boolean {
    const value = this.configService.get<string>(
      'PDF_RICH_EXTRACTION_ENABLED',
    );

    if (!value) {
      return false;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
}
