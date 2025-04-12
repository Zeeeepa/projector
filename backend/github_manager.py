"""
GitHub integration manager for the Projector application.
"""
import os
import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from github import Github, GithubException, Repository, PullRequest, ContentFile

logger = logging.getLogger(__name__)

class GitHubManager:
    """
    Manager for GitHub integration.
    """
    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the GitHub manager.
        
        Args:
            access_token: GitHub access token. If not provided, will try to get from environment.
        """
        self.access_token = access_token or os.getenv("GITHUB_ACCESS_TOKEN")
        self.github = None
        self.is_valid_token = False
        
        if not self.access_token:
            logger.warning("GitHub access token not provided")
        else:
            self.validate_token()
    
    def validate_token(self) -> bool:
        """
        Validate the GitHub token by making API calls.
        
        Returns:
            bool: True if token is valid, False otherwise
        """
        if not self.access_token:
            return False
            
        try:
            self.github = Github(self.access_token)
            
            # Try to get the authenticated user to validate the token
            user = self.github.get_user()
            login = user.login  # This will trigger an API call
            
            # Try to list repositories to check permissions
            repos = list(user.get_repos()[:1])  # Just get the first repo to check permissions
            
            logger.info(f"GitHub token validated for user: {login}")
            self.is_valid_token = True
            return True
            
        except GithubException as e:
            logger.error(f"Invalid GitHub token or insufficient permissions: {e}")
            self.github = None
            self.is_valid_token = False
            return False
        except Exception as e:
            logger.error(f"Error validating GitHub token: {e}")
            self.github = None
            self.is_valid_token = False
            return False
    
    def get_repository(self, owner: str, repo: str) -> Optional[Repository.Repository]:
        """
        Get a GitHub repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            Repository object or None if not found
        """
        if not self.github:
            if not self.validate_token():
                logger.error("GitHub client not initialized - invalid token")
                return None
        
        try:
            return self.github.get_repo(f"{owner}/{repo}")
        except GithubException as e:
            logger.error(f"Error getting repository {owner}/{repo}: {e}")
            return None
    
    def get_repository_contents(self, owner: str, repo: str, path: str = "") -> Optional[List[Dict[str, Any]]]:
        """
        Get repository contents.
        
        Args:
            owner: Repository owner
            repo: Repository name
            path: Path in the repository
            
        Returns:
            List of content items or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            contents = repository.get_contents(path)
            result = []
            
            # Handle single file or directory
            if not isinstance(contents, list):
                contents = [contents]
                
            for content in contents:
                item = {
                    "path": content.path,
                    "type": "file" if content.type == "file" else "dir",
                    "sha": content.sha
                }
                
                # Include content for small files
                if content.type == "file" and content.size < 100000:  # 100KB limit
                    try:
                        item["content"] = content.decoded_content.decode("utf-8")
                    except UnicodeDecodeError:
                        item["content"] = None
                
                result.append(item)
                
            return result
        except GithubException as e:
            logger.error(f"Error getting repository contents {owner}/{repo}/{path}: {e}")
            return None
    
    def get_pull_request(self, owner: str, repo: str, pr_number: int) -> Optional[Dict[str, Any]]:
        """
        Get a pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            
        Returns:
            Pull request data or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            pr = repository.get_pull(pr_number)
            return {
                "number": pr.number,
                "title": pr.title,
                "body": pr.body,
                "html_url": pr.html_url,
                "state": pr.state,
                "created_at": pr.created_at.isoformat(),
                "updated_at": pr.updated_at.isoformat(),
                "merged": pr.merged,
                "merged_at": pr.merged_at.isoformat() if pr.merged_at else None,
                "user": {
                    "login": pr.user.login,
                    "avatar_url": pr.user.avatar_url
                }
            }
        except GithubException as e:
            logger.error(f"Error getting pull request {owner}/{repo}#{pr_number}: {e}")
            return None
    
    def get_comments(self, owner: str, repo: str, pr_number: int) -> Optional[List[Dict[str, Any]]]:
        """
        Get comments on a pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            
        Returns:
            List of comments or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            pr = repository.get_pull(pr_number)
            comments = pr.get_issue_comments()
            
            result = []
            for comment in comments:
                result.append({
                    "id": comment.id,
                    "body": comment.body,
                    "created_at": comment.created_at.isoformat(),
                    "updated_at": comment.updated_at.isoformat(),
                    "user": {
                        "login": comment.user.login,
                        "avatar_url": comment.user.avatar_url
                    }
                })
                
            return result
        except GithubException as e:
            logger.error(f"Error getting comments for {owner}/{repo}#{pr_number}: {e}")
            return None
    
    def create_comment(self, owner: str, repo: str, pr_number: int, body: str) -> Optional[Dict[str, Any]]:
        """
        Create a comment on a pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            body: Comment body
            
        Returns:
            Comment data or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            pr = repository.get_pull(pr_number)
            comment = pr.create_issue_comment(body)
            
            return {
                "id": comment.id,
                "body": comment.body,
                "created_at": comment.created_at.isoformat(),
                "updated_at": comment.updated_at.isoformat(),
                "user": {
                    "login": comment.user.login,
                    "avatar_url": comment.user.avatar_url
                }
            }
        except GithubException as e:
            logger.error(f"Error creating comment for {owner}/{repo}#{pr_number}: {e}")
            return None
    
    def get_branches(self, owner: str, repo: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get branches in a repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            List of branches or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            branches = repository.get_branches()
            
            result = []
            for branch in branches:
                result.append({
                    "name": branch.name,
                    "commit": {
                        "sha": branch.commit.sha,
                        "url": branch.commit.url
                    }
                })
                
            return result
        except GithubException as e:
            logger.error(f"Error getting branches for {owner}/{repo}: {e}")
            return None
    
    def get_commits(
        self, 
        owner: str, 
        repo: str, 
        branch: Optional[str] = None,
        path: Optional[str] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        max_count: int = 100
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get commits in a repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch: Branch name (optional)
            path: File path (optional)
            since: Start date (optional)
            until: End date (optional)
            max_count: Maximum number of commits to return
            
        Returns:
            List of commits or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            commits = repository.get_commits(sha=branch, path=path, since=since, until=until)
            
            result = []
            count = 0
            for commit in commits:
                if count >= max_count:
                    break
                    
                result.append({
                    "sha": commit.sha,
                    "message": commit.commit.message,
                    "author": {
                        "name": commit.commit.author.name,
                        "email": commit.commit.author.email,
                        "date": commit.commit.author.date.isoformat()
                    },
                    "committer": {
                        "name": commit.commit.committer.name,
                        "email": commit.commit.committer.email,
                        "date": commit.commit.committer.date.isoformat()
                    },
                    "html_url": commit.html_url
                })
                count += 1
                
            return result
        except GithubException as e:
            logger.error(f"Error getting commits for {owner}/{repo}: {e}")
            return None
    
    def get_recent_merges(self, owner: str, repo: str, days: int = 7) -> Optional[List[Dict[str, Any]]]:
        """
        Get recent merged pull requests.
        
        Args:
            owner: Repository owner
            repo: Repository name
            days: Number of days to look back
            
        Returns:
            List of merged pull requests or None if error
        """
        repository = self.get_repository(owner, repo)
        if not repository:
            return None
        
        try:
            # Get merged PRs from the last N days
            since_date = datetime.now() - timedelta(days=days)
            pulls = repository.get_pulls(state="closed", sort="updated", direction="desc")
            
            result = []
            for pr in pulls:
                # Skip if not merged or merged before the since date
                if not pr.merged or pr.merged_at < since_date:
                    continue
                    
                result.append({
                    "number": pr.number,
                    "title": pr.title,
                    "body": pr.body,
                    "html_url": pr.html_url,
                    "state": pr.state,
                    "created_at": pr.created_at.isoformat(),
                    "updated_at": pr.updated_at.isoformat(),
                    "merged": pr.merged,
                    "merged_at": pr.merged_at.isoformat(),
                    "user": {
                        "login": pr.user.login,
                        "avatar_url": pr.user.avatar_url
                    }
                })
                
            return result
        except GithubException as e:
            logger.error(f"Error getting recent merges for {owner}/{repo}: {e}")
            return None
