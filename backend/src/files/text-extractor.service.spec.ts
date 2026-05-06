import { ConfigService } from '@nestjs/config';
import { TextExtractorService } from './text-extractor.service';

describe('TextExtractorService', () => {
  let service: TextExtractorService;

  beforeEach(() => {
    service = new TextExtractorService({} as ConfigService);
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
    service = new TextExtractorService({
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
    service = new TextExtractorService({
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

  it('applies the configured image timeout to each PDF page independently', async () => {
    service = new TextExtractorService({
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
    jest
      .spyOn(service as never, 'mergePdfPageContent')
      .mockReturnValue('');

    await expect(service['extractRichPdfText'](Buffer.from('pdf'))).resolves.toBe(
      '',
    );

    expect(imageSpy).toHaveBeenCalledTimes(3);
    expect(imageSpy).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      doc,
      pages[0],
      expect.any(Map),
      1500,
    );
    expect(imageSpy).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      doc,
      pages[1],
      expect.any(Map),
      1500,
    );
    expect(imageSpy).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      doc,
      pages[2],
      expect.any(Map),
      1500,
    );
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
      {} as never,
      {
        getViewport: () => ({ transform: [1, 0, 0, 1, 0, 0] }),
        getOperatorList: async () => ({
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
      } as never,
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
});
