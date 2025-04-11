"""
Initialize and register all model providers
"""
from .registry import get_provider_registry
from .openai import OpenAIProvider, OpenAICompatibleProvider
from .anthropic import AnthropicProvider

# Import other providers as they are implemented
# from .nvidia import NvidiaProvider
# from .deepinfra import DeepInfraProvider
# from .openrouter import OpenRouterProvider

def register_providers():
    """Register all available model providers with the registry"""
    registry = get_provider_registry()
    
    # Register OpenAI providers
    registry.register_provider(OpenAIProvider())
    registry.register_provider(OpenAICompatibleProvider())
    
    # Register Anthropic provider
    registry.register_provider(AnthropicProvider())
    
    # Register other providers as they are implemented
    # registry.register_provider(NvidiaProvider())
    # registry.register_provider(DeepInfraProvider())
    # registry.register_provider(OpenRouterProvider())
    
    return registry
