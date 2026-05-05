export enum ParseFormat {
  AUTO = 'AUTO',
  STANDARD = 'STANDARD',
  PARENS_MARKERS = 'PARENS_MARKERS',
  TAGGED_FIRST_CORRECT = 'TAGGED_FIRST_CORRECT',
  FIRST_VARIANT_CORRECT = 'FIRST_VARIANT_CORRECT',
}

export type ParseOptions = {
  format?: ParseFormat;
};

export type ParsedVariant = {
  text: string;
  imageUrls?: string[];
  isCorrect: boolean;
};

export type ParsedQuestion = {
  text: string;
  imageUrls?: string[];
  variants: ParsedVariant[];
  warnings?: string[];
};
