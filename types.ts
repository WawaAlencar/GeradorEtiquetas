export interface TagConfig {
  columnsPerRow: number;
  rowsPerPage: number;
  fontSizeTitle: number; // in points (pt)
  fontSizeCode: number;  // in points (pt)
  barcodeScale: number;  // percentage (100 = default)
}

export interface AssetData {
  code: string;
}

export interface ReportItem {
  patrimonio: string;
  itemMaterial: string;
  descricao: string;
  dataTombamento: string;
  valor: number;
  uorg: string;
  destinacao: string;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}

export type AppMode = 'tags' | 'excel_report';