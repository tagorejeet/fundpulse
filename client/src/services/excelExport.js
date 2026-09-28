import * as XLSX from 'xlsx';

/**
 * Custom Fund List Excel Exporter matching exact reference layout
 */
export const exportCustomListToExcel = ({ funds = [], plan = 'regular', reportDate = '28-Sep-2026' }) => {
  if (!funds || funds.length === 0) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const planLabel = plan.toLowerCase() === 'direct' ? 'Direct Plan' : 'Regular Plan';

  // Header rows
  const wsData = [
    ['FundPulse — Custom Mutual Fund Performance Selection'],
    [`AMFI Data Date: ${reportDate}`, `Calculation Date: ${todayStr}`, `Plan: ${planLabel}`],
    [], // empty spacing row
    ['Category', 'Scheme Name', 'AUM (Cr)', '1 Yr (%)', '2 Yr (%)', '3 Yr (%)', '5 Yr (%)', '10 Yr (%)']
  ];

  // Helper to format values
  const parseNum = (val) => {
    if (val === null || val === undefined || val === 'N/A' || isNaN(val)) return null;
    return Number(val);
  };

  // Populate fund rows
  funds.forEach(fund => {
    wsData.push([
      fund.category || 'Other',
      fund.displayName || fund.amfiSchemeName,
      parseNum(fund.dailyAUMRaw) !== null ? parseNum(fund.dailyAUMRaw) : 'N/A',
      parseNum(fund.return1Yr) !== null ? parseNum(fund.return1Yr) / 100 : 'N/A',
      parseNum(fund.return2Yr) !== null ? parseNum(fund.return2Yr) / 100 : 'N/A',
      parseNum(fund.return3Yr) !== null ? parseNum(fund.return3Yr) / 100 : 'N/A',
      parseNum(fund.return5Yr) !== null ? parseNum(fund.return5Yr) / 100 : 'N/A',
      parseNum(fund.return10Yr) !== null ? parseNum(fund.return10Yr) / 100 : 'N/A'
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Set numeric cell formats
  // Header starts at row 5 (0-indexed row 4)
  const startRow = 5;
  for (let i = 0; i < funds.length; i++) {
    const rowIdx = startRow + i; // 1-indexed Excel row number

    // AUM column C
    const cellC = worksheet[`C${rowIdx}`];
    if (cellC && typeof cellC.v === 'number') {
      cellC.z = '#,##0.00';
    }

    // Percentage columns D to H
    ['D', 'E', 'F', 'G', 'H'].forEach(col => {
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
    { wch: 12 }, // 1 Yr (%)
    { wch: 12 }, // 2 Yr (%)
    { wch: 12 }, // 3 Yr (%)
    { wch: 12 }, // 5 Yr (%)
    { wch: 12 }  // 10 Yr (%)
  ];

  // AutoFilter on header row (row 5 in 1-indexed, row 4 in 0-indexed)
  worksheet['!autofilter'] = { ref: `A5:H${startRow + funds.length - 1}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Fund Selection');

  const fileName = `FundPulse_Custom_Fund_List_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
