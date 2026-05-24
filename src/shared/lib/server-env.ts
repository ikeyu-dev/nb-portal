import "server-only";

export const getGasApiUrl = () =>
    process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_API_URL;
