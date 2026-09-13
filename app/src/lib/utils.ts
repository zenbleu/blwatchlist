import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ============================================================
   Share Card Generation — Native Canvas API
   ============================================================ */

interface ShareCardEntry {
  title: string;
  poster: string | null;
  year?: number;
  country?: string;
}

type ShareCardType = "favorites" | "top10" | "stats";

interface ShareCardOptions {
  type: ShareCardType;
  title: string;
  subtitle?: string;
  entries: ShareCardEntry[];
  year?: number;
  stats?: {
    totalEntries: number;
    completed: number;
    favorites: number;
    avgRating: string;
    topCountry: string;
    yearsCollecting: number | string;
  };
  watermark?: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const BG_COLOR = "#0a0a0a";
const TEXT_COLOR = "#ffffff";
const ACCENT_COLOR = "#E50914";
const MUTED_COLOR = "#888888";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function drawPoster(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  roundedRect(ctx, x, y, w, h, 12);
  ctx.save();
  ctx.clip();

  if (img) {
    // Cover fit
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  } else {
    // Placeholder gradient
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#1a1a1a");
    grad.addColorStop(1, "#2a2a2a");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Letter placeholder
    ctx.fillStyle = "#444";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title.charAt(0).toUpperCase() || "?", x + w / 2, y + h / 2);
  }
  ctx.restore();

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.stroke();
}

export async function generateShareCard(options: ShareCardOptions): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle gradient overlay at top
  const topGrad = ctx.createLinearGradient(0, 0, 0, 300);
  topGrad.addColorStop(0, "rgba(229,9,20,0.08)");
  topGrad.addColorStop(1, "transparent");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, 300);

  // Title
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(options.title, CARD_WIDTH / 2, 100);

  // Subtitle
  if (options.subtitle) {
    ctx.fillStyle = MUTED_COLOR;
    ctx.font = "28px sans-serif";
    ctx.fillText(options.subtitle, CARD_WIDTH / 2, 155);
  }

  // Red accent line
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillRect(CARD_WIDTH / 2 - 60, 185, 120, 3);

  if (options.type === "stats" && options.stats) {
    await drawStatsCard(ctx, options);
  } else if (options.type === "favorites") {
    await drawFavoritesCard(ctx, options);
  } else if (options.type === "top10") {
    await drawTop10Card(ctx, options);
  }

  // Watermark
  const watermark = options.watermark || "BL Watchlist Manager";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(watermark, CARD_WIDTH / 2, CARD_HEIGHT - 40);

  return canvas.toDataURL("image/png");
}

async function drawFavoritesCard(ctx: CanvasRenderingContext2D, options: ShareCardOptions) {
  const posters = options.entries.slice(0, 6);
  const posterW = 280;
  const posterH = 400;
  const gapX = 40;
  const gapY = 40;
  const startX = (CARD_WIDTH - (posterW * 3 + gapX * 2)) / 2;
  const startY = 240;

  const images = await Promise.all(posters.map((e) => loadImage(e.poster || "")));

  for (let i = 0; i < posters.length; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = startX + col * (posterW + gapX);
    const y = startY + row * (posterH + gapY);
    await drawPoster(ctx, images[i], x, y, posterW, posterH, posters[i].title);

    // Title below poster
    ctx.fillStyle = "#B3B3B3";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(truncateText(ctx, posters[i].title, posterW, 18), x + posterW / 2, y + posterH + 28);
  }

  // Count
  ctx.fillStyle = MUTED_COLOR;
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${options.entries.length} favorites`, CARD_WIDTH / 2, CARD_HEIGHT - 100);
}

async function drawTop10Card(ctx: CanvasRenderingContext2D, options: ShareCardOptions) {
  const posters = options.entries.slice(0, 10);
  const posterW = 170;
  const posterH = 245;
  const gapX = 20;
  const gapY = 50;
  const cols = 5;
  const startX = (CARD_WIDTH - (posterW * cols + gapX * (cols - 1))) / 2;
  const startY = 230;

  const images = await Promise.all(posters.map((e) => loadImage(e.poster || "")));

  // Draw posters with rank badges (no title text below each poster)
  for (let i = 0; i < posters.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * (posterW + gapX);
    const y = startY + row * (posterH + gapY);

    // Rank badge background
    const rankColors = ["#E50914", "#FF2D7B", "#FF6B35"];
    const badgeColor = rankColors[i] || "#333";
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(x + 22, y + 22, 18, 0, Math.PI * 2);
    ctx.fill();

    // Rank number
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), x + 22, y + 22);

    await drawPoster(ctx, images[i], x, y, posterW, posterH, posters[i].title);
  }

  // --- Ranked title list below all posters ---
  // Bottom of row 2: startY + 2*(posterH+gapY) = 230 + 2*295 = 820
  const sepY = startY + 2 * (posterH + gapY) + 18;

  // Separator line
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, sepY);
  ctx.lineTo(CARD_WIDTH - 60, sepY);
  ctx.stroke();

  // Two-column layout: ranks 1-5 on left, 6-10 on right
  const padX = 70;
  const colGap = 50;
  const colWidth = (CARD_WIDTH - padX * 2 - colGap) / 2;
  const rowH = 46;
  const listStartY = sepY + 36;
  const rankColors = ["#E50914", "#FF2D7B", "#FF6B35"];

  for (let i = 0; i < posters.length; i++) {
    const colIdx = i < 5 ? 0 : 1;
    const rowIdx = i < 5 ? i : i - 5;
    const x = padX + colIdx * (colWidth + colGap);
    const y = listStartY + rowIdx * rowH + rowH / 2;

    // Rank number
    ctx.fillStyle = rankColors[i] || "#888888";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}.`, x, y);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "22px sans-serif";
    const titleX = x + 54;
    const maxW = colWidth - 54;
    ctx.fillText(truncateText(ctx, posters[i].title, maxW, 22), titleX, y);
  }
}

