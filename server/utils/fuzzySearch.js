/**
 * High-performance, typo-tolerant fuzzy matching utility for Indian Mutual Fund search
 * Tolerates:
 * 1. Spelling mistakes / typos (e.g., "parag parik" -> "Parag Parikh", "motilal oswall" -> "Motilal Oswal")
 * 2. Letter transpositions (e.g., "samll" -> "small")
 * 3. Omitted or repeated letters (e.g., "hdfcc" -> "hdfc", "nipon" -> "nippon")
 * 4. Word order variations (e.g., "small cap sbi" -> "SBI Small Cap")
 * 5. Compound words (e.g., "smallcap" vs "small cap", "flexicap" vs "flexi cap")
 */

// Damerau-Levenshtein distance calculation (allows insertions, deletions, substitutions, and transpositions)
function damerauLevenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a || !b) return (a || '').length + (b || '').length;

  const al = a.length;
  const bl = b.length;

  // Quick optimization: length diff exceeds max tolerance
  if (Math.abs(al - bl) > 3) return Math.abs(al - bl);

  const matrix = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[al][bl];
}

// Normalize string for indexing: lowercase, remove special characters
function normalizeStr(str) {
  return (str || '')
    .toLowerCase()
    .replace(/\bm\s+id\b/gi, 'mid')
    .replace(/\bl\s+arge\b/gi, 'large')
    .replace(/\bs\s+mall\b/gi, 'small')
    .replace(/\bf\s+lexi\b/gi, 'flexi')
    .replace(/\bm\s+ulti\b/gi, 'multi')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTerm(str, ...terms) {
  const norm = ' ' + normalizeStr(str) + ' ';
  return terms.some(t => {
    const tNorm = normalizeStr(t);
    return norm.includes(' ' + tNorm + ' ') || norm.includes(tNorm.replace(/\s+/g, ''));
  });
}

// Tokenize string into words
function tokenize(str) {
  return normalizeStr(str).split(' ').filter(Boolean);
}

/**
 * Checks if query token matches a candidate word either exactly, by prefix, or fuzzily
 */
function matchToken(qToken, targetTokens, targetJoined) {
  const qLen = qToken.length;

  // 1. Direct substring match in joined target
  if (targetJoined.includes(qToken)) {
    return { matched: true, score: 100, exact: true };
  }

  let bestScore = 0;

  for (const tToken of targetTokens) {
    if (tToken === qToken) {
      return { matched: true, score: 120, exact: true };
    }

    // Prefix match
    if (tToken.startsWith(qToken)) {
      const score = 90 - (tToken.length - qLen) * 2;
      bestScore = Math.max(bestScore, score);
      continue;
    }

    // Target word starts with query token or query starts with target
    if (qToken.startsWith(tToken) && tToken.length >= 3) {
      bestScore = Math.max(bestScore, 80);
      continue;
    }

    // Fuzzy distance matching based on token length
    if (qLen >= 3) {
      const maxDistance = qLen <= 4 ? 1 : qLen <= 7 ? 2 : 3;
      const dist = damerauLevenshteinDistance(qToken, tToken);
      if (dist <= maxDistance) {
        const score = 75 - dist * 20;
        bestScore = Math.max(bestScore, score);
      }
    }
  }

  if (bestScore > 0) {
    return { matched: true, score: bestScore, exact: false };
  }

  return { matched: false, score: 0, exact: false };
}

/**
 * Score a mutual fund scheme against a search query
 * @param {Object} scheme - Scheme object
 * @param {string} query - Raw search query
 * @returns {number} Score (> 0 if matched, 0 if no match)
 */
function scoreSchemeMatch(scheme, query) {
  if (!query || !query.trim()) return 100;

  const rawQuery = query.trim().toLowerCase();
  const normQ = normalizeStr(query);
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 100;

  const nameNorm = normalizeStr(scheme.displayName || scheme.amfiSchemeName || '');
  const amcNorm = normalizeStr(scheme.amcName || '');
  const catNorm = normalizeStr(scheme.category || '');
  const targetJoined = `${nameNorm} ${amcNorm} ${catNorm}`;
  const targetJoinedNoSpace = targetJoined.replace(/\s+/g, '');
  const targetTokens = tokenize(targetJoined);

  // Market Cap Disambiguation
  const qHasMidCap = hasTerm(normQ, 'mid cap', 'midcap');
  const qHasLarge = hasTerm(normQ, 'large', 'large cap', 'largecap');
  const qHasSmall = hasTerm(normQ, 'small', 'small cap', 'smallcap');
  const qHasLargeAndMid = hasTerm(normQ, 'large and mid', 'large & mid', 'large mid', 'large midcap');

  const targetHasLargeAndMid = hasTerm(targetJoined, 'large and mid', 'large & mid', 'large mid') ||
                               catNorm.includes('large & mid') || catNorm.includes('large and mid');
  const targetHasLargeCap = (hasTerm(targetJoined, 'large cap', 'largecap') || catNorm === 'large cap') && !targetHasLargeAndMid;
  const targetHasMidCap = (hasTerm(targetJoined, 'mid cap', 'midcap') || catNorm === 'mid cap') && !targetHasLargeAndMid;

  // RULE 1: If user specifically entered "mid cap" (without "large"), do NOT show "Large & Mid Cap" or "Large Cap"
  if (qHasMidCap && !qHasLarge && !qHasLargeAndMid) {
    if (targetHasLargeAndMid || targetHasLargeCap) {
      return 0;
    }
  }

  // RULE 2: If user specifically entered "large cap" (without "mid"), do NOT show "Large & Mid Cap" or "Mid Cap"
  if (qHasLarge && !qHasMidCap && !qHasLargeAndMid) {
    if (targetHasLargeAndMid || targetHasMidCap) {
      return 0;
    }
  }

  // RULE 3: If user specifically entered "small cap" (without "mid"), do NOT show "Mid & Small Cap"
  if (qHasSmall && !qHasMidCap) {
    if (hasTerm(targetJoined, 'mid and small', 'mid & small', 'mid small')) {
      return 0;
    }
  }

  // Exact phrase match in scheme name gets highest priority
  if (nameNorm.includes(normQ)) {
    return 2000 + (100 - normQ.length);
  }

  // Exact full phrase bonus in joined target
  if (nameNorm.includes(rawQuery) || targetJoined.includes(rawQuery) || targetJoined.includes(normQ)) {
    return 1500 + (100 - rawQuery.length);
  }

  // Check continuous no-space match (e.g. "smallcap" vs "small cap")
  const queryNoSpace = rawQuery.replace(/[^a-z0-9]/g, '');
  if (queryNoSpace.length >= 4 && targetJoinedNoSpace.includes(queryNoSpace)) {
    return 800;
  }

  let totalScore = 0;
  let allTokensMatched = true;

  for (const qToken of qTokens) {
    const res = matchToken(qToken, targetTokens, targetJoined);
    if (!res.matched) {
      allTokensMatched = false;
      break;
    }
    totalScore += res.score;
  }

  if (!allTokensMatched) {
    return 0;
  }

  // Bonus for matching in scheme name rather than just category
  if (nameNorm.includes(qTokens[0])) {
    totalScore += 50;
  }

  return totalScore;
}

/**
 * Filter and rank schemes by fuzzy query
 */
function fuzzyFilterSchemes(schemes, query) {
  if (!query || !query.trim()) return schemes;

  const scored = [];
  for (const s of schemes) {
    const score = scoreSchemeMatch(s, query);
    if (score > 0) {
      scored.push({ scheme: s, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored.map(item => item.scheme);
}

module.exports = {
  scoreSchemeMatch,
  fuzzyFilterSchemes,
  damerauLevenshteinDistance,
  tokenize,
  normalizeStr
};
