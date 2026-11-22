export type ServiceCount = { active: number; monitored: number };

export function countServices(
  services: ReadonlyArray<{ estadoAtual: string }>,
): ServiceCount {
  const monitored = services.filter(
    (service) => service.estadoAtual !== 'REMOVIDO',
  );

  return {
    active: monitored.filter((service) => service.estadoAtual === 'DISPONIVEL')
      .length,
    monitored: monitored.length,
  };
}

export function formatServiceCounter({ active, monitored }: ServiceCount) {
  const format = new Intl.NumberFormat('pt-BR').format;

  return `${format(active)} ${active === 1 ? 'ativo' : 'ativos'} de ${format(monitored)} ${monitored === 1 ? 'monitorado' : 'monitorados'}`;
}
