-- CreateEnum
CREATE TYPE "EstadoMonitoramento" AS ENUM ('DISPONIVEL', 'INDISPONIVEL', 'SEM_METRICAS', 'REMOVIDO', 'DESCONHECIDO');

-- CreateEnum
CREATE TYPE "EstadoColeta" AS ENUM ('SUCESSO', 'SEM_METRICAS', 'FALHA');

-- CreateEnum
CREATE TYPE "EstadoCalculo" AS ENUM ('PENDENTE', 'CONCLUIDO', 'FALHA');

-- CreateTable
CREATE TABLE "Regiao" (
    "codigo" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "regiao" TEXT NOT NULL,
    "cidade" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "atualizadaEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" SERIAL NOT NULL,
    "idExterno" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "regiaoCodigo" TEXT NOT NULL,
    "caminhoMetricas" TEXT NOT NULL,
    "estadoAtual" "EstadoMonitoramento" NOT NULL DEFAULT 'DESCONHECIDO',
    "descobertoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaVezListadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coleta" (
    "id" SERIAL NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "regiaoCodigoNaColeta" TEXT,
    "iniciadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEm" TIMESTAMPTZ(3),
    "intervaloColetaSegundos" INTEGER,
    "estadoColeta" "EstadoColeta" NOT NULL,
    "codigoErro" TEXT,
    "mensagemErro" TEXT,
    "cpuPercent" DOUBLE PRECISION,
    "memoryGb" DOUBLE PRECISION,
    "diskGb" DOUBLE PRECISION,
    "networkGb" DOUBLE PRECISION,
    "intensidadeCarbonoGCo2ePorKwh" DOUBLE PRECISION,
    "consultadaCarbonoEm" TIMESTAMPTZ(3),
    "inicioPeriodo" TIMESTAMPTZ(3),
    "fimPeriodo" TIMESTAMPTZ(3),
    "energiaKwh" DOUBLE PRECISION,
    "emissaoGCo2e" DOUBLE PRECISION,
    "estadoCalculo" "EstadoCalculo" NOT NULL DEFAULT 'PENDENTE',
    "versaoCalculo" TEXT,

    CONSTRAINT "Coleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoMonitoramento" (
    "id" SERIAL NOT NULL,
    "intervaloDescobertaSegundos" INTEGER NOT NULL,
    "intervaloColetaSegundos" INTEGER NOT NULL,
    "atualizadaEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ConfiguracaoMonitoramento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Servico_idExterno_key" ON "Servico"("idExterno");

-- CreateIndex
CREATE INDEX "Servico_regiaoCodigo_idx" ON "Servico"("regiaoCodigo");

-- CreateIndex
CREATE INDEX "Coleta_servicoId_iniciadaEm_idx" ON "Coleta"("servicoId", "iniciadaEm");

-- CreateIndex
CREATE INDEX "Coleta_regiaoCodigoNaColeta_idx" ON "Coleta"("regiaoCodigoNaColeta");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_regiaoCodigo_fkey" FOREIGN KEY ("regiaoCodigo") REFERENCES "Regiao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coleta" ADD CONSTRAINT "Coleta_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coleta" ADD CONSTRAINT "Coleta_regiaoCodigoNaColeta_fkey" FOREIGN KEY ("regiaoCodigoNaColeta") REFERENCES "Regiao"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
