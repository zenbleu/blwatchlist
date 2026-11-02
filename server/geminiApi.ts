import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import fs from 'fs';
import path from 'path';

function getApiKey(): string {
  // Always prioritize system environment variable
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    return process.env.GEMINI_API_KEY;
  }
  try {
    const envPaths = [
      path.resolve(process.cwd(), 'app/.env.local'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '../app/.env.local'),
      path.resolve(process.cwd(), '../.env.local'),
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match && match[1]?.trim() && match[1].trim() !== 'MY_GEMINI_API_KEY') {
          return match[1].trim();
        }
      }
    }
  } catch {}
  return process.env.GEMINI_API_KEY || '';
}

export function getAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: getApiKey(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 30000,
    },
  });
}

// gemini-3.1-flash-lite provides fast response times (~1s) and high reliability for interactive UI features
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_MODEL = 'gemini-3.8-flash';

export interface SeriesMetadataResult {
  title: string;
  year?: number;
  country?: string;
  type?: 'Series' | 'Movie';
  totalEpisodes?: number;
  genres?: string[];
  synopsis?: string;
}

export interface RecommendationResult {
  title: string;
  year: number;
  country: string;
  type: 'Series' | 'Movie';
  totalEpisodes: number;
  reason: string;
}

/**
 * Robust JSON extractor from model text output that safely strips code blocks,
 * leading/trailing conversational text, and parses structured objects or arrays.
 */
function extractJson<T>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  let text = rawText.trim();

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    // If direct parse fails, try extracting the outermost JSON object or array
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      try {
        const candidate = text.slice(firstBracket, lastBracket + 1);
        return JSON.parse(candidate);
      } catch {}
    }

    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        const candidate = text.slice(firstBrace, lastBrace + 1);
        return JSON.parse(candidate);
      } catch {}
    }

    return fallback;
  }
}

/**
 * Formats Gemini API errors into clean, user-friendly messages.
 */
export function formatGeminiError(err: any): Error {
  if (!err) return new Error('Unknown Gemini AI error.');
  const msg = typeof err === 'string' ? err : err.message || '';
  const status = err.status || err.code;

  if (status === 504 || msg.includes('DEADLINE_EXCEEDED') || msg.includes('Deadline expired') || msg.includes('timeout')) {
    return new Error('The Gemini AI request timed out. Please try again in a moment.');
  }
  if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('Quota')) {
    return new Error('Gemini AI rate limit reached. Please wait a moment and try again.');
  }
  if (status === 403 || msg.includes('PERMISSION_DENIED') || (status === 400 && msg.includes('API_KEY_INVALID'))) {
    return new Error('Gemini API key is invalid or lacks required permissions. Check Settings > Secrets.');
  }
  if (status === 503 || msg.includes('UNAVAILABLE')) {
    return new Error('Gemini AI service is temporarily unavailable. Please try again shortly.');
  }
  return err instanceof Error ? err : new Error(msg || 'Gemini AI request failed.');
}

/**
 * Retries transient operations with exponential backoff and optional model fallback.
 */
