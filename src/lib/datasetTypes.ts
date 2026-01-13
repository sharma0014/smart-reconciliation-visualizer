export type DatasetRow = Record<string, unknown>;

export type ParsedDataset = {
  rows: DatasetRow[];
  columns: string[];
};

export type DatasetParseError = {
  message: string;
  details?: string;
};
