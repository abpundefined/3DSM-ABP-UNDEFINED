import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import Icon from '../components/common/Icon';
import usePageTitle from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../services/api';

interface LoginResponse {
  accessToken: string;
}

const TOKEN_STORAGE_KEY = '@greener-abp:token';

export default function Login() {
  usePageTitle('Entrar');
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
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
        body: JSON.stringify({ email: username, senha: password }),
      });

      if (!response || typeof response.accessToken !== 'string') {
        throw new Error('A resposta de autenticação não contém um token válido.');
      }

      window.localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Credenciais inválidas. Verifique seu usuário e senha.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-screen flex flex-1 flex-col md:flex-row">
      <section
        aria-labelledby="login-story-heading"
        className="login-story-panel flex min-h-[50vh] w-full flex-1 flex-col px-8 py-10 text-white md:min-h-0 md:w-1/2 md:px-12 md:py-14 lg:px-20"
      >
        <div>
          <p className="!text-sm uppercase !tracking-wider text-green-200">
            GREEN COMPUTING, NA PRÁTICA
          </p>
          <h1
            id="login-story-heading"
            className="!mt-5 !text-4xl !font-bold !leading-tight !tracking-normal text-white lg:!text-5xl"
          >
            Mais clareza. <br />
            Menos impacto.
          </h1>
          <p className="!mt-5 max-w-lg text-base leading-7 text-green-100">
            Entenda o consumo dos seus serviços e transforme dados em decisões
            mais sustentáveis.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto my-10 flex min-h-64 w-full max-w-sm flex-1 items-center justify-center"
        >
          <div className="absolute h-56 w-72 rounded-[50%] border border-green-300/20" />
          <div className="absolute h-40 w-52 rounded-[50%] border border-green-300/30" />
          <div className="relative grid h-24 w-24 place-items-center rounded-[28px] bg-green-100 text-green-900 shadow-xl shadow-black/10">
            <Icon name="leaf" className="!h-12 !w-12" />
          </div>
          <span className="absolute left-[12%] top-[25%] grid h-11 w-11 place-items-center rounded-xl border border-green-300/30 bg-green-800 text-green-100">
            <Icon name="server" />
          </span>
          <span className="absolute right-[12%] top-[30%] grid h-11 w-11 place-items-center rounded-xl border border-lime-300/30 bg-lime-900 text-lime-100">
            <Icon name="bolt" />
          </span>
          <span className="absolute bottom-[12%] grid h-11 w-11 place-items-center rounded-xl border border-purple-200/30 bg-purple-800 text-purple-100">
            <Icon name="cloud" />
          </span>
        </div>

        <div className="flex items-start gap-3 border-t border-green-300/20 pt-6 text-sm text-green-100">
          <Icon name="check" className="!mt-0.5 !h-5 !w-5 text-green-300" />
          <span>O dashboard é público e pode ser consultado sem login.</span>
        </div>
      </section>

      <section className="login-split-form flex min-h-[50vh] w-full flex-1 items-center px-6 py-12 md:min-h-0 md:w-1/2 md:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="login-panel-lock mb-8 grid h-12 w-12 place-items-center rounded-xl">
            <Icon name="lock" />
          </div>
          <p className="!text-sm uppercase !tracking-wider text-green-400">
            ÁREA ADMINISTRATIVA
          </p>
          <h2 className="!mt-3 !text-3xl !font-bold !leading-tight !tracking-normal text-white">
            Bem-vindo de volta
          </h2>
          <p className="login-muted !mt-2 text-sm">
            Acesse a configuração do monitoramento.
          </p>

          {errorMessage && (
            <div
              className="mt-6 flex gap-3 rounded-lg border border-[#E5C158]/50 bg-[#2A2411] p-4 text-sm text-[#E5C158]"
              role="alert"
            >
              <Icon name="alert" className="!mt-0.5 !h-5 !w-5" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            <div>
              <label
                className="login-field-label mb-2 block text-sm font-medium"
                htmlFor="username"
              >
                Usuário
              </label>
              <input
                className="login-input w-full rounded-lg border px-4 py-3 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30"
                id="username"
                name="username"
                type="email"
                autoComplete="username"
                placeholder="Seu e-mail de acesso"
                required
                maxLength={120}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div>
              <label
                className="login-field-label mb-2 block text-sm font-medium"
                htmlFor="password"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  className="login-input w-full rounded-lg border px-4 py-3 pr-12 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30"
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
                  className="login-password-toggle absolute inset-y-0 right-0 grid h-full place-items-center border-0 bg-transparent px-4"
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

            <button
              className="login-submit flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
              {!isLoading && <Icon name="arrow" />}
            </button>
          </form>

          <div className="login-form-divider mt-8 border-t pt-6 text-center">
            <Link
              className="login-dashboard-link text-sm font-medium underline-offset-4 hover:underline"
              to="/dashboard"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
