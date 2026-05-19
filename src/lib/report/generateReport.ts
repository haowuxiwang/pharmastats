/**
 * PDF report generation using html2canvas + jsPDF.
 */

import jsPDF from 'jspdf';
import type { ParsedData } from '../../types';

export interface ReportOptions {
  data: ParsedData;
  results: Record<string, unknown>;
  aiSummary?: string;
  charts?: { title: string; dataUrl: string }[];
}

export async function generateReport(options: ReportOptions): Promise<void> {
  const { data, results, aiSummary, charts } = options;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaStats Analysis Report', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`File: ${data.file_path} | Rows: ${data.n_rows} | Columns: ${data.n_cols}`, margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 10;

  // Separator
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Data overview
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Data Overview', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Numeric columns: ${data.numeric_columns.join(', ')}`, margin, y);
  y += 10;

  // Analysis results
  const resultEntries = Object.entries(results).filter(([, v]) => v != null);
  for (const [module, result] of resultEntries) {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(getModuleTitle(module), margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);

    const lines = formatResult(module, result);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 5;
  }

  // Charts
  if (charts && charts.length > 0) {
    for (const chart of charts) {
      if (y > 180) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(chart.title, margin, y);
      y += 7;

      try {
        const imgWidth = contentWidth;
        const imgHeight = 80;
        doc.addImage(chart.dataUrl, 'PNG', margin, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      } catch {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('[Chart could not be rendered]', margin, y);
        y += 7;
      }
    }
  }

  // AI Summary
  if (aiSummary) {
    if (y > 220) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('AI Analysis Summary', margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);

    const lines = doc.splitTextToSize(aiSummary, contentWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    }
  }

  doc.save('PharmaStats-Report.pdf');
}

function getModuleTitle(module: string): string {
  const titles: Record<string, string> = {
    descriptive: 'Descriptive Statistics',
    normality: 'Normality Test',
    outlier: 'Outlier Detection',
    capability: 'Process Capability',
    control_chart: 'Control Chart',
    trend: 'Trend Analysis',
  };
  return titles[module] || module;
}

function formatResult(module: string, result: unknown): string[] {
  const r = result as Record<string, unknown>;
  const lines: string[] = [];

  if (module === 'descriptive') {
    lines.push(`N: ${r.n}  |  Mean: ${fmt(r.mean)}  |  Median: ${fmt(r.median)}  |  Std: ${fmt(r.std)}`);
    lines.push(`RSD: ${fmt(r.rsd_percent)}%  |  Min: ${fmt(r.min)}  |  Max: ${fmt(r.max)}  |  Range: ${fmt(r.range)}`);
    lines.push(`Q1: ${fmt(r.q1)}  |  Q3: ${fmt(r.q3)}  |  IQR: ${fmt(r.iqr)}`);
    lines.push(`95% CI: [${fmt(r.ci_95_lower)}, ${fmt(r.ci_95_upper)}]  |  Skewness: ${fmt(r.skewness)}  |  Kurtosis: ${fmt(r.kurtosis)}`);
  } else if (module === 'normality') {
    const sw = r.shapiro_wilk as Record<string, unknown>;
    lines.push(`Shapiro-Wilk: statistic=${fmt(sw.statistic)}, p=${fmt(sw.p_value)}, normal=${sw.is_normal}`);
    lines.push(`Conclusion: ${r.is_normal ? 'Data is normally distributed' : 'Data is NOT normally distributed'}`);
  } else if (module === 'outlier') {
    const summary = r.summary as Record<string, unknown>;
    lines.push(`Total outliers: ${summary.total_outliers}`);
  } else if (module === 'capability') {
    lines.push(`Cp: ${fmt(r.cp)}  |  Cpk: ${fmt(r.cpk)}  |  Pp: ${fmt(r.pp)}  |  Ppk: ${fmt(r.ppk)}`);
    lines.push(`Rating: ${r.rating}  |  Mean: ${fmt(r.mean)}`);
  } else if (module === 'trend') {
    lines.push(`Slope: ${fmt(r.slope)}  |  Intercept: ${fmt(r.intercept)}  |  R²: ${fmt(r.r_squared)}`);
    lines.push(`p-value: ${fmt(r.p_value)}  |  Direction: ${r.direction}  |  Significant: ${r.is_significant}`);
  } else {
    lines.push(JSON.stringify(r, null, 2).slice(0, 500));
  }

  return lines;
}

function fmt(v: unknown): string {
  if (typeof v === 'number') return v.toFixed(4);
  return String(v ?? '-');
}
