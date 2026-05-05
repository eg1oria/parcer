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
});
