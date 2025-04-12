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
    "monitor_all_repos": False
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
        self.stop_event = threading.Event()  # Add a stop event for clean shutdown
        
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
            self.github_client = Github(self.config["github_token"])
            user = self.github_client.get_user()
            logger.info(f"GitHub API client initialized for user: {user.login}")
            
            # Get repositories to monitor
            self._get_repositories_to_monitor()
            
        except GithubException as e:
            logger.error(f"GitHub API initialization error: {e}")
            raise ValueError(f"GitHub API initialization failed: {e}")
        
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
                for repo in self.github_client.get_user().get_repos():
                    self.monitored_repos.append(repo)
                logger.info(f"Monitoring all accessible repositories: {len(self.monitored_repos)} found")
            else:
                # Get specific repositories if provided
                # This would be extended to read from config or other sources
                user = self.github_client.get_user()
                for repo in user.get_repos():
                    if not repo.fork:  # Only monitor non-fork repositories
                        self.monitored_repos.append(repo)
                logger.info(f"Monitoring user's repositories: {len(self.monitored_repos)} found")
        
        except GithubException as e:
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
        self.stop_event.clear()  # Clear the stop event
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_prs, daemon=True)
        self.monitor_thread.start()
        
        # Keep the main thread alive
        try:
            while self.running and not self.stop_event.is_set():
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
        self.stop_event.set()  # Set the stop event to signal threads to exit
        
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
            if self.monitor_thread.is_alive():
                logger.warning("Monitor thread did not exit cleanly, forcing termination")
        
        logger.info("PR Review Bot stopped")
    
    def _monitor_prs(self) -> None:
        """
        Monitor PRs and branches for changes.
        This runs in a separate thread.
        """
        logger.info("Starting PR monitoring thread...")
        
        while self.running and not self.stop_event.is_set():
            try:
                logger.info("Checking for PR updates...")
                
                # Get all open PRs from monitored repositories
                all_prs = []
                
                for repo in self.monitored_repos:
                    try:
                        # Get open pull requests created or updated since last check
                        open_prs = repo.get_pulls(state='open')
                        
                        for pr in open_prs:
                            # Check if PR was created or updated since last check
                            if pr.created_at > self.last_check_time or pr.updated_at > self.last_check_time:
                                logger.info(f"Found new/updated PR: {repo.full_name}#{pr.number} - {pr.title}")
                                
                                # Add to list of PRs to track
                                all_prs.append({
                                    "repo": repo.full_name,
                                    "number": pr.number,
                                    "title": pr.title,
                                    "status": "under_review",
                                    "url": pr.html_url
                                })
                                
                                # If auto-review is enabled, trigger a review
                                if self.config.get("auto_review", True):
                                    # This would call the review function
                                    # For now, just log that we would review it
                                    logger.info(f"Auto-review enabled, would review PR: {repo.full_name}#{pr.number}")
                    
                    except GithubException as e:
                        logger.error(f"Error checking PRs for repository {repo.full_name}: {e}")
                
                # Update last check time
                self.last_check_time = datetime.now(timezone.utc)
                
                # Update PR status in Projector if we have any PRs to report
                if all_prs:
                    self._update_pr_status(all_prs)
                
                # Sleep for the configured interval before checking again
                # Use stop_event.wait() instead of time.sleep() to allow for faster shutdown
                self.stop_event.wait(self.config.get("poll_interval", 30))
            
            except Exception as e:
                logger.error(f"Error in PR monitoring thread: {e}")
                # Use stop_event.wait() instead of time.sleep() to allow for faster shutdown
                self.stop_event.wait(60)  # Sleep longer on error
        
        logger.info("PR monitoring thread exiting...")
    
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
            repo = self.github_client.get_repo(repo_name)
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
    
    return config

def main() -> None:
    """
    Main entry point for the PR Review Bot.
    """
    args = parse_args()
    config = load_config(args)
    
    # Create a global bot instance for signal handlers to access
    global bot_instance
    
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
            # For now, just log that we would set up webhooks
            logger.info("Setting up webhooks is not yet implemented")
            sys.exit(0)
        
        # Create bot instance for normal operation
        bot = PRReviewBot(config)
        bot_instance = bot  # Store globally for signal handlers
        
        # Set up signal handlers
        def signal_handler(sig, frame):
            logger.info(f"Received signal {sig}, shutting down...")
            if 'bot_instance' in globals() and bot_instance:
                bot_instance.stop()
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
    # Initialize global bot instance
    bot_instance = None
    main()
