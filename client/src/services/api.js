/**
 * Client API Service to interface with Express Backend
 */

const API_BASE = '/api';

export const fetchFunds = async ({ category = 'all', search = '', plan = 'regular', option = 'all', page = 1, limit = 50, days, customDays = '33,50,67', startDate, endDate, asOfDate, calculationDate } = {}) => {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (search && search.trim()) params.append('search', search.trim());
  if (plan) params.append('plan', plan);
  if (option && option !== 'all') params.append('option', option);
  if (page) params.append('page', String(page));
  if (limit) params.append('limit', String(limit));
  
  const rawDays = days || customDays;
  if (rawDays) {
    const formattedDays = Array.isArray(rawDays) ? rawDays.join(',') : String(rawDays);
    params.append('days', formattedDays);
    params.append('customDays', formattedDays);
  }
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const dateVal = asOfDate || calculationDate;
  if (dateVal) {
    params.append('asOfDate', dateVal);
    params.append('calculationDate', dateVal);
  }

  const response = await fetch(`${API_BASE}/funds?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'AMFI data is temporarily unavailable.');
  }
  return response.json();
};

export const fetchBatchFunds = async ({ ids = [], plan = 'regular', days, customDays = '33,50,67', startDate, endDate, asOfDate, calculationDate } = {}) => {
  if (!ids || ids.length === 0) {
    return { success: true, data: { funds: [], total: 0 } };
  }

  const rawDays = days || customDays;
  const formattedDays = Array.isArray(rawDays) ? rawDays.join(',') : String(rawDays);
  const dateVal = asOfDate || calculationDate;

  const response = await fetch(`${API_BASE}/funds/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ids,
      plan,
      days: formattedDays,
      customDays: formattedDays,
      startDate,
      endDate,
      asOfDate: dateVal,
      calculationDate: dateVal
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch custom fund list data.');
  }
  return response.json();
};

export const fetchFundById = async (id, plan = 'regular', days, customDays = '33,50,67', startDate, endDate, asOfDate, calculationDate) => {
  const params = new URLSearchParams();
  if (plan) params.append('plan', plan);
  const rawDays = days || customDays;
  if (rawDays) {
    const formattedDays = Array.isArray(rawDays) ? rawDays.join(',') : String(rawDays);
    params.append('days', formattedDays);
    params.append('customDays', formattedDays);
  }
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const dateVal = asOfDate || calculationDate;
  if (dateVal) {
    params.append('asOfDate', dateVal);
    params.append('calculationDate', dateVal);
  }

  const response = await fetch(`${API_BASE}/funds/${id}?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch fund details.');
  }
  return response.json();
};

export const fetchCategories = async () => {
  const response = await fetch(`${API_BASE}/categories`);
  if (!response.ok) {
    throw new Error('Failed to fetch categories.');
  }
  return response.json();
};

export const fetchHealth = async () => {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('Health check failed.');
  }
  return response.json();
};

export const triggerRefresh = async () => {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Manual refresh failed.');
  }
  return response.json();
};

export const calculateSipApi = async ({ ids = [], monthlySip = 10000, calculationDate = null, sipDay = 25, plan = 'regular' } = {}) => {
  const response = await fetch(`${API_BASE}/sip/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids, monthlySip, calculationDate, sipDay, plan })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to calculate SIP returns.');
  }
  return response.json();
};

export const fetchSipNavHistory = async (fundId, plan = 'regular') => {
  const response = await fetch(`${API_BASE}/sip/nav-history/${fundId}?plan=${plan}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to retrieve NAV history.');
  }
  return response.json();
};

// Official NSE Benchmark Indices API
export const fetchNSEIndices = async (date = null, { days = null, customDays = null, startDate = null, endDate = null } = {}) => {
  const params = new URLSearchParams();
  if (date) {
    params.append('date', date);
  }
  if (days) {
    params.append('days', Array.isArray(days) ? days.join(',') : String(days));
  }
  if (customDays) {
    params.append('customDays', customDays);
  }
  if (startDate) {
    params.append('startDate', startDate);
  }
  if (endDate) {
    params.append('endDate', endDate);
  }
  const queryStr = params.toString();
  const response = await fetch(`${API_BASE}/nse/indices${queryStr ? '?' + queryStr : ''}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Official NSE data is temporarily unavailable.');
  }
  return response.json();
};

export const fetchNSEIndexById = async (id, date = null) => {
  const params = new URLSearchParams();
  if (date) {
    params.append('date', date);
  }
  const response = await fetch(`${API_BASE}/nse/indices/${encodeURIComponent(id)}?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch official NSE index details.');
  }
  return response.json();
};

export const triggerNSERefresh = async () => {
  const response = await fetch(`${API_BASE}/nse/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to refresh official NSE data.');
  }
  return response.json();
};

