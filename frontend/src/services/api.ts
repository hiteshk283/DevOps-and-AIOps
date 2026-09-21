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

// Comprehensive HealthShield API Suite
export const api = {
  // 1. Policies & Quotation
  getPolicies: async () => {
    const response = await apiClient.get('/policies');
    return response.data;
  },
  comparePolicies: async (codes: string[]) => {
    const response = await apiClient.get(`/policies/compare?codes=${codes.join(',')}`);
    return response.data;
  },
  calculateQuote: async (data: { policyCode: string; age: number; memberCount: number; hasPreExistingConditions: boolean }) => {
    const response = await apiClient.post('/policies/calculate-quote', data);
    return response.data;
  },
  submitProposal: async (proposalData: any) => {
    const response = await apiClient.post('/policies/proposals', proposalData);
    return response.data;
  },

  // 2. Cashless Hospital Network
  getHospitals: async (params?: { city?: string; specialty?: string; cashless?: boolean; emergency?: boolean; q?: string }) => {
    const response = await apiClient.get('/hospitals', { params });
    return response.data;
  },
  getHospitalById: async (id: number) => {
    const response = await apiClient.get(`/hospitals/${id}`);
    return response.data;
  },
  checkHospitalPreauth: async (data: any) => {
    const response = await apiClient.post('/hospitals/preauth-check', data);
    return response.data;
  },

  // 3. Claims (Cashless Pre-Auth & Reimbursements)
  getClaims: async (memberId?: string) => {
    const endpoint = memberId ? `/claims/member/${memberId}` : '/claims';
    const response = await apiClient.get(endpoint);
    return response.data;
  },
  submitCashlessPreAuth: async (preAuthData: any) => {
    const response = await apiClient.post('/claims/pre-auth', preAuthData);
    return response.data;
  },
  submitReimbursementClaim: async (claimData: any) => {
    const response = await apiClient.post('/claims/reimbursement', claimData);
    return response.data;
  },
  updateClaimDecision: async (claimId: string | number, decision: { status: string; approvedAmount?: number; notes?: string }) => {
    const response = await apiClient.patch(`/claims/${claimId}/decision`, decision);
    return response.data;
  },
  getClaimQueries: async (claimId: number) => {
    const response = await apiClient.get(`/claims/${claimId}/queries`);
    return response.data;
  },

  // 4. Billing & Payments (Idempotency & Section 80D)
  createBillingOrder: async (data: { userId: number; policyCode: string; amount: number; idempotencyKey: string }) => {
    const response = await apiClient.post('/billing/create-order', data);
    return response.data;
  },
  verifyPayment: async (data: { invoiceNumber: string; userId: number; amount: number; paymentMethod: string; idempotencyKey: string }) => {
    const response = await apiClient.post('/billing/verify', data);
    return response.data;
  },
  getUserInvoices: async (userId: number) => {
    const response = await apiClient.get(`/billing/invoices/user/${userId}`);
    return response.data;
  },
  getUserPayments: async (userId: number) => {
    const response = await apiClient.get(`/billing/payments/user/${userId}`);
    return response.data;
  },

  // 5. Document Vault & IRDAI Consent Management
  uploadDocument: async (docData: { userId: number; claimId?: number; documentType: string; fileName: string }) => {
    const response = await apiClient.post('/documents/upload', docData);
    return response.data;
  },
  getUserDocuments: async (userId: number) => {
    const response = await apiClient.get(`/documents/user/${userId}`);
    return response.data;
  },
  grantConsent: async (consentData: any) => {
    const response = await apiClient.post('/documents/consent', consentData);
    return response.data;
  },
  getUserConsents: async (userId: number) => {
    const response = await apiClient.get(`/documents/consent/user/${userId}`);
    return response.data;
  },
  withdrawConsent: async (consentId: number) => {
    const response = await apiClient.post(`/documents/consent/${consentId}/withdraw`);
    return response.data;
  },

  // 6. Support Desk (Jira Service Management & Splunk)
  createSupportTicket: async (ticketData: any) => {
    const response = await apiClient.post('/support/tickets', ticketData);
    return response.data;
  },
  getUserTickets: async (userId: number) => {
    const response = await apiClient.get(`/support/tickets/user/${userId}`);
    return response.data;
  },
  getAllTickets: async () => {
    const response = await apiClient.get('/support/tickets');
    return response.data;
  },
  getTicketMessages: async (ticketId: number) => {
    const response = await apiClient.get(`/support/tickets/${ticketId}/messages`);
    return response.data;
  },
  sendTicketMessage: async (ticketId: number, data: { senderRole: string; senderName: string; message: string }) => {
    const response = await apiClient.post(`/support/tickets/${ticketId}/messages`, data);
    return response.data;
  },

  // 7. Member & Policy Subscriptions
  getMember: async (memberId: string) => {
    const response = await apiClient.get(`/members/${memberId}`);
    return response.data;
  },

  // 8. Auth, OTP & KYC
  sendOtp: async (phoneOrEmail: string) => {
    const response = await apiClient.post('/auth/send-otp', { phoneOrEmail });
    return response.data;
  },
  verifyOtp: async (phoneOrEmail: string, otp: string) => {
    const response = await apiClient.post('/auth/verify-otp', { phoneOrEmail, otp });
    if (response.data?.token) {
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  getKyc: async (userId: number) => {
    const response = await apiClient.get(`/auth/kyc/${userId}`);
    return response.data;
  },
  submitKyc: async (data: any) => {
    const response = await apiClient.post('/auth/kyc', data);
    return response.data;
  },
  getDependents: async (userId: number) => {
    const response = await apiClient.get(`/auth/dependents/${userId}`);
    return response.data;
  },
  getNominees: async (userId: number) => {
    const response = await apiClient.get(`/auth/nominees/${userId}`);
    return response.data;
  },
  getBankAccount: async (userId: number) => {
    const response = await apiClient.get(`/auth/bank-account/${userId}`);
    return response.data;
  },

  // 9. System Telemetry & Gateway
  getStatus: async () => {
    const response = await apiClient.get('/status');
    return response.data;
  }
};
