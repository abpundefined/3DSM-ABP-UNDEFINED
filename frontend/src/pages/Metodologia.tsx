import { Link, useSearchParams } from 'react-router';
import Icon from '../components/common/Icon';
import { FONTE_EQUIVALENCIAS } from '../constants/equivalencias';
import usePageTitle from '../hooks/usePageTitle';
import { formatEmission, formatEnergy } from '../utils/formatters';
import { CONSTANTES_CALCULO, EXEMPLO_CALCULO_REAL } from '../utils/metodologia';
import { MINIMO_PONTOS_PICO, MULTIPLICADOR_DESVIO_PICO } from '../utils/picos';
import './metodologia.css';

function formatarDecimal(valor: number, casas = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export default function Metodologia() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  usePageTitle('Como calculamos');

  const { entrada, resultado } = EXEMPLO_CALCULO_REAL;

  return (
    <div className="methodology-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">TRANSPARÊNCIA METODOLÓGICA</p>
          <h1>Como calculamos</h1>
          <p className="page-subtitle">
            As fórmulas, fontes externas e limites do modelo usado pelo GreenER
            para estimar consumo elétrico e emissões de CO₂e.
          </p>
        </div>
        <Link
          to={isDemo ? '/?demo=1' : '/'}
          className="button button--secondary"
        >
          Voltar ao dashboard
          <Icon name="back" />
        </Link>
      </header>

      <aside className="methodology-disclaimer" role="note">
        <Icon name="info" />
        <div>
          <strong>Escopo e caráter informativo:</strong> Os valores exibidos
          pelo GreenER são <strong>estimativas operacionais</strong> calculadas
          a partir de telemetria de uso, e não medições físicas em wattímetro.
          Eles não substituem inventários auditados e{' '}
          <strong>não servem para relatório oficial de emissões</strong>.
        </div>
      </aside>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-energia-title"
      >
        <h2 id="metodologia-energia-title">
          1. Estimativa de potência e energia elétrica
        </h2>
        <p>
          A cada coleta válida recebida pela API de métricas, o backend soma a
          potência estimada dos quatro recursos computacionais do serviço (CPU,
          memória RAM, disco e tráfego de rede) e multiplica pela duração exata
          do intervalo em horas:
        </p>
        <div className="methodology-formulas">
          <p>
            <strong>Potência total (W):</strong>{' '}
            <code>
              P = (CPU% ÷ 100 ×{' '}
              {formatarDecimal(CONSTANTES_CALCULO.cpuMaxWatts, 1)} W) + (RAM_GB
              × {formatarDecimal(CONSTANTES_CALCULO.memoriaWattsPorGb, 3)} W/GB)
              + (Disco_GB ×{' '}
              {formatarDecimal(CONSTANTES_CALCULO.discoWattsPorGb, 2)} W/GB) +
              (Rede_GB × {formatarDecimal(CONSTANTES_CALCULO.redeWattsPorGb, 2)}{' '}
              W/GB)
            </code>
          </p>
          <p>
            <strong>Energia no intervalo:</strong>{' '}
            <code>
              Energia (Wh) = Potência (W) × (Intervalo em segundos ÷ 3.600)
            </code>{' '}
            (armazenada em kWh dividindo Wh por 1.000).
          </p>
          <p>
            <strong>Emissão operacional:</strong>{' '}
            <code>
              Emissão (gCO₂e) = Energia (kWh) × Intensidade regional (gCO₂e/kWh)
            </code>
          </p>
        </div>

        <dl className="methodology-factors-grid">
          <div>
            <dt>CPU (potência máxima base)</dt>
            <dd>{formatarDecimal(CONSTANTES_CALCULO.cpuMaxWatts, 2)} W</dd>
          </div>
          <div>
            <dt>Memória RAM</dt>
            <dd>
              {formatarDecimal(CONSTANTES_CALCULO.memoriaWattsPorGb, 3)} W/GB
            </dd>
          </div>
          <div>
            <dt>Armazenamento (disco)</dt>
            <dd>
              {formatarDecimal(CONSTANTES_CALCULO.discoWattsPorGb, 2)} W/GB
            </dd>
          </div>
          <div>
            <dt>Tráfego de rede</dt>
            <dd>
              {formatarDecimal(CONSTANTES_CALCULO.redeWattsPorGb, 2)} W/GB
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-exemplo-title"
      >
        <h2 id="metodologia-exemplo-title">
          2. Exemplo numérico conferido com o código
        </h2>
        <p>
          Reproduzindo passo a passo a mesma fórmula executada pelo{' '}
          <code>CalculosService</code> para um serviço em execução por{' '}
          <strong>{entrada.intervaloSegundos} segundos</strong> (1 hora) em uma
          região com intensidade de{' '}
          <strong>
            {formatarDecimal(entrada.intensidadeCarbonoGCo2ePorKwh, 0)}{' '}
            gCO₂e/kWh
          </strong>
          :
        </p>
        <div className="methodology-example-grid">
          <div className="methodology-example-box">
            <h3>Dados da coleta</h3>
            <ul>
              <li>CPU: {formatarDecimal(entrada.cpuPercent, 0)}%</li>
              <li>Memória RAM: {formatarDecimal(entrada.memoryGb, 0)} GB</li>
              <li>Disco: {formatarDecimal(entrada.diskGb, 0)} GB</li>
              <li>Rede: {formatarDecimal(entrada.networkGb, 0)} GB</li>
              <li>Intervalo: {entrada.intervaloSegundos} s (1,00 h)</li>
              <li>
                Intensidade regional:{' '}
                {formatarDecimal(entrada.intensidadeCarbonoGCo2ePorKwh, 1)}{' '}
                gCO₂e/kWh
              </li>
            </ul>
          </div>
          <div className="methodology-example-box">
            <h3>Resultado passo a passo</h3>
            <ul>
              <li>CPU: {formatarDecimal(resultado.consumoCpuW, 2)} W</li>
              <li>
                Memória: {formatarDecimal(resultado.consumoMemoriaW, 2)} W
              </li>
              <li>Disco: {formatarDecimal(resultado.consumoDiscoW, 2)} W</li>
              <li>Rede: {formatarDecimal(resultado.consumoRedeW, 2)} W</li>
              <li>
                <strong>
                  Potência total: {formatarDecimal(resultado.potenciaTotalW, 2)}{' '}
                  W
                </strong>
              </li>
              <li>
                <strong>
                  Energia: {formatEnergy(resultado.energiaKwh)} (
                  {formatarDecimal(resultado.energiaKwh, 4)} kWh)
                </strong>
              </li>
              <li>
                <strong>
                  Emissão: {formatEmission(resultado.emissaoGCo2e)} (
                  {formatarDecimal(resultado.emissaoGCo2e, 3)} gCO₂e)
                </strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-carbono-title"
      >
        <h2 id="metodologia-carbono-title">
          3. Origem da intensidade de carbono e tratamento de falhas
        </h2>
        <p>
          A intensidade regional em <code>gCO₂e/kWh</code> é consultada na{' '}
          <strong>GreenER Carbon Intensity API</strong> através da rota{' '}
          <code>GET /regions/{'{codigo}'}/carbon-intensity</code>, com tempo
          limite de 8 segundos por requisição.
        </p>
        <p>
          <strong>Quando a API falha ou retorna resposta inválida:</strong> o
          sistema <strong>não utiliza fator substituto fictício</strong> nem
          inventa emissão. A coleta é registrada com{' '}
          <code>estadoColeta = SUCESSO</code> (telemetria recebida) e{' '}
          <code>estadoCalculo = FALHA</code>, sem gravar emissão para essa
          amostra, e o erro é contabilizado no painel de saúde das integrações (
          <code>/admin</code>). Nos indicadores, gráficos e totais do período
          entram apenas coletas com <code>estadoCalculo = CONCLUIDO</code>; já a
          busca da última coleta válida (
          <code>/coletas/servico/:id/ultima-valida</code>) filtra apenas por{' '}
          <code>estadoColeta = SUCESSO</code>, podendo retornar a coleta mais
          recente ainda sem emissão calculada (<code>—</code>) em vez de uma
          coleta anterior concluída.
        </p>
      </section>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-sci-title"
      >
        <h2 id="metodologia-sci-title">
          4. Relação com a especificação SCI (Green Software Foundation) e
          limites do modelo
        </h2>
        <p>
          O cálculo operacional do GreenER segue o núcleo operacional da{' '}
          <strong>Software Carbon Intensity (SCI)</strong> da Green Software
          Foundation (<code>O = E × I</code>, energia consumida multiplicada
          pela intensidade de carbono da rede elétrica da região).
        </p>
        <ul>
          <li>
            <strong>O que está incluído:</strong> estimativa da energia elétrica
            em operação (<code>E</code>) ponderada pela intensidade de carbono
            regional (<code>I</code>).
          </li>
          <li>
            <strong>O que não está incluído:</strong> carbono incorporado do
            hardware (<code>M</code> — fabricação, transporte e descarte dos
            servidores físicos), perdas de refrigeração/PUE específicas de cada
            provedor e diferenças entre arquitetura de processadores.
          </li>
          <li>
            <strong>Uso recomendado:</strong> comparar serviços entre si,
            acompanhar tendências ao longo do tempo e priorizar ações de
            redução. Os números são apenas informativos e não servem para
            relatório oficial de emissões.
          </li>
        </ul>
      </section>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-equivalencias-title"
      >
        <h2 id="metodologia-equivalencias-title">
          5. Equivalências do CO₂e no dia a dia
        </h2>
        <p>
          Para facilitar a leitura de emissões em gramas ou quilogramas, os
          totais exibem comparações aproximadas (indicadas pelo símbolo{' '}
          <code>≈</code>) baseadas nos fatores oficiais da{' '}
          <a
            href={FONTE_EQUIVALENCIAS.url}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            {FONTE_EQUIVALENCIAS.nome}
          </a>{' '}
          (consultada em <strong>{FONTE_EQUIVALENCIAS.consultadoEm}</strong>):
        </p>
        <dl className="methodology-factors-grid">
          <div>
            <dt>Carro de passeio a gasolina</dt>
            <dd>
              {formatarDecimal(FONTE_EQUIVALENCIAS.carroGCo2ePorMilha, 0)}{' '}
              gCO₂e/milha (≈{' '}
              {formatarDecimal(FONTE_EQUIVALENCIAS.carroGCo2ePorKm, 2)}{' '}
              gCO₂e/km)
            </dd>
          </div>
          <div>
            <dt>Carga completa de smartphone</dt>
            <dd>
              {formatarDecimal(FONTE_EQUIVALENCIAS.celularGCo2ePorCarga, 1)}{' '}
              gCO₂e por carga
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-timeshifting-title"
      >
        <h2 id="metodologia-timeshifting-title">
          6. Melhor horário e <em>time-shifting</em>
        </h2>
        <p>
          O mapa de calor de horários organiza as coletas em uma{' '}
          <strong>matriz 7 × 24</strong> (dia da semana × hora) com a
          intensidade média de carbono de cada intervalo e identifica a{' '}
          <strong>melhor janela de 3 horas seguidas</strong> com medições
          registradas.
        </p>
        <p>
          Essa leitura apoia o padrão de <strong>time-shifting</strong> da{' '}
          <strong>Green Software Foundation</strong>: deslocar cargas flexíveis
          (como processamentos em lote e rotinas pesadas) para os horários em
          que a rede elétrica da região emite menos CO₂e por kWh. A matriz
          reflete apenas as{' '}
          <strong>médias históricas do período selecionado</strong>, e não uma
          previsão futura da rede elétrica.
        </p>
      </section>

      <section
        className="methodology-card"
        aria-labelledby="metodologia-picos-title"
      >
        <h2 id="metodologia-picos-title">
          7. Detecção de picos incomuns nos gráficos
        </h2>
        <p>
          Nos gráficos de tendência do dashboard e de histórico no detalhe do
          serviço, o GreenER destaca automaticamente intervalos com consumo ou
          emissão fora do padrão esperado da própria série.
        </p>
        <div className="methodology-formulas">
          <p>
            <strong>Critério estatístico:</strong>{' '}
            <code>
              Limiar = média + {MULTIPLICADOR_DESVIO_PICO} × desvio-padrão
            </code>{' '}
            (desvio-padrão populacional da série observada).
          </p>
        </div>
        <ul>
          <li>
            <strong>Amostra mínima:</strong> a marcação só é ativada quando há
            pelo menos <strong>{MINIMO_PONTOS_PICO} pontos válidos</strong> no
            período, evitando alertas distorcidos em séries curtas.
          </li>
          <li>
            <strong>Série constante:</strong> quando todos os pontos têm o mesmo
            valor (<code>desvio-padrão = 0</code>), nenhum pico é marcado.
          </li>
          <li>
            <strong>Leitura acessível:</strong> cada ponto acima do limiar
            recebe destaque visual no gráfico (ex.:{' '}
            <em>&ldquo;pico incomum às 14h&rdquo;</em>) e aparece em uma lista
            acessível logo abaixo do gráfico com horário, valor e desvio em
            relação à média.
          </li>
        </ul>
      </section>
    </div>
  );
}
