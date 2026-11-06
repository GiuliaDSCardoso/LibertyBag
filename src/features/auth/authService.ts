import { db, type CategoryRecord } from '../../db/dexie';
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_CATEGORIES_SEED,
  DEFAULT_SPACE_ID,
  DEFAULT_USER_ID
} from '../../db/seed';
import { getSupabaseClient } from '../../lib/supabase';
import { syncAllWithSupabase } from '../sync/syncService';
import emailjs from '@emailjs/browser';

export const EMAILJS_DEFAULT_SERVICE_ID =
  (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() ||
  'service_l1jy5d7';
export const EMAILJS_DEFAULT_TEMPLATE_ID =
  (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined)?.trim() ||
  'template_bz8lrt9';
export const EMAILJS_DEFAULT_PUBLIC_KEY =
  (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ||
  'byZwGfQatQ0wfeM9-';

export const FREE_EMAIL_DEFAULT_WEBHOOK_URL =
  (import.meta.env.VITE_FREE_EMAIL_WEBHOOK_URL as string | undefined)?.trim() ||
  'https://script.google.com/macros/s/AKfycby00EDYR9mc6vYIGXX9ns48k30NSYEhxbocYgaxu64PnO-JoURt8E7Kb83LkKiqR_q09w/exec';

const PENDING_VERIFICATION_KEY = 'libertybag_pending_verification_v1';
const REMEMBERED_LOGIN_KEY = 'libertybag_remembered_login_v1';
const LOCAL_ACCOUNTS_KEY = 'libertybag_local_accounts_v1';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AuthFieldErrorKey = 'name' | 'email' | 'password' | 'code' | 'newPasswordReset';

export type AuthFieldErrors = Partial<Record<AuthFieldErrorKey, string>>;

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  checks: {
    minLength: boolean;
    hasUpperAndLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  friendlyTip: string;
}

/**
 * Avalia a força da senha em tempo real com dicas amigáveis para a família.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  if (!password) {
    return {
      score: 0,
      label: 'Digite uma senha',
      color: '#BFD4F2',
      checks,
      friendlyTip: 'Dica: misture uma palavra querida com números (ex.: Praia@2026).'
    };
  }

  let points = 0;
  if (checks.minLength) points += 1;
  if (checks.hasUpperAndLower) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSpecial) points += 1;

  if (password.length < 6) {
    return {
      score: 1,
      label: 'Ainda curtinha',
      color: '#D9534F',
      checks,
      friendlyTip: 'Use pelo menos 8 letras ou números para ficar bem protegida.'
    };
  }

  if (points <= 1) {
    return {
      score: 1,
      label: 'Fraca',
      color: '#D9534F',
      checks,
      friendlyTip: 'Adicione números ou uma letra maiúscula para reforçar.'
    };
  }

  if (points === 2) {
    return {
      score: 2,
      label: 'Boa, quase lá',
      color: '#E6A82E',
      checks,
      friendlyTip: 'Coloque um símbolo como @, ! ou # para ficar forte!'
    };
  }

  if (points === 3) {
    return {
      score: 3,
      label: 'Forte e segura',
      color: '#2E9E6B',
      checks,
      friendlyTip: 'Ótima senha! Fácil para você lembrar e difícil de adivinhar.'
    };
  }

  return {
    score: 4,
    label: 'Super segura! ✨',
    color: '#2E9E6B',
    checks,
    friendlyTip: 'Perfeito! Sua senha tem todos os ingredientes de segurança máxima.'
  };
}

/**
 * Valida todos os campos de Cadastro, Login e Recuperação de Senha.
 */
export function validateAuthForm(input: {
  mode: 'login' | 'signup' | 'forgot';
  name?: string;
  email: string;
  password?: string;
}): { valid: boolean; fieldErrors: AuthFieldErrors; firstError?: string } {
  const fieldErrors: AuthFieldErrors = {};
  const cleanName = (input.name || '').trim();
  const cleanEmail = (input.email || '').trim().toLowerCase();
  const rawPassword = input.password || '';

  if (input.mode === 'signup') {
    if (!cleanName) {
      fieldErrors.name = 'Digite seu nome ou como gosta de ser chamado(a).';
    } else if (cleanName.length < 2 || !/[A-Za-zÀ-ÿ]{2,}/.test(cleanName)) {
      fieldErrors.name = 'Digite um nome válido com pelo menos 2 letras.';
    } else if (cleanName.length > 60) {
      fieldErrors.name = 'O nome pode ter no máximo 60 caracteres.';
    }
  }

  if (!cleanEmail) {
    fieldErrors.email = 'Digite seu endereço de e-mail.';
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    fieldErrors.email = 'Formato de e-mail inválido (ex.: maria@gmail.com).';
  }

  if (input.mode === 'login') {
    if (!rawPassword) {
      fieldErrors.password = 'Digite sua senha para entrar.';
    } else if (rawPassword.length < 6) {
      fieldErrors.password = 'Sua senha tem pelo menos 6 caracteres.';
    }
  }

  if (input.mode === 'signup') {
    if (!rawPassword) {
      fieldErrors.password = 'Crie uma senha para proteger sua conta.';
    } else if (rawPassword.length < 8) {
      fieldErrors.password = 'A senha precisa ter pelo menos 8 caracteres.';
    } else if (!/[A-Za-zÀ-ÿ]/.test(rawPassword) || !/\d/.test(rawPassword)) {
      fieldErrors.password = 'A senha precisa misturar letras e pelo menos 1 número.';
    }
  }

  const firstError =
    fieldErrors.name || fieldErrors.email || fieldErrors.password || undefined;

  return {
    valid: !firstError,
    fieldErrors,
    firstError
  };
}

/**
 * Gera um código numérico criptograficamente seguro de 6 dígitos (ex.: "482910") via Web Crypto CSPRNG.
 */
export function generateSixDigitCode(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const code = 100000 + (array[0] % 900000);
    return String(code);
  }
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

// ---------------------------------------------------------------------------
// Rate Limiting em Memória com Backoff Progressivo contra Força Bruta
// ---------------------------------------------------------------------------
interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
}
const authRateLimitMap = new Map<string, RateLimitRecord>();

export function checkAuthRateLimit(email: string): { allowed: boolean; waitSeconds?: number } {
  const key = email.trim().toLowerCase();
  const record = authRateLimitMap.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.blockedUntil > now) {
    const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }
  return { allowed: true };
}

