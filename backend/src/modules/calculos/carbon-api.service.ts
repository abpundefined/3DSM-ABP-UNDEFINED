import { Injectable, Logger } from "@nestjs/common";

export const DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH: number = 85;

interface CarbonApiResponse {
  carbon_intensity_gco2e_per_kwh: number;
}

@Injectable()
export class CarbonApiService {
  private readonly logger = new Logger(CarbonApiService.name);
  private readonly apiUrl = process.env.CARBON_API_URL;

  async obterIntensidadeCarbono(regionCode: string): Promise<number> {
    try {
      if (!this.apiUrl) {
        throw new Error("CARBON_API_URL não configurada.");
      }

      const baseUrl = this.apiUrl.replace(/\/+$/, "");
      const encodedRegionCode = encodeURIComponent(regionCode);
      const response = await fetch(
        `${baseUrl}/regions/${encodedRegionCode}/carbon-intensity`,
      );

      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}`);
      }

      const data = (await response.json()) as CarbonApiResponse;
      const intensity = data.carbon_intensity_gco2e_per_kwh;
      if (!Number.isFinite(intensity) || intensity < 0) {
        throw new Error("Resposta inválida da API de intensidade de carbono.");
      }

      return intensity;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      this.logger.error(
        `Falha ao buscar carbono para ${regionCode}. Usando fallback.`,
        errorMessage,
      );
      return DEFAULT_CARBON_INTENSITY_GCO2E_PER_KWH;
    }
  }
}
