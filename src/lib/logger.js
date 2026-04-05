const isProd = import.meta.env.PROD;

function print(method, args) {
  // En producción solo dejamos warn/error para reducir exposición de datos.
  if (isProd && (method === "debug" || method === "info")) return;
  console[method](...args);
}

export const logger = {
  debug: (...args) => print("debug", args),
  info:  (...args) => print("info", args),
  warn:  (...args) => print("warn", args),
  error: (...args) => print("error", args),
};
