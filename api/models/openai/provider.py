import json
import aiohttp
from typing import Dict, List, Optional, Any

from ..base import BaseModelProvider

class OpenAIProvider(BaseModelProvider):
    """
    OpenAI API provider implementation
    """
    
    @property
    def name(self) -> str:
        return "OpenAI"
    
    @property
    def provider_id(self) -> str:
        return "openai"
    
    @property
    def supports_custom_endpoint(self) -> bool:
        return False
    
    async def validate_api_key(self, api_key: str, custom_endpoint: Optional[str] = None) -> bool:
        """Validate OpenAI API key"""
        if not api_key:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                endpoint = custom_endpoint or "https://api.openai.com/v1/models"
                
                async with session.get(endpoint, headers=headers) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def get_available_models(self, api_key: str, custom_endpoint: Optional[str] = None) -> List[str]:
        """Get available models from OpenAI"""
        if not api_key:
            return self.get_default_models()
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                endpoint = custom_endpoint or "https://api.openai.com/v1/models"
                
                async with session.get(endpoint, headers=headers) as response:
                    if response.status != 200:
                        return self.get_default_models()
                    
                    data = await response.json()
                    
                    # Filter for relevant models
                    if data.get("data") and isinstance(data["data"], list):
                        return [
                            model["id"] for model in data["data"]
                            if any(keyword in model["id"] for keyword in ["gpt", "llama", "mistral"])
                        ]
                    
                    return self.get_default_models()
        except Exception:
            return self.get_default_models()
    
    async def test_connection(self, api_key: str, model: str, custom_endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Test connection to OpenAI API"""
        if not api_key:
            return {"success": False, "message": "API key is required"}
        
        if not model:
            return {"success": False, "message": "Model is required"}
        
        try:
            # Just validate the API key without sending a message
            is_valid = await self.validate_api_key(api_key, custom_endpoint)
            
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
        """Generate a completion from OpenAI"""
        if not api_key:
            raise ValueError("API key is required")
        
        if not model:
            raise ValueError("Model is required")
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                
                endpoint = custom_endpoint or "https://api.openai.com/v1/chat/completions"
                
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
        """Get default models for OpenAI"""
        return [
            "gpt-4",
            "gpt-4-turbo",
            "gpt-3.5-turbo"
        ]
