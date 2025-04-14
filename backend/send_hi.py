#!/usr/bin/env python3
"""
Simple script to send a 'Hi' message to a Slack user.

This script uses the SlackUserMessenger class to send a direct message
to a user specified in the environment variables.

Usage:
    python send_hi.py
"""

import os
from dotenv import load_dotenv
from slack_user_messenger import SlackUserMessenger

def main():
    """Send a 'Hi' message to the default user."""
    # Load environment variables from .env file
    load_dotenv()
    
    # Get environment variables
    token = os.getenv('SLACK_USER_TOKEN')
    member_id = os.getenv('SLACK_MEMBER_ID')
    
    if not token:
        print("Error: SLACK_USER_TOKEN environment variable is required")
        return
    
    if not member_id:
        print("Error: SLACK_MEMBER_ID environment variable is required")
        return
    
    # Initialize the messenger
    messenger = SlackUserMessenger(token)
    
    # Send a simple "Hi" message
    print(f"Sending 'Hi' message to user {member_id}...")
    response = messenger.send_dm(member_id, "Hi")
    
    if response:
        print("✅ Message sent successfully!")
    else:
        print("❌ Failed to send message. Check your environment variables and Slack token.")

if __name__ == "__main__":
    main()
