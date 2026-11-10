from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger("verityai.services.bifrost")


class BifrostService:
    """Gateway interface to AI models routed through Bifrost."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = (api_key or settings.BIFROST_API_KEY).strip()
        self.base_url = (base_url or settings.BIFROST_BASE_URL).rstrip("/")
        self.model = (model or settings.BIFROST_MODEL).strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url)

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "x-bf-vk": self.api_key,
            "Content-Type": "application/json",
        }

    async def verify_claim_with_evidence(
        self,
        claim_text: str,
        evidence_snippets: list[str],
        model: str | None = None,
    ) -> dict[str, Any]:
        """Routes verification prompt to the configured model via Bifrost."""
        if not self.api_key:
            return {
                "verdict": "unverified",
                "confidence": 0.0,
                "reasoning": "Bifrost API key not configured.",
                "raw_response": None,
            }

        target_model = model or self.model
        headers = self._get_headers()
        payload = {
            "model": target_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are VerityAI Verification Engine. Evaluate the claim strictly against provided evidence.",
                },
                {
                    "role": "user",
                    "content": f"Claim: {claim_text}\nEvidence:\n" + "\n---\n".join(evidence_snippets),
                },
            ],
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def chat_completion(
        self,
        prompt: str,
        model: str | None = None,
        system_prompt: str = "You are VerityAI assistant.",
        max_tokens: int = 500,
    ) -> dict[str, Any]:
        """Sends a general completion request through Bifrost."""
        if not self.api_key:
            raise ValueError("Bifrost API key not configured.")

        target_model = model or self.model
        headers = self._get_headers()
        payload = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def generate_structured_json(
        self,
        prompt: str,
        system_instruction: str = "You are a factual auditor. Respond in JSON.",
        model: str | None = None,
    ) -> dict[str, Any]:
        """Requests structured JSON output from Gemini routed via Bifrost."""
        raw = await self.chat_completion(
            prompt=prompt,
            model=model or self.model,
            system_prompt=system_instruction,
            max_tokens=600,
        )
        content = raw.get("choices", [{}])[0].get("message", {}).get("content", "")
        clean_json = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            return json.loads(clean_json)
        except Exception:
            return {"raw_text": content}
