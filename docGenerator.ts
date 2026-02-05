import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, ImageRun, WidthType, BorderStyle, VerticalAlign, AlignmentType, Header, Footer } from 'docx';
import JsBarcode from 'jsbarcode';
import saveAs from 'file-saver';
import { AssetData, TagConfig } from './types';

const generateBarcodeImage = (text: string): string => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    displayValue: false, // We will add the text manually in the Word doc
    margin: 0,
    width: 2,
    height: 40,
    background: "#ffffff"
  });
  return canvas.toDataURL("image/png");
};

export const generateAndDownloadDoc = async (assets: AssetData[], config: TagConfig) => {
  const tagsPerPage = config.columnsPerRow * config.rowsPerPage;
  
  // Calculate column width percentage
  const colWidthPercent = 100 / config.columnsPerRow;

  // Font sizes in half-points (e.g. 10pt = 20 half-points)
  const titleSizeHalfPt = config.fontSizeTitle * 2;
  const codeSizeHalfPt = config.fontSizeCode * 2;

  // Barcode dimensions based on scale (Base: 100px width, 35px height)
  const scaleFactor = config.barcodeScale / 100;
  const barcodeWidth = 100 * scaleFactor;
  const barcodeHeight = 35 * scaleFactor;

  // Split assets into pages
  const pages: Table[] = [];
  
  // Pre-process all items into cells
  const allCells: TableCell[] = assets.map((asset) => {
    const barcodeDataUrl = generateBarcodeImage(asset.code);
    
    return new TableCell({
      width: {
        size: colWidthPercent,
        type: WidthType.PERCENTAGE,
      },
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
      },
      margins: {
        top: 100,
        bottom: 100,
        left: 100,
        right: 100,
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "PATRIMÔNIO EBSERH",
              bold: true,
              font: "Arial",
              size: titleSizeHalfPt, 
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 50, after: 50 },
          children: [
            new ImageRun({
              data: barcodeDataUrl,
              transformation: {
                width: barcodeWidth, 
                height: barcodeHeight,
              },
              type: "png"
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: asset.code,
              font: "Arial",
              size: codeSizeHalfPt, 
            }),
          ],
        }),
      ],
    });
  });

  // Organize cells into rows
  const allRows: TableRow[] = [];
  for (let i = 0; i < allCells.length; i += config.columnsPerRow) {
    const rowCells = allCells.slice(i, i + config.columnsPerRow);
    
    // Fill empty cells if last row is incomplete
    while (rowCells.length < config.columnsPerRow) {
      rowCells.push(new TableCell({
        width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
          bottom: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
          right: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
        },
        children: [new Paragraph("")], // Empty cell
      }));
    }

    allRows.push(new TableRow({
      children: rowCells,
      height: { value: 1400, rule: "atLeast" } // Approx height per row
    }));
  }

  // Organize rows into tables (pages)
  const docChildren: any[] = [];

  for (let i = 0; i < allRows.length; i += config.rowsPerPage) {
    const pageRows = allRows.slice(i, i + config.rowsPerPage);
    
    const table = new Table({
      rows: pageRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.NIL, size: 0, color: "auto" },
        bottom: { style: BorderStyle.NIL, size: 0, color: "auto" },
        left: { style: BorderStyle.NIL, size: 0, color: "auto" },
        right: { style: BorderStyle.NIL, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NIL, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NIL, size: 0, color: "auto" },
      }
    });

    docChildren.push(table);

    // Add page break if it's not the last batch of rows
    if (i + config.rowsPerPage < allRows.length) {
      docChildren.push(new Paragraph({
        children: [new TextRun({ break: 1 })], 
        pageBreakBefore: false, 
      }));
       docChildren.push(new Paragraph({
         children: [new TextRun({ text: "", break: 1 })], // Force explicit break
         pageBreakBefore: true
       }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 500, // 0.5 inch approx
            right: 500,
            bottom: 500,
            left: 500,
          },
        },
      },
      children: docChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Etiquetas_Patrimonio.docx");
};
