// Type declarations for js-dos v8 loaded via CDN
// https://js-dos.com/

interface DosOptions {
  url: string;
  autoStart?: boolean;
  theme?: 'light' | 'dark';
  renderAspect?: string;
  imageRendering?: string;
  noSideBar?: boolean;
  noFullscreen?: boolean;
  noSocialLinks?: boolean;
  pathPrefix?: string;
}

interface DosInstance {
  stop: () => Promise<void>;
  layers: {
    pointerButton: number;
  };
}

declare function Dos(
  element: HTMLDivElement,
  options?: DosOptions
): Promise<DosInstance>;
