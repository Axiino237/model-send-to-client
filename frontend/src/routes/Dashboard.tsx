import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useModelStore } from '../store/modelStore';
import type { Model } from '../store/modelStore';
import { useShareStore } from '../store/shareStore';
import {
  LogOut, Plus, Search, Trash2, Edit2, Share2, Copy, Check,
  HardDrive, Link as LinkIcon, Eye, EyeOff, Box, RefreshCw, Layers, Lock, AlertTriangle
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const { user, logout, isAuthenticated, initialize } = useAuthStore();
  const {
    models, stats, dailyViews, devices, loading, error,
    fetchModels, fetchDashboardData, uploadModel, renameModel, deleteModel
  } = useModelStore();
  const { createShareLink, deleteShareLink, resetShareViews } = useShareStore();

  const navigate = useNavigate();

  // Search & Modals state
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPhotos, setUploadPhotos] = useState<File[]>([]);
  const [uploadAttachments, setUploadAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Share Modal State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpires, setShareExpires] = useState('');
  const [shareMaxViews, setShareMaxViews] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Rename state
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Custom Confirmation Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Manage Share Links Modal state
  const [isManageSharesOpen, setIsManageSharesOpen] = useState(false);
  const [sharesModel, setSharesModel] = useState<Model | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [shareId: string]: boolean }>({});

  // Notepad Editor state
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [editorWordCount, setEditorWordCount] = useState(0);
  const [editorCharCount, setEditorCharCount] = useState(0);
  const [editorFont, setEditorFont] = useState('sans');
  const [editorColor, setEditorColor] = useState('#e2e8f0');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const resetUploadForm = () => {
    setIsUploadOpen(false);
    setUploadFile(null);
    setUploadName('');
    setUploadDescription('');
    setUploadPhotos([]);
    setUploadAttachments([]);
    setEditorWordCount(0);
    setEditorCharCount(0);
    setEditorFont('sans');
    setEditorColor('#e2e8f0');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchModels();
      fetchDashboardData();
    }
  }, [isAuthenticated, navigate, fetchModels, fetchDashboardData]);

  // Handle Search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchModels(e.target.value);
  };

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadDescription.trim()) {
      setUploadError('3D Model File and Showcase Description are both required.');
      return;
    }
    setUploadProgress(true);
    setUploadError('');

    try {
      await uploadModel(
        uploadFile,
        uploadName,
        uploadDescription,
        uploadPhotos,
        uploadAttachments,
      );
      resetUploadForm();
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploadProgress(false);
    }
  };

  // Share handler
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    try {
      const data = await createShareLink(
        selectedModel.id,
        sharePassword || undefined,
        shareExpires ? parseInt(shareExpires) : undefined,
        shareMaxViews ? parseInt(shareMaxViews) : undefined
      );

      const fullShareUrl = `${window.location.origin}/share/${data.shareToken}`;
      setGeneratedLink(fullShareUrl);

      // Refresh models to show share links
      fetchModels(search);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Share Link
  const handleDeleteShare = (shareId: string, modelId: string) => {
    setConfirmTitle('Disable Share Link?');
    setConfirmMessage('Are you sure you want to disable this share link? Clients will no longer be able to access the model using this link.');
    setConfirmAction(() => async () => {
      await deleteShareLink(shareId);
      await fetchModels(search);
      await fetchDashboardData();

      // Update the active shares modal list if open
      setSharesModel((prev) => {
        if (!prev) return null;
        const freshModels = useModelStore.getState().models;
        const updated = freshModels.find((m) => m.id === modelId);
        return updated || null;
      });
    });
    setIsConfirmOpen(true);
  };

  // Reset Share Views
  const handleResetViews = (shareId: string, modelId: string) => {
    setConfirmTitle('Reset View Counter?');
    setConfirmMessage('This will reset the view count to 0, allowing new views up to the maximum again.');
    setConfirmAction(() => async () => {
      await resetShareViews(shareId);
      await fetchModels(search);
      await fetchDashboardData();
      setSharesModel((prev) => {
        if (!prev) return null;
        const freshModels = useModelStore.getState().models;
        const updated = freshModels.find((m) => m.id === modelId);
        return updated || null;
      });
    });
    setIsConfirmOpen(true);
  };

  // Delete Model Link
  const handleDeleteModel = (model: Model) => {
    setConfirmTitle('Delete Model?');
    setConfirmMessage(`Are you sure you want to delete "${model.name}"? All photos, attachments, and active share links associated with this model will be permanently deleted. This action cannot be undone.`);
    setConfirmAction(() => async () => {
      await deleteModel(model.id);
    });
    setIsConfirmOpen(true);
  };

  // Confirmation action runner
  const handleConfirmAction = async () => {
    if (confirmAction) {
      try {
        await confirmAction();
      } catch (err) {
        console.error(err);
      } finally {
        setIsConfirmOpen(false);
        setConfirmAction(null);
      }
    }
  };

  // Rich Text Editor Helpers
  const execEditorCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setUploadDescription(editorRef.current.innerHTML);
      handleEditorInput();
    }
  };

  const handleFontChange = (font: string) => {
    setEditorFont(font);
    let fontName = 'Inter, sans-serif';
    if (font === 'outfit') fontName = 'Outfit, sans-serif';
    else if (font === 'playfair') fontName = 'Playfair Display, serif';
    else if (font === 'fira') fontName = 'Fira Code, monospace';
    execEditorCommand('fontName', fontName);
  };

  const handleFormatChange = (format: string) => {
    let tag = '<p>';
    if (format === 'h1') tag = '<h1>';
    else if (format === 'h2') tag = '<h2>';
    else if (format === 'h3') tag = '<h3>';
    execEditorCommand('formatBlock', tag);
  };

  const handleColorChange = (color: string) => {
    setEditorColor(color);
    execEditorCommand('foreColor', color);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const charCount = text.length;
      const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      setEditorCharCount(charCount);
      setEditorWordCount(wordCount);
      setUploadDescription(editorRef.current.innerHTML);
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Format File Size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Chart config
  const lineChartData = {
    labels: dailyViews.map(d => d.date),
    datasets: [
      {
        label: 'Model Views',
        data: dailyViews.map(d => d.count),
        fill: true,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366f1',
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 21, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 }
      }
    }
  };

  const doughnutData = (data: { name: string, count: number }[]) => ({
    labels: data.map(d => d.name),
    datasets: [
      {
        data: data.map(d => d.count),
        backgroundColor: ['#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f59e0b'],
        borderWidth: 1,
        borderColor: 'rgba(15, 15, 21, 0.8)',
      }
    ]
  });

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#cbd5e1',
          font: { size: 10 },
          boxWidth: 8,
          padding: 10
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-fade-in transition-all duration-300 ${toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/30 text-red-300'
              : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
            }`}
        >
          {toast.type === 'error' ? (
            <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 text-slate-500 hover:text-white cursor-pointer">✕</button>
        </div>
      )}
      {/* Background radial overlays */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="glass-panel border-b border-white/5 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">Insight3D</h1>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">{user?.role} Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{user?.name}</div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="p-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all duration-200 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8 z-10">

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Models */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Box className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats?.totalModels ?? 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Models</div>
            </div>
          </div>

          {/* Card 2: Storage Used */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{formatBytes(stats?.storageUsed ?? 0)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Storage Used</div>
            </div>
          </div>

          {/* Card 3: Total Shares */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats?.totalShares ?? 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Shares</div>
            </div>
          </div>

          {/* Card 4: Total Views */}
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats?.totalViews ?? 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Views</div>
            </div>
          </div>
        </section>

        {/* Charts & Analytics section */}
        {stats && stats.totalViews > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Views Line Chart */}
            <div className="glass-panel p-5 rounded-3xl border border-white/5 md:col-span-2 h-[260px] flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">View Analytics (Last 7 Days)</h3>
              <div className="flex-1 relative min-h-0">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            {/* Browser/Device Breakdown */}
            <div className="glass-panel p-5 rounded-3xl border border-white/5 h-[260px] flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Device Breakdown</h3>
              <div className="flex-1 relative min-h-0">
                {devices.length > 0 ? (
                  <Doughnut data={doughnutData(devices)} options={doughnutOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">No device logs available</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Model Management Section */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">My 3D Models</h2>
              <p className="text-xs text-slate-400 mt-0.5">Upload and manage secure client viewing links</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative border-glow-blue">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search models..."
                  className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full sm:w-64"
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/10 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Models Table/List */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            {loading && models.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-xs text-slate-400">Loading models...</div>
              </div>
            ) : models.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                  <Box className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-300">No models found</h3>
                  <p className="text-xs text-slate-500 mt-1">Upload your first 3D model (.glb, .gltf, .fbx, .obj) to get started.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">Model Info</th>
                      <th className="py-4 px-6">File Size</th>
                      <th className="py-4 px-6">Created At</th>
                      <th className="py-4 px-6">Active Share Links</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {models.map((model) => (
                      <tr key={model.id} className="hover:bg-white/1 flex-row">
                        {/* Name Info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                              {model.fileUrl ? <Box className="w-4.5 h-4.5" /> : <Layers className="w-4.5 h-4.5 text-indigo-400" />}
                            </div>
                            <div>
                              {editingModelId === model.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="glass-input px-2 py-1 text-sm rounded-md w-40"
                                  />
                                  <button
                                    onClick={async () => {
                                      await renameModel(model.id, editName);
                                      setEditingModelId(null);
                                    }}
                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 px-2 cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingModelId(null)}
                                    className="text-xs text-slate-500 hover:text-slate-400 px-1 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">{model.name}</span>
                                  <button
                                    onClick={() => {
                                      setEditingModelId(model.id);
                                      setEditName(model.name);
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                {model.fileUrl ? (
                                  <span className="text-[10px] text-slate-500 font-mono bg-white/2 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[200px]" title={model.fileUrl}>
                                    {model.fileUrl.split('/').pop()}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    No 3D Model
                                  </span>
                                )}
                                {model.photos && model.photos.length > 0 && (
                                  <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    {model.photos.length} Photos
                                  </span>
                                )}
                                {model.attachments && model.attachments.length > 0 && (
                                  <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    {model.attachments.length} Files
                                  </span>
                                )}
                                {model.description && (
                                  <span className="text-[9px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded font-medium italic truncate max-w-[120px]" title={model.description.replace(/<[^>]*>/g, '')}>
                                    {model.description.replace(/<[^>]*>/g, '')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Size */}
                        <td className="py-4 px-6 text-xs text-slate-300 font-medium">
                          {model.size ? formatBytes(model.size) : <span className="text-slate-600 italic">No 3D file</span>}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {new Date(model.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* Share links details */}
                        <td className="py-4 px-6">
                          {model.shares && model.shares.length > 0 ? (
                            <button
                              onClick={() => {
                                setSharesModel(model);
                                setVisiblePasswords({});
                                setIsManageSharesOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                              title="Manage active share links"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{model.shares.length} Link{model.shares.length > 1 ? 's' : ''}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unshared</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedModel(model);
                                setSharePassword('');
                                setShareExpires('');
                                setShareMaxViews('');
                                setGeneratedLink('');
                                setIsShareOpen(true);
                              }}
                              className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </button>
                            <button
                              onClick={() => handleDeleteModel(model)}
                              className="p-2 text-slate-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/10 hover:bg-red-500/5 cursor-pointer transition-all"
                              title="Delete model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* MODAL 1: Upload Model (Full-screen Notepad Workspace) */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col md:flex-row fade-in overflow-hidden">
          {/* Left Sidebar: Metadata & Inputs */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 bg-slate-900/40 p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-white">Create Showcase</h3>
                <p className="text-xs text-slate-400 mt-1">Provide project details and upload assets</p>
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              <div className="space-y-4">
                {/* Showcase Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Showcase Name (Required)
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Exhibition Stall Design"
                    className="glass-input px-4 py-2.5 block w-full rounded-xl text-xs"
                  />
                </div>

                {/* 3D Model File */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    3D Model File (.glb, .gltf- Required)
                  </label>
                  <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-4 hover:border-blue-500/50 transition-colors bg-white/2 cursor-pointer relative">
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (ext !== 'glb' && ext !== 'gltf') {
                            showToast('Invalid file format! Only .glb and .gltf files are supported.', 'error');
                            e.target.value = '';
                            setUploadFile(null);
                            return;
                          }
                        }
                        setUploadFile(file);
                        if (file && !uploadName) {
                          setUploadName(file.name.substring(0, file.name.lastIndexOf('.')));
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Box className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-300 font-semibold text-center truncate max-w-full">
                      {uploadFile ? uploadFile.name : 'Select 3D model'}
                    </span>
                    {uploadFile && (
                      <span className="text-[9px] text-slate-500 mt-0.5">{formatBytes(uploadFile.size)}</span>
                    )}
                  </div>
                </div>

                {/* Renders / Photos */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Renders &amp; Photos
                  </label>
                  <div
                    className="relative border border-dashed border-white/10 rounded-xl p-3 hover:border-blue-500/40 transition-colors bg-white/2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const allowed = ['png', 'jpg', 'jpeg'];
                      const dropped = Array.from(e.dataTransfer.files);
                      const invalid = dropped.filter(f => {
                        const ext = f.name.split('.').pop()?.toLowerCase();
                        return !allowed.includes(ext || '');
                      });
                      if (invalid.length > 0) {
                        showToast(`Invalid file(s): ${invalid.map(f => f.name).join(', ')}. Only PNG and JPG allowed.`, 'error');
                        return;
                      }
                      setUploadPhotos(prev => [...prev, ...dropped]);
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      onChange={(e) => {
                        const allowed = ['png', 'jpg', 'jpeg'];
                        const newFiles = Array.from(e.target.files || []);
                        const invalid = newFiles.filter(f => {
                          const ext = f.name.split('.').pop()?.toLowerCase();
                          return !allowed.includes(ext || '');
                        });
                        if (invalid.length > 0) {
                          showToast(`Invalid file(s): ${invalid.map(f => f.name).join(', ')}. Only PNG and JPG allowed.`, 'error');
                          e.target.value = '';
                          return;
                        }
                        setUploadPhotos(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {uploadPhotos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-3 pointer-events-none">
                        <svg className="w-6 h-6 text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] text-slate-400 font-medium">Click or drag images here</span>
                        <span className="text-[9px] text-slate-600 mt-0.5">PNG, JPG only</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {uploadPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-slate-800 shrink-0">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={photo.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadPhotos(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg z-10"
                              title="Remove"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <span className="absolute bottom-0 left-0 right-0 text-[7px] text-white bg-black/60 px-1 py-0.5 truncate">{photo.name}</span>
                          </div>
                        ))}
                        {/* Add more tile */}
                        <div className="w-16 h-16 rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:border-blue-400/40 hover:text-slate-400 transition-colors shrink-0 cursor-pointer relative">
                          <input
                            type="file"
                            multiple
                            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                            onChange={(e) => {
                              const allowed = ['png', 'jpg', 'jpeg'];
                              const newFiles = Array.from(e.target.files || []);
                              const invalid = newFiles.filter(f => {
                                const ext = f.name.split('.').pop()?.toLowerCase();
                                return !allowed.includes(ext || '');
                              });
                              if (invalid.length > 0) {
                                showToast(`Invalid file(s): ${invalid.map(f => f.name).join(', ')}. Only PNG and JPG allowed.`, 'error');
                                e.target.value = '';
                                return;
                              }
                              setUploadPhotos(prev => [...prev, ...newFiles]);
                              e.target.value = '';
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[8px] mt-0.5">Add more</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {uploadPhotos.length > 0 && (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-blue-400 font-medium">{uploadPhotos.length} image{uploadPhotos.length > 1 ? 's' : ''} selected</span>
                      <button
                        type="button"
                        onClick={() => setUploadPhotos([])}
                        className="text-[9px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                  {uploadPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {uploadPhotos.map((photo, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 text-[9px] bg-white/5 border border-white/8 text-slate-300 px-2 py-0.5 rounded-full"
                        >
                          {photo.name.length > 16 ? photo.name.substring(0, 14) + '…' : photo.name}
                          <button
                            type="button"
                            onClick={() => setUploadPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-red-400 cursor-pointer ml-0.5 leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Spec Sheets / PDFs / CSV / Excel
                  </label>
                  <div
                    className="relative border border-dashed border-white/10 rounded-xl p-3 hover:border-purple-500/40 transition-colors bg-white/2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const allowed = ['pdf', 'csv', 'xls', 'xlsx'];
                      const dropped = Array.from(e.dataTransfer.files);
                      const invalid = dropped.filter(f => {
                        const ext = f.name.split('.').pop()?.toLowerCase();
                        return !allowed.includes(ext || '');
                      });
                      if (invalid.length > 0) {
                        showToast(`Invalid file(s): ${invalid.map(f => f.name).join(', ')}. Only PDF, CSV, XLS, XLSX allowed.`, 'error');
                        return;
                      }
                      setUploadAttachments(prev => [...prev, ...dropped]);
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.csv,.xls,.xlsx,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(e) => {
                        const allowed = ['pdf', 'csv', 'xls', 'xlsx'];
                        const newFiles = Array.from(e.target.files || []);
                        const invalid = newFiles.filter(f => {
                          const ext = f.name.split('.').pop()?.toLowerCase();
                          return !allowed.includes(ext || '');
                        });
                        if (invalid.length > 0) {
                          showToast(`Invalid file(s): ${invalid.map(f => f.name).join(', ')}. Only PDF, CSV, XLS, XLSX allowed.`, 'error');
                          e.target.value = '';
                          return;
                        }
                        setUploadAttachments(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center py-3 pointer-events-none">
                      <svg className="w-6 h-6 text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-[10px] text-slate-400 font-medium">Click or drag files here</span>
                      <span className="text-[9px] text-slate-600 mt-0.5">PDF, CSV, XLS, XLSX only</span>
                    </div>
                  </div>
                  {uploadAttachments.length > 0 && (
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-purple-400 font-medium">{uploadAttachments.length} file{uploadAttachments.length > 1 ? 's' : ''} selected</span>
                      <button
                        type="button"
                        onClick={() => setUploadAttachments([])}
                        className="text-[9px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                  {uploadAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {uploadAttachments.map((file, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 text-[9px] bg-white/5 border border-white/8 text-slate-300 px-2 py-0.5 rounded-full"
                        >
                          {file.name.length > 16 ? file.name.substring(0, 14) + '…' : file.name}
                          <button
                            type="button"
                            onClick={() => setUploadAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-red-400 cursor-pointer ml-0.5 leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar bottom action buttons */}
            <div className="flex items-center gap-3 pt-6 border-t border-white/5 mt-6">
              <button
                type="button"
                onClick={resetUploadForm}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white border border-white/5 hover:bg-white/2 rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={uploadProgress || !uploadName || !uploadFile || !uploadDescription.trim()}
                className="flex-1 flex items-center justify-center py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
              >
                {uploadProgress ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Creating...
                  </span>
                ) : 'Create Showcase'}
              </button>
            </div>
          </div>

          {/* Main Content Area: Rich Text Notepad Workspace */}
          <div className="flex-1 flex flex-col bg-slate-950/20 overflow-hidden">
            {/* Rich Text Toolbar */}
            <div className="bg-slate-900/80 border-b border-white/5 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10">
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                {/* Font Family selector */}
                <select
                  value={editorFont}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className="bg-slate-950 border border-white/5 rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  title="Font Family"
                >
                  <option value="sans">Inter (Sans)</option>
                  <option value="outfit">Outfit (Modern)</option>
                  <option value="playfair">Playfair (Serif)</option>
                  <option value="fira">Fira Code (Mono)</option>
                </select>

                {/* Heading / Style selector */}
                <select
                  onChange={(e) => handleFormatChange(e.target.value)}
                  defaultValue="p"
                  className="bg-slate-950 border border-white/5 rounded-lg text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  title="Block Style"
                >
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>

                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>

                {/* Styling buttons */}
                <button
                  type="button"
                  onClick={() => execEditorCommand('bold')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 font-bold w-7 h-7 flex items-center justify-center text-xs hover:text-white cursor-pointer"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('italic')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 italic w-7 h-7 flex items-center justify-center text-xs hover:text-white cursor-pointer"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('underline')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 underline w-7 h-7 flex items-center justify-center text-xs hover:text-white cursor-pointer"
                  title="Underline"
                >
                  U
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('strikeThrough')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 line-through w-7 h-7 flex items-center justify-center text-xs hover:text-white cursor-pointer"
                  title="Strikethrough"
                >
                  S
                </button>

                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>

                {/* Lists */}
                <button
                  type="button"
                  onClick={() => execEditorCommand('insertUnorderedList')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 w-7 h-7 flex items-center justify-center text-xs hover:text-white cursor-pointer"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('insertOrderedList')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 w-7 h-7 flex items-center justify-center text-xs hover:text-white cursor-pointer"
                  title="Numbered List"
                >
                  1. List
                </button>

                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>

                {/* Alignment */}
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyLeft')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 text-xs cursor-pointer hover:text-white"
                  title="Align Left"
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyCenter')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 text-xs cursor-pointer hover:text-white"
                  title="Align Center"
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => execEditorCommand('justifyRight')}
                  className="p-1.5 rounded hover:bg-white/5 active:bg-white/10 text-xs cursor-pointer hover:text-white"
                  title="Align Right"
                >
                  Right
                </button>

                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>

                {/* Foreground color picker */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={editorColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
                    title="Text Color"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">{editorColor}</span>
                </div>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-3 text-slate-500 text-xs">
                <span className="bg-slate-900 border border-white/5 py-1 px-2.5 rounded-lg font-mono">
                  Words: <strong className="text-slate-300">{editorWordCount}</strong>
                </span>
                <span className="bg-slate-900 border border-white/5 py-1 px-2.5 rounded-lg font-mono">
                  Chars: <strong className="text-slate-300">{editorCharCount}</strong>
                </span>
              </div>
            </div>

            {/* Document sheet */}
            <div className="flex-1 p-8 overflow-y-auto flex justify-center bg-slate-950/40">
              <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleEditorInput}
                className={`max-w-3xl w-full min-h-[500px] bg-slate-900/60 border border-white/5 rounded-2xl p-8 focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-100 shadow-2xl overflow-y-auto text-sm leading-relaxed richtext-content ${editorFont === 'outfit' ? 'font-outfit-editor' :
                  editorFont === 'playfair' ? 'font-playfair-editor' :
                    editorFont === 'fira' ? 'font-fira-editor' : 'font-sans-editor'
                  }`}
                data-placeholder="Start writing showcase description, design specifications, or notes here..."
                style={{ height: 'fit-content' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Share Configuration */}
      {isShareOpen && selectedModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 fade-in">
          <div className="w-full max-w-md glass-panel-heavy rounded-3xl p-6 border border-white/10 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Create Share Link</h3>
            <p className="text-xs text-slate-400 mb-5">Configure security access policies for model "{selectedModel.name}"</p>

            {!generatedLink ? (
              <form onSubmit={handleShareSubmit} className="space-y-4">
                {/* Password Protection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Password Protection (Optional)
                  </label>
                  <input
                    type="password"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Enter password to protect link"
                    className="glass-input px-4 py-2.5 block w-full rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Expiration Days */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Expires In (Days) (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={shareExpires}
                      onChange={(e) => setShareExpires(e.target.value)}
                      placeholder="e.g. 7 (Optional)"
                      className="glass-input px-4 py-2.5 block w-full rounded-xl text-sm"
                    />
                  </div>

                  {/* Max Views */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Max View Count (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={shareMaxViews}
                      onChange={(e) => setShareMaxViews(e.target.value)}
                      placeholder="e.g. 50 (Optional)"
                      className="glass-input px-4 py-2.5 block w-full rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsShareOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
                  >
                    Generate Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Secure Link Ready</div>
                  <div className="text-xs text-white font-mono break-all bg-black/40 p-3 rounded-lg border border-white/5 select-all">
                    {generatedLink}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer transition-all duration-200"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsShareOpen(false);
                      setGeneratedLink('');
                    }}
                    className="px-5 py-3 text-sm font-semibold text-slate-400 hover:text-white border border-white/5 hover:border-white/10 rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Manage Share Links */}
      {isManageSharesOpen && sharesModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 fade-in overflow-y-auto">
          <div className="w-full max-w-lg glass-panel-heavy rounded-3xl p-6 border border-white/10 shadow-2xl relative my-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Active Share Links</h3>
                <p className="text-xs text-slate-400 mt-1">Manage links for model "{sharesModel.name}"</p>
              </div>
              <button
                onClick={() => {
                  setIsManageSharesOpen(false);
                  setSharesModel(null);
                }}
                className="text-slate-400 hover:text-white text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {sharesModel.shares && sharesModel.shares.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {sharesModel.shares.map((share) => {
                  const fullUrl = `${window.location.origin}/share/${share.shareToken}`;
                  const isPassVisible = !!visiblePasswords[share.id];
                  return (
                    <div
                      key={share.id}
                      className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-xs text-slate-300 break-all select-all">
                          /{share.shareToken}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs flex items-center gap-1 ${share.maxViews && share.views >= share.maxViews ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                            <Eye className="w-3.5 h-3.5" /> {share.views} {share.maxViews ? `/${share.maxViews}` : ''}
                          </span>

                          {share.maxViews && (
                            <button
                              onClick={() => handleResetViews(share.id, sharesModel.id)}
                              className="text-slate-400 hover:text-amber-400 p-1.5 hover:bg-amber-500/10 rounded-lg cursor-pointer transition-colors"
                              title="Reset view counter"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteShare(share.id, sharesModel.id)}
                            className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                            title="Disable share link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Password/Lock Section */}
                      {share.passwordPlain && (
                        <div className="flex items-center justify-between bg-white/2 border border-white/5 rounded-lg px-3 py-1.5 text-xs">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="font-mono">
                              {isPassVisible ? share.passwordPlain : '••••••••'}
                            </span>
                          </div>
                          <button
                            onClick={() => setVisiblePasswords(prev => ({
                              ...prev,
                              [share.id]: !prev[share.id]
                            }))}
                            className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded transition-colors"
                            title={isPassVisible ? "Hide password" : "Show password"}
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {/* Action buttons (Copy link) */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(fullUrl);
                            setGeneratedLink(fullUrl);
                            setCopySuccess(true);
                            setTimeout(() => {
                              setCopySuccess(false);
                              setGeneratedLink('');
                            }, 2000);
                          }}
                          className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 border border-white/5 hover:border-white/10 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer transition-all"
                        >
                          {copySuccess && generatedLink === fullUrl ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Share Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                No active share links.
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setIsManageSharesOpen(false);
                  setSharesModel(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Custom Confirmation */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center p-4 z-[60] fade-in">
          <div className="w-full max-w-sm glass-panel-heavy rounded-3xl p-6 border border-white/15 shadow-2xl relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{confirmTitle}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{confirmMessage}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setConfirmAction(null);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/10 cursor-pointer transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* axiion.com attribution */}
      <div className="w-full flex justify-center py-4 z-10">
        <a
          href="https://www.axiino.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/3 border border-white/8 hover:bg-white/6 hover:border-white/15 transition-all duration-200 group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:bg-blue-300 transition-colors animate-pulse"></span>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors font-medium tracking-wide">
            Developed by <span className="text-blue-400 group-hover:text-blue-300 font-semibold">axiino</span>
          </span>
        </a>
      </div>
    </div>
  );
}
