/**
 * Client API Service to interface with Express Backend
 */

const API_BASE = '/api';

export const fetchFunds = async (category = 'all', search = '') => {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (search && search.trim()) params.append('search', search.trim());

  const response = await fetch(`${API_BASE}/funds?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'AMFI data is temporarily unavailable.');
  }
  return response.json();
};

export const fetchFundById = async (id) => {
  const response = await fetch(`${API_BASE}/funds/${id}`);
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
