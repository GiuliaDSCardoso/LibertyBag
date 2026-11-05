import { db } from '../../db/dexie';
import { DEFAULT_USER_ID } from '../../db/seed';
import { getSupabaseClient } from '../../lib/supabase';
import { syncAllWithSupabase } from '../sync/syncService';

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
 * Monta o HTML completo estilizado do e-mail de confirmação do LibertyBag
 * (com o código de 6 dígitos e o botão de confirmação com 1 toque).
 * Pode ser aberto gratuitamente em uma nova aba HTML ou enviado via Google Apps Script.
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
  <title>Seu código de acesso ao LibertyBag: ${params.code}</title>
</head>
<body style="margin:0; padding:0; background-color:#FBF6EA; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#12206B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FBF6EA; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px; background-color:#FFFFFF; border:3px solid #2346C8; border-radius:28px; overflow:hidden; box-shadow:0 12px 32px rgba(18,32,107,0.10);">
          <tr>
            <td style="background-color:#2346C8; padding:28px 32px; text-align:center;">
              <div style="display:inline-block; background-color:#F8D56B; color:#12206B; font-weight:800; font-size:13px; padding:6px 16px; border-radius:999px; margin-bottom:12px;">
                ✿ LIBERTYBAG • FINANÇAS EM FAMÍLIA
              </div>
              <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-style:italic; font-size:30px; color:#FFFFFF; letter-spacing:-0.5px;">
                Confirme seu acesso
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px; text-align:center;">
              <p style="margin:0 0 12px; font-size:18px; font-weight:700; color:#12206B;">
                Olá, ${params.toName}! ☀️
              </p>
              <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#52608F;">
                Para: ${params.toEmail}
              </p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#12206B;">
                Aqui está o seu código de segurança de <strong>6 números</strong> para entrar no <strong>LibertyBag</strong>:
              </p>
              <div style="background-color:#FBF6EA; border:2px dashed #2346C8; border-radius:22px; padding:22px 16px; margin:0 auto 24px; max-width:320px;">
                <div style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:#2346C8; margin-bottom:8px;">
                  SEU CÓDIGO DE 6 DÍGITOS
                </div>
                <div style="font-size:38px; font-weight:800; letter-spacing:10px; color:#12206B; font-family:'Courier New', Courier, monospace;">
                  ${params.code}
                </div>
              </div>
              <p style="margin:0 0 18px; font-size:14px; line-height:1.5; color:#12206B;">
                Ou, se preferir entrar com apenas <strong>1 toque</strong>, clique no botão azul abaixo:
              </p>
              <div style="margin:0 0 26px;">
                <a href="${params.confirmLink}" style="display:inline-block; background-color:#2346C8; color:#FFFFFF; text-decoration:none; font-weight:800; font-size:16px; padding:16px 32px; border-radius:999px; box-shadow:0 6px 16px rgba(35,70,200,0.28);">
                  Confirmar meu acesso agora →
                </a>
              </div>
              <hr style="border:none; border-top:1px solid #BFD4F2; margin:24px 0;" />
              <p style="margin:0; font-size:12px; line-height:1.5; color:#52608F;">
                Este código vale por <strong>15 minutos</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#BFD4F2; padding:16px 24px; text-align:center; font-size:12px; font-weight:700; color:#12206B;">
              LibertyBag • Feito by Giulia Cardoso ✿
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
 * (sem duplicar linhas em `users`) e envia o e-mail HTML estilizado via Webhook Gratuito (Google Apps Script).
 * O envio via EmailJS está pausado conforme solicitado.
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

  // Salva na tabela auth_verifications e atualiza o usuário único existente em users (sem duplicar!)
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
      const canonicalUserId = existing.userId || DEFAULT_USER_ID;

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

  // Envio gratuito do E-mail HTML via Google Apps Script (VITE_FREE_EMAIL_WEBHOOK_URL)
  const freeWebhookUrl = FREE_EMAIL_DEFAULT_WEBHOOK_URL;

  if (freeWebhookUrl && freeWebhookUrl.startsWith('http')) {
    try {
      await fetch(freeWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to_email: cleanEmail,
          to_name: cleanName,
          verification_code: code,
          confirm_link: confirmLink,
          html_body: buildStyledVerificationEmailHTML({
            toName: cleanName,
            toEmail: cleanEmail,
            code,
            confirmLink
          })
        })
      });
      return {
        code,
        confirmLink,
        emailSent: true
      };
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message : 'Não foi possível conectar ao serviço de e-mail HTML.';
      return {
        code,
        confirmLink,
        emailSent: false,
        errorDetail: detail
      };
    }
  }

  /*
   * Envio pelo EmailJS pausado para testar exclusivamente o envio com E-mail HTML gratuito:
   *
   * await emailjs.send(
   *   EMAILJS_DEFAULT_SERVICE_ID,
   *   EMAILJS_DEFAULT_TEMPLATE_ID,
   *   {
   *     to_email: cleanEmail,
   *     to_name: cleanName,
   *     verification_code: code,
   *     confirm_link: confirmLink,
   *     app_name: 'LibertyBag'
   *   },
   *   { publicKey: EMAILJS_DEFAULT_PUBLIC_KEY }
   * );
   */

  return {
    code,
    confirmLink,
    emailSent: false,
    errorDetail: 'URL do webhook de e-mail HTML não configurada.'
  };
}

