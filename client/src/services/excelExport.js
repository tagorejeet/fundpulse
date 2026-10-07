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

const parseNum = (val) => {
  if (val === null || val === undefined || val === 'N/A' || isNaN(val)) return 'N/A';
  return Number(val);
};

const parseAum = (fund) => {
  if (!fund) return 'N/A';
  if (fund.dailyAUMRaw !== null && fund.dailyAUMRaw !== undefined && !isNaN(fund.dailyAUMRaw) && fund.dailyAUMRaw !== '') {
    return Number(Number(fund.dailyAUMRaw).toFixed(2));
  }
  if (fund.aum !== null && fund.aum !== undefined && !isNaN(fund.aum) && fund.aum !== '') {
    return Number(Number(fund.aum).toFixed(2));
  }
  if (fund.aumRaw !== null && fund.aumRaw !== undefined && !isNaN(fund.aumRaw) && fund.aumRaw !== '') {
    return Number(Number(fund.aumRaw).toFixed(2));
  }
  const formatted = fund.dailyAUMFormatted || fund.aumFormatted;
  if (formatted && typeof formatted === 'string') {
    const cleaned = formatted.replace(/[₹,Cr\s]/gi, '').trim();
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val > 0) return Number(val.toFixed(2));
  }
  return 'N/A';
};

const parseNav = (val) => {
  if (val === null || val === undefined || val === 'N/A' || val === '') return 'N/A';
  if (typeof val === 'number') return isNaN(val) ? 'N/A' : Number(val.toFixed(2));
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹,\s]/gi, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 'N/A' : Number(parsed.toFixed(2));
  }
  return 'N/A';
};

const parsePct = (val) => {
  if (val === null || val === undefined || val === 'N/A' || isNaN(val)) return 'N/A';
  return Number(val) / 100;
};

/**
 * Creates the AMFI Custom Funds Worksheet
 */
