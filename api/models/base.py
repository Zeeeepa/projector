from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any

class BaseModelProvider(ABC):
    """
    Base class for all AI model providers.
    Defines the common interface that all providers must implement.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Get the display name of the provider"""
        pass
    
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Get the unique identifier for this provider"""
        pass
    
    @abstractmethod
    async def validate_api_key(self, api_key: str, custom_endpoint: Optional[str] = None) -> bool:
        """
        Validate if the provided API key is valid
        
        Args:
            api_key: The API key to validate
            custom_endpoint: Optional custom API endpoint
            
        Returns:
            bool: True if the API key is valid, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_available_models(self, api_key: str, custom_endpoint: Optional[str] = None) -> List[str]:
        """
        Get a list of available models from the provider
        
        Args:
            api_key: The API key to use for authentication
            custom_endpoint: Optional custom API endpoint
            
        Returns:
            List[str]: List of model identifiers
        """
        pass
    
    @abstractmethod
    async def test_connection(self, api_key: str, model: str, custom_endpoint: Optional[str] = None) -> Dict[str, Any]:
        """
        Test the connection to the provider
        
        Args:
            api_key: The API key to use for authentication
            model: The model to test
            custom_endpoint: Optional custom API endpoint
            
        Returns:
            Dict[str, Any]: Result of the test with success status and message
        """
        pass
    
    @abstractmethod
    async def generate_completion(
        self, 
        api_key: str, 
        model: str, 
        messages: List[Dict[str, str]], 
        custom_endpoint: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """
        Generate a completion from the model
        
        Args:
            api_key: The API key to use for authentication
            model: The model to use
            messages: List of messages in the conversation
            custom_endpoint: Optional custom API endpoint
            temperature: Temperature parameter for generation
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            str: The generated completion text
        """
        pass
    
    @abstractmethod
    def get_default_models(self) -> List[str]:
        """
        Get a list of default models for this provider
        Used as fallback when API calls fail
        
        Returns:
            List[str]: List of default model identifiers
        """
        pass
    
    @property
    @abstractmethod
    def supports_custom_endpoint(self) -> bool:
        """
        Whether this provider supports custom endpoints
        
        Returns:
            bool: True if custom endpoints are supported
        """
        pass
