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

function sanitizeSheetName(name, existingNames = new Set()) {
  let clean = (name || 'Sheet')
    .replace(/[\\/*?[\]:]/g, '')
    .trim()
    .substring(0, 28);
  if (!clean) clean = 'Fund';

  let finalName = clean;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${clean.substring(0, 25)}_${counter}`;
    counter++;
  }
  existingNames.add(finalName.toLowerCase());
  return finalName;
}

/**
 * Export full SIP Calculation Workbook with Overview Summary + Per-Fund Cash Flow Sheets
 */
export const exportSipToExcel = ({
  results = [],
  monthlySip = 10000,
  calculationDate = '',
  sipDay = 25,
  plan = 'regular',
  reportDate = ''
}) => {
  if (!results || results.length === 0) return;

  const workbook = XLSX.utils.book_new();
  const existingSheetNames = new Set();
  const todayStr = new Date().toISOString().split('T')[0];
  const planLabel = plan.toLowerCase() === 'direct' ? 'Direct Plan' : 'Regular Plan';

  // ==========================================
  // SHEET 1: SIP RETURNS OVERVIEW
  // ==========================================
  const summaryHeaders = [
    'Category',
    'Scheme Name',
    'AMC Name',
    'Plan',
    'Monthly SIP (₹)',
    'Current NAV (₹)',
    '1 Yr SIP (%)',
    '2 Yr SIP (%)',
    '3 Yr SIP (%)',
    '5 Yr SIP (%)',
    '10 Yr SIP (%)'
  ];

  const summaryRows = [
    ['FundPulse — Mutual Fund SIP Return Analysis'],
    [
      `Calculation Date: ${calculationDate || todayStr}`,
      `AMFI Data Date: ${reportDate || 'Latest'}`,
      `Monthly SIP: ₹${Number(monthlySip).toLocaleString('en-IN')}`,
      `SIP Day: ${sipDay}th of month`,
      `Plan: ${planLabel}`
    ],
    [], // Blank row
    summaryHeaders
  ];

  const parsePct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return Number(val) / 100;
  };

  results.forEach(fund => {
    summaryRows.push([
      fund.category || 'Other',
      fund.displayName || fund.amfiSchemeName,
      fund.amcName || '',
      planLabel,
      Number(monthlySip),
      fund.currentNav ? Number(fund.currentNav) : (fund.navRegular ? Number(fund.navRegular) : 'N/A'),
      parsePct(fund.returns?.return1Yr),
      parsePct(fund.returns?.return2Yr),
      parsePct(fund.returns?.return3Yr),
      parsePct(fund.returns?.return5Yr),
      parsePct(fund.returns?.return10Yr)
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

  // Apply formatting to Summary Sheet
  const startRow = 5; // 1-indexed
  for (let i = 0; i < results.length; i++) {
    const rowIdx = startRow + i;

    // Monthly SIP Col E (index 4)
    const cellE = summarySheet[`E${rowIdx}`];
    if (cellE && typeof cellE.v === 'number') cellE.z = '"₹"#,##0';

    // Current NAV Col F (index 5)
    const cellF = summarySheet[`F${rowIdx}`];
    if (cellF && typeof cellF.v === 'number') cellF.z = '"₹"#,##0.00';

    // Percentages: G, H, I, J, K (indices 6, 7, 8, 9, 10)
    ['G', 'H', 'I', 'J', 'K'].forEach(col => {
      const cell = summarySheet[`${col}${rowIdx}`];
      if (cell && typeof cell.v === 'number') cell.z = '0.00%';
    });
  }

  summarySheet['!cols'] = [
    { wch: 18 }, // Category
    { wch: 45 }, // Scheme Name
    { wch: 25 }, // AMC Name
    { wch: 14 }, // Plan
    { wch: 16 }, // Monthly SIP
    { wch: 16 }, // Current NAV
    { wch: 14 }, // 1Y SIP
    { wch: 14 }, // 2Y SIP
    { wch: 14 }, // 3Y SIP
    { wch: 14 }, // 5Y SIP
    { wch: 14 }  // 10Y SIP
  ];

  summarySheet['!autofilter'] = { ref: `A4:K${startRow + results.length - 1}` };
  XLSX.utils.book_append_sheet(workbook, summarySheet, sanitizeSheetName('SIP Returns Overview', existingSheetNames));

  // ==========================================
  // DETAILED CASH FLOW SHEETS PER FUND
  // ==========================================
  results.forEach(fund => {
    // Choose primary period with data (prefer 3Y, or 1Y, or first available)
    const periodKeys = ['1Y', '3Y', '5Y', '10Y', '2Y'];
    const activePeriodKey = periodKeys.find(k => fund.periods?.[k]?.hasSufficientData) || '1Y';
    const periodData = fund.periods?.[activePeriodKey];

    const detailRows = [
      [`FundPulse — Detailed Monthly SIP Cash Flow Ledger`],
      [`Scheme Name: ${fund.displayName || fund.amfiSchemeName}`],
      [`AMC: ${fund.amcName || 'N/A'}`, `Category: ${fund.category || 'N/A'}`, `Plan: ${planLabel}`],
      [`Analysis Period: ${activePeriodKey} (${periodData?.installmentsCount || 0} monthly installments)`, `Calculation Date: ${calculationDate || todayStr}`],
      []
    ];

    if (!periodData || !periodData.hasSufficientData) {
      detailRows.push(['Status: Insufficient historical NAV data for this calculation horizon.']);
      if (periodData?.insufficientReason) {
        detailRows.push([`Reason: ${periodData.insufficientReason}`]);
      }
    } else {
      // Summary Metrics block
      detailRows.push(['--- SUMMARY METRICS ---']);
      detailRows.push(['Total Amount Invested', Number(periodData.totalInvested)]);
      detailRows.push(['Total Accumulated Units', Number(periodData.totalUnits.toFixed(4))]);
      detailRows.push(['Latest Applicable NAV', Number(periodData.currentNav)]);
      detailRows.push(['Final Portfolio Value', Number(periodData.finalPortfolioValue)]);
      detailRows.push(['Absolute Gain / Profit', Number(periodData.absoluteGain)]);
      detailRows.push(['Annualized Return (SIP XIRR)', periodData.sipXirr !== null ? Number(periodData.sipXirr) / 100 : 'N/A']);
      detailRows.push([]); // blank

      // Table Header
      const tableStartRow = detailRows.length + 1;
      detailRows.push([
        'Installment #',
        'Scheduled SIP Date',
        'Allotment / NAV Date',
        'Holiday Adjusted?',
        'Applicable NAV (₹)',
        'Monthly SIP (₹)',
        'Units Purchased',
        'Cumulative Units',
        'Cumulative Invested (₹)',
        'Valuation at Latest NAV (₹)'
      ]);

      // Installments
      periodData.installments.forEach(inst => {
        const valAtLatest = inst.cumulativeUnits * periodData.currentNav;
        detailRows.push([
          inst.installmentNumber,
          inst.scheduledDate,
          inst.allotmentDate,
          inst.isAdjustedForHoliday ? 'Yes' : 'No',
          Number(inst.nav),
          Number(inst.sipAmount),
          Number(inst.unitsPurchased.toFixed(4)),
          Number(inst.cumulativeUnits.toFixed(4)),
          Number(inst.cumulativeInvested),
          Number(valAtLatest.toFixed(2))
        ]);
      });

      // Final Valuation Row
      detailRows.push([
        'Valuation',
        periodData.valuationDate,
        periodData.valuationDate,
        '-',
        Number(periodData.currentNav),
        'Final Value',
        '-',
        Number(periodData.totalUnits.toFixed(4)),
        Number(periodData.totalInvested),
        Number(periodData.finalPortfolioValue)
      ]);
    }

    const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);

    // Apply formatting to summary metric rows
    const summaryMetricMap = {
      7: '"₹"#,##0.00',  // Total Invested
      8: '#,##0.0000',    // Total Units
      9: '"₹"#,##0.00',  // Latest NAV
      10: '"₹"#,##0.00', // Final Value
      11: '"₹"#,##0.00', // Absolute Gain
      12: '0.00%'        // SIP XIRR
    };
    Object.entries(summaryMetricMap).forEach(([r, fmt]) => {
      const cell = detailSheet[`B${r}`];
      if (cell && typeof cell.v === 'number') cell.z = fmt;
    });

    // Formatting for table data rows
    if (periodData && periodData.hasSufficientData) {
      const tableHeadIdx = 15;
      const count = periodData.installments.length;
      for (let i = 0; i < count; i++) {
        const rIdx = tableHeadIdx + 1 + i;
        const cellNav = detailSheet[`E${rIdx}`];
        if (cellNav && typeof cellNav.v === 'number') cellNav.z = '"₹"#,##0.00';

        const cellSip = detailSheet[`F${rIdx}`];
        if (cellSip && typeof cellSip.v === 'number') cellSip.z = '"₹"#,##0.00';

        const cellUnits = detailSheet[`G${rIdx}`];
        if (cellUnits && typeof cellUnits.v === 'number') cellUnits.z = '#,##0.0000';

        const cellCumUnits = detailSheet[`H${rIdx}`];
        if (cellCumUnits && typeof cellCumUnits.v === 'number') cellCumUnits.z = '#,##0.0000';

        const cellCumInv = detailSheet[`I${rIdx}`];
        if (cellCumInv && typeof cellCumInv.v === 'number') cellCumInv.z = '"₹"#,##0.00';

        const cellVal = detailSheet[`J${rIdx}`];
        if (cellVal && typeof cellVal.v === 'number') cellVal.z = '"₹"#,##0.00';
      }

      // Final row formatting
      const finalR = tableHeadIdx + 1 + count;
      const cellFinalNav = detailSheet[`E${finalR}`];
      if (cellFinalNav && typeof cellFinalNav.v === 'number') cellFinalNav.z = '"₹"#,##0.00';

      const cellFinalUnits = detailSheet[`H${finalR}`];
      if (cellFinalUnits && typeof cellFinalUnits.v === 'number') cellFinalUnits.z = '#,##0.0000';

      const cellFinalInv = detailSheet[`I${finalR}`];
      if (cellFinalInv && typeof cellFinalInv.v === 'number') cellFinalInv.z = '"₹"#,##0.00';

      const cellFinalVal = detailSheet[`J${finalR}`];
      if (cellFinalVal && typeof cellFinalVal.v === 'number') cellFinalVal.z = '"₹"#,##0.00';
    }

    detailSheet['!cols'] = [
      { wch: 15 }, // Installment #
      { wch: 18 }, // Scheduled Date
      { wch: 18 }, // Allotment Date
      { wch: 18 }, // Holiday Adjusted
      { wch: 18 }, // Applicable NAV
      { wch: 18 }, // Monthly SIP
      { wch: 18 }, // Units Purchased
      { wch: 18 }, // Cumulative Units
      { wch: 22 }, // Cumulative Invested
      { wch: 26 }  // Portfolio Value
    ];

    const tabName = sanitizeSheetName(fund.displayName || 'Fund', existingSheetNames);
    XLSX.utils.book_append_sheet(workbook, detailSheet, tabName);
  });

  const fileName = `FundPulse_SIP_Returns_${plan}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
