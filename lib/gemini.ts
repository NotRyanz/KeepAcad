export type ChatRole = 'user' | 'model';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  error?: boolean;
};

const MODEL = 'gemini-flash-latest';
const ENDPOINT = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

export class GeminiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageForStatus(status: number, apiMsg?: string): string {
  if (status === 400 && apiMsg?.toLowerCase().includes('api key')) {
    return 'That API key looks invalid. Double-check it and try again.';
  }
  if (status === 403) {
    return 'This API key is not authorized. Make sure the Generative Language API is enabled for it.';
  }
  if (status === 404) {
    return 'This Gemini model is unavailable for your key right now. Try again in a moment.';
  }
  if (status === 429) {
    return "Gemini's free tier is briefly rate-limited. This is common right after creating a new key — it usually resolves within a minute.";
  }
  if (status === 503) {
    return "Google Gemini is currently experiencing very high demand. The app tried to automatically retry, but Google's servers are still full. Please try again in a few minutes.";
  }
  if (apiMsg) return apiMsg;
  return `Gemini request failed (${status}).`;
}

/**
 * Low-level call to the Gemini generateContent endpoint. Automatically
 * retries a couple of times (with short backoff) on 429 responses only,
 * since those are frequently transient — especially seconds after a brand
 * new free-tier key is created, before Google's rate-limit bucket settles.
 * Any other error status is thrown immediately.
 */
async function requestGemini(params: { apiKey: string; body: object; maxRetries?: number }): Promise<any> {
  const { apiKey, body, maxRetries = 2 } = params;
  let lastError: GeminiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new GeminiError('Could not reach Gemini. Check your internet connection.');
    }

    if (response.ok) {
      return await response.json();
    }

    let apiMsg: string | undefined;
    try {
      const errJson = await response.json();
      apiMsg = errJson?.error?.message;
    } catch (e) {
      // ignore parse failure
    }

    lastError = new GeminiError(messageForStatus(response.status, apiMsg), response.status);

    const canRetry = (response.status === 429 || response.status === 503) && attempt < maxRetries;
    if (!canRetry) throw lastError;

    await sleep(2500 * (attempt + 1)); // slightly longer backoff for 503s
  }

  throw lastError ?? new GeminiError('Gemini request failed.');
}

/**
 * Sends the running conversation (plus a system instruction carrying live
 * app context) to the Gemini API and returns the model's reply text.
 * Throws GeminiError with a friendly message on failure.
 */
export async function askGemini(params: {
  apiKey: string;
  systemPrompt: string;
  history: ChatMessage[];
}): Promise<string> {
  const { apiKey, systemPrompt, history } = params;

  const contents = history
    .filter((m) => !m.error)
    .map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 800,
    },
  };

  const data = await requestGemini({ apiKey, body });
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  if (!text) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new GeminiError('The response was blocked by safety filters. Try rephrasing your question.');
    }
    throw new GeminiError('Gemini returned an empty response. Please try again.');
  }
  return text.trim();
}

/**
 * Quick sanity check used right after the user pastes a key — sends a tiny,
 * cheap request so we can surface "invalid key" errors immediately during
 * setup rather than on the user's first real question. Retries automatically
 * on transient 429s before giving up.
 */
export async function verifyGeminiKey(apiKey: string): Promise<void> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Reply with only the word OK.' }] }],
    generationConfig: { maxOutputTokens: 5, temperature: 0 },
  };
  await requestGemini({ apiKey, body, maxRetries: 2 });
}
