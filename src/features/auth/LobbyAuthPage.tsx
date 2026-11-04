import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Heart,
  PiggyBank,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../app/store/useAppStore';
import {
  type AuthFieldErrors,
  checkUserExistsByEmail,
  evaluatePasswordStrength,
  getRememberedCredentials,
  registerUserAccount,
  saveRememberedCredentials,
  sendVerificationCodeEmail,
  signInUserAccount,
  updateLocalPassword,
  validateAuthForm,
  verifySixDigitCode
} from './authService';
import {
  MatisseFlower,
  SunIllustration,
  WaveIllustration
} from '../../components/illustrations/BeachIllustrations';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpButton } from '../../components/ui/HelpButton';

type AuthStep = 'lobby' | 'login' | 'signup' | 'forgot' | 'verify';

export const LobbyAuthPage: React.FC = () => {
  const { theme, setTheme, loginUser, showUndoToast } = useAppStore();
  const shouldReduceMotion = useReducedMotion();

  const remembered = getRememberedCredentials();

  const [step, setStep] = useState<AuthStep>('lobby');
  const [name, setName] = useState(remembered?.name || '');
  const [email, setEmail] = useState(remembered?.email || '');
  const [password, setPassword] = useState(remembered?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(remembered?.rememberMe ?? true);

  // Estado da etapa de verificação de 6 dígitos
  const [codeDigits, setCodeDigits] = useState('');
  const [verifyPurpose, setVerifyPurpose] = useState<'login' | 'signup' | 'reset'>('login');
  const [newPasswordReset, setNewPasswordReset] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'error' | 'info' | 'success';
    text: string;
  } | null>(null);

  const strength = evaluatePasswordStrength(password);

  const clearErrors = () => {
    setFieldErrors({});
    setFeedbackMsg(null);
  };

  // Verifica automaticamente se a pessoa clicou no link de confirmação enviado no e-mail (?confirm_email=...&code=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get('confirm_email');
    const urlCode = params.get('code');

    if (urlEmail && urlCode) {
      setEmail(urlEmail);
      setCodeDigits(urlCode);
      setStep('verify');

      void verifySixDigitCode(urlEmail, urlCode).then((res) => {
        if (res.valid) {
          window.history.replaceState({}, '', window.location.pathname);
          loginUser({
            name: res.name || urlEmail.split('@')[0],
            email: urlEmail
          });
          showUndoToast('E-mail confirmado pelo link! Bem-vindo(a)!', async () => {});
        } else {
          setFieldErrors({ code: res.message });
          setFeedbackMsg({ type: 'error', text: res.message });
        }
      });
    }
  }, [loginUser, showUndoToast]);

  const handleStartLoginOrSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const mode = step === 'signup' ? 'signup' : 'login';
    const validation = validateAuthForm({
      mode,
      name,
      email,
      password
    });

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setFeedbackMsg({
        type: 'error',
        text: validation.firstError || 'Verifique os campos destacados abaixo.'
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let userDisplayName = name.trim() || cleanEmail.split('@')[0];

    setIsSubmitting(true);
    try {
      if (step === 'signup') {
        const reg = await registerUserAccount({
          name: name.trim(),
          email: cleanEmail,
          password
        });
        if (!reg.ok) {
          if (reg.fieldErrors) setFieldErrors(reg.fieldErrors);
          setFeedbackMsg({
            type: 'error',
            text: reg.error || 'Não foi possível criar a conta.'
          });
          return;
        }
      } else {
        // LOGIN: só prossegue e só envia código se a conta existir no banco e a senha estiver certa!
        const sign = await signInUserAccount({
          email: cleanEmail,
          password
        });
        if (!sign.ok) {
          if (sign.fieldErrors) setFieldErrors(sign.fieldErrors);
          setFeedbackMsg({
            type: 'error',
            text: sign.error || 'E-mail ou senha incorretos.'
          });
          return;
        }
        if (sign.name) {
          userDisplayName = sign.name;
          if (!name) setName(sign.name);
        }
      }

      // Salva preferência de "Lembrar senha"
      saveRememberedCredentials(
        rememberMe
          ? {
              email: cleanEmail,
              password,
              name: userDisplayName,
              rememberMe: true
            }
          : null
      );

      const purpose = step === 'signup' ? 'signup' : 'login';
      setVerifyPurpose(purpose);

      // Envia o e-mail com o código de 6 dígitos + link de confirmação pelo EmailJS
      const emailRes = await sendVerificationCodeEmail({
        email: cleanEmail,
        name: userDisplayName,
        purpose
      });

      setStep('verify');
      setCodeDigits('');

      if (emailRes.emailSent) {
        setFeedbackMsg({
          type: 'info',
          text: `Enviamos um código de 6 dígitos e um link de confirmação para ${cleanEmail}! Confira sua caixa de entrada (e a pasta Spam).`
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `Não foi possível enviar o e-mail (${emailRes.errorDetail || 'verifique o template no EmailJS'}).`
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const validation = validateAuthForm({
      mode: 'forgot',
      email
    });

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setFeedbackMsg({
        type: 'error',
        text: validation.firstError || 'Digite um e-mail válido.'
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    setIsSubmitting(true);
    try {
      // Só envia código de recuperação se a conta realmente existir no banco
      const existing = await checkUserExistsByEmail(cleanEmail);
      if (!existing.exists) {
        const msg =
          'Não encontramos nenhuma conta cadastrada com este e-mail. Verifique se digitou certo ou crie sua conta.';
        setFieldErrors({ email: msg });
        setFeedbackMsg({ type: 'error', text: msg });
        return;
      }

      setVerifyPurpose('reset');
      const emailRes = await sendVerificationCodeEmail({
        email: cleanEmail,
        name: existing.name || name.trim() || cleanEmail.split('@')[0],
        purpose: 'reset'
      });

      setStep('verify');
      setCodeDigits('');

      if (emailRes.emailSent) {
        setFeedbackMsg({
          type: 'info',
          text: `Enviamos um código de 6 dígitos para ${cleanEmail} para você escolher uma senha nova.`
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `O EmailJS retornou um aviso: ${emailRes.errorDetail || 'verifique o template no EmailJS'}.`
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSixDigitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const cleanCode = codeDigits.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      const msg = 'Digite os 6 números do código enviado para o seu e-mail.';
      setFieldErrors({ code: msg });
      setFeedbackMsg({ type: 'error', text: msg });
      return;
    }

    if (verifyPurpose === 'reset') {
      if (!newPasswordReset || newPasswordReset.length < 8) {
        const msg = 'A nova senha precisa ter pelo menos 8 caracteres.';
        setFieldErrors({ newPasswordReset: msg });
        setFeedbackMsg({ type: 'error', text: msg });
        return;
      }
      if (!/[A-Za-zÀ-ÿ]/.test(newPasswordReset) || !/\d/.test(newPasswordReset)) {
        const msg = 'A nova senha precisa misturar letras e pelo menos 1 número.';
        setFieldErrors({ newPasswordReset: msg });
        setFeedbackMsg({ type: 'error', text: msg });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await verifySixDigitCode(email, cleanCode);
      if (!res.valid) {
        setFieldErrors({ code: res.message });
        setFeedbackMsg({ type: 'error', text: res.message });
        return;
      }

      if (verifyPurpose === 'reset') {
        await updateLocalPassword(email, newPasswordReset);
        if (rememberMe) {
          saveRememberedCredentials({
            email: email.trim().toLowerCase(),
            password: newPasswordReset,
            name: res.name || name || email.split('@')[0],
            rememberMe: true
          });
        }
      }

      const finalName = res.name || name.trim() || email.split('@')[0];
      loginUser({
        name: finalName,
        email: email.trim().toLowerCase()
      });
      showUndoToast(`Bem-vindo(a), ${finalName}!`, async () => {});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    clearErrors();
    setIsSubmitting(true);
    try {
      const emailRes = await sendVerificationCodeEmail({
        email,
        name: name.trim() || email.split('@')[0],
        purpose: verifyPurpose
      });
      if (emailRes.emailSent) {
        setFeedbackMsg({
          type: 'success',
          text: `Novo código de 6 dígitos enviado para ${email}!`
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `Não foi possível enviar (${emailRes.errorDetail || 'confira o template no EmailJS'}).`
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-blue-deep text-blue-deep dark:text-cream transition-colors flex flex-col justify-between">
      {/* Barra Superior Fofa da Lobby Page */}
      <header className="max-w-[1200px] w-full mx-auto px-[clamp(16px,4vw,48px)] pt-5 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={shouldReduceMotion ? {} : { rotate: [0, 8, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-12 h-12 rounded-2xl bg-blue-royal flex items-center justify-center shadow-soft shrink-0"
          >
            <MatisseFlower size={36} />
          </motion.div>
          <div>
            <span className="font-serif italic text-2xl sm:text-3xl font-bold text-blue-royal dark:text-sun block leading-none">
              LibertyBag
            </span>
            <span className="text-xs sm:text-sm font-semibold text-blue-deep/80 dark:text-cream/80 block mt-0.5">
              Finanças simples em família
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTheme(theme === 'noite' ? 'praia' : 'noite')}
            aria-label="Alternar tema claro ou escuro"
            className="min-h-[48px] px-4 rounded-pill bg-white dark:bg-[#192B85] border border-blue-sky/80 font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-card"
          >
            {theme === 'noite' ? <Sun size={18} className="text-sun" /> : <Moon size={18} />}
            <span className="hidden sm:inline">
              {theme === 'noite' ? 'Tema Praia' : 'Tema Noite'}
            </span>
          </button>

          <HelpButton
            title="Bem-vindo(a) ao LibertyBag!"
            explanation="Este é o aplicativo de finanças feito para cuidar do dinheiro da casa com paz e sem palavras difíceis. Você pode criar sua conta ou entrar com seu e-mail e confirmar com o código de 6 números enviado para você."
            example="Marque a caixinha 'Lembrar minha senha neste aparelho' para não precisar digitar tudo da próxima vez!"
          />
        </div>
      </header>

      {/* Conteúdo Central: Lobby Page ou Formulário de Login / Cadastro / Código 6 Dígitos */}
      <main className="max-w-[1200px] w-full mx-auto px-[clamp(16px,4vw,48px)] py-6 flex-1 flex items-center">
        <AnimatePresence mode="wait">
          {step === 'lobby' ? (
            <motion.div
              key="lobby-view"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-7 items-center"
            >
              {/* Coluna Principal da Lobby (7 colunas): Hero Card "Rayo" Fofo */}
              <div className="lg:col-span-7">
                <Card variant="framed" withFlowerWatermark className="shadow-soft">
                  <div className="space-y-6 py-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-sun text-blue-deep text-xs sm:text-sm font-extrabold shadow-xs">
                      <Heart size={16} className="text-red-soft fill-red-soft shrink-0" />
                      <span>Para todos, com amor</span>
                    </div>

                    <div className="space-y-3">
                      <h1 className="font-serif italic font-bold text-blue-royal dark:text-sun text-[clamp(2rem,4vw,3.1rem)] leading-[1.12]">
                        Cuidar do dinheiro da casa pode ser leve como um dia de praia.
                      </h1>
                      <p className="text-base sm:text-lg text-blue-deep/90 dark:text-cream/90 leading-relaxed">
                        Sem gráficos confusos nem palavras difíceis. Anote seus gastos em{' '}
                        <strong>3 toques</strong>, planeje seus <strong>Cofrinhos</strong> e
                        acompanhe tudo com tranquilidade.
                      </p>
                    </div>

                    {/* Ilustrações fofas alinhadas */}
                    <div className="flex items-center gap-4 pt-1">
                      <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#192B85] border border-blue-sky/70 flex items-center gap-3 shadow-xs">
                        <SunIllustration size={40} />
                        <div className="text-xs">
                          <strong className="block text-sm text-blue-royal dark:text-sun">
                            100% Simples
                          </strong>
                          <span>Sem jargão de banco</span>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#192B85] border border-blue-sky/70 flex items-center gap-3 shadow-xs">
                        <WaveIllustration size={40} />
                        <div className="text-xs">
                          <strong className="block text-sm text-blue-royal dark:text-sun">
                            Funciona Offline
                          </strong>
                          <span>No celular e computador</span>
                        </div>
                      </div>
                    </div>

                    {/* Botões principais de ação da Lobby Page */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          clearErrors();
                          setStep('login');
                        }}
                      >
                        <LogIn size={20} />
                        <span>Entrar na minha conta</span>
                      </Button>

                      <Button
                        variant="sun"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          clearErrors();
                          setStep('signup');
                        }}
                      >
                        <UserPlus size={20} />
                        <span>Criar minha conta</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Coluna Direita da Lobby (5 colunas): 3 Cartões Fofos explicando o app */}
              <div className="lg:col-span-5 space-y-4">
                <Card variant="white" staggerIndex={1} className="space-y-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-royal text-white flex items-center justify-center shrink-0">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h2 className="title-section text-blue-royal dark:text-sun">
                        Anote em 3 toques
                      </h2>
                      <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1 leading-relaxed">
                        Digite o valor, escolha se o dinheiro <strong>Saiu</strong> ou{' '}
                        <strong>Entrou</strong> e toque na categoria. Tudo pode ser desfeito se errar!
                      </p>
                    </div>
                  </div>
                </Card>

                <Card variant="sun" staggerIndex={2} className="space-y-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-deep text-sun flex items-center justify-center shrink-0">
                      <PiggyBank size={24} />
                    </div>
                    <div>
                      <h2 className="title-section text-blue-deep">
                        Cofrinhos e Parcelas sem susto
                      </h2>
                      <p className="text-sm text-blue-deep/90 mt-1 leading-relaxed">
                        Acompanhe compras no crédito, Pix parcelado com ou sem entrada, viagens e veja quanto guardar por mês.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card variant="sky" staggerIndex={3} className="space-y-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-green-ok text-white flex items-center justify-center shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h2 className="title-section text-blue-deep dark:text-white">
                        Acesso seguro por código
                      </h2>
                      <p className="text-sm text-blue-deep/90 dark:text-cream/90 mt-1 leading-relaxed">
                        Confirmação simples com código de <strong>6 números</strong> e link direto enviados para o seu e-mail.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          ) : step === 'verify' ? (
            /* =================================================================
               TELA DE CONFIRMAÇÃO DO CÓDIGO DE 6 DÍGITOS (EMAILJS)
               ================================================================= */
            <motion.div
              key="verify-view"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              className="max-w-xl w-full mx-auto"
            >
              <Card variant="framed" withFlowerWatermark>
                <form onSubmit={handleConfirmSixDigitCode} noValidate className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearErrors();
                        setStep('login');
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-royal dark:text-sun hover:underline"
                    >
                      <ArrowLeft size={18} />
                      <span>Voltar</span>
                    </button>

                    <span className="px-3 py-1 rounded-pill bg-sun text-blue-deep text-xs font-extrabold">
                      Confirmação de Segurança
                    </span>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-blue-royal text-white flex items-center justify-center mx-auto shadow-soft">
                      <Mail size={28} />
                    </div>
                    <h1 className="title-page text-blue-royal dark:text-sun">
                      Digite o código de 6 números
                    </h1>
                    <p className="text-sm sm:text-base text-blue-deep/85 dark:text-cream/85">
                      Enviamos um e-mail para <strong>{email}</strong> com o seu código de 6
                      dígitos e um botão de confirmação direta.
                    </p>
                  </div>

                  {feedbackMsg && (
                    <div
                      role="alert"
                      className={`p-3.5 rounded-2xl text-sm font-bold border ${
                        feedbackMsg.type === 'error'
                          ? 'bg-red-soft/15 text-red-soft border-red-soft/40'
                          : 'bg-blue-sky/55 dark:bg-[#192B85] text-blue-deep dark:text-cream border-blue-royal/30'
                      }`}
                    >
                      {feedbackMsg.text}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="six-digit-input"
                      className="block text-center font-bold text-sm mb-2"
                    >
                      Código de 6 dígitos
                    </label>
                    <input
                      id="six-digit-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      value={codeDigits}
                      onChange={(e) => {
                        setCodeDigits(e.target.value.replace(/\D/g, '').slice(0, 6));
                        if (fieldErrors.code) {
                          setFieldErrors((prev) => ({ ...prev, code: undefined }));
                        }
                      }}
                      placeholder="000000"
                      aria-invalid={Boolean(fieldErrors.code)}
                      className={`w-full min-h-[64px] px-4 rounded-2xl bg-white dark:bg-[#192B85] border-2 text-center font-sans font-extrabold text-3xl tracking-[0.35em] tabular-nums ${
                        fieldErrors.code ? 'border-red-soft' : 'border-blue-royal'
                      }`}
                    />
                    {fieldErrors.code && (
                      <p className="mt-1.5 text-xs font-bold text-red-soft flex items-center justify-center gap-1.5">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{fieldErrors.code}</span>
                      </p>
                    )}
                  </div>

                  {verifyPurpose === 'reset' && (
                    <div>
                      <label htmlFor="new-reset-pass" className="block font-bold text-sm mb-1.5">
                        Escolha sua senha nova
                      </label>
                      <input
                        id="new-reset-pass"
                        type="password"
                        value={newPasswordReset}
                        onChange={(e) => {
                          setNewPasswordReset(e.target.value);
                          if (fieldErrors.newPasswordReset) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              newPasswordReset: undefined
                            }));
                          }
                        }}
                        placeholder="Mínimo de 8 caracteres (letras e números)"
                        aria-invalid={Boolean(fieldErrors.newPasswordReset)}
                        className={`w-full min-h-[52px] px-4 rounded-2xl bg-white dark:bg-[#192B85] border-2 font-bold ${
                          fieldErrors.newPasswordReset ? 'border-red-soft' : 'border-blue-sky'
                        }`}
                      />
                      {fieldErrors.newPasswordReset && (
                        <p className="mt-1.5 text-xs font-bold text-red-soft flex items-center gap-1.5">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{fieldErrors.newPasswordReset}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={isSubmitting}
                    >
                      <Check size={20} />
                      <span>Confirmar e entrar no LibertyBag</span>
                    </Button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isSubmitting}
                      className="w-full min-h-[46px] rounded-pill text-sm font-bold text-blue-royal dark:text-sun inline-flex items-center justify-center gap-2 hover:bg-blue-sky/35 transition-colors"
                    >
                      <RefreshCw size={16} />
                      <span>Não recebeu? Reenviar código por e-mail</span>
                    </button>
                  </div>
                </form>
              </Card>
            </motion.div>
          ) : (
            /* =================================================================
               TELA DE LOGIN / CADASTRO / ESQUECI A SENHA COM MEDIDOR ANIMADO
               ================================================================= */
            <motion.div
              key="auth-form-view"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              className="max-w-xl w-full mx-auto"
            >
              <Card variant="framed" withFlowerWatermark>
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearErrors();
                        setStep('lobby');
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-royal dark:text-sun hover:underline"
                    >
                      <ArrowLeft size={18} />
                      <span>Voltar para o início</span>
                    </button>
                  </div>

                  {/* Seletor de Abas: Entrar vs. Criar Conta */}
                  {step !== 'forgot' && (
                    <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#192B85] border border-blue-sky">
                      <button
                        type="button"
                        onClick={() => {
                          clearErrors();
                          setStep('login');
                        }}
                        className={`min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          step === 'login'
                            ? 'bg-blue-royal text-white shadow-xs'
                            : 'text-blue-deep dark:text-cream'
                        }`}
                      >
                        <LogIn size={18} />
                        <span>Entrar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          clearErrors();
                          setStep('signup');
                        }}
                        className={`min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          step === 'signup'
                            ? 'bg-blue-royal text-white shadow-xs'
                            : 'text-blue-deep dark:text-cream'
                        }`}
                      >
                        <UserPlus size={18} />
                        <span>Criar conta</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <h1 className="title-page text-blue-royal dark:text-sun">
                      {step === 'login'
                        ? 'Que bom ver você!'
                        : step === 'signup'
                          ? 'Crie sua conta em 1 minuto'
                          : 'Recuperar minha senha'}
                    </h1>
                    <p className="text-sm text-blue-deep/85 dark:text-cream/85 mt-1">
                      {step === 'login'
                        ? 'Entre com seu e-mail e senha para receber seu código de confirmação.'
                        : step === 'signup'
                          ? 'Preencha seus dados abaixo. Enviaremos um código de 6 dígitos para confirmar seu e-mail.'
                          : 'Enviaremos um código de 6 dígitos para o seu e-mail para você escolher uma senha nova.'}
                    </p>
                  </div>

                  {feedbackMsg && (
                    <div
                      role="alert"
                      className={`p-3.5 rounded-2xl text-sm font-bold border ${
                        feedbackMsg.type === 'error'
                          ? 'bg-red-soft/15 text-red-soft border-red-soft/40'
                          : 'bg-blue-sky/55 text-blue-deep border-blue-royal/30'
                      }`}
                    >
                      {feedbackMsg.text}
                    </div>
                  )}

                  <form
                    onSubmit={
                      step === 'forgot' ? handleStartForgotPassword : handleStartLoginOrSignup
                    }
                    noValidate
                    className="space-y-4"
                  >
                    {/* Nome (no cadastro) */}
                    {step === 'signup' && (
                      <div>
                        <label
                          htmlFor="auth-name"
                          className="flex items-center gap-2 font-bold text-sm mb-1.5"
                        >
                          <User size={18} className="text-blue-royal dark:text-sun" />
                          <span>Como você gosta de ser chamado(a)?</span>
                        </label>
                        <input
                          id="auth-name"
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (fieldErrors.name) {
                              setFieldErrors((prev) => ({ ...prev, name: undefined }));
                            }
                          }}
                          placeholder="Ex.: Dona Maria, Giulia..."
                          aria-invalid={Boolean(fieldErrors.name)}
                          className={`w-full min-h-[52px] px-4 rounded-2xl bg-white dark:bg-[#192B85] border-2 font-bold ${
                            fieldErrors.name ? 'border-red-soft' : 'border-blue-sky'
                          }`}
                        />
                        {fieldErrors.name && (
                          <p className="mt-1.5 text-xs font-bold text-red-soft flex items-center gap-1.5">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{fieldErrors.name}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* E-mail */}
                    <div>
                      <label
                        htmlFor="auth-email"
                        className="flex items-center gap-2 font-bold text-sm mb-1.5"
                      >
                        <Mail size={18} className="text-blue-royal dark:text-sun" />
                        <span>Seu e-mail</span>
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) {
                            setFieldErrors((prev) => ({ ...prev, email: undefined }));
                          }
                        }}
                        placeholder="Ex.: maria@gmail.com"
                        aria-invalid={Boolean(fieldErrors.email)}
                        className={`w-full min-h-[52px] px-4 rounded-2xl bg-white dark:bg-[#192B85] border-2 font-bold ${
                          fieldErrors.email ? 'border-red-soft' : 'border-blue-sky'
                        }`}
                      />
                      {fieldErrors.email && (
                        <p className="mt-1.5 text-xs font-bold text-red-soft flex items-center gap-1.5">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{fieldErrors.email}</span>
                        </p>
                      )}
                    </div>

                    {/* Senha + Olhinho para mostrar/esconder */}
                    {step !== 'forgot' && (
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor="auth-password"
                            className="flex items-center gap-2 font-bold text-sm"
                          >
                            <Lock size={18} className="text-blue-royal dark:text-sun" />
                            <span>Sua senha</span>
                          </label>

                          {step === 'login' && (
                            <button
                              type="button"
                              onClick={() => {
                                clearErrors();
                                setStep('forgot');
                              }}
                              className="text-xs font-bold text-blue-royal dark:text-sun underline"
                            >
                              Esqueci minha senha
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            id="auth-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (fieldErrors.password) {
                                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                              }
                            }}
                            placeholder={
                              step === 'signup'
                                ? 'Mínimo de 8 caracteres (letras e números)'
                                : 'Digite sua senha'
                            }
                            aria-invalid={Boolean(fieldErrors.password)}
                            className={`w-full min-h-[52px] pl-4 pr-14 rounded-2xl bg-white dark:bg-[#192B85] border-2 font-bold ${
                              fieldErrors.password ? 'border-red-soft' : 'border-blue-sky'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-blue-deep/75 dark:text-cream/75 hover:bg-blue-sky/30"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="mt-1.5 text-xs font-bold text-red-soft flex items-center gap-1.5">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{fieldErrors.password}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* ANIMAÇÃO E DICA DE SENHA SEGURA (visível no Cadastro e quando digita senha) */}
                    {step !== 'forgot' && (step === 'signup' || password.length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 rounded-2xl bg-white dark:bg-[#192B85] border border-blue-sky space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-deep/80 dark:text-cream/80">
                            Segurança da sua senha:
                          </span>
                          <motion.span
                            key={strength.label}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-xs font-extrabold px-2.5 py-0.5 rounded-pill text-white"
                            style={{ backgroundColor: strength.color }}
                          >
                            {strength.label}
                          </motion.span>
                        </div>

                        {/* Barra animada de 4 níveis */}
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((lvl) => {
                            const active = strength.score >= lvl;
                            return (
                              <div
                                key={lvl}
                                className="h-2.5 rounded-pill bg-cream dark:bg-blue-deep overflow-hidden"
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: active ? '100%' : '0%' }}
                                  transition={{ duration: 0.25 }}
                                  className="h-full rounded-pill"
                                  style={{ backgroundColor: strength.color }}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Checklist animado dos 4 ingredientes de senha segura */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {[
                            {
                              ok: strength.checks.minLength,
                              text: 'Pelo menos 8 caracteres'
                            },
                            {
                              ok: strength.checks.hasUpperAndLower,
                              text: 'Letra maiúscula e minúscula'
                            },
                            {
                              ok: strength.checks.hasNumber,
                              text: 'Pelo menos 1 número (ex.: 26)'
                            },
                            {
                              ok: strength.checks.hasSpecial,
                              text: 'Um símbolo (ex.: @, !, #)'
                            }
                          ].map((item) => (
                            <motion.div
                              key={item.text}
                              animate={item.ok ? { scale: [1, 1.04, 1] } : {}}
                              className={`flex items-center gap-2 text-xs font-bold ${
                                item.ok
                                  ? 'text-green-ok'
                                  : 'text-blue-deep/65 dark:text-cream/65'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                                  item.ok
                                    ? 'bg-green-ok text-white'
                                    : 'bg-blue-sky/60 text-transparent'
                                }`}
                              >
                                ✓
                              </span>
                              <span>{item.text}</span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Dica fofa de senha segura */}
                        <div className="p-2.5 rounded-xl bg-sun/45 dark:bg-blue-deep/90 flex items-start gap-2 text-xs">
                          <Sparkles
                            size={16}
                            className="text-blue-royal dark:text-sun shrink-0 mt-0.5"
                          />
                          <span className="font-semibold leading-snug">
                            {strength.friendlyTip}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Checkbox "Lembrar senha neste aparelho" */}
                    {step !== 'forgot' && (
                      <label className="flex items-center gap-3 min-h-[44px] px-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-5 h-5 accent-blue-royal rounded-md shrink-0"
                        />
                        <span className="text-sm font-bold">
                          Lembrar meu e-mail e senha neste aparelho
                        </span>
                      </label>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={isSubmitting}
                    >
                      <Mail size={20} />
                      <span>
                        {isSubmitting
                          ? 'Verificando e enviando código...'
                          : step === 'login'
                            ? 'Entrar e receber código de confirmação'
                            : step === 'signup'
                              ? 'Criar conta e receber código no e-mail'
                              : 'Enviar código de recuperação'}
                      </span>
                    </Button>
                  </form>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-[1200px] w-full mx-auto px-[clamp(16px,4vw,48px)] py-4 text-center text-xs font-semibold text-blue-deep/75 dark:text-cream/75">
        LibertyBag • Feito by Giulia Cardoso ✿
      </footer>
    </div>
  );
};
