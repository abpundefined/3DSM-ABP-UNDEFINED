type JsonRecord = Record<string, any>;

const toObject = (value: unknown): JsonRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as JsonRecord;
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as JsonRecord;
  const candidates = ["items", "data", "services", "results", "value"];

  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  const firstArray = Object.values(record).find((entry) =>
    Array.isArray(entry),
  );
  return firstArray ? (firstArray as unknown[]) : [];
};

const normalizeKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const findCandidate = (record: JsonRecord, keys: string[]): unknown => {
  const lookup = new Map<string, unknown>();

  for (const [key, value] of Object.entries(record)) {
    lookup.set(normalizeKey(key), value);
  }

  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (lookup.has(normalized)) {
      return lookup.get(normalized);
    }
  }

  return undefined;
};

export const findString = (
  record: JsonRecord | null,
  keys: string[],
  fallback = "",
): string => {
  if (!record) {
    return fallback;
  }

  const value = findCandidate(record, keys);
  if (value == null) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    const nested = value as JsonRecord;
    const direct = findString(
      nested,
      ["name", "title", "label", "value"],
      fallback,
    );
    return direct || fallback;
  }

  return fallback;
};

export const findNumber = (
  record: JsonRecord | null,
  keys: string[],
  fallback?: number,
): number | undefined => {
  if (!record) {
    return fallback;
  }

  const value = findCandidate(record, keys);
  if (value == null) {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const safeArrayFromResponse = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = toObject(payload);
  if (!root) {
    return [];
  }

  const direct = toArray(payload);
  if (direct.length > 0) {
    return direct;
  }

  for (const key of ["data", "result", "items", "services", "records"]) {
    const nested = root[key];
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
};

export const normalizeServicePayload = (payload: unknown) => {
  const source = toObject(payload);
  if (!source) {
    return null;
  }

  const id =
    findCandidate(source, [
      "id",
      "serviceId",
      "service_id",
      "uuid",
      "identifier",
      "externalId",
      "serviceID",
    ]) ??
    findString(source, [
      "id",
      "serviceId",
      "service_id",
      "uuid",
      "identifier",
      "externalId",
      "serviceID",
    ]);

  const name = findString(source, [
    "name",
    "title",
    "serviceName",
    "service",
    "label",
    "displayName",
  ]);
  const locationData = toObject(
    findCandidate(source, ["location", "localizacao"]),
  );

  const city =
    findString(locationData, ["city", "cidade", "municipio"]) ||
    findString(source, ["city", "cidade", "municipio", "locationCity"]);

  const country =
    findString(locationData, ["country", "pais", "countryName"]) ||
    findString(source, ["country", "pais", "countryName", "locationCountry"]);

  const region =
    findString(locationData, ["region", "regiao", "zone", "state"]) ||
    findString(source, ["region", "regiao", "zone", "state"]);

  const location =
    (typeof source.location === "string" ? source.location.trim() : "") ||
    findString(source, ["locationName", "location_name", "place"]) ||
    city ||
    region ||
    country;

  const regiaoCodigo = findString(locationData, ["region_code", "regionCode"]);

  const latitude = findNumber(locationData, ["latitude", "lat"]);

  const longitude = findNumber(locationData, ["longitude", "lon", "lng"]);

  const caminhoMetricas = findString(source, ["metrics_path", "metricsPath"]);

  const normalizedId = String(id ?? "").trim();
  const normalizedName = String(name ?? "").trim();

  if (!normalizedId || !normalizedName) {
    return null;
  }

  return {
    idExterno: normalizedId,
    nome: normalizedName,
    localizacao: location || "Desconhecida",
    cidade: city || null,
    pais: country || null,
    regiao: region || null,
    regiaoCodigo: regiaoCodigo || null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    caminhoMetricas: caminhoMetricas || `/metrics/${normalizedId}`,
  };
};

export const hasMeaningfulMetricValue = (
  metrics:
    | {
        cpuPercent?: number | null;
        memoryGb?: number | null;
        diskGb?: number | null;
        networkGb?: number | null;
      }
    | null
    | undefined,
): boolean => {
  if (!metrics) {
    return false;
  }

  const values = [metrics.cpuPercent, metrics.memoryGb, metrics.diskGb, metrics.networkGb];

  return values.some(
    (value) => typeof value === 'number' && Number.isFinite(value) && value !== 0,
  );
};

export const normalizeMetricPayload = (payload: unknown) => {
  const source = toObject(payload);
  if (!source) {
    return null;
  }

  const metricCandidates = [
    source,
    ...Object.values(source)
      .filter((value) => value && typeof value === "object")
      .map((value) => toObject(value) ?? {}),
  ];

  const values: Record<string, number | undefined> = {};

  for (const candidate of metricCandidates) {
    const metrics = candidate as JsonRecord;
    values.cpuPercent = findNumber(metrics, [
      "cpu_percent",
      "cpuPercent",
      "cpu",
      "cpuUsage",
      "usageCpu",
    ]);
    values.memoryGb = findNumber(metrics, [
      "memory_gb",
      "memoryGb",
      "memory",
      "memoryUsage",
      "ramGb",
    ]);
    values.diskGb = findNumber(metrics, [
      "disk_gb",
      "diskGb",
      "disk",
      "diskUsage",
      "storageGb",
    ]);
    values.networkGb = findNumber(metrics, [
      "network_gb",
      "networkGb",
      "network",
      "networkUsage",
      "trafficGb",
    ]);

    if (hasMeaningfulMetricValue(values)) {
      break;
    }
  }

  return {
    cpuPercent: values.cpuPercent,
    memoryGb: values.memoryGb,
    diskGb: values.diskGb,
    networkGb: values.networkGb,
  };
};
