/**
 * Client-Side SIP Return Engine (ES Module)
 * Allows lightning-fast instant recalculation when user changes SIP amount or dates
 */

export function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  
  const str = String(dateStr).trim();
  const parts = str.split('-');
  
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);

    let month = parseInt(monthStr, 10) - 1;
    if (isNaN(month)) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      month = months.indexOf(monthStr.toLowerCase());
      if (month === -1) month = 0;
    }
    return new Date(year, month, day);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function formatDate(dateObj) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

export function toIsoDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateXIRR(cashFlows, guess = 0.1) {
  if (!cashFlows || cashFlows.length < 2) return null;

  const hasPositive = cashFlows.some(c => c.amount > 0);
  const hasNegative = cashFlows.some(c => c.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const d0 = cashFlows[0].date.getTime();
  const cfs = cashFlows.map(cf => ({
    years: (cf.date.getTime() - d0) / (365 * 24 * 3600 * 1000),
    amount: cf.amount
  }));

  function npv(r) {
    if (r <= -1) return Infinity;
    let sum = 0;
    for (let i = 0; i < cfs.length; i++) {
      sum += cfs[i].amount / Math.pow(1 + r, cfs[i].years);
    }
    return sum;
  }

  function npvPrime(r) {
    if (r <= -1) return Infinity;
    let sum = 0;
    for (let i = 0; i < cfs.length; i++) {
      sum -= cfs[i].years * cfs[i].amount / Math.pow(1 + r, cfs[i].years + 1);
    }
    return sum;
  }

  let r = guess;
  for (let i = 0; i < 100; i++) {
    const val = npv(r);
    const deriv = npvPrime(r);
    if (Math.abs(deriv) < 1e-12) break;
    const nextR = r - val / deriv;
    if (Math.abs(nextR - r) < 1e-7) return nextR;
    r = nextR;
    if (r <= -0.999 || r > 20) break;
  }

  let low = -0.99;
  let high = 15.0;
  let npvLow = npv(low);
  let npvHigh = npv(high);

  if (npvLow * npvHigh > 0) {
    high = 50.0;
    npvHigh = npv(high);
    if (npvLow * npvHigh > 0) return null;
  }

  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2;
    const midVal = npv(mid);
    if (Math.abs(midVal) < 1e-6 || (high - low) / 2 < 1e-7) {
      return mid;
    }
    if (npvLow * midVal < 0) {
      high = mid;
      npvHigh = midVal;
    } else {
      low = mid;
      npvLow = midVal;
    }
  }

  return null;
}

export function findApplicableNav(navRecords, targetDate, maxAllowedDate) {
  if (!navRecords || navRecords.length === 0) return null;

  const targetTime = targetDate.getTime();
  const maxTime = maxAllowedDate ? maxAllowedDate.getTime() : Infinity;

  for (let i = 0; i < navRecords.length; i++) {
    const rec = navRecords[i];
    if (rec.dateObj.getFullYear() === targetDate.getFullYear() &&
        rec.dateObj.getMonth() === targetDate.getMonth() &&
        rec.dateObj.getDate() === targetDate.getDate()) {
      return {
        record: rec,
        nav: Number(rec.nav),
        navDate: rec.date,
        navDateObj: rec.dateObj,
        isExact: true
      };
    }
  }

  const maxDiffMs = 15 * 24 * 3600 * 1000; // max 15 days holiday/weekend shift

  let nextRecord = null;
  for (let i = navRecords.length - 1; i >= 0; i--) {
    const rec = navRecords[i];
    const t = rec.dateObj.getTime();
    if (t >= targetTime && t <= maxTime) {
      if (t - targetTime <= maxDiffMs) {
        nextRecord = rec;
      }
      break;
    }
  }

  if (nextRecord) {
    return {
      record: nextRecord,
      nav: Number(nextRecord.nav),
      navDate: nextRecord.date,
      navDateObj: nextRecord.dateObj,
      isExact: false,
      reason: 'Next available business day'
    };
  }

  for (let i = 0; i < navRecords.length; i++) {
    const rec = navRecords[i];
    const t = rec.dateObj.getTime();
    if (t <= targetTime) {
      if (targetTime - t <= maxDiffMs) {
        return {
          record: rec,
          nav: Number(rec.nav),
          navDate: rec.date,
          navDateObj: rec.dateObj,
          isExact: false,
          reason: 'Preceding business day'
        };
      }
      break;
    }
  }

  return null;
}