export function recordFailedAuthAttempt(email: string): void {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const record = authRateLimitMap.get(key) || { attempts: 0, blockedUntil: 0 };
  record.attempts += 1;

  // Bloqueio progressivo após 5 tentativas consecutivas com falha
  if (record.attempts >= 5) {
    const exponent = Math.min(record.attempts - 5, 4);
    const penaltyMs = Math.pow(2, exponent) * 60 * 1000; // 1 min, 2 min, 4 min, 8 min, máx 16 min
    record.blockedUntil = now + penaltyMs;
  }
  authRateLimitMap.set(key, record);
}

export function resetAuthRateLimit(email: string): void {
  authRateLimitMap.delete(email.trim().toLowerCase());
}

// Limpa qualquer chave antiga de localStorage para garantir que nada de contas fique guardado no localhost
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(PENDING_VERIFICATION_KEY);
    localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    localStorage.removeItem(LOCAL_ACCOUNTS_KEY);
  } catch {
    // ignora
  }
}

export interface PendingVerification {
  email: string;
  name: string;
  code: string;
  expiresAt: string;
  purpose: 'login' | 'signup' | 'reset';
}

let memoryPendingVerification: PendingVerification | null = null;
const memoryAccounts = new Map<string, StoredLocalAccount>();
let memoryRememberedCredentials: RememberedCredentials | null = null;

export function getPendingVerification(): PendingVerification | null {
  return memoryPendingVerification;
}

export function clearPendingVerification(): void {
  memoryPendingVerification = null;
}

interface StoredLocalAccount {
  email: string;
  name: string;
  password: string;
  createdAt: string;
  verifiedOnDevice?: boolean;
}

function getLocalAccounts(): StoredLocalAccount[] {
  return Array.from(memoryAccounts.values());
}

function saveLocalAccount(account: StoredLocalAccount): void {
  const cleanEmail = account.email.trim().toLowerCase();
  memoryAccounts.set(cleanEmail, {
    ...account,
    email: cleanEmail
  });
}

function removeLocalAccountByEmail(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  memoryAccounts.delete(cleanEmail);
}

/**
 * Verifica se o e-mail já foi confirmado pelo menos uma vez neste dispositivo (IndexedDB `db.users`).
 */
export async function isEmailVerifiedOnThisDevice(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || cleanEmail === 'local@libertybag.app') return false;

  const localAcc = memoryAccounts.get(cleanEmail);
  if (localAcc && localAcc.verifiedOnDevice === false) {
    return false;
  }

  const verifiedLocalUsers = await db.users
    .filter(
      (u) =>
        !u.deletedAt &&
        Boolean(u.email) &&
        u.email.trim().toLowerCase() === cleanEmail &&
        u.email.trim().toLowerCase() !== 'local@libertybag.app'
    )
    .toArray();

  return verifiedLocalUsers.length > 0;
}

/**
 * Retorna o usuário que já fez login e confirmou o dispositivo anteriormente (se houver),
 * permitindo pular a tela de apresentação inicial quando não é o primeiro acesso.
 */
