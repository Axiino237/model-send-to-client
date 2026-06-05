import { create } from 'zustand';
import { apiFetch } from '../utils/api';

export interface ShareConfig {
  id: string;
  shareToken: string;
  expiresAt: string | null;
  maxViews: number | null;
  views: number;
  passwordPlain?: string | null;
}

export interface Model {
  id: string;
  name: string;
  fileUrl: string | null;
  thumbnail: string | null;
  size: number | null;
  description: string | null;
  createdAt: string;
  downloadUrl: string | null;
  shares?: ShareConfig[];
  photos?: any[];
  attachments?: any[];
}

interface DashboardStats {
  totalModels: number;
  totalShares: number;
  totalViews: number;
  storageUsed: number;
}

interface ModelStore {
  models: Model[];
  stats: DashboardStats | null;
  dailyViews: { date: string; count: number }[];
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  loading: boolean;
  error: string | null;
  
  fetchModels: (search?: string) => Promise<void>;
  fetchDashboardData: () => Promise<void>;
  uploadModel: (
    file: File | null,
    name: string,
    description?: string,
    photos?: File[],
    attachments?: File[],
  ) => Promise<void>;
  renameModel: (id: string, name: string) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  models: [],
  stats: null,
  dailyViews: [],
  devices: [],
  browsers: [],
  loading: false,
  error: null,

  fetchModels: async (search?: string) => {
    set({ loading: true, error: null });
    try {
      const endpoint = search ? `/models?search=${encodeURIComponent(search)}` : '/models';
      const models = await apiFetch(endpoint);
      set({ models, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch models', loading: false });
    }
  },

  fetchDashboardData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch('/analytics/dashboard');
      set({
        stats: data.stats,
        dailyViews: data.dailyViews,
        devices: data.devices,
        browsers: data.browsers,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch dashboard stats', loading: false });
    }
  },

  uploadModel: async (
    file: File | null,
    name: string,
    description?: string,
    photos?: File[],
    attachments?: File[],
  ) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      if (photos && photos.length > 0) {
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
      }
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          formData.append('attachments', attachment);
        });
      }

      await apiFetch('/models/upload', {
        method: 'POST',
        body: formData,
      });

      await get().fetchModels();
      await get().fetchDashboardData();
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload model', loading: false });
      throw err;
    }
  },

  renameModel: async (id: string, name: string) => {
    set({ loading: true, error: null });
    try {
      await apiFetch(`/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      await get().fetchModels();
    } catch (err: any) {
      set({ error: err.message || 'Failed to rename model', loading: false });
      throw err;
    }
  },

  deleteModel: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiFetch(`/models/${id}`, {
        method: 'DELETE',
      });
      await get().fetchModels();
      await get().fetchDashboardData();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete model', loading: false });
      throw err;
    }
  },
}));
