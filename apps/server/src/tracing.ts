import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (!endpoint) {
  console.warn('[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set — telemetry disabled');
}

// Header format: "Key=Value,Key2=Value2"
function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    raw.split(',').map((h) => {
      const eq = h.indexOf('=');
      return [h.slice(0, eq), h.slice(eq + 1)] as [string, string];
    }),
  );
}

const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

export const sdk = new NodeSDK({
  serviceName: 'polypad-server',
  ...(endpoint && {
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics`, headers }),
      exportIntervalMillis: 30_000,
    }),
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new RuntimeNodeInstrumentation({ monitoringPrecision: 5000 }),
  ],
});

sdk.start();
