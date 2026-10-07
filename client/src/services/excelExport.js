import ExcelJS from 'exceljs';

const FONT_FAMILY = 'Times New Roman';
const BORDER_MEDIUM = { style: 'medium', color: { argb: 'FF000000' } };
const BORDER_THIN = { style: 'thin', color: { argb: 'FF000000' } };

const CATEGORY_ORDER = {
  'Large Cap': 1,
  'Mid Cap': 2,
  'Large & Mid Cap': 3,
  'Small Cap': 4,
  'Multi Cap': 5,
  'Flexi Cap': 6,
  'Value': 7,
  'ELSS': 8,
  'Contra': 9,
  'Dividend Yield': 10,
  'Focused': 11,
  'Index Funds': 12,
  'Hybrid': 13,
  'Debt / Liquid': 14,
  'Other': 15
};

const parseAum = (fund) => {
  if (!fund) return null;
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
  return null;
};

const parseNav = (val) => {
  if (val === null || val === undefined || val === 'N/A' || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : Number(val.toFixed(2));
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹,\s]/gi, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : Number(parsed.toFixed(2));
  }
  return null;
};

const parsePct = (val) => {
  if (val === null || val === undefined || val === 'N/A' || isNaN(val) || val === '') return null;
  return Number(val) / 100;
};

function formatTitleDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
  }
  return str;
}

async function downloadWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Builds the exact "Suggestion List" worksheet reproducing "Our Suggestion Sheet.xlsx"
 * with Times New Roman font, exact column widths, row heights, dynamic categories,
 * merged category cells, blank separator rows, and precise borders.
 */
