export interface Env {
  ENVIRONMENT: 'production' | 'preview' | 'development';
  ALLOWED_ORIGIN: string;
  HINTS_DISABLED: string;
  MODEL_PROVIDER?: 'gemini' | 'anthropic'; // defaults: gemini if GEMINI_API_KEY, else anthropic
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  HINT_LIMITS?: KVNamespace;
  HINT_AUDIT?: AnalyticsEngineDataset;
}
