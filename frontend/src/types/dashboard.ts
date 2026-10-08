export type ServiceStatus = 'active' | 'unavailable' | 'noMetrics';

export type DashboardService = {
  id: string;
  name: string;
  region: string;
  status: ServiceStatus;
  cpuPercent: number | null;
  memoryGb: number | null;
  energyKwh: number | null;
  carbonKg: number | null;
};

export type DailyImpact = {
  date: string;
  label: string;
  energyKwh: number;
  carbonKg: number;
};

export type ImpactMetric = 'energyKwh' | 'carbonKg';
