/**
 * MASTER CATEGORY & ALLOWLIST DEFINITIONS
 */

const CATEGORY_DISPLAY_ORDER = {
  'Large Cap': 1,
  'Mid Cap': 2,
  'Large & Mid Cap': 3,
  'Small Cap': 4,
  'Multi Cap': 5,
  'Value': 6,
  'Flexi Cap': 7,
  'Sectoral / Thematic': 8,
  'ELSS': 9,
  'Contra': 10,
  'Dividend Yield': 11,
  'Focused': 12,
  'Index Funds': 13,
  'Hybrid': 14,
  'Debt / Liquid': 15,
  'Other': 16
};

const MASTER_CATEGORIES = [
  { id: 'all', name: 'All Schemes', subCategoryId: 0 },
  { id: 'large-cap', name: 'Large Cap', subCategoryId: 1 },
  { id: 'mid-cap', name: 'Mid Cap', subCategoryId: 5 },
  { id: 'large-mid-cap', name: 'Large & Mid Cap', subCategoryId: 2 },
  { id: 'small-cap', name: 'Small Cap', subCategoryId: 6 },
  { id: 'multi-cap', name: 'Multi Cap', subCategoryId: 4 },
  { id: 'value', name: 'Value', subCategoryId: 7 },
  { id: 'flexi-cap', name: 'Flexi Cap', subCategoryId: 3 },
  { id: 'sectoral-thematic', name: 'Sectoral / Thematic', subCategoryId: 12 },
  { id: 'elss', name: 'ELSS', subCategoryId: 8 },
  { id: 'contra', name: 'Contra', subCategoryId: 7 },
  { id: 'dividend-yield', name: 'Dividend Yield', subCategoryId: 9 },
  { id: 'focused', name: 'Focused', subCategoryId: 10 },
  { id: 'index-funds', name: 'Index Funds', subCategoryId: 13 },
  { id: 'hybrid', name: 'Hybrid', subCategoryId: 14 },
  { id: 'debt-liquid', name: 'Debt / Liquid', subCategoryId: 15 }
];