export async function withRetry<T>(fn: (model: string) => Promise<T>, retries = 1, delayMs = 1000): Promise<T> {
  const models = [DEFAULT_MODEL, FALLBACK_MODEL];
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const currentModel = models[attempt] || DEFAULT_MODEL;
    try {
      return await fn(currentModel);
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 504 ||
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes('DEADLINE_EXCEEDED') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('timeout');

      if (!isTransient || attempt === retries) {
        throw formatGeminiError(err);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw formatGeminiError(lastError);
}

/**
 * Handles fetching series metadata using Gemini server-side.
 */
export async function getSeriesMetadata(query: string): Promise<SeriesMetadataResult> {
  const prompt = `Provide the official drama/movie details for the Boys' Love (BL) title: "${query}".`;
  const systemInstruction = `You are a specialized Asian Boys' Love (BL) encyclopedia assistant.
Identify the official production details for the given title.
Respond strictly in JSON adhering to this schema:
{
  "title": "Official Title in English or Romanized",
  "year": 2023,
  "country": "Thailand",
  "type": "Series",
  "totalEpisodes": 12,
  "genres": ["Romance", "Youth"],
  "synopsis": "Brief 1-2 sentence synopsis without spoilers."
}
Allowed countries: Thailand, Japan, South Korea, Taiwan, China, Hong Kong, Philippines, Vietnam, Singapore, Other.
Allowed types: Series, Movie.
Return raw JSON only without markdown formatting.`;

  return withRetry(async (model) => {
    const isLite = model.includes('lite');
    const response = await getAIClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        ...(isLite ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
      },
    });

    const parsed = extractJson<Record<string, any>>(response.text ?? '', {});
    if (!parsed || (!parsed.title && !parsed.year && !parsed.country)) {
      throw new Error('Failed to parse metadata from Gemini response.');
    }

    return {
      title: parsed.title || query,
      year: typeof parsed.year === 'number' ? parsed.year : undefined,
      country: parsed.country || 'Thailand',
      type: parsed.type === 'Movie' ? 'Movie' : 'Series',
      totalEpisodes: typeof parsed.totalEpisodes === 'number' ? Math.max(1, parsed.totalEpisodes) : 1,
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      synopsis: parsed.synopsis || '',
    };
  });
}

/**
 * Handles generating recommendations based on favorites and genres.
 */
export async function getRecommendations(
  favoriteTitles: string[],
  topGenres: string[],
): Promise<RecommendationResult[]> {
  const prompt = `User's favorite BL titles: ${favoriteTitles.slice(0, 10).join(', ') || 'Popular Asian BL dramas'}
User's preferred genres: ${topGenres.slice(0, 8).join(', ') || 'Romance, Drama'}
Recommend 4 officially released BL dramas or movies that the user would enjoy.`;

  const systemInstruction = `You are an expert Boys' Love (BL) drama curator.
Recommend 4 distinctive, acclaimed Asian BL series or movies that match the user's taste.
Respond strictly in JSON array format:
[
  {
    "title": "Title",
    "year": 2023,
    "country": "Thailand",
    "type": "Series",
    "totalEpisodes": 12,
    "reason": "1 concise sentence why they will love it based on their taste"
  }
]
Allowed countries: Thailand, Japan, South Korea, Taiwan, China, Hong Kong, Philippines, Vietnam, Singapore, Other.
Allowed types: Series, Movie.
Return raw JSON only without markdown formatting.`;

  return withRetry(async (model) => {
    const isLite = model.includes('lite');
    const response = await getAIClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        ...(isLite ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
      },
    });

    const parsed = extractJson<any[]>(response.text ?? '', []);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Failed to parse recommendations from Gemini response.');
    }

    return parsed.map((item) => ({
      title: item.title || 'Untitled',
      year: typeof item.year === 'number' ? item.year : new Date().getFullYear(),
      country: item.country || 'Thailand',
      type: item.type === 'Movie' ? 'Movie' : 'Series',
      totalEpisodes: typeof item.totalEpisodes === 'number' ? Math.max(1, item.totalEpisodes) : 12,
      reason: item.reason || 'Recommended based on your watchlist.',
    }));
  });
}

/**
 * General text generation.
 */
export async function generateContent(
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  return withRetry(async (model) => {
    const isLite = model.includes('lite');
    const response = await getAIClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        ...(isLite ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
      },
    });

    return response.text ?? '';
  });
}

/**
 * General streaming generation.
 */
export async function* generateContentStream(
  prompt: string,
  systemInstruction?: string,
): AsyncGenerator<string, void, unknown> {
  const isLite = DEFAULT_MODEL.includes('lite');
  const stream = await getAIClient().models.generateContentStream({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || undefined,
      ...(isLite ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
    },
  });

  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