export function buildSuggestionSheetWorksheet(workbook, {
  funds = [],
  nseIndices = [],
  plan = 'regular',
  mode = 'yearly',
  customDaysList = [33, 50, 67],
  calculationDate = null
}) {
  const isBoth = String(plan).toLowerCase() === 'both';
  const isDaysMode = mode === 'days';
  const dateFormatted = formatTitleDate(calculationDate);

  const ws = workbook.addWorksheet('Suggestion List', {
    views: [{ showGridLines: true }]
  });

  // 1. Determine Headers & Columns
  let headers = [];
  let colWidths = [];

  if (isBoth) {
    if (isDaysMode) {
      const dayHeaders = customDaysList.flatMap(d => [`${d}D Reg (%)`, `${d}D Dir (%)`]);
      headers = ['Category', 'Scheme name', 'AUM (Cr)', 'NAV Reg', 'NAV Dir', ...dayHeaders];
      colWidths = [32.75, 47.38, 12.0, 11.0, 11.0, ...customDaysList.flatMap(() => [11.0, 11.0])];
    } else {
      headers = [
        'Category',
        'Scheme name',
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
      colWidths = [32.75, 47.38, 12.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.5, 11.5];
    }
  } else {
    if (isDaysMode) {
      const dayHeaders = customDaysList.map(d => `${d} Days (%)`);
      headers = ['Category', 'Scheme name', 'AUM (Cr)', 'Current NAV', ...dayHeaders];
      colWidths = [32.75, 47.38, 12.0, 11.0, ...customDaysList.map(() => 11.0)];
    } else {
      headers = ['Category', 'Scheme name', 'AUM (Cr)', '1 Yr (%)', '2 Yr (%)', '3 Yr (%)', '5 Yr (%)', '10 Yr (%)'];
      colWidths = [32.75, 47.38, 12.0, 10.5, 10.5, 10.5, 10.5, 11.5];
    }
  }

  const totalCols = headers.length;

  // Set Column Widths
  ws.columns = colWidths.map(w => ({ width: w }));

  // Row 1: Title (Merged A1 across all columns)
  ws.mergeCells(1, 1, 1, totalCols);
  const titleRow = ws.getRow(1);
  titleRow.height = 30;
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `Suggestions (${dateFormatted})`;
  titleCell.font = { name: FONT_FAMILY, size: 18, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(1, c);
    cell.border = {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: c === 1 ? BORDER_MEDIUM : undefined,
      right: c === totalCols ? BORDER_MEDIUM : undefined
    };
  }

  // Row 2: Table Header
  const headerRow = ws.getRow(2);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = ws.getCell(2, colIdx);
    cell.value = h;
    cell.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: colIdx === 1 ? BORDER_MEDIUM : BORDER_THIN,
      right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
    };
  });

  // Group Mutual Funds by Category dynamically
  const groups = {};
  funds.forEach(f => {
    const cat = f.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  });

  const sortedCategories = Object.keys(groups).sort((a, b) => {
    const ordA = CATEGORY_ORDER[a] || 99;
    const ordB = CATEGORY_ORDER[b] || 99;
    return ordA - ordB;
  });

  let currentRow = 3;

  // Output each Category Block
  sortedCategories.forEach((catName, catIdx) => {
    const catFunds = groups[catName];
    const catStartRow = currentRow;
    const catEndRow = currentRow + catFunds.length - 1;

    // Output individual fund rows
    catFunds.forEach((fund, fIdx) => {
      const rowNum = catStartRow + fIdx;
      const row = ws.getRow(rowNum);
      row.height = 20;

      // Col 2: Scheme Name
      const nameCell = ws.getCell(rowNum, 2);
      nameCell.value = fund.displayName || fund.schemeName || 'N/A';
      nameCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      nameCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

      // Col 3: AUM (Cr)
      const aumCell = ws.getCell(rowNum, 3);
      const aumVal = parseAum(fund);
      if (aumVal !== null) {
        aumCell.value = aumVal;
        aumCell.numFmt = '#,##0.00';
      } else {
        aumCell.value = '-';
      }
      aumCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      aumCell.alignment = { horizontal: 'center', vertical: 'middle' };
      aumCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

      if (isBoth) {
        // Col 4: NAV Reg
        const regNavCell = ws.getCell(rowNum, 4);
        const regNavVal = parseNav(fund.regNav ?? fund.navRegular ?? fund.currentNav ?? fund.nav);
        if (regNavVal !== null) {
          regNavCell.value = regNavVal;
          regNavCell.numFmt = '#,##0.00';
        } else {
          regNavCell.value = '-';
        }
        regNavCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
        regNavCell.alignment = { horizontal: 'center', vertical: 'middle' };
        regNavCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

        // Col 5: NAV Dir
        const dirNavCell = ws.getCell(rowNum, 5);
        const dirNavVal = parseNav(fund.dirNav ?? fund.navDirect ?? fund.currentNav ?? fund.nav);
        if (dirNavVal !== null) {
          dirNavCell.value = dirNavVal;
          dirNavCell.numFmt = '#,##0.00';
        } else {
          dirNavCell.value = '-';
        }
        dirNavCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
        dirNavCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dirNavCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

        if (isDaysMode) {
          const returnVals = customDaysList.flatMap(d => [
            parsePct(fund[`regReturn${d}d`] ?? fund[`return${d}d`]),
            parsePct(fund[`dirReturn${d}d`])
          ]);
          returnVals.forEach((ret, rIdx) => {
            const colIdx = 6 + rIdx;
            const retCell = ws.getCell(rowNum, colIdx);
            if (ret !== null) {
              retCell.value = ret;
              retCell.numFmt = '0.00%';
            } else {
              retCell.value = '-';
            }
            retCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
            retCell.alignment = { horizontal: 'center', vertical: 'middle' };
            retCell.border = {
              top: BORDER_THIN,
              bottom: BORDER_THIN,
              left: BORDER_THIN,
              right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
            };
          });
        } else {
          const returnVals = [
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
          ];
          returnVals.forEach((ret, rIdx) => {
            const colIdx = 6 + rIdx;
            const retCell = ws.getCell(rowNum, colIdx);
            if (ret !== null) {
              retCell.value = ret;
              retCell.numFmt = '0.00%';
            } else {
              retCell.value = '-';
            }
            retCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
            retCell.alignment = { horizontal: 'center', vertical: 'middle' };
            retCell.border = {
              top: BORDER_THIN,
              bottom: BORDER_THIN,
              left: BORDER_THIN,
              right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
            };
          });
        }
      } else {
        // Single Plan (Regular or Direct)
        let returnVals = [];
        let startRetCol = 4;

        if (isDaysMode) {
          // Col 4: Current NAV
          const navCell = ws.getCell(rowNum, 4);
          const navVal = parseNav(fund.currentNav ?? fund.nav);
          if (navVal !== null) {
            navCell.value = navVal;
            navCell.numFmt = '#,##0.00';
          } else {
            navCell.value = '-';
          }
          navCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
          navCell.alignment = { horizontal: 'center', vertical: 'middle' };
          navCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

          returnVals = customDaysList.map(d => parsePct(fund[`return${d}d`]));
          startRetCol = 5;
        } else {
          returnVals = [
            parsePct(fund.return1Yr),
            parsePct(fund.return2Yr),
            parsePct(fund.return3Yr),
            parsePct(fund.return5Yr),
            parsePct(fund.return10Yr)
          ];
          startRetCol = 4;
        }

        returnVals.forEach((ret, rIdx) => {
          const colIdx = startRetCol + rIdx;
          const retCell = ws.getCell(rowNum, colIdx);
          if (ret !== null) {
            retCell.value = ret;
            retCell.numFmt = '0.00%';
          } else {
            retCell.value = '-';
          }
          retCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
          retCell.alignment = { horizontal: 'center', vertical: 'middle' };
          retCell.border = {
            top: BORDER_THIN,
            bottom: BORDER_THIN,
            left: BORDER_THIN,
            right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
          };
        });
      }
    });

    // Merge Category cell across catStartRow to catEndRow in Col 1
    if (catEndRow > catStartRow) {
      ws.mergeCells(catStartRow, 1, catEndRow, 1);
    }
    const catCell = ws.getCell(catStartRow, 1);
    const displayCatName = catName.endsWith('Fund') ? catName : `${catName} Fund`;
    catCell.value = displayCatName;
    catCell.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: 'FF000000' } };
    catCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Apply borders to Category column cells
    for (let r = catStartRow; r <= catEndRow; r++) {
      const cell = ws.getCell(r, 1);
      cell.border = {
        top: r === catStartRow ? BORDER_THIN : undefined,
        bottom: r === catEndRow ? BORDER_THIN : undefined,
        left: BORDER_MEDIUM,
        right: BORDER_THIN
      };
    }

    currentRow = catEndRow + 1;

    // Blank separator row between categories
    const isLastCategory = (catIdx === sortedCategories.length - 1) && (!nseIndices || nseIndices.length === 0);
    if (!isLastCategory) {
      const sepRow = ws.getRow(currentRow);
      sepRow.height = 14;
      for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.border = {
          top: BORDER_THIN,
          bottom: BORDER_THIN,
          left: c === 1 ? BORDER_MEDIUM : undefined,
          right: c === totalCols ? BORDER_MEDIUM : undefined
        };
      }
      currentRow++;
    }
  });

  // Dynamic NSE Benchmark Indices Section (if selected)
  if (nseIndices && nseIndices.length > 0) {
    const nseStartRow = currentRow;
    const nseEndRow = currentRow + nseIndices.length - 1;

    nseIndices.forEach((idx, iIdx) => {
      const rowNum = nseStartRow + iIdx;
      const row = ws.getRow(rowNum);
      row.height = 20;

      // Col 2: Index Name
      const nameCell = ws.getCell(rowNum, 2);
      nameCell.value = idx.displayName || idx.officialName || idx.id;
      nameCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      nameCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

      // Col 3: Index Value (Close)
      const aumCell = ws.getCell(rowNum, 3);
      const val = Number(idx.currentValue);
      if (!isNaN(val) && val > 0) {
        aumCell.value = val;
        aumCell.numFmt = '#,##0.00';
      } else {
        aumCell.value = '-';
      }
      aumCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      aumCell.alignment = { horizontal: 'center', vertical: 'middle' };
      aumCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

      let retCols = [];
      let startCol = 4;

      if (isBoth) {
        // Col 4 & 5: Index Value repeated
        [4, 5].forEach(colIdx => {
          const valCell = ws.getCell(rowNum, colIdx);
          if (!isNaN(val) && val > 0) {
            valCell.value = val;
            valCell.numFmt = '#,##0.00';
          } else {
            valCell.value = '-';
          }
          valCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
          valCell.alignment = { horizontal: 'center', vertical: 'middle' };
          valCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };
        });

        if (isDaysMode) {
          retCols = customDaysList.flatMap(d => [
            parsePct(idx.dayReturns?.[d] ?? idx[`return${d}d`]),
            parsePct(idx.dayReturns?.[d] ?? idx[`return${d}d`])
          ]);
        } else {
          const r1 = parsePct(idx.return1Yr);
          const r2 = parsePct(idx.return2Yr);
          const r3 = parsePct(idx.return3Yr);
          const r5 = parsePct(idx.return5Yr);
          const r10 = parsePct(idx.return10Yr);
          retCols = [r1, r1, r2, r2, r3, r3, r5, r5, r10, r10];
        }
        startCol = 6;
      } else {
        if (isDaysMode) {
          // Col 4: Current Value
          const navCell = ws.getCell(rowNum, 4);
          if (!isNaN(val) && val > 0) {
            navCell.value = val;
            navCell.numFmt = '#,##0.00';
          } else {
            navCell.value = '-';
          }
          navCell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
          navCell.alignment = { horizontal: 'center', vertical: 'middle' };
          navCell.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

          retCols = customDaysList.map(d => parsePct(idx.dayReturns?.[d] ?? idx[`return${d}d`]));
          startCol = 5;
        } else {
          retCols = [
            parsePct(idx.return1Yr),
            parsePct(idx.return2Yr),
            parsePct(idx.return3Yr),
            parsePct(idx.return5Yr),
            parsePct(idx.return10Yr)
          ];
          startCol = 4;
        }
      }

      retCols.forEach((ret, rIdx) => {
        const colIdx = startCol + rIdx;
        const cell = ws.getCell(rowNum, colIdx);
        if (ret !== null) {
          cell.value = ret;
          cell.numFmt = '0.00%';
        } else {
          cell.value = '-';
        }
        cell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: BORDER_THIN,
          bottom: BORDER_THIN,
          left: BORDER_THIN,
          right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
        };
      });
    });

    // Merge NSE Category cell
    if (nseEndRow > nseStartRow) {
      ws.mergeCells(nseStartRow, 1, nseEndRow, 1);
    }
    const nseCatCell = ws.getCell(nseStartRow, 1);
    nseCatCell.value = 'NSE Benchmark Indices';
    nseCatCell.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: 'FF000000' } };
    nseCatCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    for (let r = nseStartRow; r <= nseEndRow; r++) {
      const cell = ws.getCell(r, 1);
      cell.border = {
        top: r === nseStartRow ? BORDER_THIN : undefined,
        bottom: r === nseEndRow ? BORDER_THIN : undefined,
        left: BORDER_MEDIUM,
        right: BORDER_THIN
      };
    }

    currentRow = nseEndRow + 1;
  }

  // Bottom edge border on last row
  const lastRow = currentRow - 1;
  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(lastRow, c);
    const cur = cell.border || {};
    cell.border = { ...cur, bottom: BORDER_MEDIUM };
  }

  return ws;
}