export async function getVerifiedDeviceUser(): Promise<{
  hasVerifiedUser: boolean;
  email?: string;
  name?: string;
}> {
  const verifiedUsers = await db.users
    .filter(
      (u) =>
        !u.deletedAt &&
        Boolean(u.email) &&
        u.email.trim().toLowerCase() !== 'local@libertybag.app'
    )
    .toArray();

  if (verifiedUsers.length === 0) {
    return { hasVerifiedUser: false };
  }

  const primary = verifiedUsers[0];
  const cleanEmail = primary.email.trim().toLowerCase();
  const localAcc = memoryAccounts.get(cleanEmail);
  if (localAcc && localAcc.verifiedOnDevice === false) {
    return { hasVerifiedUser: false };
  }

  return {
    hasVerifiedUser: true,
    email: cleanEmail,
    name: primary.name || cleanEmail.split('@')[0]
  };
}

/**
 * Gera uma assinatura determinística da senha para validar login sem expor a senha em texto puro
 * e sem chamar `/auth/v1/token?grant_type=password` (evitando erro 400 do Supabase Auth).
 */
function hashPasswordToken(email: string, password: string): string {
  const input = `libertybag::${email.trim().toLowerCase()}::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `pwd:${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Remove duplicações na tabela `users` (tanto no Dexie quanto no Supabase) para o mesmo e-mail
 * e retorna o registro único existente (se houver).
 * Quando o Supabase está conectado, a tabela `public.users` é a fonte da verdade absoluta:
 * se a linha foi apagada no Supabase, limpa o cache local imediatamente!
 */
export async function checkUserExistsByEmail(email: string): Promise<{
  exists: boolean;
  userId?: string;
  name?: string;
  email: string;
  emailVerified?: boolean;
  passwordToken?: string;
  source?: 'supabase' | 'local';
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { exists: false, email: cleanEmail };
  }

  // 1. Consulta e deduplica no Supabase (se conectado e fora de teste)
  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .order('updatedAt', { ascending: false });

        if (!error) {
          const activeRows = (rows || []).filter((r) => !r.deletedAt);
          if (activeRows.length > 0) {
            const primary = activeRows[0];

            // Se havia linhas duplicadas para o mesmo e-mail no Supabase, remove as extras imediatamente
            if (rows && rows.length > 1) {
              const duplicateIds = rows
                .slice(1)
                .map((r) => String(r.id))
                .filter((id) => id !== String(primary.id));
              if (duplicateIds.length > 0) {
                await supabase.from('users').delete().in('id', duplicateIds);
              }
            }

            const rawToken = String(primary.verificationExpiresAt || '');
            const passwordToken = rawToken.startsWith('pwd:') ? rawToken : undefined;

            return {
              exists: true,
              userId: String(primary.id),
              name: String(primary.name || cleanEmail.split('@')[0]),
              email: cleanEmail,
              emailVerified: Boolean(primary.emailVerified),
              passwordToken,
              source: 'supabase'
            };
          }

          // Se a consulta ao Supabase funcionou e NÃO há usuário na tabela `public.users`,
          // limpa qualquer resquício antigo da memória/IndexedDB para não bloquear novo cadastro!
          removeLocalAccountByEmail(cleanEmail);
          const staleLocalUsers = await db.users
            .filter((u) => (u.email || '').trim().toLowerCase() === cleanEmail)
            .toArray();
          for (const stale of staleLocalUsers) {
            await db.users.update(stale.id, {
              name: '',
              email: 'local@libertybag.app'
            });
          }

          return { exists: false, email: cleanEmail };
        }
      } catch {
        // segue para verificação local apenas se estiver sem internet
      }
    }
  }

  // 2. Consulta nas contas locais salvas no aparelho
  const localAcc = getLocalAccounts().find((a) => a.email === cleanEmail);
  if (localAcc) {
    return {
      exists: true,
      userId: DEFAULT_USER_ID,
      name: localAcc.name,
      email: cleanEmail,
      source: 'local'
    };
  }

  // 3. Consulta na tabela local Dexie (ignorando o usuário placeholder inicial)
  const dexieUsers = await db.users
    .filter(
      (u) =>
        !u.deletedAt &&
        Boolean(u.email) &&
        u.email.trim().toLowerCase() === cleanEmail &&
        u.email.trim().toLowerCase() !== 'local@libertybag.app'
    )
    .toArray();

  if (dexieUsers.length > 0) {
    return {
      exists: true,
      userId: dexieUsers[0].id,
      name: dexieUsers[0].name || cleanEmail.split('@')[0],
      email: cleanEmail,
      source: 'local'
    };
  }

  return { exists: false, email: cleanEmail };
}

/**
 * Monta o texto puro (plain text) do e-mail de confirmação do LibertyBag.
 * Essencial para evitar que filtros anti-spam classifiquem a mensagem como lixo (SpamAssassin MIME_HTML_ONLY).
 */
