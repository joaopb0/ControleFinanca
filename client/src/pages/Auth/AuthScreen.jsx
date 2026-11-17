import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';

function AuthForm({ mode, onChangeMode }) {
  const isRegister = mode === 'register';
  const { signIn, signUp } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmation: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const errorRef = useRef(null);

  useEffect(() => {
    document.title = `${isRegister ? 'Criar conta' : 'Entrar'} | ControleFinanca`;
    return () => { document.title = 'ControleFinanca'; };
  }, [isRegister]);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    const nextErrors = {};
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();
    if (isRegister && (name.length < 2 || name.length > 100)) {
      nextErrors.name = 'Informe um nome com 2 a 100 caracteres.';
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Informe um e-mail válido.';
    }
    if (!values.password) nextErrors.password = 'Informe sua senha.';
    if (isRegister && (values.password.length < 12 || new TextEncoder().encode(values.password).length > 72)) {
      nextErrors.password = 'Use pelo menos 12 caracteres e no máximo 72 bytes (acentos e emojis ocupam mais espaço).';
    }
    if (isRegister && values.confirmation !== values.password) {
      nextErrors.confirmation = 'As senhas precisam ser iguais.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0]);
      firstInvalid?.focus();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const credentials = { email, password: values.password };
      if (isRegister) await signUp({ ...credentials, name });
      else await signIn(credentials);
    } catch (failure) {
      setError(failure.message || 'Não foi possível entrar. Tente novamente.');
      setLoading(false);
      // Aguarda a mensagem ser renderizada antes de anunciar e focar o erro.
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  function input(name, label, properties = {}) {
    return (
      <div className="auth-field">
        <label htmlFor={`auth-${name}`}>{label}</label>
        <input
          id={`auth-${name}`}
          name={name}
          value={values[name]}
          onChange={updateField}
          required
          {...properties}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `auth-${name}-error` : properties['aria-describedby']}
        />
        {errors[name] && <p id={`auth-${name}-error`} className="auth-field-error">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <section className="auth-form-panel" aria-labelledby="auth-title">
      <span className="auth-eyebrow">{isRegister ? 'COMECE SUA ORGANIZAÇÃO' : 'SEU ESPAÇO FINANCEIRO'}</span>
      <h1 id="auth-title">{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
      <p className="auth-description">
        {isRegister ? 'Um lugar para organizar seus extratos e enxergar suas finanças com clareza.' : 'Entre para acessar seus extratos, regras e relatórios.'}
      </p>
      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <fieldset disabled={loading} className="auth-fields">
          <legend className="sr-only">{isRegister ? 'Dados de cadastro' : 'Dados de acesso'}</legend>
          {isRegister && input('name', 'Nome', { autoComplete: 'name', minLength: 2, maxLength: 100, autoFocus: true, placeholder: 'Como podemos chamar você?' })}
          {input('email', 'E-mail', { type: 'email', autoComplete: 'email', maxLength: 254, autoFocus: !isRegister, placeholder: 'voce@exemplo.com', inputMode: 'email', autoCapitalize: 'none', spellCheck: false })}
          {input('password', 'Senha', { type: showPassword ? 'text' : 'password', autoComplete: isRegister ? 'new-password' : 'current-password', maxLength: isRegister ? 72 : undefined, 'aria-describedby': isRegister ? 'password-hint' : undefined })}
          <div className="auth-password-options">
            {isRegister && <p id="password-hint">Pelo menos 12 caracteres. Prefira uma frase longa e exclusiva.</p>}
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
              {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            </button>
          </div>
          {isRegister && input('confirmation', 'Confirme a senha', { type: showPassword ? 'text' : 'password', autoComplete: 'new-password', maxLength: 72 })}
          {error && <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <><span className="auth-spinner" aria-hidden="true" /> {isRegister ? 'Criando sua conta…' : 'Entrando…'}</> : isRegister ? 'Criar conta e entrar' : 'Entrar na minha conta'}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </fieldset>
        {loading && <span className="sr-only" role="status">{isRegister ? 'Criando conta. Aguarde.' : 'Entrando. Aguarde.'}</span>}
      </form>
      <p className="auth-switch">
        {isRegister ? 'Já tem uma conta?' : 'Primeira vez por aqui?'}{' '}
        <button type="button" disabled={loading} onClick={() => onChangeMode(isRegister ? 'login' : 'register')}>
          {isRegister ? 'Entrar' : 'Criar conta'}
        </button>
      </p>
    </section>
  );
}

export function AuthScreen() {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState(() => window.location.pathname === '/register' ? 'register' : 'login');

  useEffect(() => {
    if (!['/login', '/register'].includes(window.location.pathname)) {
      window.history.replaceState(null, '', '/login');
    }
    const handlePopState = () => setMode(window.location.pathname === '/register' ? 'register' : 'login');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function changeMode(nextMode) {
    window.history.pushState(null, '', `/${nextMode}`);
    setMode(nextMode);
  }

  return (
    <main className="auth-shell">
      <header className="auth-header">
        <span className="auth-brand"><span className="auth-brand-mark" aria-hidden="true">↗</span> ControleFinanca <span className="auth-pro">PRO</span></span>
        <button className="auth-theme" type="button" onClick={toggleTheme} aria-label={`Ativar tema ${theme === 'dark' ? 'claro' : 'escuro'}`}>
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span> Tema {theme === 'dark' ? 'claro' : 'escuro'}
        </button>
      </header>
      <div className="auth-card">
        <aside className="auth-intro" aria-label="ControleFinanca: gestão financeira">
          <span className="auth-intro-label">GESTÃO FINANCEIRA & RELATÓRIOS</span>
          <div className="auth-intro-symbol" aria-hidden="true">↗</div>
          <h2>Mais clareza.<br />Mais controle.<br /><span>Suas finanças.</span></h2>
          <p>Transforme seus extratos em informação para tomar melhores decisões.</p>
          <ul>
            <li><span aria-hidden="true">01</span> Importe e revise seus extratos</li>
            <li><span aria-hidden="true">02</span> Organize com suas próprias regras</li>
            <li><span aria-hidden="true">03</span> Acompanhe seus relatórios</li>
          </ul>
          <p className="auth-intro-footer">Seu espaço. Seus dados. Sua organização.</p>
        </aside>
        <AuthForm key={mode} mode={mode} onChangeMode={changeMode} />
      </div>
      <footer className="auth-footer">ControleFinanca · Gestão financeira com clareza</footer>
    </main>
  );
}
