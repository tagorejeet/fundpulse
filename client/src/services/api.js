/**
 * Client API Service to interface with Express Backend
 */

const API_BASE = '/api';

export const fetchFunds = async ({ category = 'all', search = '', plan = 'regular', page = 1, limit = 50, days, customDays = '33,50,67', startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (search && search.trim()) params.append('search', search.trim());
  if (plan) params.append('plan', plan);
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

  const response = await fetch(`${API_BASE}/funds?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'AMFI data is temporarily unavailable.');
  }
  return response.json();
};

export const fetchBatchFunds = async ({ ids = [], plan = 'regular', days, customDays = '33,50,67', startDate, endDate } = {}) => {
  if (!ids || ids.length === 0) {
    return { success: true, data: { funds: [], total: 0 } };
  }

  const rawDays = days || customDays;
  const formattedDays = Array.isArray(rawDays) ? rawDays.join(',') : String(rawDays);

  const response = await fetch(`${API_BASE}/funds/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids, plan, days: formattedDays, customDays: formattedDays, startDate, endDate })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch custom fund list data.');
  }
  return response.json();
};

export const fetchFundById = async (id, plan = 'regular', days, customDays = '33,50,67', startDate, endDate) => {
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
