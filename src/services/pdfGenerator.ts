/**
 * High-Fidelity PDF Generator for CAMP Piero Pollone Monthly Report
 * Recreates the exact 15-page document layout from the attached official PDF.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyReport } from '../types';
import { sqlDb } from './sqlDb';
import { prepareImageForPdf, ImageInfo } from './imageUtils';

export async function generateOfficialReportPdf(report: MonthlyReport): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const settings = sqlDb.getInstitutionSettings();

  // Pre-load and normalize all institutional logos in parallel to ensure natural aspect ratios and zero distortion
  const [
    processedMainLogo,
    processedRotaryLogo,
    processedAbtrfLogo,
    processedOngLogo,
    processedTranspLogo,
    processedCoverBannerLogo,
  ] = await Promise.all([
    prepareImageForPdf(settings.logoUrl),
    prepareImageForPdf(settings.rotaryLogoUrl),
    prepareImageForPdf(settings.abtrfLogoUrl),
    prepareImageForPdf(settings.ongVerificadaLogoUrl),
    prepareImageForPdf(settings.transparenciaLogoUrl),
    prepareImageForPdf(settings.coverBannerLogoUrl || settings.logoUrl),
  ]);

  /**
   * Embeds an image within a bounding box, strictly preserving its natural aspect ratio
   * to eliminate any distortion, squishing, or stretching (CSS object-fit: contain).
   */
  const renderFittedImage = (
    img: ImageInfo | null,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number,
    align: 'center' | 'left' | 'right' = 'center',
    valign: 'middle' | 'top' | 'bottom' = 'middle'
  ): boolean => {
    if (!img || !img.dataUrl || !img.aspectRatio || img.aspectRatio <= 0) {
      return false;
    }

    const boxAspect = boxW / boxH;
    let renderW: number;
    let renderH: number;

    if (img.aspectRatio > boxAspect) {
      // Proportioned wider than the target box -> bound by box width
      renderW = boxW;
      renderH = boxW / img.aspectRatio;
    } else {
      // Proportioned taller than the target box -> bound by box height
      renderH = boxH;
      renderW = boxH * img.aspectRatio;
    }

    // Horizontal alignment
    let renderX = boxX;
    if (align === 'center') {
      renderX = boxX + (boxW - renderW) / 2;
    } else if (align === 'right') {
      renderX = boxX + (boxW - renderW);
    }

    // Vertical alignment
    let renderY = boxY;
    if (valign === 'middle') {
      renderY = boxY + (boxH - renderH) / 2;
    } else if (valign === 'bottom') {
      renderY = boxY + (boxH - renderH);
    }

    try {
      doc.addImage(
        img.dataUrl,
        img.format,
        renderX,
        renderY,
        renderW,
        renderH,
        undefined,
        'FAST'
      );
      return true;
    } catch (e) {
      console.warn('Could not add image to jsPDF:', e);
      return false;
    }
  };

  // Helper to draw the standard page header present on pages 2-15
  const drawPageHeader = (pageTitle?: string) => {
    // Top-left black badge
    doc.setFillColor(11, 15, 25);
    doc.rect(14, 8, 38, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${report.monthName.toUpperCase()} ${report.year}`, 17, 14);

    // Optional top logo in header with aspect ratio preserved
    if (processedMainLogo) {
      renderFittedImage(processedMainLogo, 56, 5.5, 30, 11, 'left', 'middle');
    }

    // Top-right dot grid matrix
    doc.setFillColor(11, 15, 25);
    const startX = 175;
    const startY = 10;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        doc.circle(startX + c * 3.2, startY + r * 3.2, 0.6, 'F');
      }
    }

    // Page Title if provided
    if (pageTitle) {
      doc.setTextColor(11, 15, 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text(pageTitle, 14, 30);

      // Subtle underline
      doc.setDrawColor(11, 15, 25);
      doc.setLineWidth(0.8);
      doc.line(14, 33, 75, 33);
    }
  };

  // Helper to draw coordinator info card
  const drawCoordinatorCard = (
    name: string,
    title: string,
    phone: string,
    email: string,
    startY: number
  ) => {
    // Circular portrait placeholder with subtle border
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(209, 213, 219);
    doc.circle(38, startY + 18, 16, 'FD');
    
    // Initial letter badge inside circle
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('');
    doc.text(initials, 34, startY + 22);

    // Info details
    doc.setTextColor(11, 15, 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(name, 62, startY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(title, 62, startY + 17);

    // Phone
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(11, 15, 25);
    doc.text(`Tel: ${phone}`, 62, startY + 25);

    // Email
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text(email, 62, startY + 31);
  };

  // ==========================================
  // PAGE 1: CAPA (COVER)
  // ==========================================
  // Black top banner
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, pageWidth, 115, 'F');

  // Month and Year
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(report.monthName, 18, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(String(report.year), 18, 42);

  // Divider inside banner
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(18, 50, 65, 50);

  // RELATÓRIO GERENCIAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('RELATÓRIO', 18, 76);
  doc.text('GERENCIAL', 18, 98);

  // Cover Logo in top-right banner if provided (strictly preserving aspect ratio)
  const coverLogo = processedCoverBannerLogo || processedMainLogo;
  if (coverLogo) {
    renderFittedImage(coverLogo, 140, 16, 52, 48, 'center', 'middle');
  }

  // Institutional Name
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(report.institution, 18, 145);

  // Thin line below name
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(18, 156, pageWidth - 18, 156);

  // Contact Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);

  // Web
  doc.text(`Website: ${report.website}`, 24, 175);
  // Phone
  doc.text(`Telefone: ${report.phone}`, 24, 187);
  // Address
  doc.text(`Endereço: ${report.address}`, 24, 199);

  // Institutional Stamps / Badges bar at the bottom
  doc.setDrawColor(229, 231, 235);
  doc.line(18, 245, pageWidth - 18, 245);

  // 1. CAMP Santo André Logo (Preserving natural aspect ratio without distortion)
  if (!renderFittedImage(processedMainLogo, 16, 248, 28, 26, 'center', 'middle')) {
    doc.setFillColor(14, 116, 144);
    doc.circle(30, 258, 6, 'F');
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CAMP', 25, 269);
    doc.text('SANTO ANDRÉ', 19, 273);
  }

  // 2. Rotary Club Logo (Wide bounding box, preserving natural aspect ratio without distortion)
  if (!renderFittedImage(processedRotaryLogo, 48, 248, 42, 26, 'center', 'middle')) {
    doc.setFillColor(29, 78, 216);
    doc.circle(58, 258, 6, 'F');
    doc.setTextColor(29, 78, 216);
    doc.setFontSize(8);
    doc.text('Rotary', 67, 257);
    doc.setFontSize(6);
    doc.setTextColor(75, 85, 99);
    doc.text('Club de Santo André Norte', 67, 261);
  }

  // 3. Selo Responsabilidade Social ABTRF (Preserving natural aspect ratio without distortion)
  if (!renderFittedImage(processedAbtrfLogo, 93, 248, 44, 26, 'center', 'middle')) {
    doc.setFillColor(30, 58, 138);
    doc.rect(96, 251, 38, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.text('Selo de Responsabilidade Social', 98, 256);
    doc.setFontSize(6);
    doc.text('ABTRF EMPRESA CIDADÃ', 98, 261);
    doc.setFontSize(5);
    doc.text('2025 - 2026', 98, 266);
  }

  // 4. ONG Verificada (Preserving natural aspect ratio without distortion)
  if (!renderFittedImage(processedOngLogo, 140, 248, 26, 26, 'center', 'middle')) {
    doc.setDrawColor(16, 185, 129);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(142, 251, 22, 18, 2, 2, 'FD');
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(5);
    doc.text('ONG', 149, 259);
    doc.text('VERIFICADA', 144, 263);
  }

  // 5. Transparência (Preserving natural aspect ratio without distortion)
  if (!renderFittedImage(processedTranspLogo, 168, 248, 26, 26, 'center', 'middle')) {
    doc.setDrawColor(14, 116, 144);
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(170, 251, 22, 18, 2, 2, 'FD');
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(5);
    doc.text('SELO', 177, 259);
    doc.text('TRANSPARÊNCIA', 171, 263);
  }

  // ==========================================
  // PAGE 2: CONTRATADOS & BAR CHARTS
  // ==========================================
  doc.addPage();
  drawPageHeader();

  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Contratados e em processo de contratação', pageWidth / 2, 26, { align: 'center' });

  const hd = report.hiringDashboard || {
    displayMode: '2_previous_and_current' as const,
    previousMonth2: {
      monthName: 'Maio 2026',
      aprendizesContratados: report.hiringHistory?.maio?.aprendizes || 667,
      contratosEmProcesso: 42,
      estagiarios: report.hiringHistory?.maio?.estagiarios || 52,
    },
    previousMonth1: {
      monthName: 'Junho 2026',
      aprendizesContratados: report.hiringHistory?.junho?.aprendizes || 649,
      contratosEmProcesso: 38,
      estagiarios: report.hiringHistory?.junho?.estagiarios || 58,
    },
    currentMonth: {
      monthName: report.fullTitle || 'Julho de 2026',
      aprendizesContratados: report.hiringHistory?.julho?.aprendizes || 629,
      contratosEmProcesso: 45,
      estagiarios: report.hiringHistory?.julho?.estagiarios || 51,
    },
  };

  // Helper to draw a 3-bar comparison chart block in PDF
  const drawTriBarChart = (
    title: string,
    aprVal: number,
    procVal: number,
    estVal: number,
    posX: number,
    posY: number,
    width: number,
    height: number,
    isProminent: boolean = false
  ) => {
    // Title
    doc.setTextColor(11, 15, 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isProminent ? 15 : 12);
    doc.text(title, posX + width / 2, posY, { align: 'center' });

    const chartTop = posY + (isProminent ? 8 : 6);
    const chartBottom = chartTop + height;

    // Grid lines
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    const steps = [0, 200, 400, 600, 700];
    steps.forEach((st) => {
      const yPos = chartBottom - (st / 700) * height;
      doc.line(posX + 10, yPos, posX + width, yPos);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.text(String(st), posX + 3, yPos + 1.5);
    });

    const bWidth = (width - 24) / 3 - 4;
    const maxH = height;

    // 1. Aprendizes (#0B0F19)
    const aprH = Math.max(4, (aprVal / 700) * maxH);
    const aprX = posX + 12;
    const aprY = chartBottom - aprH;
    doc.setFillColor(11, 15, 25);
    doc.roundedRect(aprX, aprY, bWidth, aprH, 1.5, 1.5, 'F');
    doc.setTextColor(aprH > 8 ? 255 : 11, aprH > 8 ? 255 : 15, aprH > 8 ? 255 : 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isProminent ? 11 : 8);
    doc.text(String(aprVal), aprX + bWidth / 2, aprH > 8 ? aprY + aprH / 2 + 2.5 : aprY - 1.5, { align: 'center' });
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Aprendizes', aprX + bWidth / 2, chartBottom + 4, { align: 'center' });

    // 2. Em Processo (#2563EB)
    const procH = Math.max(4, (procVal / 700) * maxH);
    const procX = aprX + bWidth + 3;
    const procY = chartBottom - procH;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(procX, procY, bWidth, procH, 1.5, 1.5, 'F');
    doc.setTextColor(procH > 8 ? 255 : 37, procH > 8 ? 255 : 99, procH > 8 ? 255 : 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isProminent ? 11 : 8);
    doc.text(String(procVal), procX + bWidth / 2, procH > 8 ? procY + procH / 2 + 2.5 : procY - 1.5, { align: 'center' });
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Em Proc.', procX + bWidth / 2, chartBottom + 4, { align: 'center' });

    // 3. Estagiários (#475569)
    const estH = Math.max(4, (estVal / 700) * maxH);
    const estX = procX + bWidth + 3;
    const estY = chartBottom - estH;
    doc.setFillColor(71, 85, 105);
    doc.roundedRect(estX, estY, bWidth, estH, 1.5, 1.5, 'F');
    doc.setTextColor(estH > 8 ? 255 : 71, estH > 8 ? 255 : 85, estH > 8 ? 255 : 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isProminent ? 11 : 8);
    doc.text(String(estVal), estX + bWidth / 2, estH > 8 ? estY + estH / 2 + 2.5 : estY - 1.5, { align: 'center' });
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Estagiários', estX + bWidth / 2, chartBottom + 4, { align: 'center' });
  };

  if (hd.displayMode === '1_previous_and_current') {
    // 2 cards side by side
    const cardW = 86;
    drawTriBarChart(
      hd.previousMonth1.monthName,
      hd.previousMonth1.aprendizesContratados,
      hd.previousMonth1.contratosEmProcesso,
      hd.previousMonth1.estagiarios,
      14,
      45,
      cardW,
      100,
      true
    );
    drawTriBarChart(
      `${hd.currentMonth.monthName} (Mês Atual)`,
      hd.currentMonth.aprendizesContratados,
      hd.currentMonth.contratosEmProcesso,
      hd.currentMonth.estagiarios,
      110,
      45,
      cardW,
      100,
      true
    );
  } else {
    // 2 months prior on top, current month below
    drawTriBarChart(
      hd.previousMonth2.monthName,
      hd.previousMonth2.aprendizesContratados,
      hd.previousMonth2.contratosEmProcesso,
      hd.previousMonth2.estagiarios,
      14,
      42,
      86,
      60
    );
    drawTriBarChart(
      hd.previousMonth1.monthName,
      hd.previousMonth1.aprendizesContratados,
      hd.previousMonth1.contratosEmProcesso,
      hd.previousMonth1.estagiarios,
      110,
      42,
      86,
      60
    );

    // Current Month Prominent below
    const julW = 140;
    const julX = (pageWidth - julW) / 2;
    drawTriBarChart(
      `${hd.currentMonth.monthName} (Mês Atual)`,
      hd.currentMonth.aprendizesContratados,
      hd.currentMonth.contratosEmProcesso,
      hd.currentMonth.estagiarios,
      julX,
      138,
      julW,
      95,
      true
    );
  }

  // Legend at the bottom
  doc.setDrawColor(229, 231, 235);
  doc.line(18, 252, pageWidth - 18, 252);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 15, 25);
  doc.setFillColor(11, 15, 25);
  doc.rect(40, 256, 4, 4, 'F');
  doc.text('Aprendizes Contratados', 46, 259.5);

  doc.setFillColor(37, 99, 235);
  doc.rect(95, 256, 4, 4, 'F');
  doc.setTextColor(37, 99, 235);
  doc.text('Contratos em Processo', 101, 259.5);

  doc.setFillColor(71, 85, 105);
  doc.rect(148, 256, 4, 4, 'F');
  doc.setTextColor(71, 85, 105);
  doc.text('Estagiários', 154, 259.5);

  // ==========================================
  // PAGE 3: GESTÃO DE PESSOAS | RH
  // ==========================================
  doc.addPage();
  drawPageHeader('Gestão de Pessoas | RH');
  const rh = report.departments.rh;
  drawCoordinatorCard(rh.coordinatorName, rh.coordinatorTitle, rh.coordinatorPhone, rh.coordinatorEmail, 40);

  // Table 1: Indicador / Quantidade
  autoTable(doc, {
    startY: 85,
    head: [['Indicador', 'Quantidade']],
    body: rh.metrics.map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  // Table 2: Despesas
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: finalY,
    head: [['Despesas', 'Valor R$']],
    body: (rh.subMetrics?.[0]?.items || []).map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 110, halign: 'left' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  // ==========================================
  // PAGE 4: FINANCEIRO
  // ==========================================
  doc.addPage();
  drawPageHeader('Financeiro');
  const fin = report.departments.financeiro;
  drawCoordinatorCard(fin.coordinatorName, fin.coordinatorTitle, fin.coordinatorPhone, fin.coordinatorEmail, 40);

  autoTable(doc, {
    startY: 95,
    head: [['Categoria', 'Valor R$']],
    body: fin.metrics.map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 90, halign: 'left' },
      1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 9, cellPadding: 3.2, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  const finY = (doc as any).lastAutoTable.finalY + 14;
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(fin.customNotes || 'Inadimplentes: sem ocorrências.', 20, finY);

  // ==========================================
  // PAGE 5: CAPTAÇÃO DE RECURSOS
  // ==========================================
  doc.addPage();
  drawPageHeader('Captação de Recursos');
  const cap = report.departments.captacao;
  drawCoordinatorCard(cap.coordinatorName, cap.coordinatorTitle, cap.coordinatorPhone, cap.coordinatorEmail, 40);

  // Table 1: Captação de Recursos
  autoTable(doc, {
    startY: 90,
    head: [['Captação de Recursos', '']],
    body: cap.metrics.map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  // Table 2: Recrutamento e Seleção
  const capY = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: capY,
    head: [['Recrutamento e Seleção', '']],
    body: (cap.subMetrics?.[0]?.items || []).map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  // ==========================================
  // PAGE 6: ENSINO
  // ==========================================
  doc.addPage();
  drawPageHeader('Ensino');
  const ens = report.departments.ensino;
  drawCoordinatorCard(ens.coordinatorName, ens.coordinatorTitle, ens.coordinatorPhone, ens.coordinatorEmail, 40);

  autoTable(doc, {
    startY: 90,
    head: [['Coordenação Técnica', '']],
    body: ens.metrics.map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8, cellPadding: 1.6, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  // ==========================================
  // PAGE 7: PSICOLOGIA & SUPERVISORA SOCIAL
  // ==========================================
  doc.addPage();
  drawPageHeader();
  const psi = report.departments.psicologia_social;

  autoTable(doc, {
    startY: 32,
    head: [['Psicologia', '']],
    body: psi.metrics.map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 7.5, cellPadding: 1.4, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  const psiY = (doc as any).lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: psiY,
    head: [['Supervisora Social', '']],
    body: (psi.subMetrics?.[0]?.items || []).map((m) => [m.label, String(m.value)]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 7.5, cellPadding: 1.4, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  // ==========================================
  // PAGE 8: LIMPEZA
  // ==========================================
  doc.addPage();
  drawPageHeader('Limpeza');
  const limp = report.departments.limpeza;

  let currentY = 50;
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  (limp.bulletActivities || []).forEach((act) => {
    doc.circle(22, currentY - 1.2, 1, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, currentY);
    currentY += lines.length * 5.2 + 3.2;
  });

  // ==========================================
  // PAGE 9: GERÊNCIA DE PROJETOS
  // ==========================================
  doc.addPage();
  drawPageHeader('Gerência de Projetos');
  const proj = report.departments.projetos;
  drawCoordinatorCard(proj.coordinatorName, proj.coordinatorTitle, proj.coordinatorPhone, proj.coordinatorEmail, 40);

  let projY = 90;
  // Section 1
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Legislação / Certificações', 20, projY);
  projY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  (proj.subBulletSections?.[0]?.items || []).forEach((act) => {
    doc.circle(22, projY - 1, 0.8, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, projY);
    projY += lines.length * 4.2 + 2;
  });

  // Section 2
  projY += 6;
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Estágio', 20, projY);
  projY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  (proj.subBulletSections?.[1]?.items || []).forEach((act) => {
    doc.circle(22, projY - 1, 0.8, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, projY);
    projY += lines.length * 4.2 + 2;
  });

  // ==========================================
  // PAGE 10: ESTÁGIO & TI
  // ==========================================
  doc.addPage();
  drawPageHeader();
  const ti = report.departments.ti;

  // Table Estágio
  autoTable(doc, {
    startY: 32,
    head: [['Estágio', '']],
    body: ti.metrics.map((m) => [
      m.date ? `${m.label} (${m.date.split('-').reverse().slice(0, 2).join('/')})` : m.label,
      String(m.value),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  const tiY = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Tecnologia da informação', 20, tiY);

  let bulletY = tiY + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  (ti.bulletActivities || []).forEach((act) => {
    doc.circle(22, bulletY - 1, 0.8, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, bulletY);
    bulletY += lines.length * 4.2 + 2;
  });

  // ==========================================
  // PAGE 11: MARKETING
  // ==========================================
  doc.addPage();
  drawPageHeader();
  const mkt = report.departments.marketing;

  autoTable(doc, {
    startY: 32,
    head: [['Marketing', '']],
    body: mkt.metrics.map((m) => [
      m.date ? `${m.label} (${m.date.split('-').reverse().slice(0, 2).join('/')})` : m.label,
      String(m.value),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [11, 15, 25], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 135, halign: 'left' },
      1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [17, 24, 39], lineColor: [209, 213, 219] },
    margin: { left: 20, right: 20 },
  });

  const mktY = (doc as any).lastAutoTable.finalY + 14;
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Campanhas e artes realizadas', 20, mktY);

  let mktBulletY = mktY + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  (mkt.bulletActivities || []).forEach((act) => {
    doc.circle(22, mktBulletY - 1, 0.8, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, mktBulletY);
    mktBulletY += lines.length * 4.8 + 2.5;
  });

  // ==========================================
  // PAGE 12: MANUTENÇÃO
  // ==========================================
  doc.addPage();
  drawPageHeader('Manutenção');
  const manut = report.departments.manutencao;

  let manutY = 52;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  (manut.bulletActivities || []).forEach((act) => {
    doc.circle(22, manutY - 1, 1, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, manutY);
    manutY += lines.length * 5.4 + 3.6;
  });

  // ==========================================
  // PAGE 13: GERÊNCIA GERAL
  // ==========================================
  doc.addPage();
  drawPageHeader('Gerência Geral');
  const gg = report.departments.gerencia_geral;
  drawCoordinatorCard(gg.coordinatorName, gg.coordinatorTitle, gg.coordinatorPhone, gg.coordinatorEmail, 40);

  let ggY = 95;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  (gg.bulletActivities || []).forEach((act) => {
    doc.circle(22, ggY - 1, 1, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, ggY);
    ggY += lines.length * 5.2 + 4;
  });

  // ==========================================
  // PAGE 14: COZINHA
  // ==========================================
  doc.addPage();
  drawPageHeader('Cozinha');
  const coz = report.departments.cozinha;

  let cozY = 52;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  (coz.bulletActivities || []).forEach((act) => {
    doc.circle(22, cozY - 1, 1, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, cozY);
    cozY += lines.length * 5.2 + 3.5;
  });

  // ==========================================
  // PAGE 15: PRESIDENTE
  // ==========================================
  doc.addPage();
  drawPageHeader('Presidente');
  const pres = report.departments.presidencia;
  drawCoordinatorCard(pres.coordinatorName, pres.coordinatorTitle, pres.coordinatorPhone, pres.coordinatorEmail, 40);

  let presY = 92;
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Implantações realizadas', 20, presY);
  presY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  (pres.subBulletSections?.[0]?.items || []).forEach((act) => {
    doc.circle(22, presY - 1, 0.8, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, presY);
    presY += lines.length * 4.6 + 2.5;
  });

  presY += 6;
  doc.setTextColor(11, 15, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Próximas implantações', 20, presY);
  presY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  (pres.subBulletSections?.[1]?.items || []).forEach((act) => {
    doc.circle(22, presY - 1, 0.8, 'F');
    const lines = doc.splitTextToSize(act, 160);
    doc.text(lines, 26, presY);
    presY += lines.length * 4.6 + 2.5;
  });

  // Footer slogan
  presY += 10;
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(pres.customNotes || 'Estamos captando novas doações e parcerias. Seja um doador você também.', 20, presY);

  return doc;
}

export async function downloadReportPdf(report: MonthlyReport): Promise<void> {
  const doc = await generateOfficialReportPdf(report);
  doc.save(`Relatorio_Gerencial_CAMP_${report.id}_Oficial.pdf`);
}
