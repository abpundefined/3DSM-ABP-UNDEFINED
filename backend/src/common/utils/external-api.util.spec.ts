
import { normalizeServicePayload } from './external-api.util';

describe('normalizeServicePayload', () => {

  it('deve extrair corretamente a localização aninhada', () => {
    const payload = {
      id: 'billing-api',
      name: 'Billing API',
      location: {
        country: 'Brazil',
        region: 'Sudeste',
        city: 'Sao Paulo',
      },
    };

    const resultado = normalizeServicePayload(payload);

    expect(resultado).toEqual({
      idExterno: 'billing-api',
      nome: 'Billing API',
      localizacao: 'Sao Paulo',
      cidade: 'Sao Paulo',
      pais: 'Brazil',
      regiao: 'Sudeste',
      regiaoCodigo: null,
      latitude: null,
      longitude: null,
      caminhoMetricas: '/metrics/billing-api',
    });
  });

  it('deve aceitar localização diretamente no objeto', () => {
    const payload = {
      id: 'checkout-worker',
      name: 'Checkout Worker',
      country: 'United States',
      region: 'Virginia',
      city: 'Ashburn',
    };

    const resultado = normalizeServicePayload(payload);

    expect(resultado).toEqual({
      idExterno: 'checkout-worker',
      nome: 'Checkout Worker',
      localizacao: 'Ashburn',
      cidade: 'Ashburn',
      pais: 'United States',
      regiao: 'Virginia',
      regiaoCodigo: null,
      latitude: null,
      longitude: null,
      caminhoMetricas: '/metrics/checkout-worker',
    });
  });

  it('deve rejeitar serviços sem ID', () => {
    const payload = {
      name: 'Serviço sem identificação',
    };

    expect(normalizeServicePayload(payload)).toBeNull();
  });

  it('deve extrair o contrato geográfico oficial da API', () => {
    const payload = {
      id: 'billing-api',
      name: 'Billing API',
      location: {
        region_code: 'br-sudeste',
        country: 'Brazil',
        region: 'Sudeste',
        city: 'Sao Paulo',
        latitude: -23.5505,
        longitude: -46.6333,
      },
      metrics_path: '/metrics/billing-api',
    };

    const resultado = normalizeServicePayload(payload);

    expect(resultado).toEqual({
      idExterno: 'billing-api',
      nome: 'Billing API',
      localizacao: 'Sao Paulo',
      cidade: 'Sao Paulo',
      pais: 'Brazil',
      regiao: 'Sudeste',
      regiaoCodigo: 'br-sudeste',
      latitude: -23.5505,
      longitude: -46.6333,
      caminhoMetricas: '/metrics/billing-api',
    });
  });

});