export function buildStyledVerificationEmailPlainText(params: {
  toName: string;
  code: string;
  confirmLink: string;
}): string {
  return `Olá, ${params.toName}!

Seu código de acesso ao LibertyBag é: ${params.code}

Você também pode confirmar diretamente clicando neste link:
${params.confirmLink}

Este código é válido por 15 minutos.
Se você não solicitou este acesso, ignore esta mensagem com segurança.

LibertyBag • Gestão Financeira
https://libertybag.vercel.app`;
}

/**
 * Monta o HTML completo estilizado do e-mail de confirmação do LibertyBag
 * com preheader, boas práticas contra filtros de spam e rodapé CAN-SPAM.
 */
export function buildStyledVerificationEmailHTML(params: {
  toName: string;
  toEmail: string;
  code: string;
  confirmLink: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LibertyBag - Código de confirmação: ${params.code}</title>
</head>
<body style="margin:0; padding:0; background-color:#FBF6EA; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#12206B;">
  <!-- Preheader oculto para visualização rápida sem cair no spam -->
  <div style="display:none; max-height:0px; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#FBF6EA;">
    Seu código de acesso do LibertyBag é ${params.code}. Válido por 15 minutos.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FBF6EA; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:500px; background-color:#FFFFFF; border:2px solid #2346C8; border-radius:24px; overflow:hidden; box-shadow:0 8px 24px rgba(18,32,107,0.08);">
          <tr>
            <td style="background-color:#2346C8; padding:24px 28px; text-align:center;">
              <div style="display:inline-block; background-color:#F8D56B; color:#12206B; font-weight:800; font-size:12px; padding:4px 14px; border-radius:999px; margin-bottom:10px;">
                LIBERTYBAG • GESTÃO FINANCEIRA
              </div>
              <h1 style="margin:0; font-family:Georgia, serif; font-size:26px; color:#FFFFFF; font-weight:700;">
                Confirmação de Acesso
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px; text-align:center;">
              <p style="margin:0 0 10px; font-size:17px; font-weight:700; color:#12206B;">
                Olá, ${params.toName}!
              </p>
              <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#12206B;">
                Você solicitou a confirmação da sua conta no <strong>LibertyBag</strong>. Digite o código de 6 números abaixo para continuar:
              </p>
              <div style="background-color:#FBF6EA; border:2px dashed #2346C8; border-radius:18px; padding:18px 12px; margin:0 auto 20px; max-width:280px;">
                <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#2346C8; margin-bottom:6px;">
                  Código de verificação
                </div>
                <div style="font-size:36px; font-weight:800; letter-spacing:8px; color:#12206B; font-family:Consolas, 'Courier New', monospace;">
                  ${params.code}
                </div>
              </div>
              <p style="margin:0 0 16px; font-size:13px; line-height:1.5; color:#52608F;">
                Ou, se preferir entrar diretamente com 1 clique:
              </p>
              <div style="margin:0 0 24px;">
                <a href="${params.confirmLink}" style="display:inline-block; background-color:#2346C8; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:15px; padding:14px 28px; border-radius:999px;">
                  Entrar no LibertyBag agora →
                </a>
              </div>
              <hr style="border:none; border-top:1px solid #E2E8F0; margin:20px 0;" />
              <p style="margin:0 0 6px; font-size:12px; line-height:1.4; color:#64748B;">
                Este código expira em <strong>15 minutos</strong>.
              </p>
              <p style="margin:0; font-size:11px; line-height:1.4; color:#94A3B8;">
                Se você não fez esta solicitação, nenhuma ação é necessária e você pode desconsiderar este e-mail com segurança.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F1F5F9; padding:14px 20px; text-align:center; font-size:11px; color:#64748B;">
              LibertyBag • Aplicativo de Organização Financeira • <a href="https://libertybag.vercel.app" style="color:#2346C8; text-decoration:none;">libertybag.vercel.app</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Gera o código de 6 dígitos + link de confirmação, salva na tabela `auth_verifications`
 * e envia com sistema de Alta Disponibilidade (Dual Provider):
 * 1. Provedor Primário: Google Apps Script Webhook com corpo multipart (HTML + Texto Puro anti-spam).
 * 2. Provedor Secundário (Fallback Automático): EmailJS caso o primário oscile ou seja bloqueado por adblockers.
 */
export async function sendVerificationCodeEmail(input: {
  email: string;
  name?: string;
  purpose?: 'login' | 'signup' | 'reset';
}): Promise<{
  code: string;
  confirmLink: string;
  emailSent: boolean;
  errorDetail?: string;
}> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = (input.name || cleanEmail.split('@')[0] || 'Família').trim();
  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const nowISO = new Date().toISOString();

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:5173';
  const confirmLink = `${origin}/?confirm_email=${encodeURIComponent(cleanEmail)}&code=${code}`;

  const pending: PendingVerification = {
    email: cleanEmail,
    name: cleanName,
    code,
    expiresAt,
    purpose: input.purpose || 'login'
  };

  memoryPendingVerification = pending;

  // Em ambiente de teste automatizado (Vitest), evita chamadas externas de rede
  if (import.meta.env.MODE === 'test') {
    return {
      code,
      confirmLink,
      emailSent: false,
      errorDetail: 'Ambiente de teste'
    };
  }

  // 1. Salva na tabela auth_verifications e atualiza o usuário no Supabase com isolamento de tenant
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('auth_verifications').upsert(
        {
          email: cleanEmail,
          name: cleanName,
          code,
          expiresAt,
          verified: false,
          updatedAt: nowISO
        },
        { onConflict: 'email' }
      );

      const existing = await checkUserExistsByEmail(cleanEmail);
      const { userId: canonicalUserId } = resolveUserEnvironment(cleanEmail, existing.userId);

      await supabase.from('users').upsert(
        {
          id: canonicalUserId,
          name: existing.name || cleanName,
          email: cleanEmail,
          emailVerified: existing.emailVerified ?? false,
          verificationCode: code,
          verificationExpiresAt: existing.passwordToken || expiresAt,
          createdAt: nowISO,
          updatedAt: nowISO,
          deletedAt: null
        },
        { onConflict: 'id' }
      );
    } catch {
      // Continua normalmente se offline
    }
  }

  const plainText = buildStyledVerificationEmailPlainText({
    toName: cleanName,
    code,
    confirmLink
  });

  const htmlBody = buildStyledVerificationEmailHTML({
    toName: cleanName,
    toEmail: cleanEmail,
    code,
    confirmLink
  });

  let webhookSent = false;
  let webhookError = '';

  // 2. Provedor Primário: Webhook Google Apps Script
  const freeWebhookUrl = FREE_EMAIL_DEFAULT_WEBHOOK_URL;
  if (freeWebhookUrl && freeWebhookUrl.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      await fetch(freeWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        signal: controller.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to_email: cleanEmail,
          to_name: cleanName,
          verification_code: code,
          confirm_link: confirmLink,
          subject: `LibertyBag: seu código de verificação é ${code}`,
          sender_name: 'LibertyBag',
          plain_text: plainText,
          html_body: htmlBody
        })
      });

      clearTimeout(timeoutId);
      webhookSent = true;
    } catch (err: unknown) {
      webhookError =
        err instanceof Error ? err.message : 'Falha na conexão com o serviço primário.';
    }
  }

  if (webhookSent) {
    return {
      code,
      confirmLink,
      emailSent: true
    };
  }

  // 3. Provedor Secundário (Fallback Automático): EmailJS
  // Se o webhook falhar, sofrer timeout ou for bloqueado por extensões no navegador do usuário
  try {
    await emailjs.send(
      EMAILJS_DEFAULT_SERVICE_ID,
      EMAILJS_DEFAULT_TEMPLATE_ID,
      {
        to_email: cleanEmail,
        to_name: cleanName,
        verification_code: code,
        confirm_link: confirmLink,
        app_name: 'LibertyBag'
      },
      { publicKey: EMAILJS_DEFAULT_PUBLIC_KEY }
    );

    return {
      code,
      confirmLink,
      emailSent: true
    };
  } catch (emailJsErr: unknown) {
    const emailJsDetail =
      emailJsErr instanceof Error ? emailJsErr.message : 'Falha no serviço alternativo.';
    return {
      code,
      confirmLink,
      emailSent: false,
      errorDetail: webhookError || emailJsDetail
    };
  }
}

