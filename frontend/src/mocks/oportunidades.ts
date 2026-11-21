import type { RespostaOportunidades } from '../types/oportunidades';
import { LIMIARES_OPORTUNIDADES_UI } from '../utils/oportunidades.ts';
import { mapaDemo } from './mapa.ts';

export const oportunidadesDemo: RespostaOportunidades = {
  periodo: mapaDemo.periodo,
  resumo: {
    totalOportunidades: 5,
    reducaoPotencialGCo2e: 28.45,
    porTipo: {
      MIGRAR_REGIAO: 2,
      SUPERDIMENSIONAMENTO: 1,
      MUDAR_HORARIO: 2,
    },
  },
  limiares: LIMIARES_OPORTUNIDADES_UI,
  aviso:
    'As oportunidades listadas são sugestões estimadas a partir do histórico do período selecionado e não representam garantia de economia.',
  oportunidades: [
    {
      id: '5:MIGRAR_REGIAO',
      servicoId: 5,
      servicoNome: 'Video Processor',
      regiaoCodigo: 'us-east',
      tipo: 'MIGRAR_REGIAO',
      titulo: 'Migrar Video Processor para Canadá · Toronto',
      explicacao:
        'Sugestão estimada: mover de Estados Unidos · Ashburn (384,0 gCO₂e/kWh) para Canadá · Toronto (41,0 gCO₂e/kWh) reduziria cerca de 89,3% das emissões do período. Não considera latência, custo ou restrições regulatórias.',
      economiaEstimadaGCo2e: 11.88,
      economiaPercentual: 89.3,
      emissaoAtualGCo2e: 13.3,
      linkDetalhe: '/servicos/5',
    },
    {
      id: '8:MIGRAR_REGIAO',
      servicoId: 8,
      servicoNome: 'Media CDN',
      regiaoCodigo: 'jp-east',
      tipo: 'MIGRAR_REGIAO',
      titulo: 'Migrar Media CDN para Canadá · Toronto',
      explicacao:
        'Sugestão estimada: mover de Japão · Tóquio (471,0 gCO₂e/kWh) para Canadá · Toronto (41,0 gCO₂e/kWh) reduziria cerca de 91,3% das emissões do período. Não considera latência, custo ou restrições regulatórias.',
      economiaEstimadaGCo2e: 7.67,
      economiaPercentual: 91.3,
      emissaoAtualGCo2e: 8.4,
      linkDetalhe: '/servicos/8',
    },
    {
      id: '5:MUDAR_HORARIO',
      servicoId: 5,
      servicoNome: 'Video Processor',
      regiaoCodigo: 'us-east',
      tipo: 'MUDAR_HORARIO',
      titulo: 'Agendar cargas de Video Processor para janela mais limpa',
      explicacao:
        'Sugestão estimada: em Estados Unidos · Ashburn, a janela de domingo (02h–05h) registrou intensidade média de 275,0 gCO₂e/kWh, 28,4% abaixo da média da região (384,0 gCO₂e/kWh). Aplicável apenas a cargas flexíveis.',
      economiaEstimadaGCo2e: 3.78,
      economiaPercentual: 28.4,
      emissaoAtualGCo2e: 13.3,
      linkDetalhe: '/servicos/5',
    },
    {
      id: '4:SUPERDIMENSIONAMENTO',
      servicoId: 4,
      servicoNome: 'Search API',
      regiaoCodigo: 'us-east',
      tipo: 'SUPERDIMENSIONAMENTO',
      titulo: 'Revisar dimensionamento de Search API',
      explicacao:
        'Sugestão estimada: CPU média de 11,4% (abaixo de 15%) com consumo energético acima da mediana dos serviços no período. Ajustar recursos alocados pode reduzir cerca de 30% das emissões, sem garantia de ganho real.',
      economiaEstimadaGCo2e: 2.91,
      economiaPercentual: 30,
      emissaoAtualGCo2e: 9.7,
      linkDetalhe: '/servicos/4',
    },
    {
      id: '8:MUDAR_HORARIO',
      servicoId: 8,
      servicoNome: 'Media CDN',
      regiaoCodigo: 'jp-east',
      tipo: 'MUDAR_HORARIO',
      titulo: 'Agendar cargas de Media CDN para janela mais limpa',
      explicacao:
        'Sugestão estimada: em Japão · Tóquio, a janela de quarta-feira (03h–06h) registrou intensidade média de 347,0 gCO₂e/kWh, 26,3% abaixo da média da região (471,0 gCO₂e/kWh). Aplicável apenas a cargas flexíveis.',
      economiaEstimadaGCo2e: 2.21,
      economiaPercentual: 26.3,
      emissaoAtualGCo2e: 8.4,
      linkDetalhe: '/servicos/8',
    },
  ],
};
