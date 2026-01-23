#!/usr/bin/env python3
"""
Douyin video information fetcher using Douyin_TikTok_Download_API
This script can be used as a fallback when yt-dlp fails.

Usage:
    python scripts/douyin_fetch.py <video_url>

Output:
    JSON string with video information:
    {
        "title": "Video title",
        "duration": 123.45,
        "video_url": "https://...",
        "audio_url": "https://..."
    }
"""

import sys
import json
import os

def fetch_douyin_video_info(video_url: str) -> dict:
    """
    Fetch Douyin video information.
    
    This is a placeholder implementation. In practice, you would:
    1. Clone the Douyin_TikTok_Download_API repository
    2. Import and use its crawler modules
    3. Return the video information
    
    For now, this script provides a structure that can be extended.
    """
    try:
        # Option 1: If you have the Douyin_TikTok_Download_API cloned locally
        # Uncomment and modify the following lines:
        #
        # import sys
        # sys.path.insert(0, '/path/to/Douyin_TikTok_Download_API')
        # from crawlers.douyin.web import DouyinWebCrawler
        # 
        # crawler = DouyinWebCrawler()
        # result = crawler.fetch_video_info(video_url)
        # 
        # return {
        #     "title": result.get("title", ""),
        #     "duration": result.get("duration", 0),
        #     "video_url": result.get("video_url", ""),
        #     "audio_url": result.get("audio_url", ""),
        # }
        
        # Option 2: Call the API service if it's running
        # Uncomment and modify the following lines:
        #
        # import requests
        # api_base_url = os.getenv("DOUYIN_API_BASE_URL", "http://localhost:8000")
        # response = requests.post(
        #     f"{api_base_url}/api/douyin/web",
        #     json={"url": video_url},
        #     timeout=30
        # )
        # response.raise_for_status()
        # data = response.json()
        # 
        # return {
        #     "title": data.get("data", {}).get("title", ""),
        #     "duration": data.get("data", {}).get("duration", 0),
        #     "video_url": data.get("data", {}).get("video_url", ""),
        #     "audio_url": data.get("data", {}).get("audio_url", ""),
        # }
        
        # Placeholder: Return error message
        return {
            "error": "Douyin_TikTok_Download_API not configured",
            "message": "Please configure the script to use Douyin_TikTok_Download_API",
            "instructions": [
                "1. Clone the repository: git clone https://github.com/Evil0ctal/Douyin_TikTok_Download_API",
                "2. Install dependencies: pip install -r requirements.txt",
                "3. Modify this script to import and use the crawler modules",
                "4. Or set DOUYIN_API_BASE_URL to use the HTTP API service"
            ]
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Failed to fetch video information"
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing video URL",
            "usage": "python scripts/douyin_fetch.py <video_url>"
        }), file=sys.stderr)
        sys.exit(1)
    
    video_url = sys.argv[1]
    result = fetch_douyin_video_info(video_url)
    
    # Output JSON to stdout
    print(json.dumps(result, ensure_ascii=False))
    
    # Exit with error code if there's an error
    if "error" in result:
        sys.exit(1)


if __name__ == "__main__":
    main()
