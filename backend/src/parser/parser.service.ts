import { Injectable } from '@nestjs/common';
import {
  ParsedQuestion,
  ParsedVariant,
  ParseFormat,
  ParseOptions,
} from './parser.types';
import { normalizeQuestionImageUrl } from '../common/image-url';

type MarkerKind = 'latin' | 'cyrillic' | 'numeric';

type InternalVariant = ParsedVariant & {
  marker: string;
  markerKind: MarkerKind;
};

type VariantMarker = {
  normalized: string;
  kind: MarkerKind;
  text: string;
};

const ANSWER_LINE_PATTERN =
  '^(?:\\u043e\\u0442\\u0432\\u0435\\u0442|\\u043f\\u0440\\u0430\\u0432\\u0438\\u043b\\u044c\\u043d\\u044b\\u0439\\s+\\u043e\\u0442\\u0432\\u0435\\u0442|answer|correct answer)\\s*[:\\-]\\s*([A-Za-z\\u0410-\\u042f\\u0401\\u0430-\\u044f\\u04510-9]+)\\s*$';
const QUESTION_PREFIX_PATTERN =
  '^(?:\\u0432\\u043e\\u043f\\u0440\\u043e\\u0441|question)\\s*[:\\-]\\s*';
const VARIANT_LINE_PATTERN =
  '^([A-Za-z\\u0410-\\u042f\\u0401\\u0430-\\u044f\\u0451]|\\d{1,2})\\s*[\\).:-]\\s*(.*)$';
const NUMERIC_QUESTION_LINE_PATTERN = /^\d+[.)](?:\s+\S|[^\s\d].*)/u;
const IMAGE_REFERENCE_PATTERN =
  /\[\[image:([^\]]+)\]\]|<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>|<image\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*\/?>/giu;

const CYRILLIC_MARKERS = [
  '\u0430',
  '\u0431',
  '\u0432',
  '\u0433',
  '\u0434',
  '\u0435',
  '\u0436',
  '\u0437',
  '\u0438',
  '\u0439',
  '\u043a',
  '\u043b',
  '\u043c',
  '\u043d',
  '\u043e',
  '\u043f',
  '\u0440',
  '\u0441',
  '\u0442',
  '\u0443',
  '\u0444',
  '\u0445',
  '\u0446',
  '\u0447',
  '\u0448',
  '\u0449',
  '\u044a',
  '\u044b',
  '\u044c',
  '\u044d',
  '\u044e',
  '\u044f',
];
const LATIN_MARKERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CYRILLIC_MARKER_MAP = Object.fromEntries(
  CYRILLIC_MARKERS.slice(0, LATIN_MARKERS.length).map((letter, index) => [
    letter,
    LATIN_MARKERS[index],
  ]),
) as Record<string, string>;

@Injectable()
export class ParserService {
  parseTextToQuestions(
    input: string,
    options: ParseOptions = {},
  ): ParsedQuestion[] {
    const normalizedInput = input.replace(/\r\n/g, '\n').trim();

    if (!normalizedInput) {
      return [];
    }

    const format = options.format ?? ParseFormat.AUTO;

    if (format === ParseFormat.AUTO) {
      return this.parseAuto(normalizedInput);
    }

    if (format === ParseFormat.PARENS_MARKERS) {
      return this.parseParenMarkerQuestions(normalizedInput);
    }

    if (format === ParseFormat.TAGGED_FIRST_CORRECT) {
      return this.parseTaggedFirstCorrectQuestions(normalizedInput);
    }

    if (format === ParseFormat.FIRST_VARIANT_CORRECT) {
      return this.parseFirstVariantCorrectQuestions(normalizedInput);
    }

    return this.parseStandardQuestions(normalizedInput);
  }

  private parseAuto(input: string): ParsedQuestion[] {
    if (/<question>/i.test(input) && /<variant>/i.test(input)) {
      return this.parseTaggedFirstCorrectQuestions(input);
    }

    if (/^\s*\((?:!|\?)\)\s*\S/m.test(input)) {
      return this.parseParenMarkerQuestions(input);
    }

    return this.parseStandardQuestions(input);
  }

  private parseStandardQuestions(input: string): ParsedQuestion[] {
    return this.splitIntoQuestionBlocks(input).map((block) =>
      this.parseQuestionBlock(block),
    );
  }

  private parseFirstVariantCorrectQuestions(input: string): ParsedQuestion[] {
    if (/<question>/i.test(input) && /<variant>/i.test(input)) {
      return this.parseTaggedFirstCorrectQuestions(input);
    }

    const questions = /^\s*\((?:!|\?)\)\s*\S/m.test(input)
      ? this.parseParenMarkerQuestions(input)
      : this.parseStandardQuestions(input);

    return questions.map((question) =>
      this.ensureFirstVariantIsCorrect(question),
    );
  }

