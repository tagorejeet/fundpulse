import * as XLSX from 'xlsx';

/**
 * Custom Fund List Excel Exporter matching exact reference layout
 */
export const exportCustomListToExcel = ({ funds = [], plan = 'regular', mode = 'yearly', customDays = 33, reportDate = '28-Sep-2026' }) => {
  if (!funds || funds.length === 0) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const planLabel = plan.toLowerCase() === 'direct' ? 'Direct Plan' : 'Regular Plan';
  const isDaysMode = mode === 'days';

  const tableHeaders = isDaysMode
    ? ['Category', 'Scheme Name', 'AUM (Cr)', '15 Days (%)', '30 Days (%)', '45 Days (%)', '60 Days (%)', '180 Days (%)', `${customDays} Days (%)`]
    : ['Category', 'Scheme Name', 'AUM (Cr)', '1 Yr (%)', '2 Yr (%)', '3 Yr (%)', '5 Yr (%)', '10 Yr (%)'];

  // Header rows
  const wsData = [
    ['FundPulse — Custom Mutual Fund Performance Selection'],
    [`AMFI Data Date: ${reportDate}`, `Calculation Date: ${todayStr}`, `Plan: ${planLabel}`, `Mode: ${isDaysMode ? 'Day Calculation' : 'Yearly Performance'}`],
    [], // empty spacing row
    tableHeaders
  ];

  // Helper to format values
  const parseNum = (val) => {
    if (val === null || val === undefined || val === 'N/A' || isNaN(val)) return 'N/A';
    return Number(val);
  };

  const parsePct = (val) => {
    if (val === null || val === undefined || val === 'N/A' || isNaN(val)) return 'N/A';
    return Number(val) / 100;
  };

  // Populate fund rows
  funds.forEach(fund => {
    if (isDaysMode) {
      wsData.push([
        fund.category || 'Other',
        fund.displayName || fund.amfiSchemeName,
        parseNum(fund.dailyAUMRaw),
        parsePct(fund.return15D),
        parsePct(fund.return30D),
        parsePct(fund.return45D),
        parsePct(fund.return60D),
        parsePct(fund.return180D),
        parsePct(fund.returnCustomD)
      ]);
    } else {
      wsData.push([
        fund.category || 'Other',
        fund.displayName || fund.amfiSchemeName,
        parseNum(fund.dailyAUMRaw),
        parsePct(fund.return1Yr),
        parsePct(fund.return2Yr),
        parsePct(fund.return3Yr),
        parsePct(fund.return5Yr),
        parsePct(fund.return10Yr)
      ]);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Set numeric cell formats
  // Header starts at row 5 (0-indexed row 4)
  const startRow = 5;
  const pctCols = isDaysMode ? ['D', 'E', 'F', 'G', 'H', 'I'] : ['D', 'E', 'F', 'G', 'H'];

  for (let i = 0; i < funds.length; i++) {
    const rowIdx = startRow + i; // 1-indexed Excel row number

    // AUM column C
    const cellC = worksheet[`C${rowIdx}`];
    if (cellC && typeof cellC.v === 'number') {
      cellC.z = '#,##0.00';
    }

    // Percentage columns
    pctCols.forEach(col => {
      const cell = worksheet[`${col}${rowIdx}`];
      if (cell && typeof cell.v === 'number') {
        cell.z = '0.00%';
      }
    });
  }

  // Column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Category
    { wch: 48 }, // Scheme Name
    { wch: 16 }, // AUM (Cr)
    { wch: 13 }, // Col 1
    { wch: 13 }, // Col 2
    { wch: 13 }, // Col 3
    { wch: 13 }, // Col 4
    { wch: 13 }, // Col 5
    { wch: 15 }  // Col 6
  ];

  // AutoFilter on header row (row 5 in 1-indexed, row 4 in 0-indexed)
  const lastCol = isDaysMode ? 'I' : 'H';
  worksheet['!autofilter'] = { ref: `A5:${lastCol}${startRow + funds.length - 1}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Fund Selection');

  const fileName = `FundPulse_Custom_Fund_List_${mode}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
