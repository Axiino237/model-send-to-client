import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useShareStore } from '../store/shareStore';
import ModelViewer from '../components/ModelViewer';
import {
  Box, Lock, ShieldAlert, ArrowRight, HardDrive, Calendar,
  FileText, Download, FileArchive, FileImage, Image as ImageIcon,
  Layers, ChevronLeft, ChevronRight, User, Eye
} from 'lucide-react';

const autoUnlockedTokens = new Set<string>();

export default function ShareView() {
  const { token } = useParams<{ token: string }>();
  const {
    activeShare, unlockedFileUrl, unlockedDescription, unlockedPhotos, unlockedAttachments, loading, error,
    fetchShareMeta, unlockShare, logViewAnalytics, clear
  } = useShareStore();

  const [password, setPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [clientName, setClientName] = useState('');
  const [hasLoggedView, setHasLoggedView] = useState(false);

  const [activeTab, setActiveTab] = useState<'3d' | 'photos'>('3d');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  const getFullUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/api/')) {
      return `http://localhost:5000${url}`;
    }
    return url;
  };

  useEffect(() => {
    setImageLoading(true);
  }, [activePhotoIndex, unlockedPhotos]);

  useEffect(() => {
    if (token) {
      clear();
      fetchShareMeta(token);
    }
    return () => clear();
  }, [token, fetchShareMeta, clear]);

  useEffect(() => {
    if (activeShare && (unlockedFileUrl || unlockedPhotos.length > 0) && !hasLoggedView) {
      logViewAnalytics(activeShare.id);
      setHasLoggedView(true);
    }
  }, [activeShare, unlockedFileUrl, unlockedPhotos, hasLoggedView, logViewAnalytics]);

  useEffect(() => {
    if (activeShare && !unlockedFileUrl && unlockedPhotos.length > 0) {
      setActiveTab('photos');
    }
  }, [activeShare, unlockedFileUrl, unlockedPhotos]);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setUnlockError('');
    setUnlocking(true);

    try {
      await unlockShare(token, password);
    } catch (err: any) {
      setUnlockError(err.message || 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  };

  const viewLimitReached = !!(activeShare?.maxViews !== null && activeShare?.maxViews !== undefined && (activeShare.views ?? 0) >= activeShare.maxViews);

  useEffect(() => {
    if (activeShare && !activeShare.hasPassword && token && !autoUnlockedTokens.has(token) && !viewLimitReached) {
      autoUnlockedTokens.add(token);
      unlockShare(token);
    }
  }, [activeShare, token, unlockShare, viewLimitReached]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FileArchive className="w-5 h-5 text-amber-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
        return <FileImage className="w-5 h-5 text-blue-400" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading && !activeShare) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-sm text-slate-400 font-medium">Verifying secure link...</div>
      </div>
    );
  }

  if (error && !viewLimitReached) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-600/5 blur-[120px] pointer-events-none"></div>
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-red-500/20 shadow-2xl text-center z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Insight3D Security Shield</div>
        </div>
      </div>
    );
  }

  if (viewLimitReached) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-600/6 blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-orange-600/5 blur-[100px] pointer-events-none"></div>
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-amber-500/20 shadow-2xl text-center z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-5">
            <Eye className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">View Limit Reached</h2>
          <p className="text-sm text-slate-400 mb-3">
            This showcase has been viewed the maximum number of times allowed by its owner.
          </p>
          <div className="flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-white/3 border border-white/8 mb-6">
            <Eye className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">{activeShare?.views} / {activeShare?.maxViews} views used</span>
          </div>
          <p className="text-xs text-slate-500">Contact the sender to request a new link or an increased view limit.</p>
          <div className="mt-6 text-[10px] text-slate-600 font-mono tracking-widest uppercase">Insight3D Security Shield</div>
        </div>
      </div>
    );
  }

  if (!activeShare) return null;

  const isUnlocked = !!(unlockedFileUrl || unlockedPhotos.length > 0 || unlockedDescription || unlockedAttachments.length > 0);

  if (activeShare.hasPassword && !isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/5 blur-[120px] pointer-events-none"></div>
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl z-10">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Password Protected Link</h2>
            <p className="text-xs text-slate-400 mt-1">Please enter the password provided to access this showcase.</p>
          </div>

          {unlockError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-5">
              {unlockError}
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="glass-input px-4 py-3 block w-full rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={unlocking}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer transition-all active:scale-[0.98]"
            >
              {unlocking ? 'Verifying...' : 'Unlock Showcase'}
              {!unlocking && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderPhotoGallery = () => {
    if (unlockedPhotos.length === 0) return null;
    const currentPhoto = unlockedPhotos[activePhotoIndex];

    const nextPhoto = () => {
      setActivePhotoIndex((prev) => (prev + 1) % unlockedPhotos.length);
    };

    const prevPhoto = () => {
      setActivePhotoIndex((prev) => (prev - 1 + unlockedPhotos.length) % unlockedPhotos.length);
    };

    return (
      <div className="flex-1 flex flex-col gap-4 justify-between bg-black/40 rounded-2xl border border-white/5 p-4 overflow-hidden relative">
        <div className="flex-1 flex items-center justify-center relative rounded-xl overflow-hidden min-h-[450px]">
          <img
            src={getFullUrl(currentPhoto.downloadUrl)}
            alt={currentPhoto.name}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            className={`max-h-[500px] max-w-full object-contain rounded-xl select-none transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
          />

          {imageLoading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 transition-all duration-300">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Image...</div>
            </div>
          )}

          {unlockedPhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 cursor-pointer transition-all z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 cursor-pointer transition-all z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm border border-white/5 py-2 px-4 rounded-xl text-xs text-center text-white font-medium truncate">
            {currentPhoto.name}
          </div>
        </div>

        {unlockedPhotos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-thin">
            {unlockedPhotos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setActivePhotoIndex(index)}
                className={`relative flex-shrink-0 w-16 h-12 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${index === activePhotoIndex ? 'border-blue-500 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
              >
                <img
                  src={getFullUrl(photo.downloadUrl)}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 relative overflow-x-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-6 z-10 justify-center">
        {/* Header Panel */}
        <header className="glass-panel border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:justify-between md:items-center gap-6 relative overflow-hidden transition-all duration-300 hover:border-white/15">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              {unlockedFileUrl ? <Box className="w-6 h-6 text-white" /> : <Layers className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none mb-2">{activeShare.model.name}</h1>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Shared By: {activeShare.model.user.name}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4 z-10">
            {activeShare.model.size && (
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/5 border border-white/5 px-3.5 py-2 rounded-2xl shadow-inner">
                <HardDrive className="w-4 h-4 text-indigo-400" /> {formatBytes(activeShare.model.size)}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/5 border border-white/5 px-3.5 py-2 rounded-2xl shadow-inner">
              <Calendar className="w-4 h-4 text-purple-400" /> Shared: {' '}
              {new Date(activeShare.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            {unlockedFileUrl && (
              <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4">
                <input
                  type="text"
                  placeholder="Watermark name..."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="glass-input px-3 py-2 rounded-xl text-xs w-40 placeholder:text-slate-500 focus:border-blue-500/80"
                  title="Add name to viewport watermark"
                />
              </div>
            )}
          </div>
        </header>

        {/* Stacked Content Sections (3D Model first, then Photos, Description, Attachments) */}
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
          {/* Section 1: 3D Model Viewer */}
          <div className="flex flex-col gap-4 bg-slate-900/40 rounded-3xl border border-white/5 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/10 relative group">
            {/* Glowing effect inside container */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50"></div>

            <div className="flex items-center justify-between gap-2 mb-2 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Box className="w-4.5 h-4.5 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">3D Interactive Viewer</h3>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
                Interactive
              </span>
            </div>

            {unlockedFileUrl ? (
              <div className="w-full min-h-[520px] flex rounded-2xl overflow-hidden bg-black/50 border border-white/5 relative shadow-inner">
                {/* Floating guide */}
                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 py-1.5 px-3 rounded-xl text-[10px] text-slate-400 font-semibold z-10 pointer-events-none select-none flex items-center gap-1.5 shadow-xl">
                  <span>Orbit: Drag</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>Pan: Right Drag</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>Zoom: Scroll</span>
                </div>
                <ModelViewer
                  modelUrl={unlockedFileUrl}
                  modelName={activeShare.model.name}
                  companyName={activeShare.model.user.name}
                  clientName={clientName || undefined}
                />
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-4 border border-dashed border-white/5 rounded-2xl bg-white/1 shadow-inner">
                <Box className="w-14 h-14 text-slate-600 animate-pulse" />
                <p className="text-sm font-semibold tracking-wide">3D Model File could not be resolved.</p>
              </div>
            )}
          </div>

          {/* Section 2: Photos Gallery */}
          {unlockedPhotos && unlockedPhotos.length > 0 && (
            <div className="flex flex-col gap-4 bg-slate-900/40 rounded-3xl border border-white/5 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/10 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>

              <div className="flex items-center justify-between gap-2 mb-2 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4.5 h-4.5 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Photos & Renders</h3>
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  {unlockedPhotos.length} Items
                </span>
              </div>
              {renderPhotoGallery()}
            </div>
          )}

          {/* Section 3: Project Description */}
          {unlockedDescription && (
            <div className="bg-slate-900/40 border border-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative transition-all duration-300 hover:border-white/10">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 opacity-50"></div>

              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                <FileText className="w-4.5 h-4.5 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Specifications</h3>
              </div>

              <div className="relative pl-6">
                <div className="absolute left-0 top-0 w-[4px] h-full bg-gradient-to-b from-blue-500 to-emerald-500 rounded-full"></div>
                <div
                  className="text-slate-300 text-sm leading-relaxed richtext-content"
                  dangerouslySetInnerHTML={{ __html: unlockedDescription }}
                />
              </div>
            </div>
          )}

          {/* Section 4: Project Files & Attachments */}
          {unlockedAttachments && unlockedAttachments.length > 0 && (
            <div className="bg-slate-900/40 border border-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl transition-all duration-300 hover:border-white/10 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 opacity-50"></div>

              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-4.5 h-4.5 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Supplementary Attachments</h3>
                </div>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  Downloads
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unlockedAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 hover:bg-white/3 transition-all duration-200 group/item"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden pr-2">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/item:bg-white/10 group-hover/item:border-white/10 transition-all">
                        {getFileIcon(attachment.name)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-semibold text-slate-100 truncate block group-hover/item:text-blue-400 transition-colors" title={attachment.name}>
                          {attachment.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                          {formatBytes(attachment.size)}
                        </span>
                      </div>
                    </div>

                    <a
                      href={getFullUrl(attachment.downloadUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-md hover:shadow-blue-500/20 active:scale-95 duration-200"
                      title="View File"
                    >
                      <Download className="w-3.5 h-3.5" /> View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* axiion.com attribution */}
      <div className="w-full flex justify-center py-6 z-10">
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
