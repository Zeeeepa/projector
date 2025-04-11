from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Body

from ..models.registry import get_provider_registry
from ..models.providers import register_providers

# Initialize the router
router = APIRouter(prefix="/models", tags=["models"])

# Register all providers
register_providers()

@router.get("/providers")
async def get_providers() -> List[Dict[str, str]]:
    """
    Get all available model providers
    
    Returns:
        List[Dict[str, str]]: List of provider information
    """
    registry = get_provider_registry()
    return registry.get_provider_names()

@router.post("/validate")
async def validate_api_key(
    provider_id: str = Body(...),
    api_key: str = Body(...),
    custom_endpoint: Optional[str] = Body(None)
) -> Dict[str, bool]:
    """
    Validate an API key for a provider
    
    Args:
        provider_id: ID of the provider
        api_key: API key to validate
        custom_endpoint: Optional custom endpoint
        
    Returns:
        Dict[str, bool]: Validation result
    """
    registry = get_provider_registry()
    provider = registry.get_provider(provider_id)
    
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    
    is_valid = await provider.validate_api_key(api_key, custom_endpoint)
    return {"valid": is_valid}

@router.post("/available")
async def get_available_models(
    provider_id: str = Body(...),
    api_key: str = Body(...),
    custom_endpoint: Optional[str] = Body(None)
) -> Dict[str, List[str]]:
    """
    Get available models for a provider
    
    Args:
        provider_id: ID of the provider
        api_key: API key to use
        custom_endpoint: Optional custom endpoint
        
    Returns:
        Dict[str, List[str]]: List of available models
    """
    registry = get_provider_registry()
    provider = registry.get_provider(provider_id)
    
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    
    models = await provider.get_available_models(api_key, custom_endpoint)
    return {"models": models}

@router.post("/test")
async def test_connection(
    provider_id: str = Body(...),
    api_key: str = Body(...),
    model: str = Body(...),
    custom_endpoint: Optional[str] = Body(None)
) -> Dict[str, Any]:
    """
    Test connection to a provider
    
    Args:
        provider_id: ID of the provider
        api_key: API key to use
        model: Model to test
        custom_endpoint: Optional custom endpoint
        
    Returns:
        Dict[str, Any]: Test result
    """
    registry = get_provider_registry()
    provider = registry.get_provider(provider_id)
    
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    
    result = await provider.test_connection(api_key, model, custom_endpoint)
    return result