export function generateMonthlySipDates(calculationDate, years, preferredSipDay = null) {
  const totalMonths = years * 12;
  const dates = [];

  const calcYear = calculationDate.getFullYear();
  const calcMonth = calculationDate.getMonth();
  const calcDay = calculationDate.getDate();

  const sipDay = preferredSipDay ? Math.min(28, Math.max(1, preferredSipDay)) : Math.min(28, calcDay);

  for (let i = totalMonths; i >= 1; i--) {
    let monthOffset = calcMonth - i;
    let yearOffset = calcYear;
    while (monthOffset < 0) {
      monthOffset += 12;
      yearOffset -= 1;
    }

    const maxDaysInMonth = new Date(yearOffset, monthOffset + 1, 0).getDate();
    const day = Math.min(sipDay, maxDaysInMonth);

    const installmentDate = new Date(yearOffset, monthOffset, day);
    dates.push(installmentDate);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates;
}

export function calculateSipForPeriod(rawNavList, monthlySipAmount, calculationDate, years, preferredSipDay = null) {
  if (!rawNavList || rawNavList.length === 0) {
    return {
      years,
      hasSufficientData: false,
      error: 'No NAV data available'
    };
  }

  const navRecords = rawNavList
    .map(r => ({
      date: r.date,
      nav: Number(r.nav),
      dateObj: parseDate(r.date)
    }))
    .filter(r => !isNaN(r.nav) && r.nav > 0 && !isNaN(r.dateObj.getTime()))
    .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  if (navRecords.length === 0) {
    return {
      years,
      hasSufficientData: false,
      error: 'No valid NAV records'
    };
  }

  const latestNavObj = navRecords.find(r => r.dateObj.getTime() <= calculationDate.getTime());
  const maxValuationLagMs = 45 * 24 * 3600 * 1000;

  if (!latestNavObj || (calculationDate.getTime() - latestNavObj.dateObj.getTime()) > maxValuationLagMs) {
    return {
      years,
      hasSufficientData: false,
      insufficientReason: `No recent NAV available near calculation date (latest recorded NAV was ${navRecords[0]?.date || 'N/A'})`
    };
  }
  const currentNav = latestNavObj.nav;
  const valuationDate = latestNavObj.dateObj;

  const earliestNavObj = navRecords[navRecords.length - 1];
  const fundInceptionDate = earliestNavObj.dateObj;

  const requiredStartDate = new Date(calculationDate);
  requiredStartDate.setFullYear(requiredStartDate.getFullYear() - years);

  const leewayDays = 45;
  const leewayMs = leewayDays * 24 * 3600 * 1000;
  if (fundInceptionDate.getTime() > (requiredStartDate.getTime() + leewayMs)) {
    return {
      years,
      hasSufficientData: false,
      insufficientReason: `Fund history available since ${formatDate(fundInceptionDate)} (${years}Y requires data from ${formatDate(requiredStartDate)})`,
      fundInceptionDate: formatDate(fundInceptionDate),
      requiredStartDate: formatDate(requiredStartDate)
    };
  }

  const sipDates = generateMonthlySipDates(calculationDate, years, preferredSipDay);
  const installments = [];
  const cashFlows = [];

  let cumulativeUnits = 0;
  let cumulativeInvested = 0;

  for (let i = 0; i < sipDates.length; i++) {
    const scheduledDate = sipDates[i];
    const navMatch = findApplicableNav(navRecords, scheduledDate, calculationDate);

    if (!navMatch) {
      return {
        years,
        hasSufficientData: false,
        error: `Could not retrieve NAV for date ${formatDate(scheduledDate)}`
      };
    }

    const nav = navMatch.nav;
    const unitsPurchased = monthlySipAmount / nav;
    cumulativeUnits += unitsPurchased;
    cumulativeInvested += monthlySipAmount;

    installments.push({
      installmentNumber: i + 1,
      scheduledDate: formatDate(scheduledDate),
      scheduledDateIso: toIsoDate(scheduledDate),
      allotmentDate: formatDate(navMatch.navDateObj),
      allotmentDateIso: toIsoDate(navMatch.navDateObj),
      isAdjustedForHoliday: !navMatch.isExact,
      nav: nav,
      sipAmount: monthlySipAmount,
      unitsPurchased: unitsPurchased,
      cumulativeUnits: cumulativeUnits,
      cumulativeInvested: cumulativeInvested
    });

    cashFlows.push({
      date: navMatch.navDateObj,
      amount: -monthlySipAmount
    });
  }

  const finalPortfolioValue = cumulativeUnits * currentNav;
  const absoluteGain = finalPortfolioValue - cumulativeInvested;
  const absoluteReturnPct = (absoluteGain / cumulativeInvested) * 100;

  cashFlows.push({
    date: valuationDate,
    amount: finalPortfolioValue
  });

  const xirrRate = calculateXIRR(cashFlows);
  const sipXirrPct = xirrRate !== null ? Number((xirrRate * 100).toFixed(2)) : null;

  return {
    years,
    periodLabel: `${years} Year${years > 1 ? 's' : ''}`,
    hasSufficientData: true,
    monthlySipAmount,
    totalInvested: cumulativeInvested,
    totalUnits: cumulativeUnits,
    currentNav: currentNav,
    valuationDate: formatDate(valuationDate),
    valuationDateIso: toIsoDate(valuationDate),
    finalPortfolioValue: Number(finalPortfolioValue.toFixed(2)),
    absoluteGain: Number(absoluteGain.toFixed(2)),
    absoluteReturnPct: Number(absoluteReturnPct.toFixed(2)),
    sipXirr: sipXirrPct,
    installmentsCount: installments.length,
    installments,
    firstInstallmentDate: installments[0]?.scheduledDate,
    lastInstallmentDate: installments[installments.length - 1]?.scheduledDate
  };
}

export function calculateFullFundSip({
  fund,
  rawNavList,
  monthlySipAmount = 10000,
  calculationDate = null,
  preferredSipDay = 25,
  plan = 'regular'
}) {
  const calcDateObj = calculationDate ? parseDate(calculationDate) : new Date();
  const periods = [1, 2, 3, 5, 10];
  const periodResults = {};

  periods.forEach(yr => {
    periodResults[`${yr}Y`] = calculateSipForPeriod(
      rawNavList,
      monthlySipAmount,
      calcDateObj,
      yr,
      preferredSipDay
    );
  });

  const latest1Y = periodResults['1Y'];
  const currentNav = latest1Y?.hasSufficientData ? latest1Y.currentNav : null;
  const valuationDate = latest1Y?.hasSufficientData ? latest1Y.valuationDate : formatDate(calcDateObj);

  return {
    fundId: fund.id,
    displayName: fund.displayName,
    amfiSchemeName: fund.amfiSchemeName || fund.displayName,
    category: fund.category,
    amcName: fund.amcName,
    plan,
    monthlySipAmount,
    preferredSipDay,
    calculationDate: formatDate(calcDateObj),
    valuationDate,
    currentNav,
    returns: {
      return1Yr: periodResults['1Y']?.hasSufficientData ? periodResults['1Y'].sipXirr : null,
      return2Yr: periodResults['2Y']?.hasSufficientData ? periodResults['2Y'].sipXirr : null,
      return3Yr: periodResults['3Y']?.hasSufficientData ? periodResults['3Y'].sipXirr : null,
      return5Yr: periodResults['5Y']?.hasSufficientData ? periodResults['5Y'].sipXirr : null,
      return10Yr: periodResults['10Y']?.hasSufficientData ? periodResults['10Y'].sipXirr : null,
    },
    periods: periodResults
  };
}
