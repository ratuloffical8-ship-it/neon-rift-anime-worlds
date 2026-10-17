// src/ui/AuthScreen.ts
import { AuthFailure } from '../net/auth';
import type { AuthService, AuthUser } from '../net/auth';

export type AuthMode = 'login' | 'register' | 'reset';

export interface AuthScreenOptions {
  auth: AuthService;
  /** Called once after a successful login or registration. */
  onAuthenticated: (user: AuthUser) => void;
}

const STYLE_ID = 'nr-auth-style';

const CSS = `
.nr-auth{position:fixed;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 30%,#1b1450 0%,#0b1026 75%);color:#e6f7ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;overflow-y:auto}
.nr-auth-card{width:100%;max-width:360px;display:flex;flex-direction:column;gap:10px;padding:22px 18px;border-radius:18px;background:rgba(18,24,61,.85);border:1px solid rgba(124,58,237,.6);box-shadow:0 0 28px rgba(124,58,237,.35)}
.nr-auth-logo{text-align:center;font-size:26px;font-weight:800;letter-spacing:4px;color:#00e5ff;text-shadow:0 0 12px #00e5ff,0 0 26px #7c3aed}
.nr-auth-sub{text-align:center;font-size:12px;letter-spacing:2px;color:#c4b5fd;margin-top:-6px}
.nr-auth-title{text-align:center;font-size:16px;font-weight:700;letter-spacing:2px;margin-top:6px}
.nr-auth-help{text-align:center;font-size:13px;color:#c4b5fd}
.nr-auth-form{display:flex;flex-direction:column;gap:10px}
.nr-auth-field{display:flex;gap:6px}
.nr-auth-input{flex:1;min-width:0;min-height:46px;padding:0 12px;border-radius:10px;border:1px solid rgba(0,229,255,.5);background:rgba(11,16,38,.8);color:#e6f7ff;font-size:16px}
.nr-auth-input:focus{outline:none;border-color:#00e5ff;box-shadow:0 0 8px rgba(0,229,255,.7)}
.nr-auth-toggle{min-width:56px;min-height:46px;border-radius:10px;border:1px solid rgba(0,229,255,.5);background:transparent;color:#c4b5fd;font-size:12px;font-weight:700}
.nr-auth-msg{min-height:18px;font-size:13px;text-align:center;line-height:1.35}
.nr-auth-msg.error{color:#ff8fd0}
.nr-auth-msg.info{color:#7ef0c8}
.nr-auth-primary{min-height:48px;border-radius:12px;border:none;font-weight:800;letter-spacing:1px;font-size:15px;background:linear-gradient(90deg,#00e5ff,#ff4fd8);color:#0b1026}
.nr-auth-google{min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#e6f7ff;font-weight:700;font-size:14px}
.nr-auth-primary:disabled,.nr-auth-google:disabled{opacity:.5}
.nr-auth-divider{text-align:center;font-size:12px;color:#8f8fb8}
.nr-auth-links{display:flex;flex-direction:column;align-items:center;gap:4px}
.nr-auth-link{min-height:36px;background:none;border:none;color:#00e5ff;font-size:13px;text-decoration:underline}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Login, registration and password-reset screen.
 * It cannot be dismissed: the player must sign in. Call show() to display it.
 */
export class AuthScreen {
  private root: HTMLDivElement | null = null;
  private card: HTMLDivElement | null = null;
  private mode: AuthMode = 'login';
  private busy = false;
  private emailValue = '';

  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmInput: HTMLInputElement | null = null;
  private messageEl: HTMLDivElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private googleBtn: HTMLButtonElement | null = null;

  constructor(private readonly options: AuthScreenOptions) {}

  isVisible(): boolean {
    return this.root !== null;
  }

  show(mode: AuthMode = 'login'): void {
    this.mode = mode;
    if (!this.root) {
      this.injectStyle();
      this.root = el('div', 'nr-auth');
      this.card = el('div', 'nr-auth-card');
      this.root.appendChild(this.card);
      document.body.appendChild(this.root);
    }
    this.render();
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
    this.card = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.confirmInput = null;
    this.messageEl = null;
    this.submitBtn = null;
    this.googleBtn = null;
  }

  dispose(): void {
    this.hide();
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private switchMode(mode: AuthMode): void {
    if (this.busy) return;
    this.emailValue = this.emailInput?.value.trim() ?? this.emailValue;
    this.mode = mode;
    this.render();
  }

  private render(): void {
    const card = this.card;
    if (!card) return;
    card.replaceChildren();

    const mode = this.mode;
    card.append(el('div', 'nr-auth-logo', 'NEON RIFT'), el('div', 'nr-auth-sub', 'ANIME WORLDS'));
    card.appendChild(
      el(
        'div',
        'nr-auth-title',
        mode === 'login' ? 'LOG IN' : mode === 'register' ? 'CREATE ACCOUNT' : 'RESET PASSWORD',
      ),
    );
    if (mode === 'reset') {
      card.appendChild(
        el('div', 'nr-auth-help', 'Enter your email and we will send you a link to reset your password.'),
      );
    }

    const form = el('form', 'nr-auth-form');
    form.noValidate = true;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.submit();
    });

    this.emailInput = el('input', 'nr-auth-input');
    this.emailInput.type = 'email';
    this.emailInput.placeholder = 'Email';
    this.emailInput.autocomplete = 'email';
    this.emailInput.value = this.emailValue;
    this.emailInput.setAttribute('aria-label', 'Email');
    form.appendChild(this.emailInput);

    this.passwordInput = null;
    this.confirmInput = null;

    if (mode !== 'reset') {
      const passwordRow = el('div', 'nr-auth-field');
      this.passwordInput = el('input', 'nr-auth-input');
      this.passwordInput.type = 'password';
      this.passwordInput.placeholder = 'Password';
      this.passwordInput.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
      this.passwordInput.setAttribute('aria-label', 'Password');

      const toggle = el('button', 'nr-auth-toggle', 'SHOW');
      toggle.type = 'button';
      toggle.addEventListener('click', () => {
        const input = this.passwordInput;
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        if (this.confirmInput) this.confirmInput.type = input.type;
        toggle.textContent = showing ? 'SHOW' : 'HIDE';
      });

      passwordRow.append(this.passwordInput, toggle);
      form.appendChild(passwordRow);
    }

    if (mode === 'register') {
      this.confirmInput = el('input', 'nr-auth-input');
      this.confirmInput.type = 'password';
      this.confirmInput.placeholder = 'Confirm password';
      this.confirmInput.autocomplete = 'new-password';
      this.confirmInput.setAttribute('aria-label', 'Confirm password');
      form.appendChild(this.confirmInput);
    }

    this.messageEl = el('div', 'nr-auth-msg');
    this.messageEl.setAttribute('aria-live', 'polite');
    form.appendChild(this.messageEl);

    this.submitBtn = el(
      'button',
      'nr-auth-primary',
      mode === 'login' ? 'LOG IN' : mode === 'register' ? 'CREATE ACCOUNT' : 'SEND RESET LINK',
    );
    this.submitBtn.type = 'submit';
    form.appendChild(this.submitBtn);
    card.appendChild(form);

    this.googleBtn = null;
    if (mode !== 'reset') {
      card.appendChild(el('div', 'nr-auth-divider', 'or'));
      this.googleBtn = el('button', 'nr-auth-google', 'CONTINUE WITH GOOGLE');
      this.googleBtn.type = 'button';
      this.googleBtn.addEventListener('click', () => void this.google());
      card.appendChild(this.googleBtn);
    }

    const links = el('div', 'nr-auth-links');
    const addLink = (text: string, target: AuthMode): void => {
      const link = el('button', 'nr-auth-link', text);
      link.type = 'button';
      link.addEventListener('click', () => this.switchMode(target));
      links.appendChild(link);
    };
    if (mode === 'login') {
      addLink('Forgot password?', 'reset');
      addLink('Create an account', 'register');
    } else if (mode === 'register') {
      addLink('Already have an account? Log in', 'login');
    } else {
      addLink('Back to log in', 'login');
    }
    card.appendChild(links);

    this.setBusy(this.busy);
  }

  private showMessage(text: string, kind: 'error' | 'info'): void {
    if (!this.messageEl) return;
    this.messageEl.textContent = text;
    this.messageEl.className = `nr-auth-msg ${kind}`;
  }

  private clearMessage(): void {
    if (!this.messageEl) return;
    this.messageEl.textContent = '';
    this.messageEl.className = 'nr-auth-msg';
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    if (this.submitBtn) this.submitBtn.disabled = busy;
    if (this.googleBtn) this.googleBtn.disabled = busy;
  }

  private finish(user: AuthUser): void {
    this.hide();
    this.options.onAuthenticated(user);
  }

  private async submit(): Promise<void> {
    if (this.busy || !this.emailInput) return;

    const email = this.emailInput.value.trim();
    this.emailValue = email;
    const password = this.passwordInput?.value ?? '';

    if (this.mode === 'register' && password !== (this.confirmInput?.value ?? '')) {
      this.showMessage('Passwords do not match.', 'error');
      return;
    }

    this.setBusy(true);
    this.clearMessage();

    try {
      if (this.mode === 'login') {
        this.finish(await this.options.auth.login(email, password));
        return;
      }
      if (this.mode === 'register') {
        this.finish(await this.options.auth.register(email, password));
        return;
      }
      await this.options.auth.resetPassword(email);
      this.showMessage('If an account exists for that email, a reset link has been sent.', 'info');
    } catch (error) {
      this.showMessage(
        error instanceof AuthFailure ? error.message : 'Something went wrong. Please try again.',
        'error',
      );
    } finally {
      this.setBusy(false);
    }
  }

  private async google(): Promise<void> {
    if (this.busy) return;
    this.setBusy(true);
    this.clearMessage();
    let redirecting = false;

    try {
      const user = await this.options.auth.loginWithGoogle();
      if (user) {
        this.finish(user);
        return;
      }
      // The page is about to leave for Google: keep the buttons disabled.
      redirecting = true;
      this.showMessage('Redirecting to Google...', 'info');
    } catch (error) {
      this.showMessage(
        error instanceof AuthFailure ? error.message : 'Something went wrong. Please try again.',
        'error',
      );
    } finally {
      if (!redirecting) this.setBusy(false);
    }
  }
}
