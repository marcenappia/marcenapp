import type {
  AIProvider,
  PlanToolsParams,
  ProviderId,
  ProviderPlanResult,
} from "./aiProvider";
import { ProviderError } from "./aiProvider";

export interface ProviderRouterConfig {
  providers: AIProvider[];
  userPreference?: ProviderId;
  onProviderFailure?: (id: ProviderId, error: ProviderError) => void;
}

export async function planWithFallback(
  params: PlanToolsParams,
  config: ProviderRouterConfig,
): Promise<ProviderPlanResult & { provider: ProviderId }> {
  const providers = config.userPreference
    ? [
        ...config.providers.filter(
          (provider) => provider.id === config.userPreference,
        ),
        ...config.providers.filter(
          (provider) => provider.id !== config.userPreference,
        ),
      ]
    : config.providers;

  const causes: ProviderError[] = [];

  for (const provider of providers) {
    try {
      const result = await provider.planTools(params);

      return {
        ...result,
        provider: provider.id,
      };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError("connection_error", String(error));

      if (providerError.code !== "not_configured") {
        causes.push(providerError);
        config.onProviderFailure?.(provider.id, providerError);
      }
    }
  }

  throw new Error(
    `Todos os provedores falharam: ${causes
      .map((cause) => cause.code)
      .join(",")}`,
  );
}
