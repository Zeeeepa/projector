"""
PR Review Bot Manager for the Projector application.
"""
import os
import json
import logging
import subprocess
import tempfile
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)

class PRReviewBotManager:
    """
    Manager for PR Review Bot operations.
    """
    def __init__(self):
        """Initialize the PR Review Bot manager."""
        self.config_path = Path("config/pr_review_bot.json")
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Default configuration
        self.default_config = {
            "webhook_secret": "",
            "github_token": "",
            "auto_review": True,
            "monitor_branches": True,
            "setup_all_repos_webhooks": True,
            "validate_documentation": True,
            "documentation_files": ["STRUCTURE.md", "STEP-BY-STEP.md"],
            "anthropic_api_key": "",
            "openai_api_key": "",
            "slack_bot_token": "",
            "slack_channel": "",
            "instructions": ""
        }
        
        # Load or create configuration
        self._load_config()
        
        # PR Review Bot process
        self.pr_review_bot_process = None
        self.pr_review_bot_status = "stopped"
        self.connection_status = "disconnected"
        self.pr_status_list = []
    
    def _load_config(self) -> Dict[str, Any]:
        """
        Load configuration from file or create default.
        
        Returns:
            Dict[str, Any]: Configuration dictionary
        """
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as f:
                    self.config = json.load(f)
                    # Ensure all default keys exist
                    for key, value in self.default_config.items():
                        if key not in self.config:
                            self.config[key] = value
            except Exception as e:
                logger.error(f"Error loading PR Review Bot configuration: {e}")
                self.config = self.default_config.copy()
        else:
            self.config = self.default_config.copy()
            self._save_config()
        
        return self.config
    
    def _save_config(self) -> None:
        """Save configuration to file."""
        try:
            with open(self.config_path, "w") as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving PR Review Bot configuration: {e}")
    
    def get_config(self) -> Dict[str, Any]:
        """
        Get current configuration.
        
        Returns:
            Dict[str, Any]: Configuration dictionary
        """
        return self.config
    
    def update_config(self, config: Dict[str, Any]) -> None:
        """
        Update configuration.
        
        Args:
            config (Dict[str, Any]): New configuration values
        """
        self.config.update(config)
        self._save_config()
        
        # Restart PR Review Bot if running
        if self.pr_review_bot_status == "running":
            self.stop_pr_review_bot()
            self.start_pr_review_bot()
    
    def set_connection_status(self, status: str) -> None:
        """
        Set the connection status of the PR Review Bot.
        
        Args:
            status (str): Connection status ("connected" or "disconnected")
        """
        self.connection_status = status
        logger.info(f"PR Review Bot connection status set to: {status}")
        
        # If the bot is connected but our status is stopped, update it
        if status == "connected" and self.pr_review_bot_status == "stopped":
            self.pr_review_bot_status = "running"
    
    def update_pr_status(self, pr_status_list: List[Dict[str, Any]]) -> None:
        """
        Update PR status list.
        
        Args:
            pr_status_list (List[Dict[str, Any]]): List of PR status dictionaries
        """
        self.pr_status_list = pr_status_list
        logger.info(f"Updated PR status list with {len(pr_status_list)} PRs")
    
    def get_pr_status_list(self) -> List[Dict[str, Any]]:
        """
        Get the current PR status list.
        
        Returns:
            List[Dict[str, Any]]: List of PR status dictionaries
        """
        return self.pr_status_list
    
    def start_pr_review_bot(self) -> Dict[str, Any]:
        """
        Start the PR Review Bot process.
        
        Returns:
            Dict[str, Any]: Status information
        """
        if self.pr_review_bot_process is not None and self.pr_review_bot_process.poll() is None:
            return {"status": "already_running", "message": "PR Review Bot is already running"}
        
        # Create .env file for PR Review Bot
        env_file = self._create_env_file()
        
        try:
            # Start PR Review Bot process
            cmd = [
                "python", "-m", "pr_review_bot.main",
                "--env-file", env_file
            ]
            
            # Add GitHub token directly to command line
            if self.config.get("github_token"):
                cmd.extend(["--github-token", self.config.get("github_token")])
            
            # Set AI provider and key
            if self.config.get("anthropic_api_key"):
                cmd.extend(["--ai-provider", "anthropic", "--ai-key", self.config.get("anthropic_api_key")])
            elif self.config.get("openai_api_key"):
                cmd.extend(["--ai-provider", "openai", "--ai-key", self.config.get("openai_api_key")])
            
            # Add auto-review flag if enabled
            if self.config.get("auto_review"):
                cmd.append("--auto-review")
            
            # Add instructions if provided
            if self.config.get("instructions"):
                cmd.extend(["--instructions", self.config.get("instructions")])
            
            # Add monitor-all-repos flag if enabled
            if self.config.get("setup_all_repos_webhooks"):
                cmd.append("--monitor-all-repos")
            
            logger.info(f"Starting PR Review Bot with command: {' '.join(cmd)}")
            
            self.pr_review_bot_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.pr_review_bot_status = "running"
            return {"status": "started", "message": "PR Review Bot started successfully"}
        except Exception as e:
            logger.error(f"Error starting PR Review Bot: {e}")
            self.pr_review_bot_status = "error"
            return {"status": "error", "message": str(e)}
    
    def stop_pr_review_bot(self) -> Dict[str, Any]:
        """
        Stop the PR Review Bot process.
        
        Returns:
            Dict[str, Any]: Status information
        """
        if self.pr_review_bot_process is None or self.pr_review_bot_process.poll() is not None:
            self.pr_review_bot_status = "stopped"
            return {"status": "not_running", "message": "PR Review Bot is not running"}
        
        try:
            self.pr_review_bot_process.terminate()
            self.pr_review_bot_process.wait(timeout=5)
            self.pr_review_bot_status = "stopped"
            return {"status": "stopped", "message": "PR Review Bot stopped successfully"}
        except subprocess.TimeoutExpired:
            self.pr_review_bot_process.kill()
            self.pr_review_bot_status = "stopped"
            return {"status": "killed", "message": "PR Review Bot killed after timeout"}
        except Exception as e:
            logger.error(f"Error stopping PR Review Bot: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get PR Review Bot status.
        
        Returns:
            Dict[str, Any]: Status information
        """
        if self.pr_review_bot_process is not None:
            if self.pr_review_bot_process.poll() is None:
                self.pr_review_bot_status = "running"
            else:
                self.pr_review_bot_status = "stopped"
        
        return {
            "status": self.pr_review_bot_status,
            "connection_status": self.connection_status,
            "config": self.config,
            "pr_status": self.pr_status_list
        }
    
    def review_pr(self, repo: str, pr_number: int, github_token: str) -> Dict[str, Any]:
        """
        Review a pull request.
        
        Args:
            repo (str): Repository name (owner/repo)
            pr_number (int): Pull request number
            github_token (str): GitHub token
        
        Returns:
            Dict[str, Any]: Review result
        """
        # Create temporary .env file
        env_file = self._create_env_file(github_token)
        
        try:
            # Run PR review command
            cmd = [
                "python", "-m", "pr_review_bot.main",
                "--env-file", env_file,
                "review",
                "--repo", repo,
                "--pr", str(pr_number)
            ]
            
            # Add GitHub token directly to command line
            if github_token:
                cmd.extend(["--github-token", github_token])
            
            # Set AI provider and key
            if self.config.get("anthropic_api_key"):
                cmd.extend(["--ai-provider", "anthropic", "--ai-key", self.config.get("anthropic_api_key")])
            elif self.config.get("openai_api_key"):
                cmd.extend(["--ai-provider", "openai", "--ai-key", self.config.get("openai_api_key")])
            
            # Add instructions if provided
            if self.config.get("instructions"):
                cmd.extend(["--instructions", self.config.get("instructions")])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Parse output for review URL
            review_url = None
            for line in result.stdout.splitlines():
                if "Review URL:" in line:
                    review_url = line.split("Review URL:")[1].strip()
            
            return {
                "status": "success",
                "message": "PR review completed successfully",
                "review_url": review_url,
                "output": result.stdout
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"Error reviewing PR: {e.stderr}")
            return {
                "status": "error",
                "message": f"Error reviewing PR: {e.stderr}",
                "output": e.stdout
            }
        except Exception as e:
            logger.error(f"Error reviewing PR: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def setup_webhooks(self, repos: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Set up webhooks for repositories.
        
        Args:
            repos (Optional[List[str]]): List of repositories to set up webhooks for
        
        Returns:
            Dict[str, Any]: Setup result
        """
        # Create temporary .env file
        env_file = self._create_env_file()
        
        try:
            # Run webhook setup command
            cmd = [
                "python", "-m", "pr_review_bot.main",
                "--env-file", env_file,
                "setup-webhooks"
            ]
            
            # Add GitHub token directly to command line
            if self.config.get("github_token"):
                cmd.extend(["--github-token", self.config.get("github_token")])
            
            if repos:
                for repo in repos:
                    cmd.extend(["--repo", repo])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            return {
                "status": "success",
                "message": "Webhooks set up successfully",
                "output": result.stdout
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"Error setting up webhooks: {e.stderr}")
            return {
                "status": "error",
                "message": f"Error setting up webhooks: {e.stderr}",
                "output": e.stdout
            }
        except Exception as e:
            logger.error(f"Error setting up webhooks: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def _create_env_file(self, github_token: Optional[str] = None) -> str:
        """
        Create a temporary .env file for PR Review Bot.
        
        Args:
            github_token (Optional[str]): GitHub token to use
        
        Returns:
            str: Path to the .env file
        """
        fd, env_file = tempfile.mkstemp(suffix=".env")
        
        with os.fdopen(fd, "w") as f:
            # Use the provided token or the one from config
            token = github_token or self.config.get('github_token', '')
            f.write(f"GITHUB_TOKEN={token}\n")
            f.write(f"GITHUB_WEBHOOK_SECRET={self.config.get('webhook_secret', '')}\n")
            
            if self.config.get("anthropic_api_key"):
                f.write(f"ANTHROPIC_API_KEY={self.config.get('anthropic_api_key')}\n")
            
            if self.config.get("openai_api_key"):
                f.write(f"OPENAI_API_KEY={self.config.get('openai_api_key')}\n")
            
            if self.config.get("slack_bot_token"):
                f.write(f"SLACK_BOT_TOKEN={self.config.get('slack_bot_token')}\n")
            
            if self.config.get("slack_channel"):
                f.write(f"SLACK_CHANNEL={self.config.get('slack_channel')}\n")
            
            # Add auto-review setting
            f.write(f"AUTO_REVIEW={'true' if self.config.get('auto_review') else 'false'}\n")
            
            # Add monitor-all-repos setting
            f.write(f"MONITOR_ALL_REPOS={'true' if self.config.get('setup_all_repos_webhooks') else 'false'}\n")
            
            # Add instructions if provided
            if self.config.get("instructions"):
                f.write(f"INSTRUCTIONS={self.config.get('instructions')}\n")
            
            f.write("HOST=0.0.0.0\n")
            f.write("PORT=8001\n")
            f.write("LOG_LEVEL=INFO\n")
        
        return env_file
