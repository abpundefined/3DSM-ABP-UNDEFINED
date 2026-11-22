import type { LiveService } from '../components/dashboard/liveTypes';

export type CollectionNotice =
  | { kind: 'never' }
  | { kind: 'previous'; dateTime: string | null; label: string | null };

export function describeServiceCollection(
  service: Pick<LiveService, 'estadoAtual' | 'latestCollection'>,
): CollectionNotice | null {
  const collection = service.latestCollection;

  if (!collection) {
    return { kind: 'never' };
  }
  if (service.estadoAtual === 'DISPONIVEL') {
    return null;
  }

  const collectedAt = new Date(collection.iniciadaEm);
  if (!collection.iniciadaEm || !Number.isFinite(collectedAt.getTime())) {
    return { kind: 'previous', dateTime: null, label: null };
  }

  return {
    kind: 'previous',
    dateTime: collectedAt.toISOString(),
    label: collectedAt.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }),
  };
}
