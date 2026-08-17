import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

// L'application est servie sous un préfixe (« /app/ », cf. vite.config.ts) alors
// que l'API reste à la racine du domaine. Les redirections ci-dessous sortent du
// routeur React : elles doivent porter le préfixe elles-mêmes, sous peine
// d'envoyer l'utilisateur sur le site vitrine. BASE_URL se termine par « / ».
const LOGIN_PATH = `${import.meta.env.BASE_URL}login`;

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple redirections
let isRedirecting = false;

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Don't add token to auth endpoints (login, register, refresh)
    // Check both the URL path and the full URL to be safe
    const url = config.url || '';
    const fullUrl = config.baseURL ? `${config.baseURL}${url}` : url;
    const isAuthEndpoint = 
      url.includes('/auth/login') || 
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      fullUrl.includes('/auth/login') ||
      fullUrl.includes('/auth/register') ||
      fullUrl.includes('/auth/refresh');
    
    // Debug logging in development
    if (import.meta.env.DEV && isAuthEndpoint) {
      console.log('🔍 [API Interceptor] Auth endpoint detected:', {
        url,
        fullUrl,
        baseURL: config.baseURL,
        method: config.method,
        hasAuthHeader: !!config.headers.Authorization,
      });
    }
    
    // Explicitly remove Authorization header for auth endpoints
    if (isAuthEndpoint) {
      // Force remove Authorization header
      delete config.headers.Authorization;
      delete config.headers.authorization; // lowercase version
      
      if (import.meta.env.DEV) {
        console.log('✅ [API Interceptor] Removed Authorization header for auth endpoint');
        console.log('📤 [API Interceptor] Final headers:', {
          ...config.headers,
          Authorization: undefined,
        });
      }
    } else {
      // Only add token for non-auth endpoints
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Ensure no stale Authorization header exists
        delete config.headers.Authorization;
        delete config.headers.authorization;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for login endpoint - let the login page handle the error
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const isOnLoginPage = window.location.pathname === LOGIN_PATH;
    
    // Only handle 401 once to avoid redirect loops, and skip if it's a login request
    if (error.response?.status === 401 && !isRedirecting && !isLoginRequest && !isOnLoginPage) {
      isRedirecting = true;
      
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = LOGIN_PATH;
        isRedirecting = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: any) =>
    api.post('/auth/login', data),
  
  getProfile: () =>
    api.get('/auth/me'),
  
  logout: () =>
    api.post('/auth/logout'),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// Students API
export const studentsApi = {
  getAll: (params?: any) =>
    api.get('/students', { params }),
  
  getById: (id: string) =>
    api.get(`/students/${id}`),
  
  create: (data: any) =>
    api.post('/students', data),
  
  update: (id: string, data: any) =>
    api.put(`/students/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/students/${id}`),
};

// Classes API
export const classesApi = {
  getAll: () =>
    api.get('/classes'),
  
  getById: (id: string) =>
    api.get(`/classes/${id}`),
  
  create: (data: any) =>
    api.post('/classes', data),
  
  update: (id: string, data: any) =>
    api.put(`/classes/${id}`, data),
};

// Subjects API
export const subjectsApi = {
  getAll: () =>
    api.get('/subjects'),
  
  create: (data: any) =>
    api.post('/subjects', data),
  
  update: (id: string, data: any) =>
    api.put(`/subjects/${id}`, data),
};

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    api.get('/dashboard/stats'),
  
  getActivities: () =>
    api.get('/dashboard/activities'),
};

// Users API
export const usersApi = {
  getAll: (params?: any) =>
    api.get('/users', { params }),

  update: (id: string, data: any) =>
    api.put(`/users/${id}`, data),
};

// Payment types API (catalogue des types de versement)
export const paymentTypesApi = {
  getAll: (level: string) => api.get('/payment-types', { params: { level } }),
  create: (data: { name: string; level: string }) => api.post('/payment-types', data),
  update: (id: string, data: { name: string }) => api.put(`/payment-types/${id}`, data),
  delete: (id: string) => api.delete(`/payment-types/${id}`),
};

