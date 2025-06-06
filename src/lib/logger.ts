// Shared logging utility
export const createLogger = (module: string) => {
  return (event: string, data: unknown, isError: boolean = false) => {
    const timestamp = new Date().toISOString();
    const logLevel = isError ? "ERROR" : "INFO";
    console.log(
      `[${timestamp}] [${module.toUpperCase()}-${logLevel}] ${event}:`,
      JSON.stringify(data, null, 2)
    );
  };
};

// Request ID generator utility
export const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};