async function drawStatsCard(ctx: CanvasRenderingContext2D, options: ShareCardOptions) {
  if (!options.stats) return;

  const stats = options.stats;
  const statItems = [
    { label: "Total Entries", value: String(stats.totalEntries), icon: "📺" },
    { label: "Completed", value: String(stats.completed), icon: "✅" },
    { label: "Favorites", value: String(stats.favorites), icon: "❤️" },
    { label: "Avg Rating", value: `★ ${stats.avgRating}`, icon: "⭐" },
    { label: "Top Country", value: stats.topCountry, icon: "🌏" },
    { label: "Years", value: String(stats.yearsCollecting), icon: "📅" },
  ];

  const itemH = 110;
  const gapY = 16;
  const startY = 260;
  const paddingX = 80;

  for (let i = 0; i < statItems.length; i++) {
    const y = startY + i * (itemH + gapY);

    // Card bg
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundedRect(ctx, paddingX, y, CARD_WIDTH - paddingX * 2, itemH, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    roundedRect(ctx, paddingX, y, CARD_WIDTH - paddingX * 2, itemH, 16);
    ctx.stroke();

    // Icon
    ctx.font = "40px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(statItems[i].icon, paddingX + 24, y + itemH / 2);

    // Label
    ctx.fillStyle = MUTED_COLOR;
    ctx.font = "22px sans-serif";
    ctx.fillText(statItems[i].label, paddingX + 80, y + itemH / 2 - 14);

    // Value
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(statItems[i].value, CARD_WIDTH - paddingX - 24, y + itemH / 2);

    // Reset alignment
    ctx.textAlign = "left";
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string {
  ctx.font = `${fontSize}px sans-serif`;
  let truncated = text;
  while (ctx.measureText(truncated).width > maxWidth && truncated.length > 3) {
    truncated = truncated.slice(0, -1);
  }
  if (truncated.length < text.length) {
    truncated = truncated.slice(0, -2) + "...";
  }
  return truncated;
}

export function downloadPNG(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function generateShareFilename(type: ShareCardType, year?: number): string {
  const date = new Date().toISOString().split("T")[0];
  if (type === "favorites") return `BL-Favorites-${date}.png`;
  if (type === "top10" && year) return `BL-Top10-${year}-${date}.png`;
  if (type === "stats") return `BL-Stats-${date}.png`;
  return `BL-Share-${date}.png`;
}

/* ============================================================
   ShareCard React Component — Hidden off-screen capture target
   (Alternative: use this with html-to-image if available)
   ============================================================ */
export { type ShareCardOptions, type ShareCardType, type ShareCardEntry };