// School fee rates API (tarifs par niveau — partagés par toutes les classes du niveau)
export const schoolFeeRatesApi = {
  getAll: (level?: string) => api.get('/school-fee-rates', { params: level ? { level } : undefined }),
  getById: (id: string) => api.get(`/school-fee-rates/${id}`),
  create: (data: { level: string; isForStateAssigned?: boolean; details: Array<{ paymentTypeId: string; amount: number }> }) =>
    api.post('/school-fee-rates', data),
  update: (id: string, data: { details?: Array<{ paymentTypeId: string; amount: number }>; isForStateAssigned?: boolean }) =>
    api.patch(`/school-fee-rates/${id}`, data),
  delete: (id: string) => api.delete(`/school-fee-rates/${id}`),
};

// Conditions de paiement (gabarits réutilisables, inspirés de account.payment.term Odoo)
export const paymentConditionsApi = {
  getAll: () => api.get('/payment-conditions'),
  getById: (id: string) => api.get(`/payment-conditions/${id}`),
  create: (data: {
    name: string;
    description?: string;
    lines: Array<{ lineNumber: number; label: string; amount: number; dueDate: string }>;
  }) => api.post('/payment-conditions', data),
  update: (id: string, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    lines?: Array<{ lineNumber: number; label: string; amount: number; dueDate: string }>;
  }) => api.patch(`/payment-conditions/${id}`, data),
  assignClasses: (id: string, classIds: string[]) => api.put(`/payment-conditions/${id}/classes`, { classIds }),
  delete: (id: string) => api.delete(`/payment-conditions/${id}`),
};

// Custom payment plans API (échéanciers), incl. modèles réutilisables par niveau
export const customPaymentPlansApi = {
  getByStudentAndYear: (studentId: string, academicYearId: string) =>
    api.get(`/custom-payment-plans/student/${studentId}/academic-year/${academicYearId}`),
  getLevelTemplate: (level: string, academicYearId: string, isForStateAssigned = false) =>
    api.get('/custom-payment-plans/template/level', { params: { level, academicYearId, isForStateAssigned } }),
  saveLevelTemplate: (data: {
    level: string;
    academicYearId: string;
    isForStateAssigned?: boolean;
    name: string;
    description?: string;
    totalAmount: number;
    installments: Array<{ installmentNumber: number; dueDate: string; amount: number; notes?: string }>;
  }) => api.put('/custom-payment-plans/template/level', data),
};

// Student payments API (encaissements + reçus)
export const studentPaymentsApi = {
  getByStudent: (studentId: string, academicYearId?: string) =>
    api.get('/student-payments', { params: { studentId, academicYearId } }),
  getStatus: (studentId: string, academicYearId: string) =>
    api.get(`/student-payments/student/${studentId}/academic-year/${academicYearId}/status`),
  create: (data: {
    studentId: string;
    academicYearId: string;
    customPaymentPlanInstallmentId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'CASH' | 'CHEQUE' | 'VIREMENT' | 'MOBILE_MONEY' | 'CARTE';
    reference?: string;
    notes?: string;
  }) => api.post('/student-payments', data),
  recordAdvance: (data: {
    studentId: string;
    academicYearId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'CASH' | 'CHEQUE' | 'VIREMENT' | 'MOBILE_MONEY' | 'CARTE';
    reference?: string;
    notes?: string;
  }) => api.post('/student-payments/advance', data),
  receiptPdfUrl: (paymentId: string) => `${API_URL}/student-payments/${paymentId}/receipt-pdf`,
};

// Invoices API (factures)
export const invoicesApi = {
  getAll: (params?: { classId?: string; academicYearId?: string; status?: 'ISSUED' | 'CANCELLED' }) =>
    api.get('/invoices', { params }),
  getByStudentAndYear: (studentId: string, academicYearId: string) =>
    api.get(`/invoices/student/${studentId}/academic-year/${academicYearId}`),
  getById: (id: string) => api.get(`/invoices/${id}`),
  cancel: (id: string) => api.post(`/invoices/${id}/cancel`),
  pdfUrl: (id: string) => `${API_URL}/invoices/${id}/pdf`,
};

// Academic years API
export const academicYearsApi = {
  getAll: () => api.get('/academic-years'),
};

// Inscriptions API
export const inscriptionsApi = {
  getAll: (params?: { academicYearId?: string; classId?: string }) =>
    api.get('/inscriptions', { params }),
};

// Receipt PDF (fetched as blob to bypass browser auth)
export const receiptPdfBlob = (paymentId: string) =>
  api.get(`/student-payments/${paymentId}/receipt-pdf`, { responseType: 'blob' });