  private parseParenMarkerQuestions(input: string): ParsedQuestion[] {
    return this.splitIntoParenMarkerBlocks(input).map((block) =>
      this.parseParenMarkerBlock(block),
    );
  }

  private splitIntoParenMarkerBlocks(input: string): string[] {
    const lines = input.split('\n');
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const startsQuestion = this.isNumericQuestionLine(line.trim());

      if (startsQuestion && currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }

      if (line.trim().length > 0 || currentBlock.length > 0) {
        currentBlock.push(line);
      }
    }

    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks.map((block) => block.join('\n').trim()).filter(Boolean);
  }

  private parseParenMarkerBlock(block: string): ParsedQuestion {
    const warnings: string[] = [];
    const questionLines: string[] = [];
    const variants: ParsedVariant[] = [];
    const imageUrls: string[] = [];

    for (const rawLine of block.split('\n')) {
      const extractedLine = this.extractImagesFromText(rawLine.trim());
      const line = extractedLine.text.trim();

      if (!line) {
        this.appendImagesToCurrentTarget(
          extractedLine.imageUrls,
          imageUrls,
          variants,
        );
        continue;
      }

      const variantMatch = line.match(/^\((!|\?)\)\s*(.*)$/u);

      if (variantMatch) {
        variants.push({
          text: variantMatch[2].trim(),
          ...(extractedLine.imageUrls.length
            ? { imageUrls: extractedLine.imageUrls }
            : {}),
          isCorrect: variantMatch[1] === '!',
        });
        continue;
      }

      if (variants.length > 0) {
        variants[variants.length - 1].text = `${
          variants[variants.length - 1].text
        } ${line}`.trim();
        variants[variants.length - 1].imageUrls = [
          ...(variants[variants.length - 1].imageUrls ?? []),
          ...extractedLine.imageUrls,
        ];
        continue;
      }

      imageUrls.push(...extractedLine.imageUrls);
      questionLines.push(this.cleanQuestionLine(line));
    }

    return this.withQuestionWarnings({
      text: questionLines.join(' ').trim(),
      imageUrls,
      variants,
      warnings,
    });
  }

  private parseTaggedFirstCorrectQuestions(input: string): ParsedQuestion[] {
    const blocks = input
      .split(/(?=<question>)/i)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks.map((block) => this.parseTaggedFirstCorrectBlock(block));
  }

  private parseTaggedFirstCorrectBlock(block: string): ParsedQuestion {
    const warnings: string[] = [];
    const questionMatch = block.match(
      /<question>\s*([\s\S]*?)(?=<variant>|$)/i,
    );
    const variantMatches = Array.from(
      block.matchAll(/<variant>\s*([\s\S]*?)(?=<variant>|<question>|$)/gi),
    );
    const questionContent = this.extractImagesFromText(
      questionMatch?.[1] ?? '',
    );
    const imageUrls = [...questionContent.imageUrls];
    const text = this.normalizeInlineText(questionContent.text);
    const variants = variantMatches
      .map((match, index) => {
        const variantContent = this.extractImagesFromText(match[1]);

        return {
          text: this.normalizeInlineText(variantContent.text),
          ...(variantContent.imageUrls.length
            ? { imageUrls: variantContent.imageUrls }
            : {}),
          isCorrect: index === 0,
        };
      })
      .filter((variant) => this.variantHasContent(variant));

    if (!questionMatch) {
      warnings.push('Question tag was not found');
    }

    return this.withQuestionWarnings({
      text,
      imageUrls,
      variants,
      warnings,
    });
  }

  private splitIntoQuestionBlocks(input: string): string[] {
    const lines = input.split('\n');
    const blocks: string[][] = [];
    let currentBlock: string[] = [];
    let seenVariantKind: MarkerKind | null = null;
    let previousLineWasBlank = true;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmedLine = line.trim();
      const variantMarker = this.getVariantMarker(trimmedLine);
      const hasCurrentBlock = currentBlock.length > 0;
      const startsQuestion =
        this.isDenseNumericQuestionStart(
          trimmedLine,
          hasCurrentBlock,
          seenVariantKind,
          previousLineWasBlank,
          this.nextNonEmptyLine(lines, index),
        ) ||
        this.isQuestionStart(
          trimmedLine,
          hasCurrentBlock,
          seenVariantKind,
          previousLineWasBlank,
        );

      if (startsQuestion && currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
        seenVariantKind = null;
      }

      if (trimmedLine.length > 0 || currentBlock.length > 0) {
        currentBlock.push(line);
      }

      if (variantMarker && !startsQuestion) {
        seenVariantKind = variantMarker.kind;
      }

      previousLineWasBlank = trimmedLine.length === 0;
    }

    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks.map((block) => block.join('\n').trim()).filter(Boolean);
  }

  private isDenseNumericQuestionStart(
    line: string,
    hasCurrentBlock: boolean,
    seenVariantKind: MarkerKind | null,
    previousLineWasBlank: boolean,
    nextLine: string | null,
  ): boolean {
    if (!hasCurrentBlock || seenVariantKind !== 'numeric') {
      return false;
    }

    if (previousLineWasBlank || !this.isNumericQuestionLine(line)) {
      return false;
    }

    const nextVariantMarker = nextLine
      ? this.getVariantMarker(nextLine.trim())
      : null;

    return Boolean(
      nextVariantMarker &&
      (nextVariantMarker.kind !== 'numeric' ||
        nextVariantMarker.normalized === '1'),
    );
  }

  private nextNonEmptyLine(
    lines: string[],
    currentIndex: number,
  ): string | null {
    for (let index = currentIndex + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();

      if (line) {
        return line;
      }
    }

    return null;
  }

  private parseQuestionBlock(block: string): ParsedQuestion {
    const warnings: string[] = [];
    const questionLines: string[] = [];
    const variants: InternalVariant[] = [];
    const imageUrls: string[] = [];
    let answerMarker: string | null = null;

    for (const rawLine of block.split('\n')) {
      const extractedLine = this.extractImagesFromText(rawLine.trim());
      const line = extractedLine.text.trim();

      if (!line) {
        this.appendImagesToCurrentTarget(
          extractedLine.imageUrls,
          imageUrls,
          variants,
        );
        continue;
      }

      if (
        questionLines.length === 0 &&
        variants.length === 0 &&
        this.isQuestionStart(line, false, null, true)
      ) {
        imageUrls.push(...extractedLine.imageUrls);
        questionLines.push(this.cleanQuestionLine(line));
        continue;
      }

      const answerMatch = line.match(new RegExp(ANSWER_LINE_PATTERN, 'iu'));

      if (answerMatch) {
        answerMarker = this.normalizeMarker(answerMatch[1]);
        continue;
      }

      const variantMarker = this.getVariantMarker(line);

      if (variantMarker) {
        const rawText = variantMarker.text.trim();
        const markedCorrect = /(^\*\s*|\s*\*\s*$)/.test(rawText);
        const text = rawText
          .replace(/^\*\s*/, '')
          .replace(/\s*\*\s*$/, '')
          .trim();

        variants.push({
          marker: variantMarker.normalized,
          markerKind: variantMarker.kind,
          text,
          ...(extractedLine.imageUrls.length
            ? { imageUrls: extractedLine.imageUrls }
            : {}),
          isCorrect: markedCorrect,
        });
        continue;
      }

      if (variants.length > 0) {
        variants[variants.length - 1].text = `${
          variants[variants.length - 1].text
        } ${line}`.trim();
        variants[variants.length - 1].imageUrls = [
          ...(variants[variants.length - 1].imageUrls ?? []),
          ...extractedLine.imageUrls,
        ];
        continue;
      }

      imageUrls.push(...extractedLine.imageUrls);
      questionLines.push(this.cleanQuestionLine(line));
    }

    if (answerMarker) {
      const answerVariant = variants.find(
        (variant) => variant.marker === answerMarker,
      );

      if (!answerVariant) {
        warnings.push(`Answer marker "${answerMarker}" has no variant`);
      } else if (
        variants.some(
          (variant) => variant.isCorrect && variant.marker !== answerMarker,
        )
      ) {
        warnings.push('Correct answer markers disagree');
      }

      for (const variant of variants) {
        variant.isCorrect =
          variant.isCorrect || variant.marker === answerMarker;
      }
    }

    const text = questionLines.join(' ').trim();

    if (!text && imageUrls.length === 0) {
      warnings.push('Question text is empty');
    }

    if (variants.length < 2) {
      warnings.push('Question has fewer than 2 variants');
    }

    const correctCount = variants.filter((variant) => variant.isCorrect).length;

    if (correctCount === 0) {
      warnings.push('Question has no correct answer');
    }

    if (correctCount > 1) {
      warnings.push('Question has multiple correct answers');
    }

    if (
      (text.length < 3 && imageUrls.length === 0) ||
      variants.some((variant) => !this.variantHasContent(variant))
    ) {
      warnings.push('Question text looks poorly recognized');
    }

    return {
      text,
      imageUrls,
      variants: variants.map(({ text: variantText, imageUrls, isCorrect }) => ({
        text: variantText,
        ...(imageUrls?.length ? { imageUrls } : {}),
        isCorrect,
      })),
      warnings,
    };
  }

  private ensureFirstVariantIsCorrect(
    question: ParsedQuestion,
  ): ParsedQuestion {
    if (question.variants.length === 0) {
      return question;
    }

    const hasCorrectAnswer = question.variants.some(
      (variant) => variant.isCorrect,
    );

    if (hasCorrectAnswer) {
      return question;
    }

    return this.withQuestionWarnings({
      text: question.text,
      imageUrls: question.imageUrls,
      variants: question.variants.map((variant, index) => ({
        ...variant,
        isCorrect: index === 0,
      })),
      warnings: (question.warnings ?? []).filter(
        (warning) => warning !== 'Question has no correct answer',
      ),
    });
  }

  private withQuestionWarnings(question: ParsedQuestion): ParsedQuestion {
    const warnings = [...(question.warnings ?? [])];
    const imageUrls = question.imageUrls ?? [];

    if (!question.text && imageUrls.length === 0) {
      warnings.push('Question text is empty');
    }

    if (question.variants.length < 2) {
      warnings.push('Question has fewer than 2 variants');
    }

    const correctCount = question.variants.filter(
      (variant) => variant.isCorrect,
    ).length;

    if (correctCount === 0) {
      warnings.push('Question has no correct answer');
    }

    if (correctCount > 1) {
      warnings.push('Question has multiple correct answers');
    }

    if (
      (question.text.length < 3 && imageUrls.length === 0) ||
      question.variants.some((variant) => !this.variantHasContent(variant))
    ) {
      warnings.push('Question text looks poorly recognized');
    }

    return {
      ...question,
      imageUrls,
      warnings: Array.from(new Set(warnings)),
    };
  }

  private extractImagesFromText(value: string): {
    text: string;
    imageUrls: string[];
  } {
    const imageUrls = Array.from(value.matchAll(IMAGE_REFERENCE_PATTERN))
      .map((match) => match.slice(1).find(Boolean))
      .filter((url): url is string => typeof url === 'string')
      .map((url) => normalizeQuestionImageUrl(this.decodeHtmlEntities(url)))
      .filter((url): url is string => Boolean(url));

    return {
      text: value.replace(IMAGE_REFERENCE_PATTERN, ' ').trim(),
      imageUrls,
    };
  }

  private appendImagesToCurrentTarget(
    nextImageUrls: string[],
    questionImageUrls: string[],
    variants: ParsedVariant[],
  ): void {
    if (nextImageUrls.length === 0) {
      return;
    }

    if (variants.length === 0) {
      questionImageUrls.push(...nextImageUrls);
      return;
    }

    variants[variants.length - 1].imageUrls = [
      ...(variants[variants.length - 1].imageUrls ?? []),
      ...nextImageUrls,
    ];
  }

  private variantHasContent(
    variant: Pick<ParsedVariant, 'text' | 'imageUrls'>,
  ): boolean {
    return (
      variant.text.trim().length > 0 || (variant.imageUrls?.length ?? 0) > 0
    );
  }

  private normalizeInlineText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&');
  }

  private isQuestionStart(
    line: string,
    hasCurrentBlock: boolean,
    seenVariantKind: MarkerKind | null,
    previousLineWasBlank: boolean,
  ): boolean {
    if (!line) {
      return false;
    }

    if (new RegExp(QUESTION_PREFIX_PATTERN, 'iu').test(line)) {
      return true;
    }

    const numericQuestion = this.isNumericQuestionLine(line);

    if (!numericQuestion) {
      return false;
    }

    if (!hasCurrentBlock) {
      return true;
    }

    if (seenVariantKind && seenVariantKind !== 'numeric') {
      return true;
    }

    return previousLineWasBlank;
  }

  private getVariantMarker(line: string): VariantMarker | null {
    const match = line.match(new RegExp(VARIANT_LINE_PATTERN, 'u'));

    if (!match) {
      return null;
    }

    const rawMarker = match[1];

    return {
      normalized: this.normalizeMarker(rawMarker),
      kind: /^\d+$/.test(rawMarker)
        ? 'numeric'
        : /^[A-Za-z]$/.test(rawMarker)
          ? 'latin'
          : 'cyrillic',
      text: match[2],
    };
  }

  private isNumericQuestionLine(line: string): boolean {
    return NUMERIC_QUESTION_LINE_PATTERN.test(line);
  }

  private normalizeMarker(marker: string): string {
    const normalized = marker.trim().replace(/[.)]/g, '');

    if (/^\d+$/.test(normalized)) {
      return normalized;
    }

    return (
      CYRILLIC_MARKER_MAP[normalized.toLowerCase()] ?? normalized.toUpperCase()
    );
  }

  private cleanQuestionLine(line: string): string {
    return line
      .replace(/^\d+[.)]\s*/, '')
      .replace(new RegExp(QUESTION_PREFIX_PATTERN, 'iu'), '')
      .trim();
  }
}
