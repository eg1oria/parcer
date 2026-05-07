import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImportedImageStorageService } from './imported-image-storage.service';
import { TextExtractorService } from './text-extractor.service';

describe('TextExtractorService', () => {
  let service: TextExtractorService;

  function createService(configService: ConfigService = {} as ConfigService) {
    return new TextExtractorService(
      configService,
      {
        storePermanentImage: jest.fn(async (_buffer: Buffer, extension: string) => ({
          created: true,
          url: `/media/imported-tests/aa/test${extension || '.png'}`,
        })),
        storePreviewImage: jest.fn(
          async (_draftId: string, _buffer: Buffer, extension: string) =>
            `/media/imported-tests/preview/draft/test${extension || '.png'}`,
        ),
      } as unknown as ImportedImageStorageService,
    );
  }

  beforeEach(() => {
    service = createService();
  });

  it('linearizes Word equation XML inside tagged variants', () => {
    const result = service['docxXmlToText'](`
      <w:document xmlns:w="w" xmlns:m="m">
        <w:body>
          <w:p>
            <w:r><w:t>&lt;question&gt; Choose the formula</w:t></w:r>
          </w:p>
          <w:p>
            <w:r><w:t>&lt;variant&gt;</w:t></w:r>
            <m:oMath>
              <m:r><m:t>U</m:t></m:r>
              <m:r><m:t>12</m:t></m:r>
              <m:r><m:t>=</m:t></m:r>
              <m:f>
                <m:num>
                  <m:r><m:t>-E1*g1</m:t></m:r>
                </m:num>
                <m:den>
                  <m:r><m:t>g1+g2</m:t></m:r>
                </m:den>
              </m:f>
            </m:oMath>
          </w:p>
          <w:p>
            <w:r><w:t>&lt;variant&gt;</w:t></w:r>
            <m:oMath>
              <m:r><m:t>U12=0</m:t></m:r>
            </m:oMath>
          </w:p>
        </w:body>
      </w:document>
    `);

    expect(result.mathCount).toBe(2);
    expect(result.imageCount).toBe(0);
    expect(result.text).toContain('<variant> U12=(-E1*g1)/(g1+g2)');
    expect(result.text).toContain('<variant> U12=0');
  });

  it('keeps raw DOCX images where they appear in tagged variants', () => {
    const imageMarker = '[[image:/media/imported-tests/aa/variant.png]]';
    const result = service['docxXmlToText'](
      `
        <w:document xmlns:w="w" xmlns:a="a" xmlns:r="r">
          <w:body>
            <w:p>
              <w:r><w:t>&lt;question&gt; Choose an image answer</w:t></w:r>
            </w:p>
            <w:p>
              <w:r><w:t>&lt;variant&gt;</w:t></w:r>
              <a:blip r:embed="rId7"/>
            </w:p>
            <w:p>
              <w:r><w:t>&lt;variant&gt; Text answer</w:t></w:r>
            </w:p>
          </w:body>
        </w:document>
      `,
      new Map([['rId7', imageMarker]]),
    );

    expect(result.imageCount).toBe(1);
    expect(result.text).toContain('<variant>');
    expect(result.text).toContain(imageMarker);
    expect(result.text).toContain('<variant> Text answer');
  });

  it('rejects DOCX relationship targets that escape the archive root', () => {
    expect(
      service['resolveDocxRelationshipTarget'](
        'word/document.xml',
        '../../media/image1.png',
      ),
    ).toBeNull();
  });

  it('resolves DOCX relationship targets that stay inside the archive root', () => {
    expect(
      service['resolveDocxRelationshipTarget'](
        'word/document.xml',
        'media/image1.png',
      ),
    ).toBe('word/media/image1.png');
  });

  it('places PDF images after the nearest text block so question and variant ownership is preserved', () => {
    const result = service['mergePdfPageContent'](
      [
        {
          text: '<question> Choose the correct scheme',
          baseline: 10,
          left: 20,
          right: 200,
          top: 0,
          bottom: 12,
        },
        {
          text: '<variant> First answer',
          baseline: 40,
          left: 20,
          right: 160,
          top: 30,
          bottom: 42,
        },
        {
          text: '<variant> Second answer',
          baseline: 80,
          left: 20,
          right: 170,
          top: 70,
          bottom: 82,
        },
      ],
      [
        {
          url: '/media/imported-tests/aa/question.png',
          left: 30,
          right: 110,
          top: 18,
          bottom: 26,
        },
        {
          url: '/media/imported-tests/bb/variant.png',
          left: 30,
          right: 120,
          top: 48,
          bottom: 58,
        },
      ],
    );

    expect(result).toBe(
      [
        '<question> Choose the correct scheme',
        '[[image:/media/imported-tests/aa/question.png]]',
        '<variant> First answer',
        '[[image:/media/imported-tests/bb/variant.png]]',
        '<variant> Second answer',
      ].join('\n'),
    );
  });

  it('prefers rich PDF extraction before pdftotext when rich mode is enabled', async () => {
    service = createService({
      get: (key: string) =>
        key === 'PDF_RICH_EXTRACTION_ENABLED' ? 'true' : undefined,
    } as ConfigService);

    const richSpy = jest
      .spyOn(service as never, 'extractRichPdfText')
      .mockResolvedValue('rich result');
    const popplerSpy = jest
      .spyOn(service as never, 'extractPdfTextWithPoppler')
      .mockResolvedValue('poppler result');
    const textOnlySpy = jest
      .spyOn(service as never, 'extractTextOnlyPdfText')
      .mockResolvedValue('text-only result');

    await expect(service['extractPdfText'](Buffer.from('pdf'))).resolves.toBe(
      'rich result',
    );
    expect(richSpy).toHaveBeenCalledTimes(1);
    expect(popplerSpy).not.toHaveBeenCalled();
    expect(textOnlySpy).not.toHaveBeenCalled();
  });

  it('falls back to pdftotext when rich PDF extraction fails', async () => {
    service = createService({
      get: (key: string) =>
        key === 'PDF_RICH_EXTRACTION_ENABLED' ? 'true' : undefined,
    } as ConfigService);

    const richSpy = jest
      .spyOn(service as never, 'extractRichPdfText')
      .mockRejectedValue(new Error('rich failed'));
    const popplerSpy = jest
      .spyOn(service as never, 'extractPdfTextWithPoppler')
      .mockResolvedValue('poppler result');
    const textOnlySpy = jest
      .spyOn(service as never, 'extractTextOnlyPdfText')
      .mockResolvedValue('text-only result');

    await expect(service['extractPdfText'](Buffer.from('pdf'))).resolves.toBe(
      'poppler result',
    );
    expect(richSpy).toHaveBeenCalledTimes(1);
    expect(popplerSpy).toHaveBeenCalledTimes(1);
    expect(textOnlySpy).not.toHaveBeenCalled();
  });

  it('preserves PDF fallback details in the final exception cause', async () => {
    service = createService({
      get: (key: string) =>
        key === 'PDF_RICH_EXTRACTION_ENABLED' ? 'true' : undefined,
    } as ConfigService);

    jest
      .spyOn(service as never, 'extractRichPdfText')
      .mockRejectedValue(new Error('rich failed'));
    jest
      .spyOn(service as never, 'extractPdfTextWithPoppler')
      .mockRejectedValue(new Error('poppler failed'));
    jest
      .spyOn(service as never, 'extractTextOnlyPdfText')
      .mockRejectedValue(new Error('text-only failed'));

    try {
      await service['extractPdfText'](Buffer.from('pdf'));
      fail('Expected extractPdfText to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const extractionError = error as BadRequestException & {
        cause?: Error;
      };

      expect(extractionError.cause).toBeInstanceOf(Error);
      expect(extractionError.cause?.message).toContain('rich PDF extraction');
      expect(extractionError.cause?.message).toContain('rich failed');
      expect(extractionError.cause?.message).toContain('pdftotext extraction');
      expect(extractionError.cause?.message).toContain('poppler failed');
      expect(extractionError.cause?.message).toContain(
        'text-only PDF extraction',
      );
      expect(extractionError.cause?.message).toContain('text-only failed');
    }
  });

  it('applies the configured image timeout to each PDF page independently', async () => {
    service = createService({
      get: (key: string) =>
        key === 'PDF_IMAGE_EXTRACTION_TIMEOUT_MS' ? '1500' : undefined,
    } as ConfigService);

    const pages = Array.from({ length: 3 }, (_, index) => ({
      pageNumber: index + 1,
      cleanup: jest.fn(),
    }));
    const doc = {
      numPages: pages.length,
      getPage: jest.fn((pageNumber: number) => pages[pageNumber - 1]),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    const loadingTask = {
      promise: Promise.resolve(doc),
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(service as never, 'getPdfJs').mockResolvedValue({
      VerbosityLevel: { ERRORS: 0 },
      getDocument: jest.fn(() => loadingTask),
    } as never);
    jest
      .spyOn(service as never, 'extractPdfPageTextItems')
      .mockResolvedValue([]);
    jest
      .spyOn(service as never, 'groupPdfTextItemsIntoLines')
      .mockReturnValue([]);
    const imageSpy = jest
      .spyOn(service as never, 'extractPdfPageImagesSafely')
      .mockResolvedValue([]);
    jest.spyOn(service as never, 'mergePdfPageContent').mockReturnValue('');

    await expect(
      service['extractRichPdfText'](Buffer.from('pdf')),
    ).resolves.toBe('');

    expect(imageSpy).toHaveBeenCalledTimes(3);
    expect(imageSpy).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      doc,
      pages[0],
      expect.any(Map),
      1500,
      {},
    );
    expect(imageSpy).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      doc,
      pages[1],
      expect.any(Map),
      1500,
      {},
    );
    expect(imageSpy).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      doc,
      pages[2],
      expect.any(Map),
      1500,
      {},
    );
  });

  it('processes PDFs larger than 1 MB in 10-page batches', async () => {
    service = createService({
      get: () => undefined,
    } as ConfigService);

    const cleanupSnapshots: number[] = [];
    const pages = Array.from({ length: 23 }, (_, index) => ({
      pageNumber: index + 1,
      cleanup: jest.fn(),
    }));
    const doc = {
      numPages: pages.length,
      getPage: jest.fn((pageNumber: number) => pages[pageNumber - 1]),
      cleanup: jest.fn(() => {
        cleanupSnapshots.push(doc.getPage.mock.calls.length);
        return Promise.resolve(undefined);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    const loadingTask = {
      promise: Promise.resolve(doc),
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(service as never, 'getPdfJs').mockResolvedValue({
      VerbosityLevel: { ERRORS: 0 },
      getDocument: jest.fn(() => loadingTask),
    } as never);
    jest
      .spyOn(service as never, 'extractPdfPageTextItems')
      .mockImplementation((page: { pageNumber: number }) =>
        Promise.resolve([
          {
            text: `page-${page.pageNumber}`,
            x: 0,
            y: page.pageNumber,
            width: 10,
            height: 10,
            hasEOL: false,
          },
        ]),
      );
    jest
      .spyOn(service as never, 'extractPdfPageImagesSafely')
      .mockResolvedValue([]);
    jest
      .spyOn(service as never, 'mergePdfPageContent')
      .mockImplementation(
        (lines: Array<{ text: string }>) => lines[0]?.text ?? '',
      );

    await expect(
      service['extractRichPdfText'](Buffer.alloc(1024 * 1024 + 1, 1)),
    ).resolves.toBe(
      Array.from({ length: 23 }, (_, index) => `page-${index + 1}`).join(
        '\n\n',
      ),
    );

    expect(cleanupSnapshots).toEqual([10, 20, 23]);
    expect(doc.cleanup).toHaveBeenCalledTimes(3);
  });

  it('resolves page image objects without hanging on missing common objects', async () => {
    const buildPlacementSpy = jest
      .spyOn(service as never, 'buildPdfImagePlacement')
      .mockResolvedValue({
        url: '/media/imported-tests/aa/formula.png',
        left: 10,
        right: 20,
        top: 30,
        bottom: 40,
      });

    const images = await service['extractPdfPageImages'](
      {
        OPS: {
          save: 1,
          restore: 2,
          transform: 3,
          paintInlineImageXObject: 4,
          paintImageXObject: 5,
          paintImageXObjectRepeat: 6,
        },
        Util: {
          transform: jest.fn(),
        },
      } as never,
      {},
      {
        getViewport: () => ({ transform: [1, 0, 0, 1, 0, 0] }),
        getOperatorList: () =>
          Promise.resolve({
            fnArray: [5],
            argsArray: [['img_p0_1']],
          }),
        commonObjs: {
          has: jest.fn(() => false),
          get: jest.fn(),
        },
        objs: {
          get: jest.fn((name: string, callback: (image: unknown) => void) =>
            callback({
              name,
              width: 120,
              height: 40,
              kind: 2,
              data: new Uint8Array([255, 255, 255]),
            }),
          ),
        },
      },
      new Map(),
    );

    expect(images).toEqual([
      {
        url: '/media/imported-tests/aa/formula.png',
        left: 10,
        right: 20,
        top: 30,
        bottom: 40,
      },
    ]);
    expect(buildPlacementSpy).toHaveBeenCalledTimes(1);
  });

  it('evicts the oldest PDF image cache entries when the cache reaches its limit', async () => {
    service = createService({
      get: (key: string) =>
        key === 'PDF_IMAGE_CACHE_MAX_ENTRIES' ? '2' : undefined,
    } as ConfigService);

    jest
      .spyOn(service as never, 'convertPdfImageToPngBuffer')
      .mockResolvedValue(Buffer.from('png'));
    jest
      .spyOn(service as never, 'storeExtractedImage')
      .mockResolvedValue('/media/imported-tests/cc/new.png');
    jest.spyOn(service as never, 'buildPdfImageRect').mockReturnValue({
      left: 1,
      right: 2,
      top: 3,
      bottom: 4,
    });

    const pdfImageCache = new Map<string, string>([
      ['first', '/media/imported-tests/aa/first.png'],
      ['second', '/media/imported-tests/bb/second.png'],
    ]);

    const placement = await service['buildPdfImagePlacement'](
      {
        Util: {
          transform: jest.fn(),
        },
      } as never,
      {
        name: 'third',
        width: 32,
        height: 32,
        kind: 2,
        data: new Uint8Array([1, 2, 3]),
      },
      [1, 0, 0, 1, 0, 0],
      {
        transform: [1, 0, 0, 1, 0, 0],
      },
      pdfImageCache,
    );

    expect(placement).toEqual({
      url: '/media/imported-tests/cc/new.png',
      left: 1,
      right: 2,
      top: 3,
      bottom: 4,
    });
    expect(pdfImageCache.size).toBe(2);
    expect(pdfImageCache.has('first')).toBe(false);
    expect(pdfImageCache.has('second')).toBe(true);
  });
});