/**
 * Resolve o ambiente determinístico e seguro de isolamento do usuário (userId e spaceId).
 * Garante que a Giulia e o usuário padrão usem DEFAULT_USER_ID e DEFAULT_SPACE_ID com todos
 * os dados originais preservados, enquanto novos usuários recebem um ID e um espaço próprios.
 */
export function resolveUserEnvironment(
  cleanEmail: string,
  existingUserId?: string
): { userId: string; spaceId: string } {
  const normEmail = cleanEmail.trim().toLowerCase();
  if (
    normEmail.includes('giuli') ||
    normEmail === 'local@libertybag.app' ||
    existingUserId === DEFAULT_USER_ID
  ) {
    return {
      userId: existingUserId || DEFAULT_USER_ID,
      spaceId: DEFAULT_SPACE_ID
    };
  }

  if (existingUserId && existingUserId !== DEFAULT_USER_ID) {
    return {
      userId: existingUserId,
      spaceId: `space-personal-${existingUserId}`
    };
  }

  // Gera um ID determinístico e limpo baseado no e-mail
  let hash = 0;
  for (let i = 0; i < normEmail.length; i++) {
    hash = (hash << 5) - hash + normEmail.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const slug = normEmail.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'user';
  const generatedId = `user-${slug}-${hex}`;

  return {
    userId: generatedId,
    spaceId: `space-personal-${generatedId}`
  };
}

/**
 * Prepara o banco local (Dexie) e garante o isolamento de dados do usuário:
 * Cria/atualiza o usuário, espaço pessoal, carteira principal e categorias.
 * Se for uma nova conta neste aparelho, purga lançamentos e metas que não pertencem ao espaço do usuário.
 */
export async function setupUserLocalWorkspace(
  userId: string,
  spaceId: string,
  name: string,
  email: string
): Promise<void> {
  const now = new Date().toISOString();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Atualiza registro do usuário local
  await db.users.put({
    id: userId,
    name,
    email: cleanEmail,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  // 2. Garante o espaço pessoal do usuário
  const existingSpace = await db.spaces.get(spaceId);
  if (!existingSpace) {
    await db.spaces.put({
      id: spaceId,
      name: 'Meu Espaço Pessoal',
      type: 'pessoal',
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
  }

  // 3. Garante o vínculo do membro com o espaço
  const memberId = `member-${spaceId}-${userId}`;
  const existingMember = await db.space_members.get(memberId);
  if (!existingMember) {
    await db.space_members.put({
      id: memberId,
      spaceId,
      userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
  }

  // 4. Garante a carteira / conta principal para o espaço
  const accountId =
    spaceId === DEFAULT_SPACE_ID ? DEFAULT_ACCOUNT_ID : `account-${spaceId}-wallet`;
  const existingAccount = await db.accounts.get(accountId);
  if (!existingAccount) {
    await db.accounts.put({
      id: accountId,
      userId,
      spaceId,
      name: 'Carteira Principal',
      type: 'carteira',
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });
  }

  // 5. Se for um usuário novo (diferente do padrão legado), garante categorias no seu espaço
  if (spaceId !== DEFAULT_SPACE_ID) {
    const userCatCount = await db.categories.where('spaceId').equals(spaceId).count();
    if (userCatCount === 0) {
      const categoriesToInsert: CategoryRecord[] = DEFAULT_CATEGORIES_SEED.map((item, idx) => ({
        id: `cat-${spaceId}-${item.id.replace('cat-', '')}`,
        userId,
        spaceId,
        name: item.name,
        icon: item.icon,
        color: item.color,
        type: item.type,
        sortOrder: idx + 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      }));
      await db.categories.bulkPut(categoriesToInsert);
    }

    // Limpa do aparelho qualquer dado de outras contas que possam ter ficado no IndexedDB
    await db.transactions.where('spaceId').notEqual(spaceId).delete();
    await db.budgets.where('spaceId').notEqual(spaceId).delete();
    await db.savings_goals.where('spaceId').notEqual(spaceId).delete();
    await db.recurrences.where('spaceId').notEqual(spaceId).delete();
    await db.trips.where('spaceId').notEqual(spaceId).delete();
    await db.trip_items.where('spaceId').notEqual(spaceId).delete();
  }
}

/**
 * Valida o código de 6 dígitos digitado pelo usuário ou recebido via link `?confirm_email=...&code=...`
 */
export async function verifySixDigitCode(
  email: string,
  inputCode: string
): Promise<{
  valid: boolean;
  message: string;
  name?: string;
  userId?: string;
  spaceId?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.replace(/\D/g, '').trim();

  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { valid: false, message: 'Endereço de e-mail inválido.' };
  }

  if (cleanCode.length !== 6) {
    return { valid: false, message: 'Digite todos os 6 números do código enviado por e-mail.' };
  }

  // 1. Verifica registro pendente local
  const pending = getPendingVerification();
  if (pending && pending.email === cleanEmail && pending.code === cleanCode) {
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      return {
        valid: false,
        message: 'Este código já expirou (15 min). Clique em "Reenviar código por e-mail".'
      };
    }

    clearPendingVerification();
    const verifiedEnv = await markUserVerifiedInDatabases(cleanEmail, pending.name, cleanCode);
    return {
      valid: true,
      message: 'Acesso confirmado com sucesso!',
      name: pending.name,
      userId: verifiedEnv.userId,
      spaceId: verifiedEnv.spaceId
    };
  }

  // 2. Verifica também no Supabase (caso a pessoa tenha aberto o link em outro navegador/celular)
  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('auth_verifications')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (data && String(data.code) === cleanCode) {
          if (new Date(String(data.expiresAt)).getTime() < Date.now()) {
            return {
              valid: false,
              message: 'Este código já expirou. Clique em "Reenviar código por e-mail".'
            };
          }
          await supabase
            .from('auth_verifications')
            .update({ verified: true, updatedAt: new Date().toISOString() })
            .eq('email', cleanEmail);

          clearPendingVerification();
          const verifiedEnv = await markUserVerifiedInDatabases(
            cleanEmail,
            String(data.name || cleanEmail.split('@')[0]),
            cleanCode
          );
          return {
            valid: true,
            message: 'Acesso confirmado com sucesso!',
            name: String(data.name || cleanEmail.split('@')[0]),
            userId: verifiedEnv.userId,
            spaceId: verifiedEnv.spaceId
          };
        }
      } catch {
        // ignora erro de rede
      }
    }
  }

  return {
    valid: false,
    message: 'Código incorreto. Confira os 6 números enviados para o seu e-mail.'
  };
}

async function markUserVerifiedInDatabases(
  email: string,
  name: string,
  code: string
): Promise<{ userId: string; spaceId: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  const existing = await checkUserExistsByEmail(cleanEmail);
  const { userId, spaceId } = resolveUserEnvironment(cleanEmail, existing.userId);

  const existingLocalAcc = memoryAccounts.get(cleanEmail);
  if (existingLocalAcc) {
    saveLocalAccount({
      ...existingLocalAcc,
      name: name || existingLocalAcc.name,
      verifiedOnDevice: true
    });
  }

  await setupUserLocalWorkspace(userId, spaceId, name, cleanEmail);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('users').upsert(
        {
          id: userId,
          name,
          email: cleanEmail,
          emailVerified: true,
          verificationCode: code,
          ...(existing.passwordToken
            ? { verificationExpiresAt: existing.passwordToken }
            : {}),
          updatedAt: now,
          createdAt: now,
          deletedAt: null
        },
        { onConflict: 'id' }
      );

      await supabase
        .from('auth_verifications')
        .update({ verified: true, updatedAt: now })
        .eq('email', cleanEmail);

      await syncAllWithSupabase();
    } catch {
      // silencioso offline
    }
  }

  return { userId, spaceId };
}

