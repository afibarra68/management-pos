import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfExportColumn {
  header: string;
  dataKey: string;
  /** Función opcional para formatear el valor de la celda */
  format?: (value: unknown) => string;
}

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  columns: PdfExportColumn[];
  data: Record<string, unknown>[];
  filename: string;
  /** Color primario en hex (ej: #5C1A1A). */
  primaryColor?: string;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {

  /** Exporta datos a PDF con tabla, cabecera y pie. */
  export(options: PdfExportOptions): void {
    const {
      title,
      subtitle,
      companyName = '',
      columns,
      data,
      filename,
      primaryColor = '#5C1A1A'
    } = options;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    const rgb = this.hexToRgb(primaryColor);

    // Encabezado empresa
    if (companyName) {
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(companyName, pageWidth / 2, y, { align: 'center' });
      y += 10;
    }

    // Título
    doc.setFontSize(16);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 6;

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
      y += 10;
    } else {
      y += 5;
    }

    // Info de generación
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Total: ${data.length} registros · Generado: ${new Date().toLocaleString('es-CO')}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    const head = columns.map(c => c.header);
    const body = data.map(row =>
      columns.map(col => {
        const raw = row[col.dataKey];
        const val = col.format ? col.format(raw) : (raw != null ? String(raw) : '-');
        return val;
      })
    );

    autoTable(doc, {
      head: [head],
      body,
      startY: y,
      theme: 'striped',
      headStyles: {
        fillColor: rgb,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: 245 },
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      styles: { cellPadding: 4 },
      didDrawPage: (tableData) => {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Pág. ${tableData.pageNumber} · ${companyName || title} · ${new Date().toLocaleDateString('es-CO')}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }
    });

    doc.save(filename);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [92, 26, 26];
  }

  /** Genera nombre de archivo con fecha/hora. */
  static getExportFileName(prefix: string): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${prefix}-${y}-${m}-${d}_${h}-${min}-${s}.pdf`;
  }

  static formatDateTime(value: string | undefined): string {
    if (!value) return '-';
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(d);
    } catch {
      return String(value ?? '-');
    }
  }
}
