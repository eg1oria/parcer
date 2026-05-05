declare module 'word-extractor' {
  type TextboxOptions = {
    includeHeadersAndFooters?: boolean;
    includeBody?: boolean;
    filterUnicode?: boolean;
  };

  type ExtractedWordDocument = {
    getBody(options?: { filterUnicode?: boolean }): string;
    getTextboxes(options?: TextboxOptions): string;
  };

  export default class WordExtractor {
    extract(source: string | Buffer): Promise<ExtractedWordDocument>;
  }
}