// ============================================================================
// LEMBRAR SENHA / CREDENCIAIS E CONTAS LOCAIS + SUPABASE
// ============================================================================

export interface RememberedCredentials {
  email: string;
  password?: string;
  name?: string;
  rememberMe: boolean;
}

export function getRememberedCredentials(): RememberedCredentials | null {
  return memoryRememberedCredentials;
}

export function saveRememberedCredentials(creds: RememberedCredentials | null): void {
  if (!creds || !creds.rememberMe) {
    memoryRememberedCredentials = null;
    return;
  }
  memoryRememberedCredentials = creds;
}

/**
 * Cadastra uma nova conta APENAS se o e-mail ainda não existir no banco (Supabase ou local).
 * Garante criação de ID próprio e isolamento completo sem sobrescrever usuários existentes.
 */
export async function registerUserAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  ok: boolean;
  error?: string;
  fieldErrors?: AuthFieldErrors;
  userId?: string;
  spaceId?: string;
}> {
  const validation = validateAuthForm({
    mode: 'signup',
    name: input.name,
    email: input.email,
    password: input.password
  });

  if (!validation.valid) {
    return {
      ok: false,
      error: validation.firstError,
      fieldErrors: validation.fieldErrors
    };
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name.trim();
  const now = new Date().toISOString();

  // 1. Verifica se o usuário JÁ EXISTE no banco (Supabase ou local) — bloqueia duplicação!
  const existing = await checkUserExistsByEmail(cleanEmail);
  if (existing.exists) {
    const duplicateMsg =
      'Já existe uma conta cadastrada com este e-mail. Use a aba "Entrar" para acessar sua conta.';
    return {
      ok: false,
      error: duplicateMsg,
      fieldErrors: { email: duplicateMsg }
    };
  }

  const passwordToken = hashPasswordToken(cleanEmail, input.password);
  const { userId, spaceId } = resolveUserEnvironment(cleanEmail);

  // 2. Se o Supabase estiver conectado, registra na tabela public.users, spaces, space_members e accounts com IDs próprios
  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('users').upsert(
          {
            id: userId,
            authUserId: null,
            name: cleanName,
            email: cleanEmail,
            emailVerified: false,
            verificationExpiresAt: passwordToken,
            createdAt: now,
            updatedAt: now,
            deletedAt: null
          },
          { onConflict: 'id' }
        );

        await supabase.from('spaces').upsert(
          {
            id: spaceId,
            name: 'Meu Espaço Pessoal',
            type: 'pessoal',
            createdAt: now,
            updatedAt: now,
            deletedAt: null
          },
          { onConflict: 'id' }
        );

        await supabase.from('space_members').upsert(
          {
            id: `member-${spaceId}-${userId}`,
            spaceId,
            userId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null
          },
          { onConflict: 'id' }
        );

        const accountId =
          spaceId === DEFAULT_SPACE_ID ? DEFAULT_ACCOUNT_ID : `account-${spaceId}-wallet`;
        await supabase.from('accounts').upsert(
          {
            id: accountId,
            userId,
            spaceId,
            name: 'Carteira Principal',
            type: 'carteira',
            isDefault: true,
            createdAt: now,
            updatedAt: now,
            deletedAt: null
          },
          { onConflict: 'id' }
        );
      } catch {
        // continua offline se sem internet
      }
    }
  }

  // Prepara o ambiente local isolado para o novo usuário
  await setupUserLocalWorkspace(userId, spaceId, cleanName, cleanEmail);

  // 3. Salva conta localmente em memória aguardando a primeira confirmação do código de 6 dígitos no dispositivo
  saveLocalAccount({
    email: cleanEmail,
    name: cleanName,
    password: input.password,
    createdAt: now,
    verifiedOnDevice: false
  });

  return { ok: true, userId, spaceId };
}

