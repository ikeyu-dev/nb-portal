import "server-only";

const DEFAULT_D1_BACKEND_URL =
    "https://nb-portal-api-production.nit-housouken.workers.dev";

export const getBackendApiUrl = () =>
    process.env.D1_BACKEND_URL ||
    process.env.NEXT_PUBLIC_D1_BACKEND_URL ||
    process.env.NB_PORTAL_API_URL ||
    DEFAULT_D1_BACKEND_URL;

export const getBackendApiHeaders = (): Record<string, string> => {
    const apiKey = process.env.D1_BACKEND_API_KEY;
    return apiKey ? { "x-nb-portal-api-key": apiKey } : {};
};
