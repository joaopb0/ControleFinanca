import PDFDocument from 'pdfkit';

/**
 * Formata um número no padrão monetário brasileiro (ex: 1.250,50).
 *
 * @param {number|string} value
 * @returns {string}
 */
export function formatBRL(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Escapa um campo para o formato CSV segundo a RFC 4180 com delimitador ponto e vírgula.
 *
 * @param {*} field
 * @returns {string}
 */
export function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  let str = String(field);
  if (/^[=+\-@\t\r|]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gera conteúdo CSV com UTF-8 BOM e delimitador ';' compatível com Excel brasileiro.
 *
 * @param {Object} summary Objeto consolidado do reportService
 * @param {Array<Object>} transactions Lista de transações
 * @returns {string} Conteúdo completo do arquivo CSV
 */
export function generateCSV(summary, transactions = []) {
  const BOM = '\uFEFF';
  const lines = [];

  // 1. Metadados do Relatório
  lines.push(`${escapeCSV('RELATÓRIO FINANCEIRO - CONTROLEFINANCA')}`);
  const pStart = summary?.period?.startDate || 'Início';
  const pEnd = summary?.period?.endDate || 'Fim';
  lines.push(`${escapeCSV('Período')};${escapeCSV(`${pStart} a ${pEnd}`)}`);
  lines.push(`${escapeCSV('Data de Emissão')};${escapeCSV(new Date().toLocaleString('pt-BR'))}`);
  lines.push('');

  // 2. Resumo Geral de Totais
  lines.push(`${escapeCSV('RESUMO GERAL')}`);
  lines.push(`${escapeCSV('Métrica')};${escapeCSV('Valor (R$)')}`);
  lines.push(`${escapeCSV('Receitas Totais')};${escapeCSV(formatBRL(summary?.totals?.income))}`);
  lines.push(`${escapeCSV('Despesas Totais')};${escapeCSV(formatBRL(summary?.totals?.expenses))}`);
  lines.push(`${escapeCSV('Saldo Líquido')};${escapeCSV(formatBRL(summary?.totals?.netBalance))}`);
  lines.push(summary?.totals?.transactionCount === null
    ? `${escapeCSV('Meses no período')};${escapeCSV(summary.totals.monthCount)}`
    : `${escapeCSV('Total de Transações')};${escapeCSV(summary?.totals?.transactionCount || 0)}`);
  lines.push('');

  // 3. Subtotais por Categoria
  lines.push(`${escapeCSV('SUBTOTAIS POR CATEGORIA')}`);
  lines.push(
    [
      escapeCSV('Categoria'),
      escapeCSV('Tipo'),
      escapeCSV('Total (R$)'),
      escapeCSV('Participação (%)'),
      escapeCSV('Qtd Transações'),
    ].join(';')
  );

  const categories = summary?.categoryBreakdown || [];
  for (const cat of categories) {
    const typeLabel = cat.type === 'income' ? 'Receita' : 'Despesa';
    lines.push(
      [
        escapeCSV(cat.category),
        escapeCSV(typeLabel),
        escapeCSV(formatBRL(cat.amount)),
        escapeCSV(`${formatBRL(cat.percentage)}%`),
        escapeCSV(cat.count ?? '-'),
      ].join(';')
    );
  }
  lines.push('');

  // 4. Lançamentos Detalhados
  const txList = (summary?.filteredTransactions && summary.filteredTransactions.length > 0)
    ? summary.filteredTransactions
    : transactions;

  if (txList && txList.length > 0) {
    lines.push(`${escapeCSV('LANÇAMENTOS DETALHADOS')}`);
    lines.push(
      [
        escapeCSV('Data'),
        escapeCSV('Descrição'),
        escapeCSV('Categoria'),
        escapeCSV('Tipo'),
        escapeCSV('Valor (R$)'),
      ].join(';')
    );

    for (const tx of txList) {
      const val = Number(tx.value) || 0;
      const typeLabel = val >= 0 ? 'Receita' : 'Despesa';
      lines.push(
        [
          escapeCSV(tx.date || ''),
          escapeCSV(tx.description || ''),
          escapeCSV(tx.category || 'Outros'),
          escapeCSV(typeLabel),
          escapeCSV(formatBRL(val)),
        ].join(';')
      );
    }
  }

  return BOM + lines.join('\r\n');
}

/**
 * Gera um documento PDF binário com design corporativo e estrutura hierárquica usando PDFKit.
 *
 * @param {Object} summary Objeto consolidado do reportService
 * @param {Array<Object>} transactions Lista de transações
 * @returns {Promise<Buffer>} Buffer binário do PDF
 */
export function generatePDF(summary, transactions = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: 'Relatório Financeiro - ControleFinanca',
          Author: 'ControleFinanca',
          Subject: 'Consolidado Financeiro e Subtotais',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // --- 1. CABEÇALHO ---
      doc.rect(margin, 40, contentWidth, 60).fill('#f8fafc');
      doc.rect(margin, 40, contentWidth, 60).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.fillColor('#1e3a8a').fontSize(20).font('Helvetica-Bold').text('ControleFinanca', margin + 15, 52);
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Relatório Financeiro Consolidado', margin + 15, 76);

      const pStart = summary?.period?.startDate || 'Início';
      const pEnd = summary?.period?.endDate || 'Fim';
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
        .text(`Período: ${pStart} a ${pEnd}`, margin + contentWidth - 220, 54, { width: 205, align: 'right' });
      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
        .text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, margin + contentWidth - 220, 72, { width: 205, align: 'right' });

      let currentY = 115;

      // --- 2. CARDS KPI DE TOTAIS ---
      const cardWidth = (contentWidth - 30) / 4;
      const cardHeight = 55;

      const kpis = [
        { label: 'RECEITAS', val: `R$ ${formatBRL(summary?.totals?.income)}`, color: '#10b981', bg: '#f0fdf4' },
        { label: 'DESPESAS', val: `R$ ${formatBRL(summary?.totals?.expenses)}`, color: '#ef4444', bg: '#fef2f2' },
        {
          label: 'SALDO LÍQUIDO',
          val: `R$ ${formatBRL(summary?.totals?.netBalance)}`,
          color: (summary?.totals?.netBalance || 0) >= 0 ? '#10b981' : '#ef4444',
          bg: '#f8fafc',
        },
        { label: summary?.totals?.transactionCount === null ? 'MESES' : 'TRANSAÇÕES', val: `${summary?.totals?.transactionCount === null ? summary.totals.monthCount : summary?.totals?.transactionCount || 0}`, color: '#3b82f6', bg: '#eff6ff' },
      ];

      kpis.forEach((kpi, idx) => {
        const x = margin + idx * (cardWidth + 10);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 6).fill(kpi.bg);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 6).strokeColor('#cbd5e1').lineWidth(0.8).stroke();

        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text(kpi.label, x + 8, currentY + 10);
        doc.fillColor(kpi.color).fontSize(11).font('Helvetica-Bold').text(kpi.val, x + 8, currentY + 28, { width: cardWidth - 16 });
      });

      currentY += cardHeight + 25;

      // --- 3. TABELA DE CATEGORIAS ---
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Subtotais por Categoria', margin, currentY);
      currentY += 18;

      doc.rect(margin, currentY, contentWidth, 22).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc.text('CATEGORIA', margin + 10, currentY + 6);
      doc.text('TIPO', margin + 170, currentY + 6);
      doc.text('TOTAL (R$)', margin + 250, currentY + 6, { width: 90, align: 'right' });
      doc.text('PART. (%)', margin + 355, currentY + 6, { width: 70, align: 'right' });
      doc.text('QTD', margin + 440, currentY + 6, { width: 60, align: 'right' });

      currentY += 22;

      const categories = summary?.categoryBreakdown || [];
      categories.forEach((cat, index) => {
        if (currentY > doc.page.height - 60) {
          doc.addPage();
          currentY = 40;
        }

        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(margin, currentY, contentWidth, 20).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 20).strokeColor('#f1f5f9').lineWidth(0.5).stroke();

        doc.circle(margin + 16, currentY + 10, 4).fill(cat.color || '#94a3b8');

        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica').text(cat.category, margin + 28, currentY + 6);
        const typeLabel = cat.type === 'income' ? 'Receita' : 'Despesa';
        const typeColor = cat.type === 'income' ? '#059669' : '#dc2626';
        doc.fillColor(typeColor).text(typeLabel, margin + 170, currentY + 6);
        doc.fillColor('#1e293b').text(`R$ ${formatBRL(cat.amount)}`, margin + 250, currentY + 6, { width: 90, align: 'right' });
        doc.fillColor('#475569').text(`${formatBRL(cat.percentage)}%`, margin + 355, currentY + 6, { width: 70, align: 'right' });
        doc.text(`${cat.count ?? '-'}`, margin + 440, currentY + 6, { width: 60, align: 'right' });

        currentY += 20;
      });

      currentY += 25;

      // --- 4. DETALHAMENTO DE TRANSAÇÕES ---
      const txList = (summary?.filteredTransactions && summary.filteredTransactions.length > 0)
        ? summary.filteredTransactions
        : transactions;

      if (txList && txList.length > 0) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 40;
        }

        doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Detalhamento de Lançamentos', margin, currentY);
        currentY += 18;

        doc.rect(margin, currentY, contentWidth, 20).fill('#334155');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('DATA', margin + 10, currentY + 5);
        doc.text('DESCRIÇÃO', margin + 85, currentY + 5);
        doc.text('CATEGORIA', margin + 280, currentY + 5);
        doc.text('VALOR (R$)', margin + contentWidth - 110, currentY + 5, { width: 100, align: 'right' });

        currentY += 20;

        txList.forEach((tx, idx) => {
          if (currentY > doc.page.height - 50) {
            doc.addPage();
            currentY = 40;
          }

          const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
          doc.rect(margin, currentY, contentWidth, 18).strokeColor('#f1f5f9').lineWidth(0.5).stroke();

          const val = Number(tx.value) || 0;
          const valColor = val >= 0 ? '#059669' : '#dc2626';

          doc.fillColor('#475569').fontSize(8).font('Helvetica').text(tx.date || '-', margin + 10, currentY + 5);
          doc.fillColor('#0f172a').text(tx.description || '-', margin + 85, currentY + 5, { width: 185, lineBreak: false });
          doc.fillColor('#475569').text(tx.category || 'Outros', margin + 280, currentY + 5, { width: 110, lineBreak: false });
          doc.fillColor(valColor).font('Helvetica-Bold').text(`R$ ${formatBRL(val)}`, margin + contentWidth - 110, currentY + 5, { width: 100, align: 'right' });

          currentY += 18;
        });
      }

      // --- 5. RODAPÉ E NUMERAÇÃO DE PÁGINAS ---
      const pages = doc.bufferedPageRange();
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
          .text(
            `ControleFinanca · Relatório Gerado Automaticamente · Página ${i + 1} de ${pages.count}`,
            margin,
            doc.page.height - 25,
            { align: 'center', width: contentWidth }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export const exportService = {
  formatBRL,
  escapeCSV,
  generateCSV,
  generatePDF,
};

export default exportService;
