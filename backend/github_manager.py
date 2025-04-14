"""
GitHub Manager for the Projector application.

This module handles interactions with GitHub repositories.
"""

import os
import logging
from typing import List, Dict, Any, Optional
import base64
from github import Github, GithubException
import time

class GitHubManager:
    """
    Manages GitHub operations for the application.
    """
    
    def __init__(self, github_token: str, github_username: str, default_repo: str):
        """
        Initialize the GitHub manager.
        
        Args:
            github_token: GitHub API token
            github_username: GitHub username
            default_repo: Default repository name
        """
        self.logger = logging.getLogger(__name__)
        self.github_token = github_token
        self.github_username = github_username
        self.default_repo = default_repo
        self.github = Github(github_token)
        
    def list_branches(self, owner: str = None, repo: str = None) -> List[str]:
        """
        List branches in a repository.
        
        Args:
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            List of branch names
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            return [branch.name for branch in repository.get_branches()]
        except GithubException as e:
            self.logger.error(f"Error listing branches: {e}")
            return []
            
    def create_branch(self, branch_name: str, base_branch: str = "main", 
                     owner: str = None, repo: str = None) -> Dict[str, Any]:
        """
        Create a new branch in a repository.
        
        Args:
            branch_name: Name of the new branch
            base_branch: Name of the base branch
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            Dictionary with branch information
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            base_ref = repository.get_git_ref(f"heads/{base_branch}")
            repository.create_git_ref(f"refs/heads/{branch_name}", base_ref.object.sha)
            return {"success": True, "branch": branch_name, "base": base_branch}
        except GithubException as e:
            self.logger.error(f"Error creating branch: {e}")
            return {"success": False, "error": str(e)}
            
    def list_pull_requests(self, owner: str = None, repo: str = None) -> List[Dict[str, Any]]:
        """
        List pull requests in a repository.
        
        Args:
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            List of pull request information
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            return [
                {
                    "number": pr.number,
                    "title": pr.title,
                    "state": pr.state,
                    "created_at": pr.created_at.isoformat(),
                    "url": pr.html_url
                }
                for pr in repository.get_pulls(state="open")
            ]
        except GithubException as e:
            self.logger.error(f"Error listing pull requests: {e}")
            return []
            
    def merge_pull_request(self, pr_number: int, owner: str = None, repo: str = None) -> Dict[str, Any]:
        """
        Merge a pull request.
        
        Args:
            pr_number: Pull request number
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            Dictionary with merge information
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            pr = repository.get_pull(pr_number)
            
            # Play a bell sound when merging
            print('\a')  # ASCII bell character
            
            # Add a small delay to ensure the bell sound is played
            time.sleep(0.1)
            
            merge_result = pr.merge()
            return {
                "success": True,
                "merged": True,
                "message": merge_result.message,
                "sha": merge_result.sha
            }
        except GithubException as e:
            self.logger.error(f"Error merging pull request: {e}")
            return {"success": False, "merged": False, "error": str(e)}
            
    def list_repository_files(self, branch: str = "main", owner: str = None, repo: str = None) -> List[str]:
        """
        List files in a repository.
        
        Args:
            branch: Branch name
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            List of file paths
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            contents = repository.get_contents("", ref=branch)
            files = []
            
            while contents:
                file_content = contents.pop(0)
                if file_content.type == "dir":
                    contents.extend(repository.get_contents(file_content.path, ref=branch))
                else:
                    files.append(file_content.path)
                    
            return files
        except GithubException as e:
            self.logger.error(f"Error listing repository files: {e}")
            return []
            
    def get_file_content(self, file_path: str, branch: str = "main", owner: str = None, repo: str = None) -> Optional[str]:
        """
        Get the content of a file.
        
        Args:
            file_path: Path to the file
            branch: Branch name
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            File content as string, or None if error
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            content = repository.get_contents(file_path, ref=branch)
            decoded_content = base64.b64decode(content.content).decode('utf-8')
            return decoded_content
        except GithubException as e:
            self.logger.error(f"Error getting file content: {e}")
            return None
            
    def commit_file(self, file_path: str, commit_message: str, branch: str, content: str,
                   owner: str = None, repo: str = None) -> Dict[str, Any]:
        """
        Commit a file to a repository.
        
        Args:
            file_path: Path to the file
            commit_message: Commit message
            branch: Branch name
            content: File content
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            Dictionary with commit information
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            # Check if file exists
            try:
                file = repository.get_contents(file_path, ref=branch)
                repository.update_file(
                    file_path,
                    commit_message,
                    content,
                    file.sha,
                    branch=branch
                )
            except GithubException:
                # File doesn't exist, create it
                repository.create_file(
                    file_path,
                    commit_message,
                    content,
                    branch=branch
                )
                
            return {"success": True, "path": file_path, "branch": branch}
        except GithubException as e:
            self.logger.error(f"Error committing file: {e}")
            return {"success": False, "error": str(e)}
            
    def analyze_repository(self, owner: str = None, repo: str = None) -> Dict[str, Any]:
        """
        Analyze a repository structure.
        
        Args:
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            Dictionary with repository analysis
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            branches = [branch.name for branch in repository.get_branches()]
            languages = repository.get_languages()
            
            return {
                "name": repository.name,
                "full_name": repository.full_name,
                "description": repository.description,
                "default_branch": repository.default_branch,
                "branches": branches,
                "languages": languages,
                "size": repository.size,
                "created_at": repository.created_at.isoformat() if repository.created_at else None,
                "updated_at": repository.updated_at.isoformat() if repository.updated_at else None,
            }
        except GithubException as e:
            self.logger.error(f"Error analyzing repository: {e}")
            return {"success": False, "error": str(e)}
            
    def get_repository_contents(self, owner: str, repo: str, path: str = "") -> List[Dict[str, Any]]:
        """
        Get repository contents.
        
        Args:
            owner: Repository owner
            repo: Repository name
            path: Path in the repository
            
        Returns:
            List of content items
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            contents = repository.get_contents(path)
            
            if not isinstance(contents, list):
                contents = [contents]
                
            return [
                {
                    "name": item.name,
                    "path": item.path,
                    "type": item.type,
                    "size": item.size,
                    "download_url": item.download_url
                }
                for item in contents
            ]
        except GithubException as e:
            self.logger.error(f"Error getting repository contents: {e}")
            return []
            
    def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """
        Get repository information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            Dictionary with repository information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            return {
                "name": repository.name,
                "full_name": repository.full_name,
                "description": repository.description,
                "default_branch": repository.default_branch,
                "size": repository.size,
                "created_at": repository.created_at.isoformat() if repository.created_at else None,
                "updated_at": repository.updated_at.isoformat() if repository.updated_at else None,
            }
        except GithubException as e:
            self.logger.error(f"Error getting repository: {e}")
            return {}
            
    def get_pull_request(self, owner: str, repo: str, pr_number: int) -> Dict[str, Any]:
        """
        Get pull request information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            
        Returns:
            Dictionary with pull request information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            pr = repository.get_pull(pr_number)
            
            return {
                "number": pr.number,
                "title": pr.title,
                "body": pr.body,
                "state": pr.state,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
                "updated_at": pr.updated_at.isoformat() if pr.updated_at else None,
                "merged": pr.merged,
                "mergeable": pr.mergeable,
                "url": pr.html_url
            }
        except GithubException as e:
            self.logger.error(f"Error getting pull request: {e}")
            return {}
            
    def get_comments(self, owner: str, repo: str, pr_number: int) -> List[Dict[str, Any]]:
        """
        Get comments on a pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            
        Returns:
            List of comment information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            pr = repository.get_pull(pr_number)
            
            return [
                {
                    "id": comment.id,
                    "user": comment.user.login,
                    "body": comment.body,
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                }
                for comment in pr.get_comments()
            ]
        except GithubException as e:
            self.logger.error(f"Error getting comments: {e}")
            return []
            
    def create_comment(self, owner: str, repo: str, pr_number: int, body: str) -> Dict[str, Any]:
        """
        Create a comment on a pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pr_number: Pull request number
            body: Comment body
            
        Returns:
            Dictionary with comment information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            pr = repository.get_pull(pr_number)
            comment = pr.create_issue_comment(body)
            
            return {
                "id": comment.id,
                "user": comment.user.login,
                "body": comment.body,
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
            }
        except GithubException as e:
            self.logger.error(f"Error creating comment: {e}")
            return {}
            
    def get_branches(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """
        Get branches in a repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            List of branch information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            return [
                {
                    "name": branch.name,
                    "protected": branch.protected,
                    "commit": {
                        "sha": branch.commit.sha,
                        "url": branch.commit.html_url
                    }
                }
                for branch in repository.get_branches()
            ]
        except GithubException as e:
            self.logger.error(f"Error getting branches: {e}")
            return []
            
    def get_commits(self, owner: str, repo: str, branch: str = None, path: str = None, 
                   since: str = None, until: str = None, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Get commits in a repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch: Branch name
            path: Path in the repository
            since: ISO 8601 date string
            until: ISO 8601 date string
            limit: Maximum number of commits to return
            
        Returns:
            List of commit information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            kwargs = {}
            if branch:
                kwargs["sha"] = branch
            if path:
                kwargs["path"] = path
            if since:
                kwargs["since"] = since
            if until:
                kwargs["until"] = until
                
            commits = list(repository.get_commits(**kwargs)[:limit])
            
            return [
                {
                    "sha": commit.sha,
                    "message": commit.commit.message,
                    "author": commit.commit.author.name,
                    "date": commit.commit.author.date.isoformat() if commit.commit.author.date else None,
                    "url": commit.html_url
                }
                for commit in commits
            ]
        except GithubException as e:
            self.logger.error(f"Error getting commits: {e}")
            return []
            
    def get_recent_merges(self, owner: str, repo: str, days: int = 7) -> List[Dict[str, Any]]:
        """
        Get recent merged pull requests.
        
        Args:
            owner: Repository owner
            repo: Repository name
            days: Number of days to look back
            
        Returns:
            List of merged pull request information
        """
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            # Get all closed PRs
            pulls = repository.get_pulls(state="closed")
            
            # Filter for merged PRs within the time period
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            
            recent_merges = []
            for pr in pulls:
                if pr.merged and pr.merged_at and pr.merged_at > cutoff_date:
                    recent_merges.append({
                        "number": pr.number,
                        "title": pr.title,
                        "merged_at": pr.merged_at.isoformat(),
                        "merged_by": pr.merged_by.login if pr.merged_by else None,
                        "url": pr.html_url
                    })
                    
                # Limit to 50 recent merges to avoid API rate limits
                if len(recent_merges) >= 50:
                    break
                    
            return recent_merges
        except GithubException as e:
            self.logger.error(f"Error getting recent merges: {e}")
            return []
            
    def create_pull_request_for_feature(self, title: str, body: str, head_branch: str, 
                                      base_branch: str = "main", owner: str = None, repo: str = None) -> Dict[str, Any]:
        """
        Create a pull request for a feature.
        
        Args:
            title: Pull request title
            body: Pull request body
            head_branch: Head branch name
            base_branch: Base branch name
            owner: Repository owner (defaults to github_username)
            repo: Repository name (defaults to default_repo)
            
        Returns:
            Dictionary with pull request information
        """
        owner = owner or self.github_username
        repo = repo or self.default_repo
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            pr = repository.create_pull(
                title=title,
                body=body,
                head=head_branch,
                base=base_branch
            )
            
            return {
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
                "url": pr.html_url
            }
        except GithubException as e:
            self.logger.error(f"Error creating pull request: {e}")
            return {"success": False, "error": str(e)}
            
    def generate_code_for_feature(self, feature_description: str, language: str = "python") -> Dict[str, Any]:
        """
        Generate code for a feature (placeholder for actual implementation).
        
        Args:
            feature_description: Description of the feature
            language: Programming language
            
        Returns:
            Dictionary with generated code
        """
        # This would typically use an AI service or code generation tool
        # For now, it's just a placeholder
        
        return {
            "success": True,
            "code": f"# Generated code for: {feature_description}\n# Language: {language}\n\n# TODO: Implement feature",
            "language": language
        }