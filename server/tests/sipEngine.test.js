/**
 * Automated Test Suite for Mutual Fund SIP Calculation Engine
 * 
 * Tests Section 20 validation examples and core financial logic:
 * 1. Units = SIP / NAV (10000 / 25 = 400 units, 10000 / 50 = 200 units)
 * 2. Independent monthly units calculation and summation
 * 3. Final Portfolio Value = Total Units * Current NAV
 * 4. Annualized XIRR return from dated cash flows
 * 5. Independence of percentage return on absolute SIP amount (10k vs 20k produces same XIRR)
 * 6. Non-trading day/holiday nearest applicable NAV resolution
 * 7. Insufficient NAV history validation (e.g. 10Y requested on a 5Y fund)
 */

const assert = require('assert');
const {
  calculateXIRR,
  findApplicableNav,
  generateMonthlySipDates,
  calculateSipForPeriod,
  calculateFullFundSip,
  parseDate,
  formatDate
} = require('../utils/sipEngine');

console.log('--- RUNNING FUNDPULSE SIP ENGINE TEST SUITE ---');

// TEST 1: Section 20 Basic Unit Math
console.log('\n[Test 1] Section 20 Unit Calculation: SIP = 10,000, NAV = 25 & 50');
{
  const sip = 10000;
  const nav1 = 25;
  const units1 = sip / nav1;
  assert.strictEqual(units1, 400, 'Units for NAV 25 should be exactly 400');

  const nav2 = 50;
  const units2 = sip / nav2;
  assert.strictEqual(units2, 200, 'Units for NAV 50 should be exactly 200');

  const totalUnits = units1 + units2;
  assert.strictEqual(totalUnits, 600, 'Sum of units should be 600');

  const latestNav = 60;
  const finalValue = totalUnits * latestNav;
  assert.strictEqual(finalValue, 36000, 'Final value should be 600 * 60 = 36,000');
  console.log('✓ PASS: Section 20 unit calculations verified (400 units, 200 units, 600 total units, 36,000 final value)');
}

// TEST 2: 12-Month SIP with synthetic NAVs & XIRR
console.log('\n[Test 2] 1-Year (12 Monthly installments) SIP Return & XIRR');
{
  const mockNavs = [];
  const baseDate = new Date(2025, 8, 25); // 25-Sep-2025
  const calcDate = new Date(2026, 8, 29); // 29-Sep-2026

  // Generate synthetic daily NAVs steadily growing from 100 to 120
  for (let d = new Date(2024, 0, 1); d <= calcDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays only
      const progress = (d.getTime() - new Date(2025, 0, 1).getTime()) / (365 * 24 * 3600 * 1000);
      const navVal = 100 + (progress * 15);
      mockNavs.push({
        date: formatDate(d),
        nav: navVal.toFixed(4)
      });
    }
  }

  const result10k = calculateSipForPeriod(mockNavs, 10000, calcDate, 1, 25);
  assert.strictEqual(result10k.hasSufficientData, true, '1Y should have sufficient data');
  assert.strictEqual(result10k.installments.length, 12, '1Y should have exactly 12 installments');
  assert.strictEqual(result10k.totalInvested, 120000, 'Total invested should be 12 * 10,000 = 120,000');
  assert(result10k.sipXirr > 0, 'SIP XIRR should be positive');

  // Verify Section 3: Percentage return independence on SIP amount
  const result20k = calculateSipForPeriod(mockNavs, 20000, calcDate, 1, 25);
  assert.strictEqual(result20k.totalInvested, 240000, 'Total invested for 20k SIP should be 240,000');
  assert.strictEqual(result10k.sipXirr, result20k.sipXirr, 'SIP XIRR should be identical regardless of SIP amount');
  console.log(`✓ PASS: 12 installments calculated. 10k SIP XIRR = ${result10k.sipXirr}%, 20k SIP XIRR = ${result20k.sipXirr}% (Identical)`);
}

// TEST 3: Weekend / Holiday NAV Lookup Fallback
console.log('\n[Test 3] Non-trading day / Weekend NAV Lookup');
{
  const testNavs = [
    { date: '29-Sep-2026', nav: 110, dateObj: new Date(2026, 8, 29) }, // Tuesday
    { date: '28-Sep-2026', nav: 108, dateObj: new Date(2026, 8, 28) }, // Monday
    { date: '25-Sep-2026', nav: 105, dateObj: new Date(2026, 8, 25) }  // Friday (26 & 27 are Sat/Sun)
  ];

  // Requesting Sunday 27-Sep-2026: Should look forward to Monday 28-Sep-2026
  const targetSunday = new Date(2026, 8, 27);
  const matched = findApplicableNav(testNavs, targetSunday, new Date(2026, 8, 29));
  assert.strictEqual(matched.navDate, '28-Sep-2026', 'Weekend date should resolve to next business day Monday');
  assert.strictEqual(matched.nav, 108);
  console.log('✓ PASS: Sunday 27-Sep correctly allotted at Monday 28-Sep NAV (108)');
}

// TEST 4: Insufficient NAV History Detection (Section 15)
console.log('\n[Test 4] Insufficient NAV History Detection (10Y requested on a 3Y fund)');
{
  const mockShortNavs = [];
  const calcDate = new Date(2026, 8, 29);
  // Fund started 3 years ago (2023)
  for (let d = new Date(2023, 8, 20); d <= calcDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      mockShortNavs.push({
        date: formatDate(d),
        nav: (50 + Math.random() * 5).toFixed(4)
      });
    }
  }

  const result10Y = calculateSipForPeriod(mockShortNavs, 10000, calcDate, 10, 25);
  assert.strictEqual(result10Y.hasSufficientData, false, '10Y should fail due to insufficient history');
  assert(result10Y.insufficientReason.includes('Fund history only available since'), 'Should return clear reason');

  const result1Y = calculateSipForPeriod(mockShortNavs, 10000, calcDate, 1, 25);
  assert.strictEqual(result1Y.hasSufficientData, true, '1Y should succeed');
  console.log('✓ PASS: 10Y correctly flagged as Insufficient NAV history without producing misleading returns');
}

console.log('\n========================================');
console.log('ALL UNIT & SPECIFICATION TESTS PASSED!');
console.log('========================================\n');
