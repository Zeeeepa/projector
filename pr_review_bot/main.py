#!/usr/bin/env python3
"""
PR Review Bot - Main Entry Point

This module serves as the main entry point for the PR Review Bot.
It handles configuration, initialization, and starts the bot services.

Usage:
    python -m pr_review_bot.main [--github-token TOKEN] [--ai-provider {anthropic,openai}] [--ai-key KEY]

The bot requires only two main inputs:
1. GitHub token
2. AI provider (Anthropic or OpenAI) and its API key
"""

import os
import sys
import json
import argparse
import logging
import signal
import time
import threading
import requests
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("pr_review_bot")

# Default configuration
DEFAULT_CONFIG = {
    "github_token": "",
    "ai_provider": "anthropic",  # or "openai"
    "anthropic_api_key": "",
    "openai_api_key": "",
    "webhook_port": 8001,
    "webhook_host": "0.0.0.0",
    "projector_api_url": "http://localhost:8000",
    "monitor_branches": True,
    "auto_review": True
}

class PRReviewBot:
    """
    PR Review Bot main class that handles initialization and operation.
    """
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the PR Review Bot with the provided configuration.
        
        Args:
            config (Dict[str, Any]): Configuration dictionary
        """
        self.config = config
        self.running = False
        self.pr_status = {}  # Store PR status information
        self.projector_connected = False
        
        # Validate configuration
        self._validate_config()
        
        # Initialize components
        self._init_components()
    
    def _validate_config(self) -> None:
        """
        Validate the configuration and set defaults if needed.
        
        Raises:
            ValueError: If required configuration is missing
        """
        # Check for required GitHub token
        if not self.config.get("github_token"):
            raise ValueError("GitHub token is required")
        
        # Check for AI provider and API key
        ai_provider = self.config.get("ai_provider", "anthropic").lower()
        if ai_provider not in ["anthropic", "openai"]:
            raise ValueError("AI provider must be either 'anthropic' or 'openai'")
        
        self.config["ai_provider"] = ai_provider
        
        # Check for appropriate API key based on provider
        if ai_provider == "anthropic" and not self.config.get("anthropic_api_key"):
            raise ValueError("Anthropic API key is required when using Anthropic as the AI provider")
        
        if ai_provider == "openai" and not self.config.get("openai_api_key"):
            raise ValueError("OpenAI API key is required when using OpenAI as the AI provider")
        
        # Set defaults for optional configuration
        for key, value in DEFAULT_CONFIG.items():
            if key not in self.config:
                self.config[key] = value
    
    def _init_components(self) -> None:
        """
        Initialize the bot components.
        """
        logger.info("Initializing PR Review Bot components...")
        
        # Initialize GitHub API client
        # This would typically involve setting up a GitHub API client
        # For now, we'll just log that it's been initialized
        logger.info("GitHub API client initialized with token: %s***", self.config["github_token"][:4])
        
        # Initialize AI provider
        logger.info("AI provider initialized: %s", self.config["ai_provider"])
        
        # Notify Projector of connection
        self._notify_projector()
    
    def _notify_projector(self) -> None:
        """
        Notify the Projector application that the PR Review Bot is connected.
        """
        try:
            response = requests.post(
                f"{self.config['projector_api_url']}/api/pr-review-bot/notify-connected",
                json={"status": "connected"},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                logger.info("Successfully notified Projector of connection")
                self.projector_connected = True
            else:
                logger.warning("Failed to notify Projector of connection: %s", response.text)
        except Exception as e:
            logger.error("Error notifying Projector of connection: %s", str(e))
    
    def start(self) -> None:
        """
        Start the PR Review Bot.
        """
        if self.running:
            logger.warning("PR Review Bot is already running")
            return
        
        logger.info("Starting PR Review Bot...")
        self.running = True
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_prs, daemon=True)
        self.monitor_thread.start()
        
        # Start webhook server if needed
        # This would typically involve setting up a webhook server
        # For now, we'll just log that it's been started
        logger.info("Webhook server started on %s:%s", self.config["webhook_host"], self.config["webhook_port"])
        
        # Keep the main thread alive
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt, shutting down...")
            self.stop()
    
    def stop(self) -> None:
        """
        Stop the PR Review Bot.
        """
        if not self.running:
            logger.warning("PR Review Bot is not running")
            return
        
        logger.info("Stopping PR Review Bot...")
        self.running = False
        
        # Notify Projector of disconnection
        try:
            requests.post(
                f"{self.config['projector_api_url']}/api/pr-review-bot/notify-disconnected",
                json={"status": "disconnected"},
                headers={"Content-Type": "application/json"}
            )
        except Exception as e:
            logger.error("Error notifying Projector of disconnection: %s", str(e))
        
        # Wait for monitor thread to finish
        if hasattr(self, 'monitor_thread') and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        
        logger.info("PR Review Bot stopped")
    
    def _monitor_prs(self) -> None:
        """
        Monitor PRs and branches for changes.
        This runs in a separate thread.
        """
        logger.info("Starting PR monitoring thread...")
        
        while self.running:
            try:
                # This would typically involve checking for new PRs and branches
                # For now, we'll just log that it's checking
                logger.debug("Checking for PR updates...")
                
                # Update PR status in Projector
                self._update_pr_status()
                
                # Sleep for a while before checking again
                time.sleep(30)
            except Exception as e:
                logger.error("Error in PR monitoring thread: %s", str(e))
                time.sleep(60)  # Sleep longer on error
    
    def _update_pr_status(self) -> None:
        """
        Update PR status in Projector.
        """
        try:
            # This would typically involve sending PR status to Projector
            # For now, we'll just log that it's updating
            if self.projector_connected:
                logger.debug("Updating PR status in Projector...")
                
                # Example PR status data
                pr_status_data = {
                    "prs": [
                        {
                            "repo": "example/repo",
                            "number": 123,
                            "title": "Example PR",
                            "status": "under_review",
                            "url": "https://github.com/example/repo/pull/123"
                        }
                    ]
                }
                
                requests.post(
                    f"{self.config['projector_api_url']}/api/pr-review-bot/update-status",
                    json=pr_status_data,
                    headers={"Content-Type": "application/json"}
                )
        except Exception as e:
            logger.error("Error updating PR status in Projector: %s", str(e))

def parse_args() -> argparse.Namespace:
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="PR Review Bot")
    parser.add_argument("--github-token", help="GitHub API token")
    parser.add_argument("--ai-provider", choices=["anthropic", "openai"], default="anthropic", help="AI provider to use")
    parser.add_argument("--ai-key", help="API key for the selected AI provider")
    parser.add_argument("--config", help="Path to configuration file")
    parser.add_argument("--projector-url", default="http://localhost:8000", help="URL of the Projector API")
    
    return parser.parse_args()

def load_config(args: argparse.Namespace) -> Dict[str, Any]:
    """
    Load configuration from file and/or command line arguments.
    
    Args:
        args (argparse.Namespace): Command line arguments
    
    Returns:
        Dict[str, Any]: Configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    
    # Load from config file if provided
    if args.config:
        config_path = Path(args.config)
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    file_config = json.load(f)
                    config.update(file_config)
            except Exception as e:
                logger.error("Error loading configuration file: %s", str(e))
    
    # Override with command line arguments
    if args.github_token:
        config["github_token"] = args.github_token
    
    if args.ai_provider:
        config["ai_provider"] = args.ai_provider
    
    if args.ai_key:
        if args.ai_provider == "anthropic":
            config["anthropic_api_key"] = args.ai_key
        else:
            config["openai_api_key"] = args.ai_key
    
    if args.projector_url:
        config["projector_api_url"] = args.projector_url
    
    # Load from environment variables
    if not config["github_token"] and "GITHUB_TOKEN" in os.environ:
        config["github_token"] = os.environ["GITHUB_TOKEN"]
    
    if not config.get("anthropic_api_key") and "ANTHROPIC_API_KEY" in os.environ:
        config["anthropic_api_key"] = os.environ["ANTHROPIC_API_KEY"]
    
    if not config.get("openai_api_key") and "OPENAI_API_KEY" in os.environ:
        config["openai_api_key"] = os.environ["OPENAI_API_KEY"]
    
    return config

def main() -> None:
    """
    Main entry point for the PR Review Bot.
    """
    args = parse_args()
    config = load_config(args)
    
    try:
        bot = PRReviewBot(config)
        
        # Set up signal handlers
        def signal_handler(sig, frame):
            logger.info("Received signal %s, shutting down...", sig)
            bot.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start the bot
        bot.start()
    except ValueError as e:
        logger.error("Configuration error: %s", str(e))
        sys.exit(1)
    except Exception as e:
        logger.error("Error starting PR Review Bot: %s", str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