/**
 * Builds the standalone NSE Indices worksheet in Times New Roman
 */
export function buildNseWorksheet(workbook, indices = [], calculationDate = null, mode = 'yearly', customDaysList = [33, 50, 67]) {
  const isDaysMode = mode === 'days';
  const dateFormatted = formatTitleDate(calculationDate);
  const daysListToUse = (customDaysList && customDaysList.length > 0) ? customDaysList : (indices[0]?.customDaysList || [33, 50, 67]);

  const ws = workbook.addWorksheet('NSE Indices', {
    views: [{ showGridLines: true }]
  });

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
    '1 Yr (%)',
    '2 Yr (%)',
    '3 Yr (%)',
    '5 Yr (%)',
    '10 Yr (%)',
    'Data Date'
  ];

  const totalCols = headers.length;
  ws.columns = [
    { width: 22 },
    { width: 26 },
    { width: 26 },
    { width: 18 },
    ...Array.from({ length: totalCols - 5 }).map(() => ({ width: 12 })),
    { width: 16 }
  ];

  // Title Row
  ws.mergeCells(1, 1, 1, totalCols);
  const titleRow = ws.getRow(1);
  titleRow.height = 30;
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `Official NSE Benchmark Indices (${dateFormatted})`;
  titleCell.font = { name: FONT_FAMILY, size: 16, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(1, c).border = {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: c === 1 ? BORDER_MEDIUM : undefined,
      right: c === totalCols ? BORDER_MEDIUM : undefined
    };
  }

  // Header Row
  const headerRow = ws.getRow(2);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = ws.getCell(2, colIdx);
    cell.value = h;
    cell.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: colIdx === 1 ? BORDER_MEDIUM : BORDER_THIN,
      right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
    };
  });

  // Data Rows
  indices.forEach((idx, iIdx) => {
    const rowNum = 3 + iIdx;
    const row = ws.getRow(rowNum);
    row.height = 20;

    const val = Number(idx.currentValue);
    const returnVals = isDaysMode
      ? daysListToUse.map(d => parsePct(idx.dayReturns?.[d] ?? idx[`return${d}d`]))
      : [
          parsePct(idx.return1Yr),
          parsePct(idx.return2Yr),
          parsePct(idx.return3Yr),
          parsePct(idx.return5Yr),
          parsePct(idx.return10Yr)
        ];

    const rowData = [
      'NSE Benchmark',
      idx.displayName || idx.id,
      idx.officialName || idx.id,
      !isNaN(val) && val > 0 ? val : '-',
      ...returnVals,
      idx.dataDate || 'N/A'
    ];

    rowData.forEach((cellVal, cIdx) => {
      const colIdx = cIdx + 1;
      const cell = ws.getCell(rowNum, colIdx);
      cell.value = cellVal !== null ? cellVal : '-';
      cell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      cell.alignment = {
        horizontal: colIdx === 2 || colIdx === 3 ? 'left' : 'center',
        vertical: 'middle'
      };

      if (colIdx === 4 && typeof cellVal === 'number') {
        cell.numFmt = '#,##0.00';
      } else if (colIdx > 4 && colIdx < totalCols && typeof cellVal === 'number') {
        cell.numFmt = '0.00%';
      }

      cell.border = {
        top: BORDER_THIN,
        bottom: BORDER_THIN,
        left: colIdx === 1 ? BORDER_MEDIUM : BORDER_THIN,
        right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
      };
    });
  });

  const lastRow = 2 + indices.length;
  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(lastRow, c);
    const cur = cell.border || {};
    cell.border = { ...cur, bottom: BORDER_MEDIUM };
  }

  return ws;
}

