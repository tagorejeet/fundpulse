/**
 * High-performance, typo-tolerant fuzzy matching utility for Indian Mutual Fund search
 * Optimized for sub-millisecond execution over 10,000+ schemes.
 */

// Damerau-Levenshtein distance calculation
function damerauLevenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a || !b) return (a || '').length + (b || '').length;

  const al = a.length;
  const bl = b.length;

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

// Normalize string for indexing: lowercase, standardize common MF words, remove special characters
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

function tokenize(str) {
  return normalizeStr(str).split(' ').filter(Boolean);
}

/**
 * Pre-indexes a scheme object so search doesn't re-run regexes or string formatting
 */
function indexScheme(scheme) {
  if (scheme._searchIndexed) return scheme;

  const nameNorm = normalizeStr(scheme.displayName || scheme.amfiSchemeName || '');
  const amcNorm = normalizeStr(scheme.amcName || '');
  const catNorm = normalizeStr(scheme.category || '');
  const targetJoined = `${nameNorm} ${amcNorm} ${catNorm}`;
  const targetJoinedNoSpace = targetJoined.replace(/\s+/g, '');
  const targetTokens = targetJoined.split(' ').filter(Boolean);

  scheme._nameNorm = nameNorm;
  scheme._amcNorm = amcNorm;
  scheme._catNorm = catNorm;
  scheme._targetJoined = targetJoined;
  scheme._targetJoinedNoSpace = targetJoinedNoSpace;
  scheme._targetTokens = targetTokens;

  scheme._hasLargeAndMid = hasTerm(targetJoined, 'large and mid', 'large & mid', 'large mid') ||
                           catNorm.includes('large & mid') || catNorm.includes('large and mid');
  scheme._hasLargeCap = (hasTerm(targetJoined, 'large cap', 'largecap') || catNorm === 'large cap') && !scheme._hasLargeAndMid;
  scheme._hasMidCap = (hasTerm(targetJoined, 'mid cap', 'midcap') || catNorm === 'mid cap') && !scheme._hasLargeAndMid;
  scheme._hasMidSmall = hasTerm(targetJoined, 'mid and small', 'mid & small', 'mid small');

  scheme._searchIndexed = true;
  return scheme;
}

/**
 * Parses query into structured tokens once per search request
 */
function parseSearchQuery(query) {
  const rawQuery = (query || '').trim().toLowerCase();
  const normQ = normalizeStr(query);
  const qTokens = tokenize(query);
  const queryNoSpace = rawQuery.replace(/[^a-z0-9]/g, '');

  const qHasMidCap = hasTerm(normQ, 'mid cap', 'midcap');
  const qHasLarge = hasTerm(normQ, 'large', 'large cap', 'largecap');
  const qHasSmall = hasTerm(normQ, 'small', 'small cap', 'smallcap');
  const qHasLargeAndMid = hasTerm(normQ, 'large and mid', 'large & mid', 'large mid', 'large midcap');

  return {
    rawQuery,
    normQ,
    qTokens,
    queryNoSpace,
    qHasMidCap,
    qHasLarge,
    qHasSmall,
    qHasLargeAndMid
  };
}

/**
 * Checks if query token matches a candidate word either exactly, by prefix, or fuzzily
 */
