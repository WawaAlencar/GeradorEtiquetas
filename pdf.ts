import * as pdfjsLib from 'pdfjs-dist';
import { AssetData, ReportItem } from '../types';

// Correção para lidar com inconsistências de exportação ESM (default vs named)
// Em alguns ambientes, o módulo é exportado dentro de 'default'
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configura o worker do PDF.js para processamento em background
// Usamos o cdnjs pois ele serve o arquivo do worker de forma confiável para 'importScripts'
if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
} else {
  console.warn("PDF.js GlobalWorkerOptions não encontrado. O processamento de PDF pode falhar.");
}

/**
 * Helper interno para extrair texto bruto de um PDF
 */
const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';

    // Itera sobre todas as páginas do PDF
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extrai os itens de texto e os junta com espaço
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += ' ' + pageText;
    }
    return fullText;
}

/**
 * Função Original: Extrai apenas códigos para etiquetas (00090...)
 */
export const parsePdfFile = async (file: File): Promise<AssetData[]> => {
  try {
    const fullText = await extractTextFromPdf(file);

    /**
     * Regex busca por palavras que:
     * 1. Começam com 00090
     * 2. Tenham exatamente 5 dígitos numéricos seguintes (total 10 chars)
     */
    const patrimonyRegex = /\b00090\d{5}\b/g;
    
    const matches = fullText.match(patrimonyRegex) || [];

    if (matches.length === 0) {
      throw new Error("Nenhum código de patrimônio (00090xxxxx) encontrado no PDF.");
    }

    // Retorna todos os matches encontrados (com duplicatas se existirem no doc)
    return matches.map(code => ({ code }));

  } catch (error: any) {
    console.error("Erro ao processar PDF:", error);
    if (error.name === 'MissingPDFException') throw new Error("O arquivo parece inválido ou corrompido.");
    if (error.message && (error.message.includes("fake worker") || error.message.includes("worker"))) {
        throw new Error("Falha na inicialização do leitor de PDF. Tente recarregar a página.");
    }
    throw new Error("Falha ao ler o arquivo PDF. " + (error.message || "Verifique se o PDF é pesquisável."));
  }
};

/**
 * NOVA FUNÇÃO: Extrai dados tabulares para relatório Excel
 * Padrão: Patrimônios começam com 90 e tem 7 dígitos (ex: 9018906)
 */
export const parseLocationReportPdf = async (file: File): Promise<ReportItem[]> => {
    try {
        const rawText = await extractTextFromPdf(file);
        
        // LIMPEZA CRÍTICA:
        // 1. Substitui as barras verticais de tabela '|' por espaço, pois elas quebram a regex \s+
        // 2. Substitui múltiplos espaços por um único espaço para garantir o padrão linear
        const fullText = rawText.replace(/\|/g, ' ').replace(/\s+/g, ' ');
        
        // Regex Ajustada:
        // Grupo 1: Patrimônio (90xxxxxxx) - 7 dígitos
        // Grupo 2: Item Material (apenas dígitos)
        // Grupo 3: Descrição (Texto livre até encontrar uma data)
        // Grupo 4: Data (dd/mm/yyyy)
        // Grupo 5: Valor (formato numérico brasileiro com ponto ou vírgula)
        // Grupo 6: UORG (dígitos)
        // Grupo 7: Destinação (texto livre até o próximo 90xxxxx ou fim)
        const reportRegex = /(90\d{5})\s+(\d+)\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d\.,]+)\s+(\d+)\s+(.+?)(?=\s90\d{5}|$)/g;
        
        const items: ReportItem[] = [];
        let match;

        // Resetar lastIndex caso reutilize regex (embora seja nova constante aqui)
        while ((match = reportRegex.exec(fullText)) !== null) {
            // Tratamento do valor monetário: remove ponto de milhar e troca vírgula decimal por ponto
            // Ex: "1.200,50" -> "1200.50"
            const valorString = match[5].replace(/\./g, '').replace(',', '.');
            
            items.push({
                patrimonio: match[1].trim(),
                itemMaterial: match[2].trim(),
                descricao: match[3].trim(),
                dataTombamento: match[4].trim(),
                valor: parseFloat(valorString),
                uorg: match[6].trim(),
                destinacao: match[7].trim()
            });
        }

        if (items.length === 0) {
             console.log("Texto extraído (amostra):", fullText.substring(0, 500)); // Para debug no console se necessário
             throw new Error("Nenhum patrimônio padrão '90xxxxx' encontrado. O formato do PDF pode estar diferente do esperado.");
        }

        return items;

    } catch (error: any) {
        console.error("Erro ao processar Relatório:", error);
        throw new Error("Falha ao processar relatório. " + (error.message || ""));
    }
}