/**
 * Builds the Combined Summary worksheet in Times New Roman
 */
export function buildCombinedSummaryWorksheet(workbook, funds = [], indices = [], reportDate = '', calculationDate = null) {
  const dateFormatted = formatTitleDate(calculationDate);
  const ws = workbook.addWorksheet('Combined Summary', {
    views: [{ showGridLines: true }]
  });

  const headers = [
    'Type',
    'Category',
    'Name',
    'AUM / Index Value',
    '1 Yr (%)',
    '2 Yr (%)',
    '3 Yr (%)',
    '5 Yr (%)',
    '10 Yr (%)',
    'Data Date'
  ];

  const totalCols = headers.length;
  ws.columns = [
    { width: 16 },
    { width: 22 },
    { width: 48 },
    { width: 20 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 }
  ];

  // Title Row
  ws.mergeCells(1, 1, 1, totalCols);
  const titleRow = ws.getRow(1);
  titleRow.height = 30;
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `Combined Portfolio Performance Summary (${dateFormatted})`;
  titleCell.font = { name: FONT_FAMILY, size: 16, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(1, c).border = {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: c === 1 ? BORDER_MEDIUM : undefined,
      right: c === totalCols ? BORDER_MEDIUM : undefined
    };
  }

  // Header Row
  const headerRow = ws.getRow(2);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = ws.getCell(2, colIdx);
    cell.value = h;
    cell.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: colIdx === 1 ? BORDER_MEDIUM : BORDER_THIN,
      right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
    };
  });

  let currentRow = 3;

  // Add Mutual Funds
  funds.forEach(fund => {
    const row = ws.getRow(currentRow);
    row.height = 20;
    const aum = parseAum(fund);
    const rowData = [
      'Mutual Fund',
      fund.category || 'N/A',
      fund.displayName || fund.schemeName || 'N/A',
      aum !== null ? aum : '-',
      parsePct(fund.return1Yr),
      parsePct(fund.return2Yr),
      parsePct(fund.return3Yr),
      parsePct(fund.return5Yr),
      parsePct(fund.return10Yr),
      fund.reportDate || reportDate || 'N/A'
    ];

    rowData.forEach((cellVal, cIdx) => {
      const colIdx = cIdx + 1;
      const cell = ws.getCell(currentRow, colIdx);
      cell.value = cellVal !== null ? cellVal : '-';
      cell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      cell.alignment = {
        horizontal: colIdx === 3 ? 'left' : 'center',
        vertical: 'middle'
      };

      if (colIdx === 4 && typeof cellVal === 'number') {
        cell.numFmt = '#,##0.00';
      } else if (colIdx >= 5 && colIdx <= 9 && typeof cellVal === 'number') {
        cell.numFmt = '0.00%';
      }

      cell.border = {
        top: BORDER_THIN,
        bottom: BORDER_THIN,
        left: colIdx === 1 ? BORDER_MEDIUM : BORDER_THIN,
        right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
      };
    });

    currentRow++;
  });

  // Add NSE Indices
  indices.forEach(idx => {
    const row = ws.getRow(currentRow);
    row.height = 20;
    const val = Number(idx.currentValue);
    const rowData = [
      'NSE Index',
      'NSE Index',
      idx.displayName || idx.id,
      !isNaN(val) && val > 0 ? val : '-',
      parsePct(idx.return1Yr),
      parsePct(idx.return2Yr),
      parsePct(idx.return3Yr),
      parsePct(idx.return5Yr),
      parsePct(idx.return10Yr),
      idx.dataDate || 'N/A'
    ];

    rowData.forEach((cellVal, cIdx) => {
      const colIdx = cIdx + 1;
      const cell = ws.getCell(currentRow, colIdx);
      cell.value = cellVal !== null ? cellVal : '-';
      cell.font = { name: FONT_FAMILY, size: 12, bold: false, color: { argb: 'FF000000' } };
      cell.alignment = {
        horizontal: colIdx === 3 ? 'left' : 'center',
        vertical: 'middle'
      };

      if (colIdx === 4 && typeof cellVal === 'number') {
        cell.numFmt = '#,##0.00';
      } else if (colIdx >= 5 && colIdx <= 9 && typeof cellVal === 'number') {
        cell.numFmt = '0.00%';
      }

      cell.border = {
        top: BORDER_THIN,
        bottom: BORDER_THIN,
        left: colIdx === 1 ? BORDER_MEDIUM : BORDER_THIN,
        right: colIdx === totalCols ? BORDER_MEDIUM : BORDER_THIN
      };
    });

    currentRow++;
  });

  const lastRow = currentRow - 1;
  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(lastRow, c);
    const cur = cell.border || {};
    cell.border = { ...cur, bottom: BORDER_MEDIUM };
  }

  return ws;
}

