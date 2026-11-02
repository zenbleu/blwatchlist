export interface GeminiSeriesSuggestion {
  title: string;
  year?: number;
  country?: string;
  type?: 'Series' | 'Movie';
  totalEpisodes?: number;
  genres?: string[];
  synopsis?: string;
}

export interface GeminiRecommendation {
  title: string;
  year: number;
  country: string;
  type: 'Series' | 'Movie';
  totalEpisodes: number;
  reason: string;
}

export interface GeminiServerStatus {
  status: string;
  configured: boolean;
  model: string;
}

/**
 * Checks server Gemini status.
 */
export async function getGeminiServerStatus(): Promise<GeminiServerStatus> {
  try {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch {
    return { status: 'offline', configured: false, model: 'gemini-3.1-flash-lite' };
  }
}

/**
 * Requests series metadata from the server-side Gemini service.
 */
export async function fetchSeriesMetadataWithAI(query: string): Promise<GeminiSeriesSuggestion> {
  const response = await fetch('/api/gemini/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Requests personalized recommendations from the server-side Gemini service.
 */
export async function fetchRecommendationsWithAI(
  favoriteTitles: string[],
  topGenres: string[],
): Promise<GeminiRecommendation[]> {
  const response = await fetch('/api/gemini/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favoriteTitles, topGenres }),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * General text generation using server-side Gemini endpoint.
 */
export async function generateContentWithAI(
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * Streaming generation from server-side SSE endpoint.
 */
export async function generateContentStreamWithAI(
  prompt: string,
  onChunk: (text: string) => void,
  systemInstruction?: string,
): Promise<void> {
  const response = await fetch('/api/gemini/generate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!response.ok || !response.body) {
    let errorMsg = `Streaming failed (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.text) {
            onChunk(parsed.text);
          }
        } catch {
          // ignore malformed SSE line
        }
      }
    }
  }
}
