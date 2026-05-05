import { ConfigService } from '@nestjs/config';
import { TextExtractorService } from './text-extractor.service';

describe('TextExtractorService', () => {
  let service: TextExtractorService;

  beforeEach(() => {
    service = new TextExtractorService({
      get: (key: string) =>
        key === 'PDF_IMAGE_EXTRACTION_TIMEOUT_MS' ? 10 : undefined,
    } as ConfigService);
  });

  it('linearizes Word equation XML inside tagged variants', () => {
    const result = service['docxXmlToTextWithMath'](`
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

  it('keeps raw DOCX images when they are placed inside tagged variants', () => {
    const imageMarker =
      '[[image:data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB]]';
    const result = service['docxXmlToTextWithMath'](
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
    expect(result.text).toContain(imageMarker);
    expect(result.text).toContain('<variant> Text answer');
  });

  it('keeps mammoth image markers when math-aware text is used', () => {
    const imageMarker =
      '[[image:data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB]]';
    const merged = service['mergeDocxTextWithMath'](
      `<question> Choose the formula
${imageMarker}
<variant>
<variant>`,
      `<question> Choose the formula
<variant> U12=(-E1*g1)/(g1+g2)
<variant> U12=0`,
    );

    expect(merged).toContain(imageMarker);
    expect(merged).toContain('<variant> U12=(-E1*g1)/(g1+g2)');
    expect(merged.indexOf(imageMarker)).toBeLessThan(
      merged.indexOf('<variant>'),
    );
  });

  it('re-attaches PDF images to tagged questions and image-only variants', () => {
    const questionImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
    const firstVariantImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAC';
    const secondVariantImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAD';

    const result = service['injectImagesIntoTaggedText'](
      `<question> Choose the circuit
<variant>
<variant>`,
      [questionImage, firstVariantImage, secondVariantImage],
    );

    expect(result).toContain(`[[image:${questionImage}]]`);
    expect(result).toContain(`<variant>
[[image:${firstVariantImage}]]`);
    expect(result).toContain(`<variant>
[[image:${secondVariantImage}]]`);
    expect(result.indexOf(questionImage)).toBeLessThan(
      result.indexOf('<variant>'),
    );
  });

  it('maps PDF images to empty variants when there is no extra question image', () => {
    const firstVariantImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAC';
    const secondVariantImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAD';

    const result = service['injectImagesIntoTaggedText'](
      `<question> Choose the formula
<variant>
<variant>`,
      [firstVariantImage, secondVariantImage],
    );

    const firstVariantIndex = result.indexOf('<variant>');

    expect(result.indexOf(firstVariantImage)).toBeGreaterThan(
      firstVariantIndex,
    );
    expect(result.indexOf(secondVariantImage)).toBeGreaterThan(
      result.indexOf(firstVariantImage),
    );
    expect(result.slice(0, firstVariantIndex)).not.toContain('[[image:');
  });

  it('falls back to PDF text when image extraction times out', async () => {
    const pdfText = `<question> Choose the formula
<variant> First
<variant> Second`;
    const parser = {
      getText: jest.fn().mockResolvedValue({
        text: pdfText,
        pages: [],
      }),
      getImage: jest.fn(
        () => new Promise(() => undefined) as Promise<{ pages: [] }>,
      ),
    };

    const result = await service['extractPdfTextWithImages'](parser as never);

    expect(result).toBe(pdfText);
  });
});