/**
 * Valida o código de 6 dígitos digitado pelo usuário ou recebido via link `?confirm_email=...&code=...`
 */
export async function verifySixDigitCode(
  email: string,
  inputCode: string
): Promise<{ valid: boolean; message: string; name?: string }> {
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
    await markUserVerifiedInDatabases(cleanEmail, pending.name, cleanCode);
    return {
      valid: true,
      message: 'Acesso confirmado com sucesso!',
      name: pending.name
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
          await markUserVerifiedInDatabases(
            cleanEmail,
            String(data.name || cleanEmail.split('@')[0]),
            cleanCode
          );
          return {
            valid: true,
            message: 'Acesso confirmado com sucesso!',
            name: String(data.name || cleanEmail.split('@')[0])
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
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  const existingLocalAcc = memoryAccounts.get(cleanEmail);
  if (existingLocalAcc) {
    saveLocalAccount({
      ...existingLocalAcc,
      name: name || existingLocalAcc.name,
      verifiedOnDevice: true
    });
  }

  // Garante um único usuário local em db.users sem duplicações
  const allLocalUsers = await db.users.toArray();
  const extraIds = allLocalUsers
    .filter((u) => u.id !== DEFAULT_USER_ID)
    .map((u) => u.id);
  if (extraIds.length > 0) {
    await db.users.bulkDelete(extraIds);
  }

  await db.users.put({
    id: DEFAULT_USER_ID,
    name,
    email: cleanEmail,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const existing = await checkUserExistsByEmail(cleanEmail);
      const canonicalId = existing.userId || DEFAULT_USER_ID;

      // Remove qualquer linha órfã/duplicada com outro ID para o mesmo e-mail ou placeholder
      await supabase
        .from('users')
        .delete()
        .eq('email', 'local@libertybag.app');

      await supabase.from('users').upsert(
        {
          id: canonicalId,
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
 */
export async function registerUserAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  ok: boolean;
  error?: string;
  fieldErrors?: AuthFieldErrors;
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

  // 2. Se o Supabase estiver conectado, registra na tabela public.users (sem chamar /auth/v1/token)
  if (import.meta.env.MODE !== 'test') {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await db.transactions.clear();
        await db.recurrences.clear();
        await db.budgets.clear();
        await db.savings_goals.clear();
        await db.goal_movements.clear();
        await db.trips.clear();
        await db.trip_items.clear();

        await supabase
          .from('users')
          .delete()
          .eq('email', 'local@libertybag.app');

        await supabase.from('users').upsert(
          {
            id: DEFAULT_USER_ID,
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
      } catch {
        // continua offline se sem internet
      }
    }
  }

  // 3. Salva conta localmente em memória aguardando a primeira confirmação do código de 6 dígitos no dispositivo
  saveLocalAccount({
    email: cleanEmail,
    name: cleanName,
    password: input.password,
    createdAt: now,
    verifiedOnDevice: false
  });

  return { ok: true };
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

  return {
    ok: true,
    name: existing.name || localAcc?.name || cleanEmail.split('@')[0],
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
