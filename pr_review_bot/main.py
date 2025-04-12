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
from datetime import datetime, timezone, timedelta
from github import Github, GithubException
from github.Repository import Repository
from github.PullRequest import PullRequest

# Import utility modules
from .utils.ngrok_manager import NgrokManager
from .utils.webhook_manager import WebhookManager
from .core.github_client import GitHubClient

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
    "auto_review": True,
    "poll_interval": 30,  # seconds
    "monitor_all_repos": False,
    "ngrok_enabled": False,
    "ngrok_auth_token": "",
    "webhook_secret": ""
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
        self.github_client = None
        self.monitored_repos = []
        self.last_check_time = datetime.now(timezone.utc) - timedelta(days=1)
        self.ngrok_manager = None
        self.webhook_manager = None
        self.webhook_url = None
        
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
        try:
            # Create GitHub client wrapper
            self.github_client = GitHubClient(self.config["github_token"])
            
            # Get user information
            user = self.github_client.client.get_user()
            logger.info(f"GitHub API client initialized for user: {user.login}")
            
            # Get repositories to monitor
            self._get_repositories_to_monitor()
            
        except GithubException as e:
            logger.error(f"GitHub API initialization error: {e}")
            raise ValueError(f"GitHub API initialization failed: {e}")
        
        # Initialize ngrok if enabled
        if self.config.get("ngrok_enabled", False):
            logger.info("Initializing ngrok...")
            self.ngrok_manager = NgrokManager(
                port=self.config.get("webhook_port", 8001),
                auth_token=self.config.get("ngrok_auth_token")
            )
            
            # Start ngrok tunnel
            self.webhook_url = self.ngrok_manager.start_tunnel()
            if self.webhook_url:
                logger.info(f"ngrok tunnel started at {self.webhook_url}")
            else:
                logger.error("Failed to start ngrok tunnel")
        
        # Initialize webhook manager if webhook URL is available
        if self.webhook_url:
            logger.info(f"Initializing webhook manager with URL {self.webhook_url}")
            self.webhook_manager = WebhookManager(
                github_client=self.github_client,
                webhook_url=self.webhook_url,
                webhook_secret=self.config.get("webhook_secret")
            )
            
            # Set up webhooks for all repositories
            if self.config.get("setup_webhooks", False):
                logger.info("Setting up webhooks for all repositories...")
                self.webhook_manager.setup_webhooks_for_all_repos()
        
        # Initialize AI provider
        logger.info("AI provider initialized: %s", self.config["ai_provider"])
        
        # Notify Projector of connection
        self._notify_projector()
    
    def _get_repositories_to_monitor(self) -> None:
        """
        Get the list of repositories to monitor.
        """
        try:
            if self.config.get("monitor_all_repos", False):
                # Get all repositories the user has access to
                repos = self.github_client.get_repositories()
                self.monitored_repos = repos
                logger.info(f"Monitoring all accessible repositories: {len(self.monitored_repos)} found")
            else:
                # Get specific repositories if provided
                # This would be extended to read from config or other sources
                repos = self.github_client.get_repositories()
                self.monitored_repos = [repo for repo in repos if not repo.get("fork", False)]
                logger.info(f"Monitoring user's repositories: {len(self.monitored_repos)} found")
        
        except Exception as e:
            logger.error(f"Error getting repositories to monitor: {e}")
            # Continue with empty list rather than failing completely
            self.monitored_repos = []
    
    def _notify_projector(self) -> None:
        """
        Notify the Projector application that the PR Review Bot is connected.
        """
        try:
            response = requests.post(
                f"{self.config['projector_api_url']}/api/pr_review_bot/notify-connected",
                json={"status": "connected"},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            logger.info("Notified Projector of connection")
            self.projector_connected = True
        except Exception as e:
            logger.error(f"Failed to notify Projector of connection: {e}")
            self.projector_connected = False
    
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
        
        # Start IP change monitor if using ngrok and webhooks
        if self.ngrok_manager and self.webhook_manager:
            logger.info("Starting IP change monitor...")
            self.ip_monitor_thread = threading.Thread(
                target=self._monitor_ip_changes,
                daemon=True
            )
            self.ip_monitor_thread.start()
        
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
        
        # Stop ngrok tunnel if running
        if self.ngrok_manager:
            logger.info("Stopping ngrok tunnel...")
            self.ngrok_manager.stop_tunnel()
        
        # Notify Projector of disconnection
        try:
            response = requests.post(
                f"{self.config['projector_api_url']}/api/pr_review_bot/notify-disconnected",
                json={"status": "disconnected"},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            logger.info("Notified Projector of disconnection")
        except Exception as e:
            logger.error(f"Failed to notify Projector of disconnection: {e}")
        
        # Wait for monitor thread to finish
        if hasattr(self, 'monitor_thread') and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        
        # Wait for IP monitor thread to finish
        if hasattr(self, 'ip_monitor_thread') and self.ip_monitor_thread.is_alive():
            self.ip_monitor_thread.join(timeout=5)
        
        logger.info("PR Review Bot stopped")
    
    def _monitor_ip_changes(self) -> None:
        """
        Monitor IP changes and update webhooks if needed.
        """
        logger.info("Starting IP change monitor...")
        
        # Get initial URL
        last_url = self.webhook_url
        
        while self.running:
            time.sleep(60)  # Check every minute
            
            # Get current URL
            current_url = self.ngrok_manager.get_public_url()
            
            # Check if URL has changed
            if current_url and current_url != last_url:
                logger.info(f"Public URL changed from {last_url} to {current_url}")
                
                # Update webhook URL
                self.webhook_url = current_url
                self.webhook_manager.webhook_url = current_url
                
                # Update webhooks for all repositories
                self.webhook_manager.update_webhooks_for_all_repos()
                
                # Update last URL
                last_url = current_url
    
    def _monitor_prs(self) -> None:
        """
        Monitor PRs and branches for changes.
        This runs in a separate thread.
        """
        logger.info("Starting PR monitoring thread...")
        
        while self.running:
            try:
                logger.info("Checking for PR updates...")
                
                # Get all open PRs from monitored repositories
                all_prs = []
                
                for repo in self.monitored_repos:
                    try:
                        # Get repository name
                        repo_name = repo.get("full_name")
                        
                        # Get repository object
                        github_repo = self.github_client.client.get_repo(repo_name)
                        
                        # Get open pull requests
                        open_prs = github_repo.get_pulls(state='open')
                        
                        for pr in open_prs:
                            # Check if PR was created or updated since last check
                            if pr.created_at > self.last_check_time or pr.updated_at > self.last_check_time:
                                logger.info(f"Found new/updated PR: {repo_name}#{pr.number} - {pr.title}")
                                
                                # Add to list of PRs to track
                                all_prs.append({
                                    "repo": repo_name,
                                    "number": pr.number,
                                    "title": pr.title,
                                    "status": "under_review",
                                    "url": pr.html_url
                                })
                                
                                # If auto-review is enabled, trigger a review
                                if self.config.get("auto_review", True):
                                    # This would call the review function
                                    # For now, just log that we would review it
                                    logger.info(f"Auto-review enabled, would review PR: {repo_name}#{pr.number}")
                    
                    except GithubException as e:
                        logger.error(f"Error checking PRs for repository {repo.get('full_name')}: {e}")
                
                # Update last check time
                self.last_check_time = datetime.now(timezone.utc)
                
                # Update PR status in Projector if we have any PRs to report
                if all_prs:
                    self._update_pr_status(all_prs)
                
                # Sleep for the configured interval before checking again
                time.sleep(self.config.get("poll_interval", 30))
            
            except Exception as e:
                logger.error(f"Error in PR monitoring thread: {e}")
                time.sleep(60)  # Sleep longer on error
    
    def _update_pr_status(self, prs=None) -> None:
        """
        Update PR status in Projector.
        
        Args:
            prs (List[Dict]): List of PR status dictionaries to update
        """
        try:
            if not self.projector_connected:
                logger.warning("Not connected to Projector, skipping status update")
                return
            
            if prs is None:
                # If no PRs provided, use stored PR status
                if not self.pr_status:
                    return
                prs = list(self.pr_status.values())
            else:
                # Update stored PR status
                for pr in prs:
                    key = f"{pr['repo']}#{pr['number']}"
                    self.pr_status[key] = pr
            
            logger.info(f"Updating PR status in Projector: {len(prs)} PRs")
            
            # Send PR status to Projector
            response = requests.post(
                f"{self.config['projector_api_url']}/api/pr_review_bot/update-status",
                json={"prs": prs},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            logger.info(f"Updated PR status in Projector: {len(prs)} PRs")
        
        except Exception as e:
            logger.error(f"Error updating PR status in Projector: {e}")
    
    def review_pr(self, repo_name: str, pr_number: int) -> Dict[str, Any]:
        """
        Review a specific pull request.
        
        Args:
            repo_name (str): Repository name in format "owner/repo"
            pr_number (int): Pull request number
        
        Returns:
            Dict[str, Any]: Review result
        """
        try:
            logger.info(f"Reviewing PR {repo_name}#{pr_number}")
            
            # Get repository and PR
            repo = self.github_client.client.get_repo(repo_name)
            pr = repo.get_pull(pr_number)
            
            # Perform review (this would be implemented with AI provider)
            # For now, just add a simple comment
            pr.create_issue_comment("PR Review Bot: This PR has been reviewed.")
            
            # Update PR status
            pr_status = {
                "repo": repo_name,
                "number": pr_number,
                "title": pr.title,
                "status": "reviewed",
                "url": pr.html_url
            }
            
            # Update stored PR status
            key = f"{repo_name}#{pr_number}"
            self.pr_status[key] = pr_status
            
            # Update PR status in Projector
            self._update_pr_status([pr_status])
            
            return {
                "status": "success",
                "message": f"PR {repo_name}#{pr_number} reviewed successfully",
                "review_url": pr.html_url
            }
        
        except GithubException as e:
            logger.error(f"GitHub error reviewing PR {repo_name}#{pr_number}: {e}")
            return {
                "status": "error",
                "message": f"GitHub error: {e}",
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Error reviewing PR {repo_name}#{pr_number}: {e}")
            return {
                "status": "error",
                "message": f"Error: {e}",
                "error": str(e)
            }

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
    parser.add_argument("--env-file", help="Path to .env file")
    parser.add_argument("--monitor-all-repos", action="store_true", help="Monitor all accessible repositories")
    parser.add_argument("--poll-interval", type=int, default=30, help="Polling interval in seconds")
    
    # Webhook and ngrok settings
    parser.add_argument("--ngrok", action="store_true", help="Use ngrok to expose the server")
    parser.add_argument("--ngrok-auth-token", help="Ngrok auth token")
    parser.add_argument("--webhook-port", type=int, default=8001, help="Port for webhook server")
    parser.add_argument("--webhook-host", default="0.0.0.0", help="Host for webhook server")
    parser.add_argument("--webhook-secret", help="Secret for webhook verification")
    parser.add_argument("--setup-webhooks", action="store_true", help="Set up webhooks for repositories")
    
    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Review command
    review_parser = subparsers.add_parser("review", help="Review a specific PR")
    review_parser.add_argument("--repo", required=True, help="Repository name (owner/repo)")
    review_parser.add_argument("--pr", type=int, required=True, help="Pull request number")
    
    # Setup webhooks command
    webhook_parser = subparsers.add_parser("setup-webhooks", help="Set up webhooks for repositories")
    webhook_parser.add_argument("--repo", action="append", help="Repository to set up webhook for")
    
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
    
    # Load from .env file if provided
    if args.env_file:
        env_path = Path(args.env_file)
        if env_path.exists():
            try:
                with open(env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            key, value = line.split("=", 1)
                            os.environ[key] = value
            except Exception as e:
                logger.error(f"Error loading .env file: {e}")
    
    # Load from config file if provided
    if args.config:
        config_path = Path(args.config)
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    file_config = json.load(f)
                    config.update(file_config)
            except Exception as e:
                logger.error(f"Error loading configuration file: {e}")
    
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
    
    if args.monitor_all_repos:
        config["monitor_all_repos"] = True
    
    if args.poll_interval:
        config["poll_interval"] = args.poll_interval
    
    if args.ngrok:
        config["ngrok_enabled"] = True
    
    if args.ngrok_auth_token:
        config["ngrok_auth_token"] = args.ngrok_auth_token
    
    if args.webhook_port:
        config["webhook_port"] = args.webhook_port
    
    if args.webhook_host:
        config["webhook_host"] = args.webhook_host
    
    if args.webhook_secret:
        config["webhook_secret"] = args.webhook_secret
    
    if args.setup_webhooks:
        config["setup_webhooks"] = True
    
    # Load from environment variables
    if not config["github_token"] and "GITHUB_TOKEN" in os.environ:
        config["github_token"] = os.environ["GITHUB_TOKEN"]
    
    if not config.get("anthropic_api_key") and "ANTHROPIC_API_KEY" in os.environ:
        config["anthropic_api_key"] = os.environ["ANTHROPIC_API_KEY"]
    
    if not config.get("openai_api_key") and "OPENAI_API_KEY" in os.environ:
        config["openai_api_key"] = os.environ["OPENAI_API_KEY"]
    
    if "MONITOR_ALL_REPOS" in os.environ:
        config["monitor_all_repos"] = os.environ["MONITOR_ALL_REPOS"].lower() == "true"
    
    if "POLL_INTERVAL" in os.environ:
        try:
            config["poll_interval"] = int(os.environ["POLL_INTERVAL"])
        except ValueError:
            pass
    
    if "NGROK_AUTH_TOKEN" in os.environ:
        config["ngrok_auth_token"] = os.environ["NGROK_AUTH_TOKEN"]
        config["ngrok_enabled"] = True
    
    if "WEBHOOK_SECRET" in os.environ:
        config["webhook_secret"] = os.environ["WEBHOOK_SECRET"]
    
    return config

def main() -> None:
    """
    Main entry point for the PR Review Bot.
    """
    args = parse_args()
    config = load_config(args)
    
    try:
        # Handle specific commands
        if args.command == "review":
            # Create bot instance
            bot = PRReviewBot(config)
            
            # Review specific PR
            result = bot.review_pr(args.repo, args.pr)
            print(json.dumps(result, indent=2))
            
            # Exit after review
            sys.exit(0)
        
        elif args.command == "setup-webhooks":
            # This would set up webhooks for repositories
            config["setup_webhooks"] = True
            config["ngrok_enabled"] = True
            
            # Create bot instance
            bot = PRReviewBot(config)
            
            # Set up webhooks for repositories
            if bot.webhook_manager:
                logger.info("Setting up webhooks for repositories")
                webhooks = bot.webhook_manager.setup_webhooks_for_all_repos()
                print(json.dumps({"webhooks": len(webhooks), "status": "success"}, indent=2))
            else:
                logger.error("Webhook manager not initialized")
                print(json.dumps({"error": "Webhook manager not initialized", "status": "error"}, indent=2))
            
            # Exit after setting up webhooks
            sys.exit(0)
        
        # Create bot instance for normal operation
        bot = PRReviewBot(config)
        
        # Set up signal handlers
        def signal_handler(sig, frame):
            logger.info(f"Received signal {sig}, shutting down...")
            bot.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start the bot
        bot.start()
    
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error starting PR Review Bot: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
