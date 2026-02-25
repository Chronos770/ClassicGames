// Type declarations for js-dos v8 loaded via CDN
// https://js-dos.com/

interface DosOptions {
  url: string;
  autoStart?: boolean;
  autoSave?: boolean;
  theme?: 'light' | 'dark';
  renderAspect?: string;
  imageRendering?: string;
  kiosk?: boolean;
  thinSidebar?: boolean;
  pathPrefix?: string;
  volume?: number;
  backend?: 'dosbox' | 'dosboxX';
  backendLocked?: boolean;
  workerThread?: boolean;
  mouseCapture?: boolean;
  fullScreen?: boolean;
  softFullscreen?: boolean;
  fsChanges?: {
    local: boolean;
    urlToKey?: (url: string) => Promise<string>;
    pull?: (key: string) => Promise<Uint8Array | null>;
    push?: (key: string, data: Uint8Array) => Promise<void>;
    delete?: (key: string) => Promise<void>;
  };
}

interface DosInstance {
  stop: () => Promise<void>;
  save: () => Promise<boolean>;
  setAutoSave: (autoSave: boolean) => void;
  layers: {
    pointerButton: number;
  };
}

declare function Dos(
  element: HTMLDivElement,
  options?: DosOptions
): Promise<DosInstance>;
