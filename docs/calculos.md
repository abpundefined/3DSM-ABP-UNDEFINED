# ⚡ Memória de Cálculo Ambiental — GreenER

> **Critérios da Rubrica:** DW02, TP04, RF07, RF08, RP04  
> **Repositório:** [abpundefined/3DSM-ABP-UNDEFINED](https://github.com/abpundefined/3DSM-ABP-UNDEFINED)  
> **Equipe:** Undefined  

---

## Situação e limites — Início da Sprint 2

**Atenção:** O modelo descrito abaixo define a regra de negócio oficial do desafio a ser implementada na Sprint 2. Atualmente, o módulo `CalculosService` está em fase de desenvolvimento. A conversão de telemetria para kWh e gCO₂e será conectada aos dados reais do banco e à API de carbono durante esta sprint, assegurando a precisão exigida no cálculo de horas ($\Delta t / 3600$) sem arredondamentos prematuros.

## 🎯 1. Objetivo deste Documento

Este documento formaliza as **fórmulas matemáticas**, **unidades de medida**, **fatores de emissão** e **constantes de referência** que o backend do GreenER utilizará para converter métricas de telemetria computacional (CPU, Memória, Disco e Rede) em estimativas de **consumo energético (kWh)** e **emissões de dióxido de carbono equivalente (gCO₂e e kgCO₂e)**.

---

## 📐 2. Modelo Teórico e Constantes

O consumo total de um serviço computacional considera a soma da potência de todos os recursos alocados/utilizados, multiplicada pelo tempo de execução. As constantes adotadas seguem a especificação do desafio:

- **Memória RAM:** `0.375 W/GB`
- **Disco (Armazenamento):** `0.01 W/GB`
- **Rede (Tráfego):** `0.02 W/GB`
- **Processamento (CPU):** Proporcional à utilização com base na potência máxima da CPU (`CPU_MAX`).

---

## 🔢 3. Fórmulas de Cálculo

### 3.1 Estimativa da Potência e Consumo de Energia ($E$)

A potência total ($P_{total}$) em Watts no momento da coleta é a soma de:

$$P_{total} = P_{CPU} + P_{RAM} + P_{Disco} + P_{Rede}$$

Onde:
- **$P_{RAM}$:** $\text{RAM}_{GB} \times 0.375$
- **$P_{Disco}$:** $\text{Disco}_{GB} \times 0.01$
- **$P_{Rede}$:** $\text{Rede}_{GB} \times 0.02$
- **$P_{CPU}$:** Calculado com base no uso percentual em relação ao `CPU_MAX` do servidor.

**Consumo Energético ($E$ em kWh):**
Para um intervalo de coleta $\Delta t$ (em segundos), convertemos o tempo para horas exatas dividindo por 3600, e a potência para kW dividindo por 1000:

$$E \text{ (kWh)} = \frac{P_{total} \times \left(\frac{\Delta t}{3600}\right)}{1000}$$

---

### 3.2 Estimativa da Emissão de CO₂ Equivalente ($CO_2e$)

A pegada de carbono operacional do serviço é calculada multiplicando a energia gasta pela intensidade de carbono regional ($I_{carbon}$) fornecida por API externa:

$$Emissão_{CO_2e} (\text{gCO}_2\text{e}) = E (\text{kWh}) \times I_{carbon} (\text{gCO}_2\text{e/kWh})$$

Para exibição em quilogramas (kgCO₂e):
$$Emissão_{CO_2e} (\text{kgCO}_2\text{e}) = \frac{Emissão_{CO_2e} (\text{gCO}_2\text{e})}{1000}$$

> **Fallback de Falha de API:** Se a API de Carbono estiver inacessível ou a região não mapeada, o sistema adotará o fator de emissão base de **85.0 gCO₂e/kWh**.

### 3.3 Integração com a API de intensidade de carbono

O backend consulta `GET {CARBON_API_URL}/regions/{region_code}/carbon-intensity`. A resposta fornece o fator em `carbon_intensity_gco2e_per_kwh`; esse fator e a emissão calculada são persistidos na coleta. Se a consulta falhar ou retornar um fator inválido, aplica-se o fallback de 85.0 gCO₂e/kWh.

---

## 🧪 4. Exemplo Numérico de Referência (Validação de Testes)

Este exemplo será utilizado como *mock* e validação nos testes unitários do `CalculosService` para garantir a ausência de distorções por arredondamento.

**Dados de Entrada:**
- **Potência Total dos Recursos ($P_{total}$):** 50.87 W
- **Duração do intervalo ($\Delta t$):** 60 segundos (intervalo explícito do *scheduler*)
- **Intensidade de Carbono local:** 85.0 gCO₂e/kWh

**Passo a passo (sem arredondamento prematuro de tempo):**

1. **Cálculo da Energia ($E$):**
   $$E = \frac{50.87 \times \left(\frac{60}{3600}\right)}{1000}$$
   $$E = \frac{50.87 \times 0.0166666666666667}{1000}$$
   $$E = \mathbf{0.0008478333 \text{ kWh}}$$

2. **Cálculo da Emissão ($CO_2e$):**
   $$Emissão = 0.0008478333 \times 85.0$$
   $$Emissão = \mathbf{0.0720658 \text{ gCO}_2\text{e}}$$