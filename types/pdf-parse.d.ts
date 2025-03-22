// This file is kept for backward compatibility but is no longer used
// The app no longer depends on pdf-parse to avoid React Native compatibility issues

declare module 'pdf-lib' {
  export class PDFDocument {
    static load(buffer: Buffer | ArrayBuffer): Promise<PDFDocument>;
    getAllTextContents(): Promise<string>;
    getPageCount(): number;
  }
}
