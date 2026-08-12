import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSecureItem, setSecureItem, deleteSecureItem } from '../lib/secureStorage';
import { loadItem, saveItem, uid } from '../lib/storage';
import { askGemini, verifyGeminiKey, ChatMessage, GeminiError } from '../lib/gemini';

const API_KEY_STORAGE_KEY = 'gemini-api-key';
const MESSAGES_STORAGE_KEY = 'ai-chat-messages';

type AIContextValue = {
  ready: boolean;
  apiKey: string | null;
  connected: boolean;
  messages: ChatMessage[];
  sending: boolean;
  connecting: boolean;
  connectError: string | null;
  connectErrorStatus: number | null;
  connect: (key: string) => Promise<boolean>;
  saveKeyWithoutVerifying: (key: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendMessage: (text: string, systemPrompt: string) => Promise<void>;
  clearConversation: () => void;
  dismissLastError: () => void;
};

const AIContext = createContext<AIContextValue | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectErrorStatus, setConnectErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [key, msgs] = await Promise.all([
        getSecureItem(API_KEY_STORAGE_KEY),
        loadItem<ChatMessage[]>(MESSAGES_STORAGE_KEY, []),
      ]);
      setApiKeyState(key);
      setMessages(msgs);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) saveItem(MESSAGES_STORAGE_KEY, messages);
  }, [messages, ready]);

  const connect = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setConnectError('Please paste a valid API key.');
      setConnectErrorStatus(null);
      return false;
    }
    setConnecting(true);
    setConnectError(null);
    setConnectErrorStatus(null);
    try {
      await verifyGeminiKey(trimmed);
      await setSecureItem(API_KEY_STORAGE_KEY, trimmed);
      setApiKeyState(trimmed);
      setConnecting(false);
      return true;
    } catch (e) {
      const message = e instanceof GeminiError ? e.message : 'Could not verify this key. Please try again.';
      const status = e instanceof GeminiError ? e.status ?? null : null;
      setConnectError(message);
      setConnectErrorStatus(status);
      setConnecting(false);
      return false;
    }
  }, []);

  // Fallback path for when Gemini's verification handshake itself is
  // rate-limited (common seconds after creating a brand-new free-tier key).
  // We skip the verify ping and just store the key — any real problem with
  // it will surface with a clear error on the first actual chat message.
  const saveKeyWithoutVerifying = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setConnectError('Please paste a valid API key.');
      setConnectErrorStatus(null);
      return false;
    }
    await setSecureItem(API_KEY_STORAGE_KEY, trimmed);
    setApiKeyState(trimmed);
    setConnectError(null);
    setConnectErrorStatus(null);
    return true;
  }, []);

  const disconnect = useCallback(async () => {
    await deleteSecureItem(API_KEY_STORAGE_KEY);
    setApiKeyState(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string, systemPrompt: string) => {
      if (!apiKey) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = { id: uid(), role: 'user', text: trimmed, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);

      try {
        const nextHistory = [...messages, userMsg];
        const replyText = await askGemini({ apiKey, systemPrompt, history: nextHistory });
        const modelMsg: ChatMessage = { id: uid(), role: 'model', text: replyText, createdAt: new Date().toISOString() };
        setMessages((prev) => [...prev, modelMsg]);
      } catch (e) {
        const message = e instanceof GeminiError ? e.message : 'Something went wrong reaching Gemini.';
        const errMsg: ChatMessage = { id: uid(), role: 'model', text: message, createdAt: new Date().toISOString(), error: true };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setSending(false);
      }
    },
    [apiKey, messages]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const dismissLastError = useCallback(() => {
    setConnectError(null);
  }, []);

  const value = useMemo<AIContextValue>(
    () => ({
      ready,
      apiKey,
      connected: !!apiKey,
      messages,
      sending,
      connecting,
      connectError,
      connectErrorStatus,
      connect,
      saveKeyWithoutVerifying,
      disconnect,
      sendMessage,
      clearConversation,
      dismissLastError,
    }),
    [
      ready,
      apiKey,
      messages,
      sending,
      connecting,
      connectError,
      connectErrorStatus,
      connect,
      saveKeyWithoutVerifying,
      disconnect,
      sendMessage,
      clearConversation,
      dismissLastError,
    ]
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
}