/**
 * EXPORT 1: Download Custom List (Exact Suggestion Sheet layout + optional NSE sheet)
 */
export const exportCustomListToExcel = async ({
  funds = [],
  nseIndices = [],
  plan = 'regular',
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  reportDate = '28-Sep-2026',
  calculationDate = null
}) => {
  const workbook = new ExcelJS.Workbook();
  const todayStr = calculationDate || new Date().toISOString().split('T')[0];

  // Sheet 1: Suggestion List (Reproduces Our Suggestion Sheet.xlsx exactly)
  if (funds && funds.length > 0) {
    buildSuggestionSheetWorksheet(workbook, {
      funds,
      nseIndices,
      plan,
      mode,
      customDaysList,
      calculationDate
    });
  }

  // Sheet 2: NSE Indices (if selected)
  if (nseIndices && nseIndices.length > 0) {
    buildNseWorksheet(workbook, nseIndices, calculationDate, mode, customDaysList);
  }

  if (workbook.worksheets.length === 0) return;

  const fileName = `FundPulse_Suggestion_Sheet_${plan}_${todayStr}.xlsx`;
  await downloadWorkbook(workbook, fileName);
};

/**
 * EXPORT 2: Download NSE List (Only selected NSE indices)
 */
export const exportNseListToExcel = async (
  indices = [],
  calculationDate = null,
  mode = 'yearly',
  customDaysList = [33, 50, 67]
) => {
  if (!indices || indices.length === 0) return;
  const todayStr = calculationDate || new Date().toISOString().split('T')[0];

  const workbook = new ExcelJS.Workbook();
  buildNseWorksheet(workbook, indices, calculationDate, mode, customDaysList);

  const fileName = `FundPulse_NSE_Indices_${todayStr}.xlsx`;
  await downloadWorkbook(workbook, fileName);
};

/**
 * EXPORT 3: Download Everything (Sheet 1: Suggestion List, Sheet 2: NSE, Sheet 3: Combined Summary)
 */
export const exportEverythingToExcel = async ({
  funds = [],
  nseIndices = [],
  plan = 'regular',
  mode = 'yearly',
  customDays = 33,
  customDaysList = [33, 50, 67],
  reportDate = '28-Sep-2026',
  calculationDate = null
}) => {
  const workbook = new ExcelJS.Workbook();
  const todayStr = calculationDate || new Date().toISOString().split('T')[0];

  // Sheet 1: Suggestion List
  buildSuggestionSheetWorksheet(workbook, {
    funds,
    nseIndices,
    plan,
    mode,
    customDaysList,
    calculationDate
  });

  // Sheet 2: NSE Indices
  if (nseIndices && nseIndices.length > 0) {
    buildNseWorksheet(workbook, nseIndices, calculationDate, mode, customDaysList);
  }

  // Sheet 3: Combined Summary
  buildCombinedSummaryWorksheet(workbook, funds, nseIndices, reportDate, calculationDate);

  const fileName = `FundPulse_Complete_Portfolio_${plan}_${todayStr}.xlsx`;
  await downloadWorkbook(workbook, fileName);
};