export function createAmfiWorksheet({
  funds = [],
  plan = 'regular',
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  reportDate = '28-Sep-2026',
  calculationDate = null
}) {
  const isBoth = plan.toLowerCase() === 'both';
  const planLabel = isBoth ? 'BOTH (Regular & Direct Plans)' : plan.toLowerCase() === 'direct' ? 'Direct Plan' : 'Regular Plan';
  const isDaysMode = mode === 'days';
  const calcDateStr = calculationDate || new Date().toISOString().split('T')[0];

  let tableHeaders = [];
  let pctStartColIdx = 4;

  if (isBoth) {
    pctStartColIdx = 5;
    if (isDaysMode) {
      const dayHeaders = customDaysList.flatMap(d => [`${d}D Reg (%)`, `${d}D Dir (%)`]);
      tableHeaders = ['Category', 'Scheme Name', 'AUM (Cr)', 'NAV Reg', 'NAV Dir', ...dayHeaders];
    } else {
      tableHeaders = [
        'Category',
        'Scheme Name',
        'AUM (Cr)',
        'NAV Reg',
        'NAV Dir',
        '1 Yr Reg (%)',
        '1 Yr Dir (%)',
        '2 Yr Reg (%)',
        '2 Yr Dir (%)',
        '3 Yr Reg (%)',
        '3 Yr Dir (%)',
        '5 Yr Reg (%)',
        '5 Yr Dir (%)',
        '10 Yr Reg (%)',
        '10 Yr Dir (%)'
      ];
    }
  } else {
    pctStartColIdx = 4;
    if (isDaysMode) {
      const dayHeaders = customDaysList.map(d => `${d} Days (%)`);
      tableHeaders = ['Category', 'Scheme Name', 'AUM (Cr)', 'Current NAV', ...dayHeaders];
    } else {
      tableHeaders = [
        'Category',
        'Scheme Name',
        'AUM (Cr)',
        'Current NAV',
        '1 Yr (%)',
        '2 Yr (%)',
        '3 Yr (%)',
        '5 Yr (%)',
        '10 Yr (%)'
      ];
    }
  }

  const wsData = [
    ['FundPulse — Custom Mutual Fund Performance Selection'],
    [`AMFI Data Date: ${reportDate}`, `Valuation / Calculation Date: ${calcDateStr}`, `Plan: ${planLabel}`, `Mode: ${isDaysMode ? 'Day Calculation' : 'Yearly Performance'}`],
    [],
    tableHeaders
  ];

  funds.forEach(fund => {
    const aumVal = parseAum(fund);

    if (isBoth) {
      const regNav = parseNav(fund.regNav ?? fund.navRegular ?? fund.currentNav ?? fund.nav);
      const dirNav = parseNav(fund.dirNav ?? fund.navDirect ?? fund.currentNav ?? fund.nav);
      if (isDaysMode) {
        const dayVals = customDaysList.flatMap(d => [
          parsePct(fund[`regReturn${d}d`] ?? fund[`return${d}d`]),
          parsePct(fund[`dirReturn${d}d`])
        ]);
        wsData.push([
          fund.category || 'N/A',
          fund.displayName || fund.schemeName || 'N/A',
          aumVal,
          regNav,
          dirNav,
          ...dayVals
        ]);
      } else {
        wsData.push([
          fund.category || 'N/A',
          fund.displayName || fund.schemeName || 'N/A',
          aumVal,
          regNav,
          dirNav,
          parsePct(fund.regReturn1Yr ?? fund.return1Yr),
          parsePct(fund.dirReturn1Yr),
          parsePct(fund.regReturn2Yr ?? fund.return2Yr),
          parsePct(fund.dirReturn2Yr),
          parsePct(fund.regReturn3Yr ?? fund.return3Yr),
          parsePct(fund.dirReturn3Yr),
          parsePct(fund.regReturn5Yr ?? fund.return5Yr),
          parsePct(fund.dirReturn5Yr),
          parsePct(fund.regReturn10Yr ?? fund.return10Yr),
          parsePct(fund.dirReturn10Yr)
        ]);
      }
    } else {
      const currentNav = parseNav(fund.currentNav ?? fund.nav ?? (plan === 'direct' ? fund.dirNav : fund.regNav));
      if (isDaysMode) {
        const dayVals = customDaysList.map(d => parsePct(fund[`return${d}d`]));
        wsData.push([
          fund.category || 'N/A',
          fund.displayName || fund.schemeName || 'N/A',
          aumVal,
          currentNav,
          ...dayVals
        ]);
      } else {
        wsData.push([
          fund.category || 'N/A',
          fund.displayName || fund.schemeName || 'N/A',
          aumVal,
          currentNav,
          parsePct(fund.return1Yr),
          parsePct(fund.return2Yr),
          parsePct(fund.return3Yr),
          parsePct(fund.return5Yr),
          parsePct(fund.return10Yr)
        ]);
      }
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  const numReturnCols = tableHeaders.length - pctStartColIdx;
  const pctColLetters = Array.from({ length: numReturnCols }).map((_, i) => getColLetter(pctStartColIdx + i));
  const startRow = 5;

  for (let r = 0; r < funds.length; r++) {
    const rowIdx = startRow + r;
    const cellC = worksheet[`C${rowIdx}`];
    if (cellC && typeof cellC.v === 'number') cellC.z = '#,##0.00';

    const cellD = worksheet[`D${rowIdx}`];
    if (cellD && typeof cellD.v === 'number') cellD.z = '#,##0.00';

    if (isBoth) {
      const cellE = worksheet[`E${rowIdx}`];
      if (cellE && typeof cellE.v === 'number') cellE.z = '#,##0.00';
    }

    pctColLetters.forEach(col => {
      const cell = worksheet[`${col}${rowIdx}`];
      if (cell && typeof cell.v === 'number') cell.z = '0.00%';
    });
  }

  const returnColWidths = Array.from({ length: numReturnCols }).map(() => ({ wch: 14 }));
  const prefixCols = isBoth 
    ? [{ wch: 22 }, { wch: 48 }, { wch: 16 }, { wch: 14 }, { wch: 14 }]
    : [{ wch: 22 }, { wch: 48 }, { wch: 16 }, { wch: 14 }];

  worksheet['!cols'] = [...prefixCols, ...returnColWidths];
  const lastColLetter = getColLetter(tableHeaders.length - 1);
  if (funds.length > 0) {
    worksheet['!autofilter'] = { ref: `A4:${lastColLetter}${startRow + funds.length - 1}` };
  }

  return worksheet;
}

/**
 * Creates the NSE Indices Worksheet
 */
export function createNseWorksheet(indices = [], calculationDate = null, mode = 'yearly', customDaysList = [33, 50, 67]) {
  const calcDateStr = calculationDate || new Date().toISOString().split('T')[0];
  const isDaysMode = mode === 'days';
  const daysListToUse = (customDaysList && customDaysList.length > 0) ? customDaysList : (indices[0]?.customDaysList || [33, 50, 67]);

  const headers = isDaysMode ? [
    'Category',
    'Index Name',
    'Official Name',
    'Index Value (Close)',
    ...daysListToUse.map(d => `${d} Days (%)`),
    'Data Date'
  ] : [
    'Category',
    'Index Name',
    'Official Name',
    'Index Value (Close)',
    '1Y (%)',
    '2Y (%)',
    '3Y (%)',
    '5Y (%)',
    '10Y (%)',
    'Data Date'
  ];

  const wsData = [
    ['FundPulse — Official NSE Benchmark Indices'],
    [
      'Source: NSE India / NSE Indices',
      `Valuation Date: ${calcDateStr}`,
      isDaysMode
        ? `Formula: 4 * ((VT / V0)^(365 / (4 * D)) - 1)`
        : 'Formula: 4 * ((VT / V0)^(1 / (4 * T)) - 1)'
    ],
    [],
    headers
  ];

  indices.forEach(idx => {
    if (isDaysMode) {
      const dayVals = daysListToUse.map(d => parsePct(idx.dayReturns?.[d] ?? idx[`return${d}d`]));
      wsData.push([
        'NSE Index',
        idx.displayName || idx.id,
        idx.officialName || idx.id,
        parseNum(idx.currentValue),
        ...dayVals,
        idx.dataDate || 'N/A'
      ]);
    } else {
      wsData.push([
        'NSE Index',
        idx.displayName || idx.id,
        idx.officialName || idx.id,
        parseNum(idx.currentValue),
        parsePct(idx.return1Yr),
        parsePct(idx.return2Yr),
        parsePct(idx.return3Yr),
        parsePct(idx.return5Yr),
        parsePct(idx.return10Yr),
        idx.dataDate || 'N/A'
      ]);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const startRow = 5;
  const numReturnCols = headers.length - 5; // 4 prefix cols, 1 suffix col (Data Date)

  for (let r = 0; r < indices.length; r++) {
    const rowIdx = startRow + r;
    // Value col D
    const cellD = worksheet[`D${rowIdx}`];
    if (cellD && typeof cellD.v === 'number') cellD.z = '#,##0.00';

    for (let c = 0; c < numReturnCols; c++) {
      const colLetter = getColLetter(4 + c);
      const cell = worksheet[`${colLetter}${rowIdx}`];
      if (cell && typeof cell.v === 'number') cell.z = '0.00%';
    }
  }

  const dynamicCols = [
    { wch: 18 }, // Category
    { wch: 24 }, // Index Name
    { wch: 24 }, // Official Name
    { wch: 18 }, // Value
    ...Array.from({ length: numReturnCols }).map(() => ({ wch: 14 })),
    { wch: 16 }  // Data Date
  ];
  worksheet['!cols'] = dynamicCols;

  if (indices.length > 0) {
    const lastColLetter = getColLetter(headers.length - 1);
    worksheet['!autofilter'] = { ref: `A4:${lastColLetter}${startRow + indices.length - 1}` };
  }

  return worksheet;
}

/**
 * Creates the Combined Summary Worksheet (AMFI Mutual Funds + NSE Indices)
 */
export function createCombinedSummaryWorksheet(funds = [], indices = [], reportDate = '', calculationDate = null) {
  const calcDateStr = calculationDate || new Date().toISOString().split('T')[0];
  const headers = [
    'Type',
    'Category',
    'Name',
    'AUM / Index Value',
    '1Y (%)',
    '2Y (%)',
    '3Y (%)',
    '5Y (%)',
    '10Y (%)',
    'Data Date'
  ];

  const wsData = [
    ['FundPulse — Combined Performance Summary (Mutual Funds & NSE Indices)'],
    [`Valuation / Calculation Date: ${calcDateStr}`, 'Standard Formula: 4 * ((VT / V0)^(1 / (4 * T)) - 1)'],
    [],
    headers
  ];

  // 1. Add Mutual Funds
  funds.forEach(fund => {
    wsData.push([
      'Mutual Fund',
      fund.category || 'N/A',
      fund.displayName || fund.schemeName || 'N/A',
      parseAum(fund),
      parsePct(fund.return1Yr),
      parsePct(fund.return2Yr),
      parsePct(fund.return3Yr),
      parsePct(fund.return5Yr),
      parsePct(fund.return10Yr),
      fund.reportDate || reportDate || 'N/A'
    ]);
  });

  // 2. Add NSE Indices
  indices.forEach(idx => {
    wsData.push([
      'NSE Index',
      'NSE Index',
      idx.displayName || idx.id,
      parseNum(idx.currentValue),
      parsePct(idx.return1Yr),
      parsePct(idx.return2Yr),
      parsePct(idx.return3Yr),
      parsePct(idx.return5Yr),
      parsePct(idx.return10Yr),
      idx.dataDate || 'N/A'
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const totalRows = funds.length + indices.length;
  const startRow = 5;

  for (let r = 0; r < totalRows; r++) {
    const rowIdx = startRow + r;
    const cellD = worksheet[`D${rowIdx}`];
    if (cellD && typeof cellD.v === 'number') cellD.z = '#,##0.00';

    ['E', 'F', 'G', 'H', 'I'].forEach(col => {
      const cell = worksheet[`${col}${rowIdx}`];
      if (cell && typeof cell.v === 'number') cell.z = '0.00%';
    });
  }

  worksheet['!cols'] = [
    { wch: 16 }, // Type
    { wch: 22 }, // Category
    { wch: 48 }, // Name
    { wch: 20 }, // AUM / Value
    { wch: 14 }, // 1Y
    { wch: 14 }, // 2Y
    { wch: 14 }, // 3Y
    { wch: 14 }, // 5Y
    { wch: 14 }, // 10Y
    { wch: 16 }  // Data Date
  ];

  if (totalRows > 0) {
    worksheet['!autofilter'] = { ref: `A4:J${startRow + totalRows - 1}` };
  }

  return worksheet;
}

/**
 * EXPORT 1: Download Custom List (Selected AMFI Funds + Selected NSE Indices in 1 workbook)
 */
export const exportCustomListToExcel = ({
  funds = [],
  nseIndices = [],
  plan = 'regular',
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  reportDate = '28-Sep-2026',
  calculationDate = null
}) => {
  const workbook = XLSX.utils.book_new();
  const todayStr = calculationDate || new Date().toISOString().split('T')[0];

  // Sheet 1: Custom Fund List
  if (funds && funds.length > 0) {
    const amfiWs = createAmfiWorksheet({ funds, plan, mode, customDays, customDaysList, reportDate, calculationDate });
    XLSX.utils.book_append_sheet(workbook, amfiWs, 'Custom Fund List');
  }

  // Sheet 2: NSE Indices
  if (nseIndices && nseIndices.length > 0) {
    const nseWs = createNseWorksheet(nseIndices, calculationDate, mode, customDaysList);
    XLSX.utils.book_append_sheet(workbook, nseWs, 'NSE Indices');
  }

  // If both are empty, don't export
  if (workbook.SheetNames.length === 0) return;

  const fileName = `FundPulse_Custom_List_${plan}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * EXPORT 2: Download NSE List (Only selected NSE indices)
 */
export const exportNseListToExcel = (indices = [], calculationDate = null, mode = 'yearly', customDaysList = [33, 50, 67]) => {
  if (!indices || indices.length === 0) return;
  const todayStr = calculationDate || new Date().toISOString().split('T')[0];

  const workbook = XLSX.utils.book_new();
  const nseWs = createNseWorksheet(indices, calculationDate, mode, customDaysList);
  XLSX.utils.book_append_sheet(workbook, nseWs, 'NSE Indices');

  const fileName = `FundPulse_NSE_Indices_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * EXPORT 3: Download Everything (Sheet 1: AMFI, Sheet 2: NSE, Sheet 3: Combined Summary)
 */
export const exportEverythingToExcel = ({
  funds = [],
  nseIndices = [],
  plan = 'regular',
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  reportDate = '28-Sep-2026',
  calculationDate = null
}) => {
  const workbook = XLSX.utils.book_new();
  const todayStr = calculationDate || new Date().toISOString().split('T')[0];

  // Sheet 1: AMFI Custom Funds
  const amfiWs = createAmfiWorksheet({ funds, plan, mode, customDays, customDaysList, reportDate, calculationDate });
  XLSX.utils.book_append_sheet(workbook, amfiWs, 'Custom Fund List');

  // Sheet 2: NSE Custom Indices
  const nseWs = createNseWorksheet(nseIndices, calculationDate, mode, customDaysList);
  XLSX.utils.book_append_sheet(workbook, nseWs, 'NSE Indices');

  // Sheet 3: Combined Summary
  const summaryWs = createCombinedSummaryWorksheet(funds, nseIndices, reportDate, calculationDate);
  XLSX.utils.book_append_sheet(workbook, summaryWs, 'Combined Summary');

  const fileName = `FundPulse_Complete_Portfolio_${plan}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
