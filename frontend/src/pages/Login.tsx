import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import Icon from '../components/common/Icon';
import useAuth from '../hooks/useAuth';
import usePageTitle from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../services/api';

interface LoginResponse {
  accessToken: string;
}

export default function Login() {
  usePageTitle('Entrar');
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
      });

      if (!response || typeof response.accessToken !== 'string') {
        throw new Error(
          'A resposta de autenticação não contém um token válido.',
        );
      }

      login(response.accessToken);
      navigate('/');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Não foi possível conectar ao servidor. Tente novamente.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <section
        aria-labelledby="login-story-heading"
        className="login-story-panel"
      >
        <div className="login-story-copy">
          <p className="login-story-eyebrow">GREEN COMPUTING, NA PRÁTICA</p>
          <h1 id="login-story-heading" className="login-story-title">
            Mais clareza. <br />
            Menos impacto.
          </h1>
          <p className="login-story-description">
            Entenda o consumo dos seus serviços e transforme dados em decisões
            mais sustentáveis.
          </p>
        </div>

        <div aria-hidden="true" className="login-illustration">
          <div className="login-orbit login-orbit--outer" />
          <div className="login-orbit login-orbit--inner" />
          <div className="login-illustration-leaf">
            <Icon name="leaf" />
          </div>
          <span className="login-illustration-node login-illustration-node--server">
            <Icon name="server" />
          </span>
          <span className="login-illustration-node login-illustration-node--energy">
            <Icon name="bolt" />
          </span>
          <span className="login-illustration-node login-illustration-node--cloud">
            <Icon name="cloud" />
          </span>
        </div>

        <div className="login-story-footer">
          <Icon name="check" />
          <span>O dashboard é público e pode ser consultado sem login.</span>
        </div>
      </section>

      <section className="login-split-form">
        <div className="login-form-content">
          <div className="login-panel-lock">
            <Icon name="lock" />
          </div>
          <p className="login-admin-label">ÁREA ADMINISTRATIVA</p>
          <h2 className="login-title">Bem-vindo de volta</h2>
          <p className="login-muted">Acesse a configuração do monitoramento.</p>

          {errorMessage && (
            <div className="login-alert" role="alert" aria-live="assertive">
              <Icon name="alert" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-field-label" htmlFor="email">
                E-mail
              </label>
              <input
                className="login-input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Seu e-mail de acesso"
                required
                maxLength={120}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="password">
                Senha
              </label>
              <div className="login-password-field">
                <input
                  className="login-input"
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-controls="password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
            </div>

            <button className="login-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
              {!isLoading && <Icon name="arrow" />}
            </button>
          </form>

          <div className="login-form-divider">
            <Link className="login-dashboard-link" to="/">
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
