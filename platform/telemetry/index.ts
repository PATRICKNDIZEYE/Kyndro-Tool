export interface TelemetryEvent {
  message: string;
  level: "error" | "warning" | "info";
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Transport {
  capture(event: TelemetryEvent): void | Promise<void>;
}

export interface Telemetry {
  captureError(error: unknown, context?: Record<string, unknown>): void | Promise<void>;
  capture(event: Omit<TelemetryEvent, "timestamp">): void | Promise<void>;
}

export function createTelemetry(transport: Transport): Telemetry {
  return {
    capture(event) {
      return transport.capture({ ...event, timestamp: new Date().toISOString() });
    },
    captureError(error, context) {
      const message = error instanceof Error ? error.message : String(error);
      return transport.capture({
        message,
        level: "error",
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    },
  };
}
