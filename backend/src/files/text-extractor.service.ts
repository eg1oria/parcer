import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import WordExtractor from 'word-extractor';
import { getPositiveIntConfig } from '../common/config/env-number';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from './files.constants';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const IMAGE_MARKER_PATTERN = /\[\[image:[^\]]+\]\]/g;
const PDF_IMAGE_THRESHOLD_PX = 16;
const DOCX_IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jfif': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.wmf': 'image/x-wmf',
  '.emf': 'image/x-emf',
};

type PdfTextPage = {
  num: number;
  text: string;
};

type PdfImagePage = {
  pageNumber: number;
  images: Array<{
    dataUrl?: string;
  }>;
};

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
      extractedText = await this.extractDocxText(file.buffer);
    }

    if (extension === '.doc') {
      extractedText = await this.extractDocText(file.buffer);
    }

    if (extension === '.pdf') {
      const parser = new PDFParse({ data: file.buffer });

      try {
        extractedText = await this.extractPdfTextWithImages(parser);
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

  private async convertWmfToPngBase64(
    wmfBuffer: Buffer,
    ext: string,
  ): Promise<string | null> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inputPath = join(tmpdir(), `img-${id}${ext}`);
    const outputPath = join(tmpdir(), `img-${id}.png`);

    try {
      await writeFile(inputPath, wmfBuffer);
      await execFileAsync('convert', [inputPath, outputPath], {
        timeout: 10_000,
      });
      const pngBuffer = await readFile(outputPath);
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch {
      return null;
    } finally {
      await Promise.allSettled([unlink(inputPath), unlink(outputPath)]);
    }
  }

  private async extractPdfTextWithImages(parser: PDFParse): Promise<string> {
    const textResult = await parser.getText({ pageJoiner: '\n\n' });

    if (!/<question>/i.test(textResult.text)) {
      return textResult.text;
    }

    try {
      const imageResult = await parser.getImage({
        imageBuffer: false,
        imageDataUrl: true,
        imageThreshold: PDF_IMAGE_THRESHOLD_PX,
      });

      return this.injectPdfImagesIntoTaggedText(
        textResult.pages,
        imageResult.pages,
        textResult.text,
      );
    } catch {
      return textResult.text;
    }
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.convertToHtml({ buffer });
    const textWithImages = this.htmlToTextWithImages(result.value);

    try {
      const mathAwareResult = await this.extractDocxStructuredText(buffer);

      if (mathAwareResult.mathCount === 0 && mathAwareResult.imageCount === 0) {
        return textWithImages;
      }

      const mergedText = this.mergeDocxTextWithMath(
        textWithImages,
        mathAwareResult.text,
      );

      if (
        mathAwareResult.mathCount > 0 ||
        this.countTaggedVariantsWithContent(mergedText) >
          this.countTaggedVariantsWithContent(textWithImages)
      ) {
        return mergedText;
      }

      return textWithImages;
    } catch {
      return textWithImages;
    }
  }

  private async extractDocText(buffer: Buffer): Promise<string> {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);

    return [
      document.getBody(),
      document.getTextboxes({ includeHeadersAndFooters: false }),
    ]
      .filter((segment) => segment.trim().length > 0)
      .join('\n\n');
  }

  private htmlToTextWithImages(html: string): string {
    return this.decodeHtmlEntities(
      html
        .replace(
          /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi,
          (_match, doubleQuotedSrc, singleQuotedSrc, unquotedSrc) =>
            `\n[[image:${doubleQuotedSrc ?? singleQuotedSrc ?? unquotedSrc ?? ''}]]\n`,
        )
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|h[1-6]|td|th|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, ' '),
    )
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async extractDocxStructuredText(
    buffer: Buffer,
  ): Promise<{ text: string; mathCount: number; imageCount: number }> {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      return { text: '', mathCount: 0, imageCount: 0 };
    }

    const imageMarkersByRelationshipId =
      await this.extractDocxImageMarkers(zip);

    return this.docxXmlToTextWithMath(
      documentXml,
      imageMarkersByRelationshipId,
    );
  }

  private async extractDocxImageMarkers(
    zip: JSZip,
  ): Promise<Map<string, string>> {
    const imageMarkersByRelationshipId = new Map<string, string>();
    const relationshipsXml = await zip
      .file('word/_rels/document.xml.rels')
      ?.async('string');

    if (!relationshipsXml) {
      return imageMarkersByRelationshipId;
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
        'word/document.xml',
        target,
      );

      if (!targetPath) {
        continue;
      }

      const mimeType =
        DOCX_IMAGE_MIME_BY_EXTENSION[extname(targetPath).toLowerCase()];
      const imageFile = zip.file(targetPath);

      if (!mimeType || !imageFile) {
        continue;
      }

      const imageBuffer = Buffer.from(await imageFile.async('arraybuffer'));
      const ext = extname(targetPath).toLowerCase();
      const isVectorFormat = ext === '.wmf' || ext === '.emf';

      let dataUrl: string | null;

      if (isVectorFormat) {
        dataUrl = await this.convertWmfToPngBase64(imageBuffer, ext);
      } else {
        dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      }

      if (!dataUrl) {
        continue;
      }

      imageMarkersByRelationshipId.set(relationshipId, `[[image:${dataUrl}]]`);
    }

    return imageMarkersByRelationshipId;
  }

  private docxXmlToTextWithMath(
    xml: string,
    imageMarkersByRelationshipId = new Map<string, string>(),
  ): {
    text: string;
    mathCount: number;
    imageCount: number;
  } {
    const tokenPattern =
      /<m:oMathPara\b[\s\S]*?<\/m:oMathPara>|<m:oMath\b[\s\S]*?<\/m:oMath>|<a:blip\b[^>]*\/?>|<v:imagedata\b[^>]*\/?>|<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<\/w:p>/giu;
    let text = '';
    let mathCount = 0;
    let imageCount = 0;

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
          ? imageMarkersByRelationshipId.get(relationshipId)
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
      text: text
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
      mathCount,
      imageCount,
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

  private mergeDocxTextWithMath(
    textWithImages: string,
    mathAwareText: string,
  ): string {
    if (
      !/<question>/i.test(mathAwareText) ||
      !/<variant>/i.test(mathAwareText)
    ) {
      return textWithImages;
    }

    const mathBlocks = this.splitTaggedQuestionBlocks(mathAwareText);

    if (mathBlocks.length === 0) {
      return textWithImages;
    }

    const textWithImageBlocks = this.splitTaggedQuestionBlocks(textWithImages);

    return mathBlocks
      .map((mathBlock, index) =>
        this.mergeTaggedQuestionBlockWithImages(
          textWithImageBlocks[index] ?? '',
          mathBlock,
        ),
      )
      .join('\n\n')
      .trim();
  }

  private countTaggedVariantsWithContent(value: string): number {
    return Array.from(
      value.matchAll(/<variant>\s*([\s\S]*?)(?=<variant>|<question>|$)/giu),
    ).filter((match) => {
      const variantBody = match[1] ?? '';

      return (
        variantBody.replace(IMAGE_MARKER_PATTERN, '').trim().length > 0 ||
        this.extractImageMarkers(variantBody).length > 0
      );
    }).length;
  }

  private mergeTaggedQuestionBlockWithImages(
    textWithImagesBlock: string,
    mathBlock: string,
  ): string {
    if (!textWithImagesBlock) {
      return mathBlock;
    }

    const questionImageMarkers = this.extractImageMarkers(
      this.extractTaggedQuestionBody(textWithImagesBlock),
    );
    const variantImageMarkers =
      this.extractTaggedVariantImageMarkers(textWithImagesBlock);

    const blockWithQuestionImages = this.appendImagesToTaggedQuestion(
      mathBlock,
      questionImageMarkers,
    );

    // ✅ FIX: If mammoth produced no variant images (e.g. all images are WMF),
    // the mathBlock already has correctly-placed images from docxXmlToTextWithMath.
    // Don't call appendImagesToTaggedVariants with empty markers — it would
    // overwrite/ignore the images already present in mathBlock.
    const hasAnyVariantImages = variantImageMarkers.some(
      (markers) => markers.length > 0,
    );

    if (!hasAnyVariantImages) {
      return blockWithQuestionImages;
    }

    return this.appendImagesToTaggedVariants(
      blockWithQuestionImages,
      variantImageMarkers,
    );
  }

  private splitTaggedQuestionBlocks(value: string): string[] {
    return value
      .split(/(?=<question>)/i)
      .map((block) => block.trim())
      .filter(Boolean);
  }

  private extractTaggedQuestionBody(block: string): string {
    return block.match(/<question>\s*([\s\S]*?)(?=<variant>|$)/i)?.[1] ?? '';
  }

  private extractTaggedVariantImageMarkers(block: string): string[][] {
    return Array.from(
      block.matchAll(/<variant>\s*([\s\S]*?)(?=<variant>|<question>|$)/giu),
    ).map((match) => this.extractImageMarkers(match[1] ?? ''));
  }

  private appendImagesToTaggedQuestion(
    block: string,
    imageMarkers: string[],
  ): string {
    if (imageMarkers.length === 0) {
      return block;
    }

    const firstVariantIndex = block.search(/<variant>/i);

    if (firstVariantIndex === -1) {
      return this.appendImageMarkers(block, imageMarkers);
    }

    const questionPart = block.slice(0, firstVariantIndex);
    const variantsPart = block.slice(firstVariantIndex);

    return `${this.appendImageMarkers(
      questionPart,
      imageMarkers,
    )}\n${variantsPart.trimStart()}`;
  }

  private appendImagesToTaggedVariants(
    block: string,
    variantImageMarkers: string[][],
  ): string {
    if (variantImageMarkers.every((markers) => markers.length === 0)) {
      return block;
    }

    const variantPattern =
      /<variant>\s*([\s\S]*?)(?=<variant>|<question>|$)/giu;
    let output = '';
    let lastIndex = 0;

    for (const match of block.matchAll(variantPattern)) {
      const matchIndex = match.index ?? 0;
      const variantIndex = output.match(/<variant>/gi)?.length ?? 0;

      output += block.slice(lastIndex, matchIndex);
      output += this.appendImageMarkers(
        match[0],
        variantImageMarkers[variantIndex] ?? [],
      );
      lastIndex = matchIndex + match[0].length;
    }

    output += block.slice(lastIndex);

    return output;
  }

  private injectPdfImagesIntoTaggedText(
    textPages: PdfTextPage[],
    imagePages: PdfImagePage[],
    fallbackText: string,
  ): string {
    const imagesByPage = new Map(
      imagePages.map((page) => [
        page.pageNumber,
        page.images
          .map((image) => image.dataUrl)
          .filter((imageUrl): imageUrl is string =>
            /^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(
              imageUrl ?? '',
            ),
          ),
      ]),
    );

    if (textPages.length === 0) {
      return this.injectImagesIntoTaggedText(
        fallbackText,
        Array.from(imagesByPage.values()).flat(),
      );
    }

    return textPages
      .map((page) =>
        this.injectImagesIntoTaggedText(
          page.text,
          imagesByPage.get(page.num) ?? [],
        ),
      )
      .join('\n\n')
      .trim();
  }

  private injectImagesIntoTaggedText(
    text: string,
    imageUrls: string[],
  ): string {
    if (imageUrls.length === 0 || !/<question>/i.test(text)) {
      return text;
    }

    const blocks = Array.from(
      text.matchAll(/<question>[\s\S]*?(?=<question>|$)/giu),
    );

    if (blocks.length === 0) {
      return text;
    }

    let imageIndex = 0;
    let questionImageBudget = Math.max(
      0,
      imageUrls.length -
        blocks.reduce(
          (count, block) => count + this.countEmptyTaggedVariantSlots(block[0]),
          0,
        ),
    );
    let output = '';
    let lastIndex = 0;

    for (const blockMatch of blocks) {
      const block = blockMatch[0];
      const blockIndex = blockMatch.index ?? 0;
      const result = this.injectImagesIntoTaggedBlock(
        block,
        imageUrls.slice(imageIndex),
        questionImageBudget,
      );

      output += text.slice(lastIndex, blockIndex);
      output += result.block;
      imageIndex += result.usedCount;
      questionImageBudget -= result.usedQuestionImageCount;
      lastIndex = blockIndex + block.length;
    }

    output += text.slice(lastIndex);

    return output.trim();
  }

  private injectImagesIntoTaggedBlock(
    block: string,
    imageUrls: string[],
    questionImageBudget: number,
  ): { block: string; usedCount: number; usedQuestionImageCount: number } {
    let nextBlock = block;
    let usedCount = 0;
    let usedQuestionImageCount = 0;
    const questionBody = this.extractTaggedQuestionBody(block);

    if (
      questionImageBudget > 0 &&
      imageUrls.length > 0 &&
      questionBody.trim().length > 0 &&
      this.extractImageMarkers(questionBody).length === 0
    ) {
      nextBlock = this.appendImagesToTaggedQuestion(nextBlock, [
        this.toImageMarker(imageUrls[usedCount]),
      ]);
      usedCount += 1;
      usedQuestionImageCount += 1;
    }

    const variantImageMarkers = this.extractTaggedVariantBodies(block).map(
      (variantBody) => {
        if (
          usedCount >= imageUrls.length ||
          !this.isEmptyTaggedBodyWithoutImages(variantBody)
        ) {
          return [];
        }

        const imageMarker = this.toImageMarker(imageUrls[usedCount]);
        usedCount += 1;

        return [imageMarker];
      },
    );

    nextBlock = this.appendImagesToTaggedVariants(
      nextBlock,
      variantImageMarkers,
    );

    return {
      block: nextBlock,
      usedCount,
      usedQuestionImageCount,
    };
  }

  private countEmptyTaggedVariantSlots(block: string): number {
    return this.extractTaggedVariantBodies(block).filter((variantBody) =>
      this.isEmptyTaggedBodyWithoutImages(variantBody),
    ).length;
  }

  private extractTaggedVariantBodies(block: string): string[] {
    return Array.from(
      block.matchAll(/<variant>\s*([\s\S]*?)(?=<variant>|<question>|$)/giu),
    ).map((match) => match[1] ?? '');
  }

  private isEmptyTaggedBodyWithoutImages(value: string): boolean {
    return (
      this.extractImageMarkers(value).length === 0 &&
      value.replace(IMAGE_MARKER_PATTERN, '').trim().length === 0
    );
  }

  private appendImageMarkers(value: string, imageMarkers: string[]): string {
    const missingImageMarkers = imageMarkers.filter(
      (imageMarker) => !value.includes(imageMarker),
    );

    if (missingImageMarkers.length === 0) {
      return value.trimEnd();
    }

    return `${value.trimEnd()}\n${missingImageMarkers.join('\n')}`;
  }

  private toImageMarker(imageUrl: string): string {
    return `[[image:${imageUrl}]]`;
  }

  private extractImageMarkers(value: string): string[] {
    return Array.from(value.matchAll(IMAGE_MARKER_PATTERN)).map(
      (match) => match[0],
    );
  }

  private normalizeFormulaText(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:)\]])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\[\s+/g, '[')
      .trim();
  }

  private getXmlAttribute(attributes: string, name: string): string | null {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = attributes.match(
      new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]+)"|'([^']+)')`, 'iu'),
    );

    return match ? this.decodeXmlEntities(match[1] ?? match[2] ?? '') : null;
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
