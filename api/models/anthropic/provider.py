import json
import aiohttp
from typing import Dict, List, Optional, Any

from ..base import BaseModelProvider

class AnthropicProvider(BaseModelProvider):
    """
    Anthropic API provider implementation
    """
    
    @property
    def name(self) -> str:
        return "Anthropic"
    
    @property
    def provider_id(self) -> str:
        return "anthropic"
    
    @property
    def supports_custom_endpoint(self) -> bool:
        return False
    
    async def validate_api_key(self, api_key: str, custom_endpoint: Optional[str] = None) -> bool:
        """Validate Anthropic API key"""
        if not api_key:
            return False
        
        try:
            # Anthropic doesn't have a dedicated endpoint for validation
            # We'll use a minimal request to the models endpoint
            async with aiohttp.ClientSession() as session:
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01"
                }
                
                endpoint = "https://api.anthropic.com/v1/models"
                
                async with session.get(endpoint, headers=headers) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def get_available_models(self, api_key: str, custom_endpoint: Optional[str] = None) -> List[str]:
        """Get available models from Anthropic"""
        if not api_key:
            return self.get_default_models()
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01"
                }
                
                endpoint = "https://api.anthropic.com/v1/models"
                
                async with session.get(endpoint, headers=headers) as response:
                    if response.status != 200:
                        return self.get_default_models()
                    
                    data = await response.json()
                    
                    if data.get("models") and isinstance(data["models"], list):
                        return [model["id"] for model in data["models"]]
                    
                    return self.get_default_models()
        except Exception:
            return self.get_default_models()
    
    async def test_connection(self, api_key: str, model: str, custom_endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Test connection to Anthropic API"""
        if not api_key:
            return {"success": False, "message": "API key is required"}
        
        if not model:
            return {"success": False, "message": "Model is required"}
        
        try:
            # Just validate the API key without sending a message
            is_valid = await self.validate_api_key(api_key)
            
            if is_valid:
                return {
                    "success": True,
                    "message": f"Successfully validated API key for {self.name}"
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to validate API key for {self.name}"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error testing connection: {str(e)}"
            }
    
    async def generate_completion(
        self, 
        api_key: str, 
        model: str, 
        messages: List[Dict[str, str]], 
        custom_endpoint: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """Generate a completion from Anthropic"""
        if not api_key:
            raise ValueError("API key is required")
        
        if not model:
            raise ValueError("Model is required")
        
        try:
            # Convert messages to Anthropic format
            system_message = None
            converted_messages = []
            
            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    converted_messages.append({
                        "role": "assistant" if msg["role"] == "assistant" else "user",
                        "content": msg["content"]
                    })
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01"
                }
                
                endpoint = "https://api.anthropic.com/v1/messages"
                
                payload = {
                    "model": model,
                    "messages": converted_messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }
                
                if system_message:
                    payload["system"] = system_message
                
                async with session.post(endpoint, headers=headers, json=payload) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        error_message = error_data.get("error", {}).get("message", f"API error: {response.status}")
                        raise ValueError(error_message)
                    
                    data = await response.json()
                    return data.get("content", [{}])[0].get("text", "")
        except Exception as e:
            raise ValueError(f"Error generating completion: {str(e)}")
    
    def get_default_models(self) -> List[str]:
        """Get default models for Anthropic"""
        return [
            "claude-3-5-sonnet-20240620",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2"
        ]