function matchToken(qToken, targetTokens, targetJoined) {
  const qLen = qToken.length;

  // 1. Direct substring match in joined target (Blazing fast!)
  if (targetJoined.includes(qToken)) {
    return { matched: true, score: 100 };
  }

  let bestScore = 0;

  for (let i = 0; i < targetTokens.length; i++) {
    const tToken = targetTokens[i];
    if (tToken === qToken) {
      return { matched: true, score: 120 };
    }

    // Prefix match
    if (tToken.startsWith(qToken)) {
      const score = 90 - (tToken.length - qLen) * 2;
      bestScore = Math.max(bestScore, score);
      continue;
    }

    if (qToken.startsWith(tToken) && tToken.length >= 3) {
      bestScore = Math.max(bestScore, 80);
      continue;
    }

    // Fuzzy distance matching based on token length only when necessary
    if (qLen >= 3 && Math.abs(qLen - tToken.length) <= 2) {
      const maxDistance = qLen <= 4 ? 1 : qLen <= 7 ? 2 : 2;
      const dist = damerauLevenshteinDistance(qToken, tToken);
      if (dist <= maxDistance) {
        const score = 75 - dist * 20;
        bestScore = Math.max(bestScore, score);
      }
    }
  }

  if (bestScore > 0) {
    return { matched: true, score: bestScore };
  }

  return { matched: false, score: 0 };
}

/**
 * Score a pre-indexed mutual fund scheme against pre-parsed query
 */
function scoreSchemeMatch(scheme, parsedQuery) {
  const {
    rawQuery,
    normQ,
    qTokens,
    queryNoSpace,
    qHasMidCap,
    qHasLarge,
    qHasSmall,
    qHasLargeAndMid
  } = parsedQuery;

  if (qTokens.length === 0) return 100;

  if (!scheme._searchIndexed) {
    indexScheme(scheme);
  }

  const {
    _nameNorm,
    _targetJoined,
    _targetJoinedNoSpace,
    _targetTokens,
    _hasLargeAndMid,
    _hasLargeCap,
    _hasMidCap,
    _hasMidSmall
  } = scheme;

  // Market Cap Disambiguation rules
  if (qHasMidCap && !qHasLarge && !qHasLargeAndMid) {
    if (_hasLargeAndMid || _hasLargeCap) {
      return 0;
    }
  }

  if (qHasLarge && !qHasMidCap && !qHasLargeAndMid) {
    if (_hasLargeAndMid || _hasMidCap) {
      return 0;
    }
  }

  if (qHasSmall && !qHasMidCap) {
    if (_hasMidSmall) {
      return 0;
    }
  }

  // Exact phrase match in scheme name gets highest priority
  if (_nameNorm.includes(normQ)) {
    return 2000 + (100 - Math.min(99, normQ.length));
  }

  // Exact full phrase bonus in joined target
  if (_targetJoined.includes(rawQuery) || _targetJoined.includes(normQ)) {
    return 1500 + (100 - Math.min(99, rawQuery.length));
  }

  // Check continuous no-space match (e.g. "smallcap" vs "small cap")
  if (queryNoSpace.length >= 4 && _targetJoinedNoSpace.includes(queryNoSpace)) {
    return 800;
  }

  let totalScore = 0;
  let allTokensMatched = true;

  for (let i = 0; i < qTokens.length; i++) {
    const qToken = qTokens[i];
    const res = matchToken(qToken, _targetTokens, _targetJoined);
    if (!res.matched) {
      allTokensMatched = false;
      break;
    }
    totalScore += res.score;
  }

  if (!allTokensMatched) {
    return 0;
  }

  // Bonus for matching in scheme name
  if (_nameNorm.includes(qTokens[0])) {
    totalScore += 50;
  }

  return totalScore;
}

/**
 * Filter and rank schemes by fuzzy query with sub-millisecond indexing
 */
function fuzzyFilterSchemes(schemes, query) {
  if (!query || !query.trim()) return schemes;

  const parsedQuery = parseSearchQuery(query);
  if (parsedQuery.qTokens.length === 0) return schemes;

  const scored = [];
  const len = schemes.length;
  for (let i = 0; i < len; i++) {
    const s = schemes[i];
    const score = scoreSchemeMatch(s, parsedQuery);
    if (score > 0) {
      scored.push({ scheme: s, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored.map(item => item.scheme);
}

module.exports = {
  indexScheme,
  parseSearchQuery,
  scoreSchemeMatch,
  fuzzyFilterSchemes,
  damerauLevenshteinDistance,
  tokenize,
  normalizeStr
};
