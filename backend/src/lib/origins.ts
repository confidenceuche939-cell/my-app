// CORS_ORIGIN accepte une ou plusieurs URL séparées par des virgules, ex :
//   CORS_ORIGIN="https://mon-app.vercel.app,http://localhost:5173"
// Les "/" finaux sont retirés : une origine navigateur n'en a jamais, et c'est
// l'erreur de configuration CORS la plus fréquente en production.
export const getAllowedOrigins = (raw: string | undefined = process.env.CORS_ORIGIN): string[] => {
  const origins = (raw ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return origins.length > 0 ? origins : ['http://localhost:5173'];
};