const MASTER_ALLOWLIST = [
  // LARGE CAP (4)
  {
    id: 'nippon-india-large-cap-growth',
    displayName: 'Nippon India Large Cap Fund - Growth',
    amfiSchemeName: 'Nippon India Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'Nippon India Mutual Fund',
    regularSchemeCode: 106235,
    directSchemeCode: 118632,
    seedAUM: 31250.45,
    seedNavReg: 92.45,
    seedNavDir: 104.12,
    seedBenchmark: 'NIFTY 50 TRI',
    seedReturns: {
      regular: { nav: 92.45, r1: 25.4, r2: 12.8, r3: 18.6, r5: 17.1, r10: 15.2 },
      direct: { nav: 104.12, r1: 26.8, r2: 13.9, r3: 19.9, r5: 18.4, r10: 16.5 }
    }
  },
  {
    id: 'aditya-birla-large-cap-growth',
    displayName: 'Aditya Birla Sun Life Large Cap Fund - Growth',
    amfiSchemeName: 'Aditya Birla Sun Life Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'Aditya Birla Sun Life Mutual Fund',
    regularSchemeCode: 100033,
    directSchemeCode: 119436,
    seedAUM: 26840.12,
    seedNavReg: 412.30,
    seedNavDir: 445.60,
    seedBenchmark: 'NIFTY 50 TRI',
    seedReturns: {
      regular: { nav: 412.30, r1: 22.8, r2: 11.4, r3: 16.2, r5: 14.9, r10: 13.8 },
      direct: { nav: 445.60, r1: 24.1, r2: 12.5, r3: 17.4, r5: 16.1, r10: 14.9 }
    }
  },
  {
    id: 'icici-prudential-bluechip-growth',
    displayName: 'ICICI Prudential Bluechip Fund - Growth',
    amfiSchemeName: 'ICICI Prudential Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'ICICI Prudential Mutual Fund',
    regularSchemeCode: 100356,
    directSchemeCode: 120586,
    seedAUM: 54120.80,
    seedNavReg: 108.75,
    seedNavDir: 118.90,
    seedBenchmark: 'NIFTY 100 TRI',
    seedReturns: {
      regular: { nav: 108.75, r1: 26.1, r2: 13.5, r3: 19.4, r5: 18.2, r10: 15.9 },
      direct: { nav: 118.90, r1: 27.5, r2: 14.8, r3: 20.8, r5: 19.5, r10: 17.1 }
    }
  },
  {
    id: 'kotak-large-cap-growth',
    displayName: 'Kotak Large Cap Fund - Growth',
    amfiSchemeName: 'Kotak Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'Kotak Mahindra Mutual Fund',
    regularSchemeCode: 100858,
    directSchemeCode: 119803,
    seedAUM: 8750.30,
    seedNavReg: 524.10,
    seedNavDir: 568.40,
    seedBenchmark: 'NIFTY 100 TRI',
    seedReturns: {
      regular: { nav: 524.10, r1: 23.9, r2: 12.1, r3: 17.1, r5: 15.8, r10: 14.2 },
      direct: { nav: 568.40, r1: 25.2, r2: 13.2, r3: 18.3, r5: 17.0, r10: 15.3 }
    }
  },

  // MID CAP (4)
  {
    id: 'hdfc-mid-cap-growth',
    displayName: 'HDFC Mid Cap Fund - Growth',
    amfiSchemeName: 'HDFC Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'HDFC Mutual Fund',
    regularSchemeCode: 101762,
    directSchemeCode: 119066,
    seedAUM: 67890.50,
    seedNavReg: 185.60,
    seedNavDir: 205.40,
    seedBenchmark: 'NIFTY Midcap 150 TRI',
    seedReturns: {
      regular: { nav: 185.60, r1: 39.4, r2: 21.2, r3: 27.8, r5: 23.4, r10: 20.1 },
      direct: { nav: 205.40, r1: 41.2, r2: 22.8, r3: 29.3, r5: 24.8, r10: 21.5 }
    }
  },
  {
    id: 'edelweiss-mid-cap-growth',
    displayName: 'Edelweiss Mid Cap Fund - Growth',
    amfiSchemeName: 'Edelweiss Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'Edelweiss Mutual Fund',
    regularSchemeCode: 105748,
    directSchemeCode: 120358,
    seedAUM: 6420.75,
    seedNavReg: 98.20,
    seedNavDir: 109.10,
    seedBenchmark: 'NIFTY Midcap 150 TRI',
    seedReturns: {
      regular: { nav: 98.20, r1: 42.1, r2: 22.5, r3: 28.5, r5: 24.2, r10: 19.4 },
      direct: { nav: 109.10, r1: 43.8, r2: 23.9, r3: 30.1, r5: 25.7, r10: 20.8 }
    }
  },
  {
    id: 'nippon-india-growth-mid-cap-growth',
    displayName: 'Nippon India Growth Mid Cap Fund - Growth',
    amfiSchemeName: 'Nippon India Growth Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'Nippon India Mutual Fund',
    regularSchemeCode: 100377,
    directSchemeCode: 118678,
    seedAUM: 31450.90,
    seedNavReg: 345.80,
    seedNavDir: 382.40,
    seedBenchmark: 'NIFTY Midcap 150 TRI',
    seedReturns: {
      regular: { nav: 345.80, r1: 37.8, r2: 19.8, r3: 26.2, r5: 22.8, r10: 18.7 },
      direct: { nav: 382.40, r1: 39.5, r2: 21.4, r3: 27.8, r5: 24.2, r10: 20.0 }
    }
  },
  {
    id: 'whiteoak-capital-mid-cap-growth',
    displayName: 'WhiteOak Capital Mid Cap Fund - Growth',
    amfiSchemeName: 'WhiteOak Capital Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'WhiteOak Capital Mutual Fund',
    regularSchemeCode: 149868,
    directSchemeCode: 149869,
    seedAUM: 2980.40,
    seedNavReg: 22.40,
    seedNavDir: 23.90,
    seedBenchmark: 'NIFTY Midcap 150 TRI',
    seedReturns: {
      regular: { nav: 22.40, r1: 35.6, r2: 18.5, r3: 24.1, r5: 21.0, r10: 17.5 },
      direct: { nav: 23.90, r1: 37.2, r2: 19.9, r3: 25.6, r5: 22.4, r10: 18.8 }
    }
  },

  // LARGE & MID CAP (3)
  {
    id: 'icici-prudential-large-mid-cap-growth',
    displayName: 'ICICI Prudential Large & Mid Cap Fund - Growth',
    amfiSchemeName: 'ICICI Prudential Large & Mid Cap Fund',
    category: 'Large & Mid Cap',
    subCategoryId: 2,
    amcName: 'ICICI Prudential Mutual Fund',
    regularSchemeCode: 100371,
    directSchemeCode: 120593,
    seedAUM: 14250.60,
    seedNavReg: 86.50,
    seedNavDir: 94.20,
    seedBenchmark: 'NIFTY LargeMidcap 250 TRI',
    seedReturns: {
      regular: { nav: 86.50, r1: 32.4, r2: 17.2, r3: 23.8, r5: 20.6, r10: 17.2 },
      direct: { nav: 94.20, r1: 34.0, r2: 18.6, r3: 25.2, r5: 22.0, r10: 18.5 }
    }
  },
  {
    id: 'bandhan-large-mid-cap-growth',
    displayName: 'Bandhan Large & Mid Cap Fund - Growth',
    amfiSchemeName: 'Bandhan Large & Mid Cap Fund',
    category: 'Large & Mid Cap',
    subCategoryId: 2,
    amcName: 'Bandhan Mutual Fund',
    regularSchemeCode: 108596,
    directSchemeCode: 118419,
    seedAUM: 3420.80,
    seedNavReg: 45.10,
    seedNavDir: 49.30,
    seedBenchmark: 'NIFTY LargeMidcap 250 TRI',
    seedReturns: {
      regular: { nav: 45.10, r1: 30.1, r2: 15.8, r3: 21.9, r5: 18.9, r10: 16.1 },
      direct: { nav: 49.30, r1: 31.7, r2: 17.1, r3: 23.2, r5: 20.2, r10: 17.3 }
    }
  },
  {
    id: 'mirae-asset-large-midcap-growth',
    displayName: 'Mirae Asset Large & Midcap Fund - Growth',
    amfiSchemeName: 'Mirae Asset Large & Midcap Fund',
    category: 'Large & Mid Cap',
    subCategoryId: 2,
    amcName: 'Mirae Asset Mutual Fund',
    regularSchemeCode: 113177,
    directSchemeCode: 118989,
    seedAUM: 38900.20,
    seedNavReg: 142.80,
    seedNavDir: 156.40,
    seedBenchmark: 'NIFTY LargeMidcap 250 TRI',
    seedReturns: {
      regular: { nav: 142.80, r1: 28.5, r2: 14.9, r3: 20.4, r5: 18.2, r10: 17.8 },
      direct: { nav: 156.40, r1: 30.0, r2: 16.2, r3: 21.8, r5: 19.5, r10: 19.1 }
    }
  },

  // SMALL CAP (4)
  {
    id: 'bandhan-small-cap-growth',
    displayName: 'Bandhan Small Cap Fund - Growth',
    amfiSchemeName: 'Bandhan Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'Bandhan Mutual Fund',
    regularSchemeCode: 147986,
    directSchemeCode: 147987,
    seedAUM: 5890.30,
    seedNavReg: 42.80,
    seedNavDir: 46.50,
    seedBenchmark: 'NIFTY Smallcap 250 TRI',
    seedReturns: {
      regular: { nav: 42.80, r1: 45.2, r2: 24.1, r3: 31.4, r5: 26.2, r10: 21.8 },
      direct: { nav: 46.50, r1: 47.1, r2: 25.8, r3: 33.0, r5: 27.8, r10: 23.2 }
    }
  },
  {
    id: 'pgim-small-cap-growth',
    displayName: 'PGIM Small Cap Fund - Growth',
    amfiSchemeName: 'PGIM India Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'PGIM India Mutual Fund',
    regularSchemeCode: 148782,
    directSchemeCode: 148783,
    seedAUM: 2750.10,
    seedNavReg: 38.60,
    seedNavDir: 42.10,
    seedBenchmark: 'NIFTY Smallcap 250 TRI',
    seedReturns: {
      regular: { nav: 38.60, r1: 38.9, r2: 20.4, r3: 27.2, r5: 23.5, r10: 19.6 },
      direct: { nav: 42.10, r1: 40.6, r2: 21.9, r3: 28.8, r5: 25.0, r10: 21.0 }
    }
  },
  {
    id: 'nippon-india-small-cap-growth',
    displayName: 'Nippon India Small Cap Fund - Growth',
    amfiSchemeName: 'Nippon India Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'Nippon India Mutual Fund',
    regularSchemeCode: 113184,
    directSchemeCode: 118778,
    seedAUM: 56420.90,
    seedNavReg: 168.40,
    seedNavDir: 185.20,
    seedBenchmark: 'NIFTY Smallcap 250 TRI',
    seedReturns: {
      regular: { nav: 168.40, r1: 48.6, r2: 26.5, r3: 34.2, r5: 29.4, r10: 24.1 },
      direct: { nav: 185.20, r1: 50.4, r2: 28.1, r3: 35.8, r5: 31.0, r10: 25.6 }
    }
  },
  {
    id: 'sundaram-small-cap-growth',
    displayName: 'Sundaram Small Cap Fund - Growth',
    amfiSchemeName: 'Sundaram Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'Sundaram Mutual Fund',
    regularSchemeCode: 100985,
    directSchemeCode: 119284,
    seedAUM: 3210.40,
    seedNavReg: 248.10,
    seedNavDir: 272.50,
    seedBenchmark: 'NIFTY Smallcap 250 TRI',
    seedReturns: {
      regular: { nav: 248.10, r1: 41.5, r2: 22.1, r3: 29.0, r5: 24.8, r10: 20.5 },
      direct: { nav: 272.50, r1: 43.2, r2: 23.6, r3: 30.6, r5: 26.3, r10: 21.9 }
    }
  },

  // MULTI CAP (5)
  {
    id: 'nippon-india-multicap-growth',
    displayName: 'Nippon India Multicap Fund - Growth',
    amfiSchemeName: 'Nippon India Multicap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Nippon India Mutual Fund',
    regularSchemeCode: 100868,
    directSchemeCode: 118712,
    seedAUM: 33450.80,
    seedNavReg: 285.40,
    seedNavDir: 312.80,
    seedBenchmark: 'NIFTY 500 Multicap 50:25:25 TRI',
    seedReturns: {
      regular: { nav: 285.40, r1: 36.8, r2: 19.4, r3: 25.8, r5: 22.1, r10: 18.9 },
      direct: { nav: 312.80, r1: 38.5, r2: 21.0, r3: 27.4, r5: 23.6, r10: 20.2 }
    }
  },
  {
    id: 'kotak-multicap-regular-growth',
    displayName: 'Kotak Multicap Fund - Regular Plan - Growth',
    amfiSchemeName: 'Kotak Multi Cap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Kotak Mahindra Mutual Fund',
    regularSchemeCode: 149021,
    directSchemeCode: 149022,
    seedAUM: 11840.30,
    seedNavReg: 24.90,
    seedNavDir: 27.10,
    seedBenchmark: 'NIFTY 500 Multicap 50:25:25 TRI',
    seedReturns: {
      regular: { nav: 24.90, r1: 34.2, r2: 18.1, r3: 24.1, r5: 20.4, r10: 17.5 },
      direct: { nav: 27.10, r1: 35.8, r2: 19.5, r3: 25.6, r5: 21.8, r10: 18.8 }
    }
  },
  {
    id: 'whiteoak-capital-multi-cap-growth',
    displayName: 'WhiteOak Capital Multi Cap Fund - Growth',
    amfiSchemeName: 'WhiteOak Capital Multi Cap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'WhiteOak Capital Mutual Fund',
    regularSchemeCode: 150785,
    directSchemeCode: 150786,
    seedAUM: 1540.20,
    seedNavReg: 19.80,
    seedNavDir: 21.30,
    seedBenchmark: 'NIFTY 500 Multicap 50:25:25 TRI',
    seedReturns: {
      regular: { nav: 19.80, r1: 33.5, r2: 17.6, r3: 23.0, r5: 19.8, r10: 16.9 },
      direct: { nav: 21.30, r1: 35.1, r2: 18.9, r3: 24.4, r5: 21.1, r10: 18.1 }
    }
  },
  {
    id: 'axis-multicap-regular-growth',
    displayName: 'Axis Multicap Fund - Regular Plan - Growth',
    amfiSchemeName: 'Axis Multicap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Axis Mutual Fund',
    regularSchemeCode: 149458,
    directSchemeCode: 149459,
    seedAUM: 5890.60,
    seedNavReg: 21.40,
    seedNavDir: 23.20,
    seedBenchmark: 'NIFTY 500 Multicap 50:25:25 TRI',
    seedReturns: {
      regular: { nav: 21.40, r1: 31.8, r2: 16.5, r3: 22.4, r5: 19.1, r10: 16.3 },
      direct: { nav: 23.20, r1: 33.4, r2: 17.8, r3: 23.8, r5: 20.4, r10: 17.5 }
    }
  },
  {
    id: 'mahindra-manulife-multi-cap-regular-growth',
    displayName: 'Mahindra Manulife Multi Cap Fund - Regular Plan - Growth',
    amfiSchemeName: 'Mahindra Manulife Multi Cap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Mahindra Manulife Mutual Fund',
    regularSchemeCode: 141258,
    directSchemeCode: 141259,
    seedAUM: 4120.10,
    seedNavReg: 35.60,
    seedNavDir: 39.10,
    seedBenchmark: 'NIFTY 500 Multicap 50:25:25 TRI',
    seedReturns: {
      regular: { nav: 35.60, r1: 37.9, r2: 20.1, r3: 26.5, r5: 22.8, r10: 19.4 },
      direct: { nav: 39.10, r1: 39.6, r2: 21.6, r3: 28.1, r5: 24.3, r10: 20.8 }
    }
  },

  // VALUE (5)
  {
    id: 'bandhan-value-growth',
    displayName: 'Bandhan Value Fund - Growth',
    amfiSchemeName: 'Bandhan Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'Bandhan Mutual Fund',
    regularSchemeCode: 102458,
    directSchemeCode: 118854,
    seedAUM: 7240.50,
    seedNavReg: 215.30,
    seedNavDir: 236.40,
    seedBenchmark: 'NIFTY500 Value 50 TRI',
    seedReturns: {
      regular: { nav: 215.30, r1: 37.4, r2: 19.8, r3: 26.1, r5: 22.4, r10: 18.5 },
      direct: { nav: 236.40, r1: 39.0, r2: 21.2, r3: 27.6, r5: 23.8, r10: 19.8 }
    }
  },
  {
    id: 'templeton-india-value-growth',
    displayName: 'Templeton India Value Fund - Growth',
    amfiSchemeName: 'Templeton India Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'Franklin Templeton Mutual Fund',
    regularSchemeCode: 100528,
    directSchemeCode: 118432,
    seedAUM: 1890.80,
    seedNavReg: 685.20,
    seedNavDir: 748.10,
    seedBenchmark: 'NIFTY500 Value 50 TRI',
    seedReturns: {
      regular: { nav: 685.20, r1: 35.1, r2: 18.4, r3: 24.8, r5: 21.2, r10: 17.8 },
      direct: { nav: 748.10, r1: 36.7, r2: 19.8, r3: 26.2, r5: 22.6, r10: 19.0 }
    }
  },
  {
    id: 'hsbc-value-growth',
    displayName: 'HSBC Value Fund - Growth',
    amfiSchemeName: 'HSBC Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'HSBC Mutual Fund',
    regularSchemeCode: 104856,
    directSchemeCode: 120124,
    seedAUM: 12850.30,
    seedNavReg: 112.40,
    seedNavDir: 123.50,
    seedBenchmark: 'NIFTY500 Value 50 TRI',
    seedReturns: {
      regular: { nav: 112.40, r1: 38.6, r2: 20.5, r3: 27.2, r5: 23.1, r10: 19.1 },
      direct: { nav: 123.50, r1: 40.2, r2: 22.0, r3: 28.7, r5: 24.5, r10: 20.4 }
    }
  },
  {
    id: 'nippon-india-value-growth',
    displayName: 'Nippon India Value Fund - Growth',
    amfiSchemeName: 'Nippon India Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'Nippon India Mutual Fund',
    regularSchemeCode: 102868,
    directSchemeCode: 118742,
    seedAUM: 8120.60,
    seedNavReg: 194.80,
    seedNavDir: 213.90,
    seedBenchmark: 'NIFTY500 Value 50 TRI',
    seedReturns: {
      regular: { nav: 194.80, r1: 39.2, r2: 21.0, r3: 27.8, r5: 23.8, r10: 19.7 },
      direct: { nav: 213.90, r1: 40.8, r2: 22.4, r3: 29.4, r5: 25.3, r10: 21.0 }
    }
  },
  {
    id: 'icici-value-growth',
    displayName: 'ICICI Value Fund - Growth',
    amfiSchemeName: 'ICICI Prudential Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'ICICI Prudential Mutual Fund',
    regularSchemeCode: 100384,
    directSchemeCode: 120612,
    seedAUM: 48900.70,
    seedNavReg: 392.50,
    seedNavDir: 428.10,
    seedBenchmark: 'NIFTY500 Value 50 TRI',
    seedReturns: {
      regular: { nav: 392.50, r1: 36.0, r2: 19.1, r3: 25.4, r5: 21.9, r10: 18.2 },
      direct: { nav: 428.10, r1: 37.6, r2: 20.5, r3: 26.9, r5: 23.3, r10: 19.5 }
    }
  },

  // FLEXI CAP (5)
  {
    id: 'jm-flexi-cap-growth',
    displayName: 'JM Flexi Cap Fund - Growth',
    amfiSchemeName: 'JM Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'JM Financial Mutual Fund',
    regularSchemeCode: 100456,
    directSchemeCode: 120284,
    seedAUM: 4150.20,
    seedNavReg: 118.60,
    seedNavDir: 129.40,
    seedBenchmark: 'NIFTY 500 TRI',
    seedReturns: {
      regular: { nav: 118.60, r1: 44.5, r2: 24.2, r3: 30.8, r5: 25.2, r10: 20.4 },
      direct: { nav: 129.40, r1: 46.2, r2: 25.8, r3: 32.4, r5: 26.7, r10: 21.8 }
    }
  },
  {
    id: 'aditya-birla-flexi-cap-growth',
    displayName: 'Aditya Birla Sun Life Flexi Cap Fund - Growth',
    amfiSchemeName: 'Aditya Birla Sun Life Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'Aditya Birla Sun Life Mutual Fund',
    regularSchemeCode: 100085,
    directSchemeCode: 119458,
    seedAUM: 21890.60,
    seedNavReg: 1540.20,
    seedNavDir: 1685.00,
    seedBenchmark: 'NIFTY 500 TRI',
    seedReturns: {
      regular: { nav: 1540.20, r1: 28.1, r2: 14.5, r3: 19.8, r5: 17.5, r10: 15.6 },
      direct: { nav: 1685.00, r1: 29.6, r2: 15.8, r3: 21.1, r5: 18.8, r10: 16.8 }
    }
  },
  {
    id: 'edelweiss-flexi-cap-growth',
    displayName: 'Edelweiss Flexi Cap Fund - Growth',
    amfiSchemeName: 'Edelweiss Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'Edelweiss Mutual Fund',
    regularSchemeCode: 133856,
    directSchemeCode: 133857,
    seedAUM: 2410.50,
    seedNavReg: 42.10,
    seedNavDir: 46.20,
    seedBenchmark: 'NIFTY 500 TRI',
    seedReturns: {
      regular: { nav: 42.10, r1: 33.4, r2: 17.5, r3: 22.8, r5: 19.6, r10: 16.8 },
      direct: { nav: 46.20, r1: 35.0, r2: 18.9, r3: 24.2, r5: 20.9, r10: 18.0 }
    }
  },
  {
    id: 'hdfc-flexi-cap-growth',
    displayName: 'HDFC Flexi Cap Fund - Growth',
    amfiSchemeName: 'HDFC Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'HDFC Mutual Fund',
    regularSchemeCode: 100124,
    directSchemeCode: 118968,
    seedAUM: 62450.90,
    seedNavReg: 1785.40,
    seedNavDir: 1940.10,
    seedBenchmark: 'NIFTY 500 TRI',
    seedReturns: {
      regular: { nav: 1785.40, r1: 35.8, r2: 19.2, r3: 26.4, r5: 22.8, r10: 18.9 },
      direct: { nav: 1940.10, r1: 37.4, r2: 20.6, r3: 27.9, r5: 24.2, r10: 20.2 }
    }
  },
  {
    id: 'parag-parikh-flexi-cap-growth',
    displayName: 'Parag Parikh Flexi Cap Fund - Growth',
    amfiSchemeName: 'Parag Parikh Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'PPFAS Mutual Fund',
    regularSchemeCode: 122639,
    directSchemeCode: 122640,
    seedAUM: 74890.30,
    seedNavReg: 82.40,
    seedNavDir: 89.60,
    seedBenchmark: 'NIFTY 500 TRI',
    seedReturns: {
      regular: { nav: 82.40, r1: 32.1, r2: 16.8, r3: 22.6, r5: 22.1, r10: 19.8 },
      direct: { nav: 89.60, r1: 33.6, r2: 18.1, r3: 24.0, r5: 23.5, r10: 21.1 }
    }
  },

  // SECTORAL / THEMATIC (4)
  {
    id: 'nippon-india-consumption-growth',
    displayName: 'Nippon India Consumption Fund - Growth',
    amfiSchemeName: 'Nippon India Consumption Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Nippon India Mutual Fund',
    regularSchemeCode: 102486,
    directSchemeCode: 118758,
    seedAUM: 3890.40,
    seedNavReg: 168.20,
    seedNavDir: 184.10,
    seedBenchmark: 'NIFTY India Consumption TRI',
    seedReturns: {
      regular: { nav: 168.20, r1: 34.5, r2: 17.8, r3: 23.8, r5: 20.2, r10: 17.5 },
      direct: { nav: 184.10, r1: 36.1, r2: 19.1, r3: 25.2, r5: 21.6, r10: 18.8 }
    }
  },
  {
    id: 'sundaram-consumption-growth',
    displayName: 'Sundaram Consumption Fund - Growth',
    amfiSchemeName: 'Sundaram Consumption Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Sundaram Mutual Fund',
    regularSchemeCode: 101458,
    directSchemeCode: 119312,
    seedAUM: 1450.60,
    seedNavReg: 98.40,
    seedNavDir: 107.80,
    seedBenchmark: 'NIFTY India Consumption TRI',
    seedReturns: {
      regular: { nav: 98.40, r1: 32.8, r2: 16.9, r3: 22.4, r5: 19.1, r10: 16.4 },
      direct: { nav: 107.80, r1: 34.3, r2: 18.2, r3: 23.8, r5: 20.4, r10: 17.6 }
    }
  },
  {
    id: 'bajaj-finserv-consumption-growth',
    displayName: 'Bajaj Finserv Consumption Fund - Growth',
    amfiSchemeName: 'Bajaj Finserv Consumption Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Bajaj Finserv Mutual Fund',
    regularSchemeCode: 152458,
    directSchemeCode: 152459,
    seedAUM: 890.20,
    seedNavReg: 16.50,
    seedNavDir: 17.80,
    seedBenchmark: 'NIFTY India Consumption TRI',
    seedReturns: {
      regular: { nav: 16.50, r1: 33.1, r2: 17.2, r3: 22.8, r5: 19.5, r10: 16.8 },
      direct: { nav: 17.80, r1: 34.6, r2: 18.5, r3: 24.2, r5: 20.8, r10: 18.0 }
    }
  },
  {
    id: 'union-innovation-opportunity-growth',
    displayName: 'Union Innovation and Opportunity Fund - Growth',
    amfiSchemeName: 'Union Innovation & Opportunities Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Union Mutual Fund',
    regularSchemeCode: 151858,
    directSchemeCode: 151859,
    seedAUM: 1120.50,
    seedNavReg: 18.90,
    seedNavDir: 20.40,
    seedBenchmark: 'NIFTY 500 TRI',
    seedReturns: {
      regular: { nav: 18.90, r1: 36.2, r2: 18.9, r3: 24.5, r5: 20.8, r10: 17.9 },
      direct: { nav: 20.40, r1: 37.8, r2: 20.2, r3: 26.0, r5: 22.2, r10: 19.2 }
    }
  }
];

module.exports = {
  CATEGORY_DISPLAY_ORDER,
  MASTER_CATEGORIES,
  MASTER_ALLOWLIST
};
