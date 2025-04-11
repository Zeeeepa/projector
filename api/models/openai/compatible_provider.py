import json
import aiohttp
from typing import Dict, List, Optional, Any

from ..base import BaseModelProvider
from .provider import OpenAIProvider

class OpenAICompatibleProvider(OpenAIProvider):
    """
    OpenAI-compatible API provider implementation
    For providers that implement the OpenAI API interface
    """
    
    @property
    def name(self) -> str:
        return "OpenAI Compatible"
    
    @property
    def provider_id(self) -> str:
        return "openai_compatible"
    
    @property
    def supports_custom_endpoint(self) -> bool:
        return True
    
    async def validate_api_key(self, api_key: str, custom_endpoint: Optional[str] = None) -> bool:
        """Validate OpenAI-compatible API key"""
        if not api_key or not custom_endpoint:
            return False
        
        # Extract the base URL from the endpoint
        # If the endpoint is a full path like https://example.com/v1/chat/completions
        # We need to get https://example.com/v1/models for validation
        base_url = custom_endpoint
        if "/chat/completions" in base_url:
            base_url = base_url.replace("/chat/completions", "/models")
        elif not base_url.endswith("/models"):
            if base_url.endswith("/"):
                base_url += "models"
            else:
                base_url += "/models"
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                
                async with session.get(base_url, headers=headers) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def get_available_models(self, api_key: str, custom_endpoint: Optional[str] = None) -> List[str]:
        """Get available models from OpenAI-compatible API"""
        if not api_key or not custom_endpoint:
            return self.get_default_models()
        
        # Extract the base URL from the endpoint
        base_url = custom_endpoint
        if "/chat/completions" in base_url:
            base_url = base_url.replace("/chat/completions", "/models")
        elif not base_url.endswith("/models"):
            if base_url.endswith("/"):
                base_url += "models"
            else:
                base_url += "/models"
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                
                async with session.get(base_url, headers=headers) as response:
                    if response.status != 200:
                        return self.get_default_models()
                    
                    data = await response.json()
                    
                    # Handle different response formats
                    if data.get("data") and isinstance(data["data"], list):
                        # OpenAI format
                        return [model["id"] for model in data["data"]]
                    elif isinstance(data, list):
                        # Some compatible APIs return a direct list
                        return [model.get("id", model.get("name", "")) for model in data if model.get("id") or model.get("name")]
                    
                    return self.get_default_models()
        except Exception:
            return self.get_default_models()
    
    async def generate_completion(
        self, 
        api_key: str, 
        model: str, 
        messages: List[Dict[str, str]], 
        custom_endpoint: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """Generate a completion from OpenAI-compatible API"""
        if not api_key:
            raise ValueError("API key is required")
        
        if not model:
            raise ValueError("Model is required")
        
        if not custom_endpoint:
            raise ValueError("Custom endpoint is required for OpenAI-compatible providers")
        
        # Ensure the endpoint is for chat completions
        endpoint = custom_endpoint
        if not endpoint.endswith("/chat/completions"):
            if endpoint.endswith("/"):
                endpoint += "chat/completions"
            elif not "/chat/completions" in endpoint:
                endpoint += "/chat/completions"
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                
                payload = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }
                
                async with session.post(endpoint, headers=headers, json=payload) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        error_message = error_data.get("error", {}).get("message", f"API error: {response.status}")
                        raise ValueError(error_message)
                    
                    data = await response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            raise ValueError(f"Error generating completion: {str(e)}")
    
    def get_default_models(self) -> List[str]:
        """Get default models for OpenAI-compatible providers"""
        return [
            "gpt-4",
            "gpt-3.5-turbo",
            "llama-2-70b",
            "mistral-7b"
        ]
