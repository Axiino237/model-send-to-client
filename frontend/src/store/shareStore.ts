import { create } from 'zustand';
import { apiFetch } from '../utils/api';

export interface PhotoDetails {
  id: string;
  modelId: string;
  fileUrl: string;
  name: string;
  size: number;
  downloadUrl: string;
}

export interface AttachmentDetails {
  id: string;
  modelId: string;
  fileUrl: string;
  name: string;
  size: number;
  downloadUrl: string;
}

export interface ModelFileDetails {
  id: string;
  modelId: string;
  fileUrl: string;
  name: string;
  size: number;
  downloadUrl: string;
}

export interface VideoDetails {
  id: string;
  modelId: string;
  fileUrl: string;
  name: string;
  size: number;
  downloadUrl: string;
}

export interface SharedModelDetails {
  id: string;
  modelId: string;
  shareToken: string;
  hasPassword: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  views: number;
  createdAt: string;
  model: {
    id: string;
    name: string;
    size: number | null;
    description: string | null;
    fileUrl?: string | null;
    createdAt: string;
    user: {
      name: string;
    };
    photos?: PhotoDetails[];
    attachments?: AttachmentDetails[];
    modelFiles?: ModelFileDetails[];
    videos?: VideoDetails[];
  };
}

interface ShareStore {
  activeShare: SharedModelDetails | null;
  unlockedFileUrl: string | null;
  unlockedDescription: string | null;
  unlockedPhotos: PhotoDetails[];
  unlockedAttachments: AttachmentDetails[];
  unlockedModelFiles: ModelFileDetails[];
  unlockedVideos: VideoDetails[];
  loading: boolean;
  error: string | null;
  
  fetchShareMeta: (token: string) => Promise<void>;
  unlockShare: (token: string, password?: string) => Promise<void>;
  logViewAnalytics: (shareId: string) => Promise<string | void>;
  updateAnalyticsMetrics: (analyticsId: string, timeSpentSeconds: number, interactions: number) => Promise<void>;
  createShareLink: (modelId: string, password?: string, expiresInDays?: number, maxViews?: number) => Promise<any>;
  deleteShareLink: (shareId: string) => Promise<void>;
  resetShareViews: (shareId: string) => Promise<void>;
  clear: () => void;
}

export const useShareStore = create<ShareStore>((set) => ({
  activeShare: null,
  unlockedFileUrl: null,
  unlockedDescription: null,
  unlockedPhotos: [],
  unlockedAttachments: [],
  unlockedModelFiles: [],
  unlockedVideos: [],
  loading: false,
  error: null,

  fetchShareMeta: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const activeShare = await apiFetch(`/shares/public/${token}`);
      set({ 
        activeShare, 
        unlockedDescription: activeShare.model?.description || null,
        unlockedPhotos: activeShare.model?.photos || [],
        unlockedAttachments: activeShare.model?.attachments || [],
        unlockedModelFiles: activeShare.model?.modelFiles || [],
        unlockedVideos: activeShare.model?.videos || [],
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Share link is invalid or expired', loading: false });
      throw err;
    }
  },

  unlockShare: async (token: string, password?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch(`/shares/public/${token}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      
      set({ 
        unlockedFileUrl: data.fileUrl, 
        unlockedDescription: data.description || null,
        unlockedPhotos: data.photos || [],
        unlockedAttachments: data.attachments || [],
        unlockedModelFiles: data.modelFiles || [],
        unlockedVideos: data.videos || [],
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to unlock share link', loading: false });
      throw err;
    }
  },

  logViewAnalytics: async (shareId: string) => {
    try {
      const osMatch = navigator.userAgent.match(/(Windows NT|Mac OS X|Linux|Android|iOS|iPhone|iPad)/);
      const os = osMatch ? osMatch[0] : 'Unknown';
      const screenSize = `${window.innerWidth}x${window.innerHeight}`;
      const referrer = document.referrer || null;

      const response = await apiFetch(`/analytics/log/${shareId}`, {
        method: 'POST',
        body: JSON.stringify({ os, screenSize, referrer })
      });
      return response.id;
    } catch (err) {
      console.error('Failed to log view analytics', err);
    }
  },

  updateAnalyticsMetrics: async (analyticsId: string, timeSpentSeconds: number, interactions: number) => {
    try {
      await apiFetch(`/analytics/log/${analyticsId}`, {
        method: 'PUT',
        body: JSON.stringify({ timeSpentSeconds, interactions })
      });
    } catch (err) {
      console.error('Failed to update analytics metrics', err);
    }
  },

  createShareLink: async (modelId: string, password?: string, expiresInDays?: number, maxViews?: number) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch(`/shares/${modelId}`, {
        method: 'POST',
        body: JSON.stringify({ password, expiresInDays, maxViews }),
      });
      set({ loading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create share link', loading: false });
      throw err;
    }
  },

  deleteShareLink: async (shareId: string) => {
    set({ loading: true, error: null });
    try {
      await apiFetch(`/shares/${shareId}`, {
        method: 'DELETE',
      });
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete share link', loading: false });
      throw err;
    }
  },

  resetShareViews: async (shareId: string) => {
    try {
      await apiFetch(`/shares/${shareId}/reset-views`, {
        method: 'POST',
      });
    } catch (err: any) {
      throw err;
    }
  },

  clear: () => set({ 
    activeShare: null, 
    unlockedFileUrl: null, 
    unlockedDescription: null,
    unlockedPhotos: [],
    unlockedAttachments: [],
    unlockedModelFiles: [],
    unlockedVideos: [],
    error: null 
  }),
}));

