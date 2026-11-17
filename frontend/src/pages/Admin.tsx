import { useEffect, useState, type FormEvent } from 'react';
import SaudeIntegracoes from '../components/admin/SaudeIntegracoes';
import FeedbackPanel from '../components/common/FeedbackPanel';
import useAuth from '../hooks/useAuth';
import usePageTitle from '../hooks/usePageTitle';
import { ApiError } from '../services/api';
import {
  getConfiguracao,
  saveConfiguracao,
  type Configuracao,
} from '../services/configuracao';
import {
  INTERVAL_FIELDS,
  toIntervalPayload,
  validateIntervals,
  type IntervalErrors,
  type IntervalField,
  type IntervalValues,
} from '../utils/configuracao';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

function toFormValues(configuracao: Configuracao): IntervalValues {
  return {
    intervaloColetaSegundos: String(configuracao.intervaloColetaSegundos),
    intervaloDescobertaSegundos: String(
      configuracao.intervaloDescobertaSegundos,
    ),
  };
}

export default function Admin() {
  usePageTitle('Administração');
  const { token, expireSession } = useAuth();
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [values, setValues] = useState<IntervalValues>({
    intervaloColetaSegundos: '',
    intervaloDescobertaSegundos: '',
  });
  const [errors, setErrors] = useState<IntervalErrors>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    getConfiguracao(controller.signal)
      .then((data) => {
        setConfiguracao(data);
        setValues(toFormValues(data));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
        }
      });

    return () => controller.abort();
  }, [loadAttempt]);

  function retryLoad() {
    setLoadFailed(false);
    setLoadAttempt((attempt) => attempt + 1);
  }

  function handleChange(field: IntervalField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateIntervals(values);
    setErrors(nextErrors);

    const firstInvalid = INTERVAL_FIELDS.find(({ field }) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid.field)?.focus();
      return;
    }
    if (!token) {
      return;
    }

    setSaveStatus('saving');
    try {
      const saved = await saveConfiguracao(toIntervalPayload(values), token);
      setConfiguracao(saved);
      setValues(toFormValues(saved));
      setSaveStatus('success');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        expireSession('Sua sessão expirou. Entre novamente para salvar.');
        return;
      }
      setSaveError(
        error instanceof ApiError && error.status === 400
          ? error.message
          : 'Não foi possível salvar os intervalos. Tente novamente.',
      );
      setSaveStatus('error');
    }
  }

  return (
    <div className="admin-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ÁREA RESTRITA</p>
          <h1>Administração</h1>
          <p className="page-subtitle">
            Intervalos que o backend usa para monitorar os serviços.
          </p>
        </div>
      </div>

      {loadFailed ? (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar a configuração"
          description="Verifique se o backend está disponível e tente novamente."
        >
          <button
            className="button button--primary"
            type="button"
            onClick={retryLoad}
          >
            Tentar novamente
          </button>
        </FeedbackPanel>
      ) : !configuracao ? (
        <FeedbackPanel
          kind="loading"
          title="Carregando a configuração"
          description="Buscando os intervalos atuais do monitoramento."
        />
      ) : (
        <form
          className="admin-form"
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby="admin-form-title"
        >
          <div>
            <h2 id="admin-form-title">Intervalos de monitoramento</h2>
            <p className="admin-form-meta">
              {configuracao.padrao || !configuracao.atualizadaEm
                ? 'Usando os valores padrão do servidor.'
                : `Última alteração: ${new Date(configuracao.atualizadaEm).toLocaleString('pt-BR')}`}
            </p>
          </div>

          {INTERVAL_FIELDS.map(({ field, name, description, min, max }) => (
            <div key={field} className="admin-field">
              <label htmlFor={field}>Intervalo de {name} (segundos)</label>
              <input
                id={field}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                step={1}
                value={values[field]}
                onChange={(event) => handleChange(field, event.target.value)}
                aria-invalid={errors[field] ? true : undefined}
                aria-describedby={`${field}-hint${errors[field] ? ` ${field}-error` : ''}`}
              />
              <p id={`${field}-hint`} className="admin-field-hint">
                {description} Entre {min} e {max} segundos.
              </p>
              {errors[field] && (
                <p id={`${field}-error`} className="admin-field-error">
                  {errors[field]}
                </p>
              )}
            </div>
          ))}

          <div className="admin-form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Salvando...' : 'Salvar intervalos'}
            </button>
            <p className="admin-save-status" role="status">
              {saveStatus === 'success' &&
                'Intervalos salvos. Eles passam a valer no próximo ciclo de monitoramento.'}
            </p>
          </div>

          {saveStatus === 'error' && (
            <p className="admin-save-error" role="alert">
              {saveError}
            </p>
          )}
        </form>
      )}

      <SaudeIntegracoes />
    </div>
  );
}
