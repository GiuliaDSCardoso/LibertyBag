import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LS_URL_KEY = 'libertybag_supabase_url';
const LS_ANON_KEY = 'libertybag_supabase_anon_key';

// URL do projeto identificado no painel do Supabase da Giulia (nrakzeaqgrreeoqwadqj)
export const DEFAULT_PROJECT_SUPABASE_URL = 'https://nrakzeaqgrreeoqwadqj.supabase.co';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

  const localUrl =
    typeof window !== 'undefined' ? (localStorage.getItem(LS_URL_KEY) || '').trim() : '';
  const localAnon =
    typeof window !== 'undefined' ? (localStorage.getItem(LS_ANON_KEY) || '').trim() : '';

  const rawUrl = envUrl && !envUrl.includes('SEU-PROJETO') ? envUrl : localUrl;
  const url = rawUrl || DEFAULT_PROJECT_SUPABASE_URL;
  const anonKey =
    envAnon && !envAnon.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
      ? envAnon
      : localAnon;

  const isConfigured = Boolean(url && anonKey) && url.startsWith('http');

  return { url, anonKey, isConfigured };
}

export function saveSupabaseConfigLocal(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_URL_KEY, (url || DEFAULT_PROJECT_SUPABASE_URL).trim());
  localStorage.setItem(LS_ANON_KEY, anonKey.trim());
  cachedClient = null;
  cachedConfigKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const key = `${url}::${anonKey}`;
  if (!cachedClient || cachedConfigKey !== key) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    cachedConfigKey = key;
  }

  return cachedClient;
}
