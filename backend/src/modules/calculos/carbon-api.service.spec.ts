import { CarbonApiService } from './carbon-api.service';

describe('CarbonApiService', () => {
  const originalApiUrl = process.env.CARBON_API_URL;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.CARBON_API_URL = 'https://carbon.unilaunch.org/';
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ carbon_intensity_gco2e_per_kwh: 85 }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalApiUrl === undefined) {
      delete process.env.CARBON_API_URL;
    } else {
      process.env.CARBON_API_URL = originalApiUrl;
    }
  });

  it('requests the documented region intensity endpoint', async () => {
    const service = new CarbonApiService();

    await expect(service.obterIntensidadeCarbono('br-sudeste')).resolves.toBe(
      85,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://carbon.unilaunch.org/regions/br-sudeste/carbon-intensity',
    );
  });
});
