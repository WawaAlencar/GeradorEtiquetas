import * as XLSX from 'xlsx';
import { AssetData } from './types';

export const parseExcelFile = async (file: File): Promise<AssetData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Assume first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!jsonData || jsonData.length === 0) {
          throw new Error("O arquivo Excel enviado está vazio.");
        }

        // Check for 'PATRIMÔNIO' column
        // We need to find a key that loosely matches 'PATRIMÔNIO' to be robust, or strictly matches.
        // Let's check the first row keys.
        const firstRow = jsonData[0] as Record<string, unknown>;
        const keys = Object.keys(firstRow);
        
        // Normalize keys to find the correct column (ignoring case or strict accents if needed, but requirements say "PATRIMÔNIO")
        const targetColumn = keys.find(k => k.toUpperCase().trim() === "PATRIMÔNIO");

        if (!targetColumn) {
          throw new Error("Coluna 'PATRIMÔNIO' não encontrada no arquivo Excel. Por favor, verifique o cabeçalho.");
        }

        const assets: AssetData[] = jsonData.map((row: any) => ({
          code: String(row[targetColumn]).trim()
        })).filter(asset => asset.code !== ""); // Filter out empty rows

        if (assets.length === 0) {
          throw new Error("Nenhum código de patrimônio válido encontrado na coluna 'PATRIMÔNIO'.");
        }

        resolve(assets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Falha ao ler o arquivo."));
    };

    reader.readAsBinaryString(file);
  });
};
