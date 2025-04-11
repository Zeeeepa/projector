from typing import Dict, List, Optional, Type
from .base import BaseModelProvider

class ModelProviderRegistry:
    """
    Registry for all model providers.
    Manages the registration and retrieval of model providers.
    """
    
    def __init__(self):
        self._providers: Dict[str, BaseModelProvider] = {}
        
    def register_provider(self, provider: BaseModelProvider) -> None:
        """
        Register a model provider
        
        Args:
            provider: The provider instance to register
        """
        self._providers[provider.provider_id] = provider
        
    def get_provider(self, provider_id: str) -> Optional[BaseModelProvider]:
        """
        Get a provider by its ID
        
        Args:
            provider_id: The ID of the provider to retrieve
            
        Returns:
            Optional[BaseModelProvider]: The provider instance or None if not found
        """
        return self._providers.get(provider_id)
        
    def get_all_providers(self) -> List[BaseModelProvider]:
        """
        Get all registered providers
        
        Returns:
            List[BaseModelProvider]: List of all registered providers
        """
        return list(self._providers.values())
        
    def get_provider_names(self) -> List[Dict[str, str]]:
        """
        Get names and IDs of all registered providers
        
        Returns:
            List[Dict[str, str]]: List of provider name and ID dictionaries
        """
        return [{"id": p.provider_id, "name": p.name} for p in self._providers.values()]


# Singleton instance
_registry = ModelProviderRegistry()

def get_provider_registry() -> ModelProviderRegistry:
    """
    Get the singleton provider registry instance
    
    Returns:
        ModelProviderRegistry: The provider registry instance
    """
    return _registry
