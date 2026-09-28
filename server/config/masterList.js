/**
 * MASTER ALLOWLIST OF THE 34 AUTHORIZED MUTUAL FUNDS
 * 
 * Strict Requirement:
 * The application MUST ONLY display these 34 funds.
 * Never display or discover additional funds automatically from AMFI.
 */

const MASTER_CATEGORIES = [
  { id: 'large-cap', name: 'Large Cap', subCategoryId: 1 },
  { id: 'mid-cap', name: 'Mid Cap', subCategoryId: 5 },
  { id: 'large-mid-cap', name: 'Large & Mid Cap', subCategoryId: 2 },
  { id: 'small-cap', name: 'Small Cap', subCategoryId: 6 },
  { id: 'multi-cap', name: 'Multi Cap', subCategoryId: 4 },
  { id: 'value', name: 'Value', subCategoryId: 7 },
  { id: 'flexi-cap', name: 'Flexi Cap', subCategoryId: 3 },
  { id: 'sectoral-thematic', name: 'Sectoral / Thematic', subCategoryId: 12 }
];

const MASTER_ALLOWLIST = [
  // LARGE CAP (4)
  {
    id: 'nippon-india-large-cap-growth',
    displayName: 'Nippon India Large Cap Fund - Growth',
    amfiSchemeName: 'Nippon India Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'Nippon India Mutual Fund'
  },
  {
    id: 'aditya-birla-large-cap-growth',
    displayName: 'Aditya Birla Sun Life Large Cap Fund - Growth',
    amfiSchemeName: 'Aditya Birla Sun Life Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'Aditya Birla Sun Life Mutual Fund'
  },
  {
    id: 'icici-prudential-bluechip-growth',
    displayName: 'ICICI Prudential Bluechip Fund - Growth',
    amfiSchemeName: 'ICICI Prudential Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'ICICI Prudential Mutual Fund'
  },
  {
    id: 'kotak-large-cap-growth',
    displayName: 'Kotak Large Cap Fund - Growth',
    amfiSchemeName: 'Kotak Large Cap Fund',
    category: 'Large Cap',
    subCategoryId: 1,
    amcName: 'Kotak Mahindra Mutual Fund'
  },

  // MID CAP (4)
  {
    id: 'hdfc-mid-cap-growth',
    displayName: 'HDFC Mid Cap Fund - Growth',
    amfiSchemeName: 'HDFC Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'HDFC Mutual Fund'
  },
  {
    id: 'edelweiss-mid-cap-growth',
    displayName: 'Edelweiss Mid Cap Fund - Growth',
    amfiSchemeName: 'Edelweiss Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'Edelweiss Mutual Fund'
  },
  {
    id: 'nippon-india-growth-mid-cap-growth',
    displayName: 'Nippon India Growth Mid Cap Fund - Growth',
    amfiSchemeName: 'Nippon India Growth Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'Nippon India Mutual Fund'
  },
  {
    id: 'whiteoak-capital-mid-cap-growth',
    displayName: 'WhiteOak Capital Mid Cap Fund - Growth',
    amfiSchemeName: 'WhiteOak Capital Mid Cap Fund',
    category: 'Mid Cap',
    subCategoryId: 5,
    amcName: 'WhiteOak Capital Mutual Fund'
  },

  // LARGE & MID CAP (3)
  {
    id: 'icici-prudential-large-mid-cap-growth',
    displayName: 'ICICI Prudential Large & Mid Cap Fund - Growth',
    amfiSchemeName: 'ICICI Prudential Large & Mid Cap Fund',
    category: 'Large & Mid Cap',
    subCategoryId: 2,
    amcName: 'ICICI Prudential Mutual Fund'
  },
  {
    id: 'bandhan-large-mid-cap-growth',
    displayName: 'Bandhan Large & Mid Cap Fund - Growth',
    amfiSchemeName: 'Bandhan Large & Mid Cap Fund',
    category: 'Large & Mid Cap',
    subCategoryId: 2,
    amcName: 'Bandhan Mutual Fund'
  },
  {
    id: 'mirae-asset-large-midcap-growth',
    displayName: 'Mirae Asset Large & Midcap Fund - Growth',
    amfiSchemeName: 'Mirae Asset Large & Midcap Fund',
    category: 'Large & Mid Cap',
    subCategoryId: 2,
    amcName: 'Mirae Asset Mutual Fund'
  },

  // SMALL CAP (4)
  {
    id: 'bandhan-small-cap-growth',
    displayName: 'Bandhan Small Cap Fund - Growth',
    amfiSchemeName: 'Bandhan Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'Bandhan Mutual Fund'
  },
  {
    id: 'pgim-small-cap-growth',
    displayName: 'PGIM Small Cap Fund - Growth',
    amfiSchemeName: 'PGIM India Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'PGIM India Mutual Fund'
  },
  {
    id: 'nippon-india-small-cap-growth',
    displayName: 'Nippon India Small Cap Fund - Growth',
    amfiSchemeName: 'Nippon India Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'Nippon India Mutual Fund'
  },
  {
    id: 'sundaram-small-cap-growth',
    displayName: 'Sundaram Small Cap Fund - Growth',
    amfiSchemeName: 'Sundaram Small Cap Fund',
    category: 'Small Cap',
    subCategoryId: 6,
    amcName: 'Sundaram Mutual Fund'
  },

  // MULTI CAP (5)
  {
    id: 'nippon-india-multicap-growth',
    displayName: 'Nippon India Multicap Fund - Growth',
    amfiSchemeName: 'Nippon India Multicap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Nippon India Mutual Fund'
  },
  {
    id: 'kotak-multicap-regular-growth',
    displayName: 'Kotak Multicap Fund - Regular Plan - Growth',
    amfiSchemeName: 'Kotak Multi Cap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Kotak Mahindra Mutual Fund'
  },
  {
    id: 'whiteoak-capital-multi-cap-growth',
    displayName: 'WhiteOak Capital Multi Cap Fund - Growth',
    amfiSchemeName: 'WhiteOak Capital Multi Cap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'WhiteOak Capital Mutual Fund'
  },
  {
    id: 'axis-multicap-regular-growth',
    displayName: 'Axis Multicap Fund - Regular Plan - Growth',
    amfiSchemeName: 'Axis Multicap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Axis Mutual Fund'
  },
  {
    id: 'mahindra-manulife-multi-cap-regular-growth',
    displayName: 'Mahindra Manulife Multi Cap Fund - Regular Plan - Growth',
    amfiSchemeName: 'Mahindra Manulife Multi Cap Fund',
    category: 'Multi Cap',
    subCategoryId: 4,
    amcName: 'Mahindra Manulife Mutual Fund'
  },

  // VALUE (5)
  {
    id: 'bandhan-value-growth',
    displayName: 'Bandhan Value Fund - Growth',
    amfiSchemeName: 'Bandhan Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'Bandhan Mutual Fund'
  },
  {
    id: 'templeton-india-value-growth',
    displayName: 'Templeton India Value Fund - Growth',
    amfiSchemeName: 'Templeton India Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'Franklin Templeton Mutual Fund'
  },
  {
    id: 'hsbc-value-growth',
    displayName: 'HSBC Value Fund - Growth',
    amfiSchemeName: 'HSBC Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'HSBC Mutual Fund'
  },
  {
    id: 'nippon-india-value-growth',
    displayName: 'Nippon India Value Fund - Growth',
    amfiSchemeName: 'Nippon India Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'Nippon India Mutual Fund'
  },
  {
    id: 'icici-value-growth',
    displayName: 'ICICI Value Fund - Growth',
    amfiSchemeName: 'ICICI Prudential Value Fund',
    category: 'Value',
    subCategoryId: 7,
    amcName: 'ICICI Prudential Mutual Fund'
  },

  // FLEXI CAP (5)
  {
    id: 'jm-flexi-cap-growth',
    displayName: 'JM Flexi Cap Fund - Growth',
    amfiSchemeName: 'JM Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'JM Financial Mutual Fund'
  },
  {
    id: 'aditya-birla-flexi-cap-growth',
    displayName: 'Aditya Birla Sun Life Flexi Cap Fund - Growth',
    amfiSchemeName: 'Aditya Birla Sun Life Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'Aditya Birla Sun Life Mutual Fund'
  },
  {
    id: 'edelweiss-flexi-cap-growth',
    displayName: 'Edelweiss Flexi Cap Fund - Growth',
    amfiSchemeName: 'Edelweiss Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'Edelweiss Mutual Fund'
  },
  {
    id: 'hdfc-flexi-cap-growth',
    displayName: 'HDFC Flexi Cap Fund - Growth',
    amfiSchemeName: 'HDFC Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'HDFC Mutual Fund'
  },
  {
    id: 'parag-parikh-flexi-cap-growth',
    displayName: 'Parag Parikh Flexi Cap Fund - Growth',
    amfiSchemeName: 'Parag Parikh Flexi Cap Fund',
    category: 'Flexi Cap',
    subCategoryId: 3,
    amcName: 'PPFAS Mutual Fund'
  },

  // SECTORAL / THEMATIC (4)
  {
    id: 'nippon-india-consumption-growth',
    displayName: 'Nippon India Consumption Fund - Growth',
    amfiSchemeName: 'Nippon India Consumption Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Nippon India Mutual Fund'
  },
  {
    id: 'sundaram-consumption-growth',
    displayName: 'Sundaram Consumption Fund - Growth',
    amfiSchemeName: 'Sundaram Consumption Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Sundaram Mutual Fund'
  },
  {
    id: 'bajaj-finserv-consumption-growth',
    displayName: 'Bajaj Finserv Consumption Fund - Growth',
    amfiSchemeName: 'Bajaj Finserv Consumption Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Bajaj Finserv Mutual Fund'
  },
  {
    id: 'union-innovation-opportunity-growth',
    displayName: 'Union Innovation and Opportunity Fund - Growth',
    amfiSchemeName: 'Union Innovation & Opportunities Fund',
    category: 'Sectoral / Thematic',
    subCategoryId: 12,
    amcName: 'Union Mutual Fund'
  }
];

module.exports = {
  MASTER_CATEGORIES,
  MASTER_ALLOWLIST
};
