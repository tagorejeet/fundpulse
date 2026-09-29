import * as XLSX from 'xlsx';

function getColLetter(colIdx) {
  let letter = '';
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Custom Fund List Excel Exporter matching exact layout with dynamic custom day columns
 */
export const exportCustomListToExcel = ({
  funds = [],
  plan = 'regular',
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  reportDate = '28-Sep-2026'
}) => {
  if (!funds || funds.length === 0) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const planLabel = plan.toLowerCase() === 'direct' ? 'Direct Plan' : 'Regular Plan';
  const isDaysMode = mode === 'days';

  const dayHeaders = customDaysList.map(d => `${d} Days (%)`);

  const tableHeaders = isDaysMode
    ? ['Category', 'Scheme Name', 'AUM (Cr)', ...dayHeaders]
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
      const dayValues = customDaysList.map(d => {
        const val = fund.dayReturns ? fund.dayReturns[d] : fund[`return_${d}d`];
        return parsePct(val);
      });
      wsData.push([
        fund.category || 'Other',
        fund.displayName || fund.amfiSchemeName,
        parseNum(fund.dailyAUMRaw),
        ...dayValues
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
  const numReturnCols = isDaysMode ? customDaysList.length : 5;
  const pctColLetters = [];
  for (let c = 3; c < 3 + numReturnCols; c++) {
    pctColLetters.push(getColLetter(c));
  }

  for (let i = 0; i < funds.length; i++) {
    const rowIdx = startRow + i; // 1-indexed Excel row number

    // AUM column C
    const cellC = worksheet[`C${rowIdx}`];
    if (cellC && typeof cellC.v === 'number') {
      cellC.z = '#,##0.00';
    }

    // Percentage columns
    pctColLetters.forEach(col => {
      const cell = worksheet[`${col}${rowIdx}`];
      if (cell && typeof cell.v === 'number') {
        cell.z = '0.00%';
      }
    });
  }

  // Column widths
  const returnColWidths = Array.from({ length: numReturnCols }).map(() => ({ wch: 14 }));
  worksheet['!cols'] = [
    { wch: 22 }, // Category
    { wch: 48 }, // Scheme Name
    { wch: 16 }, // AUM (Cr)
    ...returnColWidths
  ];

  // AutoFilter on header row
  const lastColLetter = getColLetter(2 + numReturnCols);
  worksheet['!autofilter'] = { ref: `A4:${lastColLetter}${startRow + funds.length - 1}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Fund Selection');

  const fileName = `FundPulse_Custom_Fund_List_${mode}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