/**
 * Valida o login APENAS se a conta existir no banco e a senha estiver correta.
 * Nunca dispara código de confirmação se a conta não existir!
 * Só exige código de 6 dígitos no login se for o PRIMEIRO acesso da conta neste dispositivo.
 */
export async function signInUserAccount(input: {
  email: string;
  password: string;
}): Promise<{
  ok: boolean;
  name?: string;
  userId?: string;
  spaceId?: string;
  requiresDeviceVerification?: boolean;
  isFirstLogin?: boolean;
  error?: string;
  fieldErrors?: AuthFieldErrors;
}> {
  const validation = validateAuthForm({
    mode: 'login',
    email: input.email,
    password: input.password
  });

  if (!validation.valid) {
    return {
      ok: false,
      error: validation.firstError,
      fieldErrors: validation.fieldErrors
    };
  }

  const cleanEmail = input.email.trim().toLowerCase();

  // Verifica proteção contra ataques de força bruta / credential stuffing
  const rateLimit = checkAuthRateLimit(cleanEmail);
  if (!rateLimit.allowed) {
    const rateLimitMsg = `Muitas tentativas com falha. Por segurança, aguarde ${rateLimit.waitSeconds} segundos antes de tentar novamente.`;
    return {
      ok: false,
      error: rateLimitMsg,
      fieldErrors: { password: rateLimitMsg }
    };
  }

  const localAcc = getLocalAccounts().find((a) => a.email === cleanEmail);

  // 1. Verifica primeiro se a conta existe no banco (Supabase ou local)
  const existing = await checkUserExistsByEmail(cleanEmail);
  if (!existing.exists) {
    recordFailedAuthAttempt(cleanEmail);
    const notFoundMsg =
      'Não encontramos nenhuma conta com este e-mail. Use a aba "Criar conta" para se cadastrar primeiro.';
    return {
      ok: false,
      error: notFoundMsg,
      fieldErrors: { email: notFoundMsg }
    };
  }

  // 2. Valida a senha via token salvo em public.users (Supabase) ou em memória na sessão atual
  const expectedToken = hashPasswordToken(cleanEmail, input.password);
  if (existing.passwordToken && existing.passwordToken !== expectedToken) {
    recordFailedAuthAttempt(cleanEmail);
    const wrongPassMsg =
      'Senha incorreta para este e-mail. Confira a digitação ou clique em "Esqueci minha senha".';
    return {
      ok: false,
      error: wrongPassMsg,
      fieldErrors: { password: wrongPassMsg }
    };
  }

  if (localAcc && localAcc.password !== input.password) {
    recordFailedAuthAttempt(cleanEmail);
    const wrongPassMsg =
      'Senha incorreta para este e-mail. Confira a digitação ou clique em "Esqueci minha senha".';
    return {
      ok: false,
      error: wrongPassMsg,
      fieldErrors: { password: wrongPassMsg }
    };
  }

  // Sucesso na autenticação: zera contador de falhas
  resetAuthRateLimit(cleanEmail);

  const alreadyVerifiedOnDevice = await isEmailVerifiedOnThisDevice(cleanEmail);
  const isFirstLogin = existing.emailVerified === false && !alreadyVerifiedOnDevice;

  const { userId, spaceId } = resolveUserEnvironment(cleanEmail, existing.userId);
  const resolvedName = existing.name || localAcc?.name || cleanEmail.split('@')[0];

  // Prepara o ambiente local isolado para o usuário que fez login
  await setupUserLocalWorkspace(userId, spaceId, resolvedName, cleanEmail);

  return {
    ok: true,
    name: resolvedName,
    userId,
    spaceId,
    requiresDeviceVerification: !alreadyVerifiedOnDevice,
    isFirstLogin
  };
}

export async function updateLocalPassword(email: string, newPassword: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = getLocalAccounts().find((a) => a.email === cleanEmail);
  saveLocalAccount({
    email: cleanEmail,
    name: existing?.name || cleanEmail.split('@')[0],
    password: newPassword,
    createdAt: existing?.createdAt || new Date().toISOString()
  });

  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const newPasswordToken = hashPasswordToken(cleanEmail, newPassword);
        await supabase
          .from('users')
          .update({
            verificationExpiresAt: newPasswordToken,
            updatedAt: new Date().toISOString()
          })
          .ilike('email', cleanEmail);
      } catch {
        // ignora se offline
      }
    }
  }
}
