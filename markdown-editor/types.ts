
export interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

export enum EditorMode {
  HYBRID = 'HYBRID', // The Typora feel
  SOURCE = 'SOURCE'  // Raw markdown mode
}

export interface Stats {
  words: number;
  chars: number;
  readingTime: number;
}
