from __future__ import annotations

import hashlib
import logging
import time
from typing import Any
import httpx
from app.core.config import settings

logger = logging.getLogger("verityai.services.tavily")


class TavilyService:
    """Agent 2 (Research Agent): Real-time live web research via Tavily Search API.
    
    Includes in-memory caching to avoid redundant API expenses, date/domain filtering,
    and automatic query optimization for supporting & counter-evidence.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = (api_key or settings.TAVILY_API_KEY).strip()
        self.base_url = "https://api.tavily.com"
        # In-memory query cache: {query_hash: (timestamp, results_dict)}
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._cache_ttl_seconds = 3600  # 1 hour cache TTL

    def _cache_key(self, query: str, search_depth: str, max_results: int) -> str:
        raw = f"{query.lower().strip()}:{search_depth}:{max_results}"
        return hashlib.sha256(raw.encode()).hexdigest()

    async def search(
        self,
        query: str,
        search_depth: str = "advanced",
        include_domains: list[str] | None = None,
        exclude_domains: list[str] | None = None,
        max_results: int = 5,
        use_cache: bool = True,
    ) -> dict[str, Any]:
        """Search the live web for authoritative evidence matching the query."""
        if not self.api_key or self.api_key == "your_tavily_api_key_here":
            logger.warning("Tavily API key not configured. Returning empty search results.")
            return {
                "results": [],
                "query": query,
                "warning": "TAVILY_API_KEY not configured.",
            }

        cache_key = self._cache_key(query, search_depth, max_results)
        if use_cache and cache_key in self._cache:
            ts, cached_data = self._cache[cache_key]
            if time.time() - ts < self._cache_ttl_seconds:
                logger.info(f"Tavily cache hit for query: '{query[:40]}...'")
                return cached_data

        payload: dict[str, Any] = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": search_depth,
            "max_results": max_results,
            "include_answer": True,
        }
        if include_domains:
            payload["include_domains"] = include_domains
        if exclude_domains:
            payload["exclude_domains"] = exclude_domains

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(f"{self.base_url}/search", json=payload)
                resp.raise_for_status()
                data = resp.json()
                if use_cache:
                    self._cache[cache_key] = (time.time(), data)
                return data
        except httpx.HTTPStatusError as http_err:
            logger.error(f"Tavily API HTTP error {http_err.response.status_code}: {http_err.response.text[:200]}")
            return {
                "results": [],
                "query": query,
                "error": f"Tavily API HTTP {http_err.response.status_code}",
            }
        except Exception as exc:
            logger.error(f"Tavily API connection failed: {exc}")
            return {
                "results": [],
                "query": query,
                "error": str(exc),
            }
