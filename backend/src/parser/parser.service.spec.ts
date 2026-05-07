import { ParserService } from './parser.service';
import { ParseFormat } from './parser.types';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(() => {
    service = new ParserService();
  });

  it('splits dense numeric questions and keeps numeric variants attached', () => {
    const result = service.parseTextToQuestions(`
      1. First question
      1) First option
      2) Second option *
      2. Second question
      1) Third option
      2) Fourth option
      Answer: 1
    `);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      text: 'First question',
      variants: [
        { text: 'First option', isCorrect: false },
        { text: 'Second option', isCorrect: true },
      ],
    });
    expect(result[1]).toMatchObject({
      text: 'Second question',
      variants: [
        { text: 'Third option', isCorrect: true },
        { text: 'Fourth option', isCorrect: false },
      ],
    });
  });

  it('parses tagged questions with question and variant images in auto mode', () => {
    const [result] = service.parseTextToQuestions(`
      <question> Choose the correct image [[image:/media/imported-tests/q/question.png]]
      <variant> [[image:/media/imported-tests/a/first.png]]
      <variant> Text answer
    `);

    expect(result).toMatchObject({
      text: 'Choose the correct image',
      imageUrls: ['/media/imported-tests/q/question.png'],
      variants: [
        {
          text: '',
          imageUrls: ['/media/imported-tests/a/first.png'],
          isCorrect: true,
        },
        {
          text: 'Text answer',
          isCorrect: false,
        },
      ],
    });
    expect(result.warnings).not.toContain('Question has no correct answer');
  });

  it('marks the first variant as correct in first-variant mode when none is set', () => {
    const [result] = service.parseTextToQuestions(
      `
        Question: Pick one
        A) First answer
        B) Second answer
      `,
      { format: ParseFormat.FIRST_VARIANT_CORRECT },
    );

    expect(result.variants).toMatchObject([
      { text: 'First answer', isCorrect: true },
      { text: 'Second answer', isCorrect: false },
    ]);
    expect(result.warnings).not.toContain('Question has no correct answer');
  });

  it('keeps disagreement warnings when inline markers and answer lines conflict', () => {
    const [result] = service.parseTextToQuestions(`
      Question: Choose one
      A) Alpha *
      B) Beta
      Answer: B
    `);

    expect(result.variants).toMatchObject([
      { text: 'Alpha', isCorrect: true },
      { text: 'Beta', isCorrect: true },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'Correct answer markers disagree',
        'Question has multiple correct answers',
      ]),
    );
  });
});
