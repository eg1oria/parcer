import { ParserService } from './parser.service';
import { ParseFormat } from './parser.types';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(() => {
    service = new ParserService();
  });

  it('parses latin variants with inline asterisk correct answers', () => {
    const result = service.parseTextToQuestions(`
1. What is HTTP?
A) Hypertext transfer protocol *
B) Programming language
C) Database

2. What is CSS?
A) Style language *
B) Backend framework
C) Server
`);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('What is HTTP?');
    expect(result[0].variants).toEqual([
      { text: 'Hypertext transfer protocol', isCorrect: true },
      { text: 'Programming language', isCorrect: false },
      { text: 'Database', isCorrect: false },
    ]);
    expect(result[1].text).toBe('What is CSS?');
  });

  it('parses teacher format with (!)/(?) answer markers', () => {
    const result = service.parseTextToQuestions(
      `
1. \u0415\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f \u0438\u043d\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438
(!) \u0413\u0435\u043d\u0440\u0438
(?) \u0412\u043e\u043b\u044c\u0442
(?) \u041e\u043c

2. \u0410\u043c\u043f\u0435\u0440 - \u044d\u0442\u043e \u0435\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f
(!) \u0422\u043e\u043a\u0430
(?) \u0418\u043d\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438
(?) \u041d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u0438\u044f
`,
      { format: ParseFormat.PARENS_MARKERS },
    );

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(
      '\u0415\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f \u0438\u043d\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438',
    );
    expect(result[0].variants[0]).toEqual({
      text: '\u0413\u0435\u043d\u0440\u0438',
      isCorrect: true,
    });
    expect(result[0].warnings).toEqual([]);
  });

  it('splits paren marker questions without spaces after numeric prefixes', () => {
    const result = service.parseTextToQuestions(`
64. Какие элементы составляют структуру информационно-измерительной системы?
(!)Датчики, преобразователи, вычислительные модули, исполнительные устройства
(?)Коммутационные шкафы
(?)Только источники питания
(?)Лампы накаливания
(?)Только аналоговые приборы
65. Автоматическая поверочная установка содержит
(!)Устройство регистрации сигнала
(?)Двухполупериодный выпрямитель
(?)Однополупериодный выпрямитель
(?)Частотомер
(?)Фазометр
66.Отличительной особенностью измерительных систем является
(!)Автоматизация процессов измерения
(?)Нелинейность
(?)Несимметрия
(?)Подключение только к одному объекту измерения
(?)Подключение только к двум объектам измерения
67. Автоматическая поверочная установка содержит
(!)Формирователь входного сигнала
(?)Двухполупериодный выпрямитель
(?)Однополупериодный выпрямитель
(?)Частотомер
(?)Фазометр
68.Отличительной особенностью измерительных систем является
(!)Многофункциональность
(?)Нелинейность
(?)Несимметрия
(?)Подключение только к одному объекту измерения
(?)Подключение только к двум объектам измерения
`);

    expect(result).toHaveLength(5);
    expect(result.map((question) => question.text)).toEqual([
      'Какие элементы составляют структуру информационно-измерительной системы?',
      'Автоматическая поверочная установка содержит',
      'Отличительной особенностью измерительных систем является',
      'Автоматическая поверочная установка содержит',
      'Отличительной особенностью измерительных систем является',
    ]);
    expect(result[1].variants[0]).toEqual({
      text: 'Устройство регистрации сигнала',
      isCorrect: true,
    });
    expect(result[2].variants[0]).toEqual({
      text: 'Автоматизация процессов измерения',
      isCorrect: true,
    });
    expect(result[4].variants[0]).toEqual({
      text: 'Многофункциональность',
      isCorrect: true,
    });
  });

  it('parses tag format and marks the first variant as correct', () => {
    const result = service.parseTextToQuestions(
      `
<question> \u041a\u0430\u043a\u043e\u0439 \u0442\u0438\u043f \u0434\u0430\u043d\u043d\u044b\u0445 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0434\u043b\u044f \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0446\u0435\u043b\u044b\u0445 \u0447\u0438\u0441\u0435\u043b \u0432 Java
<variant> int
<variant> float
<variant> double

<question> \u041a\u0430\u043a\u043e\u0439 \u043e\u043f\u0435\u0440\u0430\u0442\u043e\u0440 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0434\u043b\u044f \u0441\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u044f
<variant> ==
<variant> =
<variant> !=
`,
      { format: ParseFormat.TAGGED_FIRST_CORRECT },
    );

    expect(result).toHaveLength(2);
    expect(result[0].variants).toEqual([
      { text: 'int', isCorrect: true },
      { text: 'float', isCorrect: false },
      { text: 'double', isCorrect: false },
    ]);
    expect(result[1].variants[0]).toEqual({ text: '==', isCorrect: true });
  });

  it('can mark first standard variant as correct when format is selected', () => {
    const result = service.parseTextToQuestions(
      `
1. Pick a type
A) int
B) float
C) double
`,
      { format: ParseFormat.FIRST_VARIANT_CORRECT },
    );

    expect(result[0].variants[0].isCorrect).toBe(true);
    expect(result[0].warnings).toEqual([]);
  });

  it('parses correct answer from Russian answer line', () => {
    const result = service.parseTextToQuestions(`
1. What is TCP?
A. Transport protocol
B. Style language
\u041e\u0442\u0432\u0435\u0442: A
`);

    expect(result[0].variants[0].isCorrect).toBe(true);
    expect(result[0].variants[1].isCorrect).toBe(false);
  });

  it('parses explicit question prefix and correct answer line', () => {
    const result = service.parseTextToQuestions(`
\u0412\u043e\u043f\u0440\u043e\u0441: What is DNS?
A. Domain name system
B. Operating system
Correct answer: A
`);

    expect(result[0].text).toBe('What is DNS?');
    expect(result[0].variants[0].isCorrect).toBe(true);
  });

  it('parses short English answer lines', () => {
    const result = service.parseTextToQuestions(`
1. What is HTTP?
A. Hypertext transfer protocol
B. Programming language
Answer: A
`);

    expect(result[0].variants).toEqual([
      { text: 'Hypertext transfer protocol', isCorrect: true },
      { text: 'Programming language', isCorrect: false },
    ]);
    expect(result[0].warnings).toEqual([]);
  });

  it('parses cyrillic variant markers', () => {
    const result = service.parseTextToQuestions(`
1) What is CSS?
\u0430) Style language
\u0431) Backend framework
\u0432) Database
\u041e\u0442\u0432\u0435\u0442: \u0430
`);

    expect(result[0].variants).toEqual([
      { text: 'Style language', isCorrect: true },
      { text: 'Backend framework', isCorrect: false },
      { text: 'Database', isCorrect: false },
    ]);
  });

  it('parses numeric variant markers', () => {
    const result = service.parseTextToQuestions(`
1. Pick a protocol
1) HTTP *
2) CSS
3) HTML
`);

    expect(result[0].variants[0].isCorrect).toBe(true);
    expect(result[0].warnings).toEqual([]);
  });

  it('parses lettered variants beyond the first eight options', () => {
    const result = service.parseTextToQuestions(`
1. Pick a condition
A) Option A
B) Option B
C) Option C
D) Option D
E) Option E
F) Option F
G) Option G
H) Option H
I) Option I *
J) Option J
`);

    expect(result[0].variants).toHaveLength(10);
    expect(result[0].variants[8]).toEqual({
      text: 'Option I',
      isCorrect: true,
    });
    expect(result[0].warnings).toEqual([]);
  });

  it('parses cyrillic variants beyond the first seven options', () => {
    const result = service.parseTextToQuestions(`
1. Pick a condition
\u0430) Option A
\u0431) Option B
\u0432) Option C
\u0433) Option D
\u0434) Option E
\u0435) Option F
\u0436) Option G
\u0437) Option H
\u0438) Option I
\u041e\u0442\u0432\u0435\u0442: \u0438
`);

    expect(result[0].variants).toHaveLength(9);
    expect(result[0].variants[8]).toEqual({
      text: 'Option I',
      isCorrect: true,
    });
    expect(result[0].warnings).toEqual([]);
  });

  it('splits dense numeric questions from numeric variants', () => {
    const result = service.parseTextToQuestions(`
1. Pick a protocol
1) HTTP *
2) CSS
2. Pick a language
1) TypeScript *
2) PostgreSQL
`);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Pick a protocol');
    expect(result[0].variants).toEqual([
      { text: 'HTTP', isCorrect: true },
      { text: 'CSS', isCorrect: false },
    ]);
    expect(result[1].text).toBe('Pick a language');
    expect(result[1].variants).toEqual([
      { text: 'TypeScript', isCorrect: true },
      { text: 'PostgreSQL', isCorrect: false },
    ]);
  });

  it('returns warnings when correct answer is missing', () => {
    const result = service.parseTextToQuestions(`
1. What is HTML?
A) Markup language
B) Database
`);

    expect(result[0].warnings).toContain('Question has no correct answer');
  });

  it('returns warnings for malformed questions with too few variants', () => {
    const result = service.parseTextToQuestions(`
1. Incomplete question?
A) Only variant *
`);

    expect(result[0].warnings).toContain('Question has fewer than 2 variants');
  });
});
