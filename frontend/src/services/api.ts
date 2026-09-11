import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Health Insurance API Methods
export const api = {
  // Policies (from policy-service via gateway)
  getPolicies: async () => {
    const response = await apiClient.get('/policies');
    return response.data;
  },
  getPolicyByCode: async (code: string) => {
    const response = await apiClient.get(`/policies/${code}`);
    return response.data;
  },

  // Claims (from claim-service via gateway)
  getClaims: async (memberId?: string) => {
    const endpoint = memberId ? `/claims/member/${memberId}` : '/claims';
    const response = await apiClient.get(endpoint);
    return response.data;
  },
  submitClaim: async (claimData: {
    memberId: string;
    policyCode: string;
    patientName: string;
    providerHospital: string;
    treatmentDescription: string;
    claimedAmount: number;
    serviceDate: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/claims', claimData);
    return response.data;
  },
  updateClaimStatus: async (claimId: string | number, status: string, approvedAmount?: number, notes?: string) => {
    const response = await apiClient.patch(`/claims/${claimId}/status`, { status, approvedAmount, notes });
    return response.data;
  },

  // Members (from member-service via gateway)
  getMembers: async () => {
    const response = await apiClient.get('/members');
    return response.data;
  },
  getMember: async (memberId: string) => {
    const response = await apiClient.get(`/members/${memberId}`);
    return response.data;
  },
  updateMemberPolicy: async (memberId: string, policyCode: string) => {
    const response = await apiClient.put(`/members/${memberId}/policy`, { policyCode });
    return response.data;
  },

  // Auth (from auth-service via gateway)
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data?.token) {
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  register: async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await apiClient.post('/auth/register', userData);
    if (response.data?.token) {
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
  },
  getCurrentUser: () => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    // Default demo user
    return {
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'member',
      memberId: 'MEM-1001',
    };
  },

  // Gateway status
  getStatus: async () => {
    const response = await apiClient.get('/status');
    return response.data;
  }
};
