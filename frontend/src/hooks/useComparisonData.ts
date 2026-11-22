import { useCallback, useEffect, useMemo, useState } from 'react';
import { comparacaoDemo, servicosComparacaoDemo } from '../mocks/comparacao';
import { ApiError } from '../services/api';
import {
  buscarComparacao,
  buscarServicosComparaveis,
} from '../services/comparacao';
import type {
  RespostaComparacao,
  ServicoSelecionavel,
} from '../types/comparacao';
import { MAX_SERVICES_TO_COMPARE } from '../utils/comparacao';

type LoadState<T> =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: T };

export type ComparisonState =
  { status: 'ocioso' } | LoadState<RespostaComparacao>;

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status >= 500) {
    return `Não foi possível consultar o backend (HTTP ${error.status}). Confira se ele está em execução e tente novamente.`;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function useComparisonData({
  serviceIds,
  apiQuery,
  invalidSelection,
  isDemo = false,
}: {
  serviceIds: number[];
  apiQuery: string;
  invalidSelection: boolean;
  isDemo?: boolean;
}) {
  const [servicesAttempt, setServicesAttempt] = useState(0);
  const [servicesState, setServicesState] = useState<
    LoadState<ServicoSelecionavel[]>
  >({ status: 'carregando' });
  const [comparisonAttempt, setComparisonAttempt] = useState(0);
  const [comparisonState, setComparisonState] = useState<ComparisonState>({
    status: 'ocioso',
  });
  const idsKey = serviceIds.join(',');

  useEffect(() => {
    if (isDemo) {
      return;
    }

    const controller = new AbortController();
    setServicesState({ status: 'carregando' });

    buscarServicosComparaveis(controller.signal)
      .then((services) =>
        setServicesState({ status: 'pronto', dados: services }),
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setServicesState({
            status: 'erro',
            mensagem: errorMessage(
              error,
              'Não foi possível carregar os serviços.',
            ),
          });
        }
      });

    return () => controller.abort();
  }, [isDemo, servicesAttempt]);

  useEffect(() => {
    if (isDemo) {
      return;
    }

    if (
      invalidSelection ||
      serviceIds.length < 2 ||
      serviceIds.length > MAX_SERVICES_TO_COMPARE
    ) {
      setComparisonState({ status: 'ocioso' });
      return;
    }

    const controller = new AbortController();
    setComparisonState({ status: 'carregando' });

    buscarComparacao(serviceIds, apiQuery, controller.signal)
      .then((data) => {
        if (
          data.servicos.length !== serviceIds.length ||
          data.servicos.some(
            (service, index) => service.servicoId !== serviceIds[index],
          )
        ) {
          throw new Error(
            'O servidor devolveu serviços diferentes da seleção solicitada.',
          );
        }
        setComparisonState({ status: 'pronto', dados: data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setComparisonState({
            status: 'erro',
            mensagem: errorMessage(
              error,
              'Não foi possível carregar a comparação.',
            ),
          });
        }
      });

    return () => controller.abort();
  }, [
    apiQuery,
    comparisonAttempt,
    idsKey,
    invalidSelection,
    isDemo,
    serviceIds,
  ]);

  const demoServicesState = useMemo<LoadState<ServicoSelecionavel[]>>(
    () => ({ status: 'pronto', dados: servicosComparacaoDemo }),
    [],
  );

  const demoComparisonState = useMemo<ComparisonState>(() => {
    if (
      invalidSelection ||
      serviceIds.length < 2 ||
      serviceIds.length > MAX_SERVICES_TO_COMPARE
    ) {
      return { status: 'ocioso' };
    }
    return { status: 'pronto', dados: comparacaoDemo(serviceIds) };
  }, [invalidSelection, serviceIds]);

  const retryServices = useCallback(
    () => setServicesAttempt((attempt) => attempt + 1),
    [],
  );
  const retryComparison = useCallback(
    () => setComparisonAttempt((attempt) => attempt + 1),
    [],
  );

  return {
    servicesState: isDemo ? demoServicesState : servicesState,
    comparisonState: isDemo ? demoComparisonState : comparisonState,
    retryServices,
    retryComparison,
  };
}
