import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useFBX, Center, Html, useProgress } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Maximize2, Minimize2, RotateCw, Shield, Sliders, Sun, Video } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://model-send-to-client.onrender.com';

// Enable Draco Decompression for GLTF/GLB models to support compressed files
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("3D Model Viewer Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface ModelViewerProps {
  modelUrl: string;
  modelName: string;
  companyName: string;
  clientName?: string;
}

// Loading Progress Component
function LoadingProgress() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl glass-panel-heavy min-w-[200px] border border-white/10 shadow-2xl">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-semibold text-white tracking-wider">
          LOADING MODEL
        </div>
        <div className="text-xs text-slate-400 mt-1 font-mono">
          {progress.toFixed(0)}%
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="bg-blue-500 h-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </Html>
  );
}

// Inner Model Loader
interface RendererProps {
  url: string;
  originalUrl: string;
  wireframe: boolean;
}

function applyMaterialProperties(obj: any, wireframe: boolean) {
  obj.traverse((child: any) => {
    if (child.isMesh) {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => {
            m.wireframe = wireframe;
          });
        } else {
          child.material.wireframe = wireframe;
        }
      }
    }
  });
}

function GLBLoader({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);
  applyMaterialProperties(scene, wireframe);
  return <primitive object={scene} />;
}

function FBXLoader({ url, wireframe }: { url: string; wireframe: boolean }) {
  const fbx = useFBX(url);
  applyMaterialProperties(fbx, wireframe);
  return <primitive object={fbx} scale={0.01} />;
}

function OBJModelLoader({ url, wireframe }: { url: string; wireframe: boolean }) {
  const obj = useLoader(OBJLoader, url);
  applyMaterialProperties(obj, wireframe);
  return <primitive object={obj} />;
}

function ModelRenderer({ url, originalUrl, wireframe }: RendererProps) {
  const fileExt = originalUrl.split('.').pop()?.split('?')[0].toLowerCase() || '';

  if (fileExt === 'fbx') {
    return <FBXLoader url={url} wireframe={wireframe} />;
  } else if (fileExt === 'obj') {
    return <OBJModelLoader url={url} wireframe={wireframe} />;
  } else {
    return <GLBLoader url={url} wireframe={wireframe} />;
  }
}



// Reset Camera Action helper
function CameraController({ resetTrigger }: { resetTrigger: number }) {
  const { camera } = useThree();
  useEffect(() => {
    if (resetTrigger > 0) {
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);
    }
  }, [resetTrigger, camera]);
  return null;
}

