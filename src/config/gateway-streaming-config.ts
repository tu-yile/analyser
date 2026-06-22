import { normalizeLowerCase, parseOptionalInteger } from "./env-utils.js";

const envStreamingMode = normalizeLowerCase(process.env.STREAMING_MODE);

export const gatewayStreamingConfig = {
  streamingMode: envStreamingMode || "snapshot",
  streamUpdateIntervalMs: parseOptionalInteger(process.env.STREAM_UPDATE_INTERVAL_MS) ?? 700,
};

export type GatewayStreamingConfig = typeof gatewayStreamingConfig;
