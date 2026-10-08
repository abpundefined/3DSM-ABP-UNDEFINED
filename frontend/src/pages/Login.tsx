import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import Icon from '../components/common/Icon';
import usePageTitle from '../hooks/usePageTitle';

export default function Login() {
  usePageTitle('Entrar');
  const [showPassword, setShowPassword] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessMessage(
      'O acesso administrativo ainda não está disponível. Você pode continuar consultando o dashboard público.',
    );
  }

  return (
    <div className="login-page">
      <Link className="text-link back-link" to="/">
        <Icon name="back" />
        Voltar ao dashboard
      </Link>
      <div className="login-layout">
        <section className="login-story" aria-labelledby="login-story-heading">
          <p className="eyebrow">GREEN COMPUTING, NA PRÁTICA</p>
          <h2 id="login-story-heading">
            Mais clareza. <br />
            Menos impacto.
          </h2>
          <p>
            Entenda o consumo dos seus serviços e transforme dados em decisões
            mais sustentáveis.
          </p>
          <div className="story-visual" aria-hidden="true">
            <div className="story-orbit story-orbit--outer" />
            <div className="story-orbit story-orbit--inner" />
            <div className="story-leaf">
              <Icon name="leaf" />
            </div>
            <span className="story-node story-node--server">
              <Icon name="server" />
            </span>
            <span className="story-node story-node--energy">
              <Icon name="bolt" />
            </span>
            <span className="story-node story-node--carbon">
              <Icon name="cloud" />
            </span>
          </div>
          <div className="story-bottom">
            <Icon name="check" />
            <span>O dashboard é público e pode ser consultado sem login.</span>
          </div>
        </section>
        <section className="login-form-panel" aria-labelledby="login-heading">
          <span className="login-lock">
            <Icon name="lock" />
          </span>
          <p className="eyebrow">ÁREA ADMINISTRATIVA</p>
          <h1 id="login-heading">Bem-vindo de volta</h1>
          <p className="login-intro">Acesse a configuração do monitoramento.</p>
          <div className="availability-notice" id="login-availability">
            <Icon name="info" />
            <p>
              O acesso administrativo está em preparação e ainda não permite
              entrar.
            </p>
          </div>
          <form onSubmit={handleSubmit} aria-describedby="login-availability">
            <div className="field">
              <label htmlFor="username">Usuário</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Seu nome de usuário"
                required
                maxLength={120}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  required
                  maxLength={128}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-controls="password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
            </div>
            <button
              className="button button--primary login-submit"
              type="submit"
            >
              Entrar
              <Icon name="arrow" />
            </button>
            <div className="login-feedback" role="status" aria-live="polite">
              {accessMessage && <p>{accessMessage}</p>}
            </div>
          </form>
          <div className="login-public">
            <p>Quer acompanhar os indicadores?</p>
            <Link to="/" className="text-link">
              Consultar o dashboard
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
