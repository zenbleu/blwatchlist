interface DesktopUpdateInfo {
  currentVersion: string;
  version: string;
  releaseNotes?: string;
}

interface DesktopUpdateProgress {
  downloadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
}

type DesktopDisplayMode = 'fullscreen' | 'windowed' | 'borderless';

interface DesktopUpdater {
  checkForUpdate: () => Promise<DesktopUpdateInfo | null>;
  downloadUpdate: () => Promise<{ cancelled: boolean }>;
  cancelDownload: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onProgress: (listener: (progress: DesktopUpdateProgress) => void) => () => void;
}

interface DesktopShell {
  getDisplayMode: () => Promise<DesktopDisplayMode>;
  setDisplayMode: (mode: DesktopDisplayMode) => Promise<DesktopDisplayMode>;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<boolean>;
  isWindowMaximized: () => Promise<boolean>;
  onMaximizeStateChange: (listener: (maximized: boolean) => void) => () => void;
  closeWindow: () => Promise<void>;
}

interface Window {
  blDesktopUpdater?: DesktopUpdater;
  blDesktopShell?: DesktopShell;
}
