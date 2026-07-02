import { AIProvider, AIProviderAdapterRequest, AIProviderAdapterResponse } from "./EnterpriseAITypes";

type ProviderAdapter = (request: AIProviderAdapterRequest) => AIProviderAdapterResponse;

export class AIProviderAdapterEngine {
  private readonly adapters = new Map<AIProvider, ProviderAdapter>();

  constructor() {
    const providers: AIProvider[] = ["openai", "azure_openai", "anthropic", "gemini", "local", "future_provider"];
    providers.forEach((provider) => this.registerAdapter(provider, this.createDeterministicAdapter(provider)));
  }

  registerAdapter(provider: AIProvider, adapter: ProviderAdapter): void {
    this.adapters.set(provider, adapter);
  }

  complete(request: AIProviderAdapterRequest): AIProviderAdapterResponse {
    const adapter = this.adapters.get(request.model.provider);
    if (!adapter) {
      return {
        provider: request.model.provider,
        modelId: request.model.id,
        status: "failed",
        normalizedText: "No provider adapter is registered.",
        structuredData: {},
        tokenEstimate: 0,
        estimatedCost: 0,
      };
    }

    return adapter(request);
  }

  private createDeterministicAdapter(provider: AIProvider): ProviderAdapter {
    return (request) => {
      const tokenEstimate = Math.ceil(request.prompt.length / 4);
      return {
        provider,
        modelId: request.model.id,
        status: "completed",
        normalizedText: `AI analysis completed for ${request.session.request.task}.`,
        structuredData: {
          provider,
          modelId: request.model.id,
          organizationId: request.session.scope.organizationId,
          operatingUnitId: request.session.scope.operatingUnitId ?? null,
          confidence: {
            statisticalConfidence: 0.82,
            dataCompleteness: 0.78,
            forecastStability: 0.74,
            modelAgreement: 0.8,
          },
        },
        tokenEstimate,
        estimatedCost: Number(((request.model.costPerUnit ?? 0.000001) * tokenEstimate).toFixed(6)),
      };
    };
  }
}
