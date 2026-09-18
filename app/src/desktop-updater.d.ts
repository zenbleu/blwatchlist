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

interface DesktopUpdater {
  checkForUpdate: () => Promise<DesktopUpdateInfo | null>;
  downloadUpdate: () => Promise<{ cancelled: boolean }>;
  cancelDownload: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onProgress: (listener: (progress: DesktopUpdateProgress) => void) => () => void;
}

interface Window {
  blDesktopUpdater?: DesktopUpdater;
}