export default function ModelViewer({ modelUrl, modelName, companyName, clientName }: ModelViewerProps) {
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Lighting controls
  const [ambientIntensity, setAmbientIntensity] = useState(0.8);
  const [directionalIntensity, setDirectionalIntensity] = useState(1.0);
  const [showControls, setShowControls] = useState(false);

  // Download states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleResetCamera = () => {
    setResetTrigger(prev => prev + 1);
  };

  // Convert absolute or local URLs to the backend full address if necessary
  const getFullUrl = (url: string) => {
    if (url.startsWith('/api/')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  // Handle Model File Downloading via XMLHttpRequest for Real Byte-by-Byte progress tracking
  useEffect(() => {
    let active = true;
    let xhr: XMLHttpRequest | null = null;
    let currentBlobUrl: string | null = null;

    const downloadModel = () => {
      setDownloadLoading(true);
      setDownloadProgress(0);
      setDownloadError(null);
      setLocalUrl(null);

      const url = getFullUrl(modelUrl);
      
      xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (!active) return;
        if (event.lengthComputable && event.total > 0) {
          const percent = (event.loaded / event.total) * 100;
          setDownloadProgress(percent);
        } else {
          // Fallback if Content-Length header is missing from CDN: show downloaded MB
          const loadedMB = event.loaded / (1024 * 1024);
          setDownloadProgress(-loadedMB);
        }
      };

      xhr.onload = () => {
        if (!active) return;
        if (xhr.status === 200) {
          const blob = xhr.response;
          currentBlobUrl = URL.createObjectURL(blob);
          setLocalUrl(currentBlobUrl);
          setDownloadLoading(false);
        } else {
          setDownloadError(`Failed to load 3D model (Server returned status ${xhr.status}).`);
          setDownloadLoading(false);
        }
      };

      xhr.onerror = () => {
        if (!active) return;
        setDownloadError('Network error occurred while downloading the 3D model. Please check your connection.');
        setDownloadLoading(false);
      };

      xhr.send();
    };

    downloadModel();

    return () => {
      active = false;
      if (xhr) {
        xhr.abort();
      }
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [modelUrl, retryTrigger]);

  if (downloadLoading) {
    const isMB = downloadProgress < 0;
    return (
      <div 
        ref={containerRef}
        className={`relative w-full rounded-2xl overflow-hidden glass-panel h-[500px] md:h-[600px] border border-white/5 shadow-2xl flex flex-col justify-center items-center bg-radial from-slate-900 via-slate-950 to-black p-6 ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : ''
        }`}
      >
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl glass-panel-heavy min-w-[280px] border border-white/10 shadow-2xl z-10">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-5"></div>
          <div className="text-sm font-bold text-white tracking-widest uppercase mb-1.5">
            Downloading 3D Model
          </div>
          <div className="text-xs text-blue-400 font-mono font-bold">
            {isMB 
              ? `${Math.abs(downloadProgress).toFixed(1)} MB Loaded` 
              : `${downloadProgress.toFixed(0)}%`}
          </div>
          {!isMB && (
            <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden border border-white/5 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 ease-out" 
                style={{ width: `${Math.max(0, Math.min(100, downloadProgress))}%` }}
              ></div>
            </div>
          )}
          <div className="text-[10px] text-slate-500 mt-4 text-center select-none font-medium">
            File: {modelName}
          </div>
        </div>
      </div>
    );
  }

  if (downloadError) {
    return (
      <div 
        ref={containerRef}
        className={`relative w-full rounded-2xl overflow-hidden glass-panel h-[500px] md:h-[600px] border border-white/5 shadow-2xl flex flex-col justify-center items-center bg-radial from-slate-900 via-slate-950 to-black p-6 ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : ''
        }`}
      >
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl glass-panel-heavy max-w-md border border-red-500/20 shadow-2xl text-center z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-5 animate-bounce">
            <Shield className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Download Failed</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            {downloadError}
          </p>
          <button
            onClick={() => setRetryTrigger(prev => prev + 1)}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer shadow-md hover:shadow-blue-500/20"
          >
            Retry Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full rounded-2xl overflow-hidden glass-panel h-[500px] md:h-[600px] border border-white/5 shadow-2xl flex flex-col ${
        isFullscreen ? 'w-screen h-screen rounded-none border-none' : ''
      }`}
    >
      {/* 3D Canvas */}
      <div className="flex-1 w-full bg-radial from-slate-900 via-slate-950 to-black relative">
        <ErrorBoundary fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950/80 backdrop-blur-sm z-30">
            <Shield className="w-12 h-12 text-red-500/80 mb-4 animate-pulse" />
            <h4 className="text-sm font-bold text-white mb-2">3D Renderer Error</h4>
            <p className="text-xs max-w-md">
              Unable to load or display the 3D model. The file format might be unsupported, corrupted, or WebGL is disabled/failed on your device.
            </p>
          </div>
        }>
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
            <ambientLight intensity={ambientIntensity} />
            <directionalLight position={[10, 10, 5]} intensity={directionalIntensity} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
            <pointLight position={[0, 5, 0]} intensity={0.8} />

            <Suspense fallback={<LoadingProgress />}>
              <Center>
                <ModelRenderer url={localUrl!} originalUrl={modelUrl} wireframe={wireframe} />
              </Center>
            </Suspense>

            <OrbitControls 
              enableDamping 
              dampingFactor={0.05}
              autoRotate={autoRotate}
              autoRotateSpeed={2.0}
              makeDefault
            />
            <CameraController resetTrigger={resetTrigger} />
          </Canvas>
        </ErrorBoundary>

        {/* Watermark Overlay (Security & Branding) */}
        <div className="absolute top-6 left-6 pointer-events-none select-none flex flex-col gap-1.5 opacity-60">
          <div className="flex items-center gap-1.5 text-xs tracking-widest text-slate-400 font-semibold uppercase">
            <Shield className="w-3.5 h-3.5 text-blue-500" /> Secure Viewer
          </div>
          <div className="text-sm font-bold text-white tracking-wide">
            Shared By: <span className="text-blue-400">{companyName}</span>
          </div>
          {clientName && (
            <div className="text-xs font-semibold text-slate-300">
              Client: <span className="text-indigo-400">{clientName}</span>
            </div>
          )}
        </div>

        {/* Model Name Floating Badge */}
        <div className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full glass-panel-heavy text-xs font-semibold tracking-wider text-slate-200 uppercase border border-white/10 select-none">
          {modelName}
        </div>

        {/* Toolbar Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full glass-panel border border-white/10 shadow-2xl backdrop-blur-xl z-20">
          {/* Reset Camera */}
          <button 
            onClick={handleResetCamera} 
            title="Reset Camera" 
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Auto Rotate */}
          <button 
            onClick={() => setAutoRotate(!autoRotate)} 
            title="Auto Rotate" 
            className={`p-2 rounded-full transition-colors ${
              autoRotate ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Wireframe Mode */}
          <button 
            onClick={() => setWireframe(!wireframe)} 
            title="Wireframe Mode" 
            className={`p-2 rounded-full text-xs font-semibold px-3 uppercase transition-colors ${
              wireframe ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            WF
          </button>

          {/* Lighting Controls Toggle */}
          <button 
            onClick={() => setShowControls(!showControls)} 
            title="Lighting Adjustments" 
            className={`p-2 rounded-full transition-colors ${
              showControls ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1"></div>

          {/* Fullscreen */}
          <button 
            onClick={toggleFullscreen} 
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} 
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Dynamic Light Adjuster Slider Panel */}
        {showControls && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 p-4 rounded-2xl glass-panel-heavy border border-white/10 min-w-[240px] flex flex-col gap-3 shadow-2xl z-20 fade-in select-none">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">
              <Sun className="w-3.5 h-3.5 text-yellow-400" /> Light Controls
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Ambient Light</span>
                <span>{ambientIntensity.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1" 
                value={ambientIntensity} 
                onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Directional Light</span>
                <span>{directionalIntensity.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="3" 
                step="0.1" 
                value={directionalIntensity} 
                onChange={(e) => setDirectionalIntensity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
