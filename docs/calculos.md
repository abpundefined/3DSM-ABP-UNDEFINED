# ⚡ Memória de Cálculo Ambiental — GreenER

> **Critérios da Rubrica:** DW02, TP04, RF07, RF08, RP04  
> **Repositório:** [abpundefined/3DSM-ABP-UNDEFINED](https://github.com/abpundefined/3DSM-ABP-UNDEFINED)  
> **Equipe:** Undefined  

---

## Situação e limites — 19/10/2026

**Modelo proposto, ainda não implementado ou validado.** O backend atual não calcula energia/CO₂e nem consulta carbono. Os indicadores reais permanecem indisponíveis. Fórmulas, constantes e fallback descritos abaixo são propostas da documentação inicial e não evidência de comportamento existente.

A API atual fornece `cpu_percent`, GB e `collection_interval_seconds`; a proposta abaixo usa millicores/núcleos em alguns trechos. Antes da Sprint 2, reconciliar as unidades e hipóteses de capacidade, documentar a origem dos fatores e validar com o professor. Não converter percentual em millicores sem definir capacidade, nem assumir que o intervalo do agendador é o intervalo medido. O fallback de 85 gCO₂e/kWh também não está implementado/validado e não deve ser apresentado como estimativa real atual.

## 🎯 1. Objetivo deste Documento

Este documento formaliza as **fórmulas matemáticas**, **unidades de medida**, **fatores de emissão** e **constantes de referência** utilizadas pelo backend do GreenER para converter métricas de telemetria computacional (CPU, memória e tráfego) em estimativas de **consumo energético (kWh)** e **emissões de dióxido de carbono equivalente (gCO₂e e kgCO₂e)**.

---

## 📐 2. Modelo Teórico de Green Computing

A metodologia adotada pelo GreenER baseia-se nos padrões da iniciativa **Green Software Foundation (SCI — Software Carbon Intensity)** e modelos consolidados como o **Cloud Carbon Footprint (CCF)**.

O consumo total de um serviço computacional considera:
1. **Energia de Processamento (CPU):** Função do uso de núcleos/millicores e potência média por núcleo.
2. **Energia de Memória RAM:** Proporcional à quantidade de memória alocada e em uso.
3. **PUE (Power Usage Effectiveness):** Fator multiplicativo da eficiência da infraestrutura do Data Center (energia gasta em refrigeração e perdas elétricas).
4. **Intensidade de Carbono Regional ($I_{carbon}$):** Gramas de CO₂ emitidas por kWh gerado na matriz elétrica da região do data center.

---

## 🔢 3. Fórmulas de Cálculo

### 3.1 Estimativa da Potência e Consumo de Energia ($E$)

O consumo de energia por hora de processamento é modelado da seguinte forma:

$$P_{serviço} = P_{CPU} + P_{RAM}$$

Onde:
- **Potência da CPU ($P_{CPU}$ em Watts):**
  $$P_{CPU} = P_{idle} + (P_{max} - P_{idle}) \times \left(\frac{CPU_{mcores}}{1000 \times N_{cores}}\right)$$
  - $P_{idle}$ (Potência em repouso por vCPU): ~**1.5 W**
  - $P_{max}$ (Potência em carga máxima por vCPU): ~**4.0 W**
  - $CPU_{mcores}$: Millicores consumidos no momento da medição.

- **Potência da Memória RAM ($P_{RAM}$ em Watts):**
  $$P_{RAM} = RAM_{GB} \times C_{RAM}$$
  - $C_{RAM}$ (Consumo médio por GB): ~**0.38 W/GB**
  - $RAM_{GB}$: Volume de memória em Gigabytes ($\text{Bytes} / 1024^3$).

- **Consumo Energético Total com PUE ($E_{total}$ em kWh):**
  Para um intervalo de coleta $\Delta t$ (em segundos):
  $$E_{total} (\text{kWh}) = \left(\frac{P_{serviço} \times \text{PUE} \times \Delta t}{3600 \times 1000}\right)$$
  - $\text{PUE}$ (Data Center Eficiência Padrão): **1.2** (valor de referência para data centers modernos em nuvem).

---

### 3.2 Estimativa da Emissão de CO₂ Equivalente ($CO_2e$)

A pegada de carbono operacional do serviço é calculada multiplicando a energia gasta pela intensidade de carbono regional obtida da API externa:

$$Emissão_{CO_2e} (\text{gCO}_2\text{e}) = E_{total} (\text{kWh}) \times I_{carbon} (\text{gCO}_2\text{e/kWh})$$

Para exibição em quilogramas (kgCO₂e):
$$Emissão_{CO_2e} (\text{kgCO}_2\text{e}) = \frac{Emissão_{CO_2e} (\text{gCO}_2\text{e})}{1000}$$

> **Nota:** Se a API de Intensidade de Carbono estiver momentaneamente inacessível, o sistema utiliza o fator de emissão médio da matriz elétrica brasileira do SIN (Sistema Interligado Nacional): **~85.0 gCO₂e/kWh** como fallback tolerante a falhas (**RF05**, **RNF05**).

---

## 📊 4. Indicadores Consolidados Agregados (RF08)

Para a visão geral do dashboard, o backend computa os seguintes totais:

1. **Consumo Total de Energia:**
   $$E_{agregada} = \sum_{i=1}^{N} E_{total}(i)$$
2. **Emissão Total de Carbono:**
   $$CO_{2}e_{agregada} = \sum_{i=1}^{N} Emissão_{CO_2e}(i)$$
3. **Média de Intensidade Energética por Requisição:**
   $$\text{Eficiência} = \frac{E_{agregada}}{\text{Total de Requisições do Período}}$$

---

## 🧪 5. Exemplo Numérico Prático

Considere um serviço de catálogo com as seguintes métricas coletadas:
- **CPU:** 800 millicores (0.8 núcleos)
- **RAM:** 2.048 MB (2.0 GB)
- **Duração do intervalo ($\Delta t$):** 60 segundos
- **Intensidade de Carbono local:** 120 gCO₂e/kWh

**Passo a passo:**
1. **$P_{CPU}$:** $1.5 + (4.0 - 1.5) \times 0.8 = 1.5 + 2.0 = \mathbf{3.5\text{ W}}$
2. **$P_{RAM}$:** $2.0\text{ GB} \times 0.38\text{ W/GB} = \mathbf{0.76\text{ W}}$
3. **$P_{serviço}$:** $3.5 + 0.76 = \mathbf{4.26\text{ W}}$
4. **$E_{total}$ com PUE 1.2:**
   $$E_{total} = \frac{4.26 \times 1.2 \times 60}{3600 \times 1000} = \frac{306.72}{3\,600\,000} \approx \mathbf{0.0000852\text{ kWh}}$$
5. **Emissão de $CO_2e$:**
   $$Emissão = 0.0000852 \times 120 \approx \mathbf{0.01022\text{ gCO}_2\text{e}}$$

Este algoritmo está totalmente isolado no módulo `CalculosService` do NestJS e coberto por testes unitários conforme exigido por **RP04** e **TP04**.
