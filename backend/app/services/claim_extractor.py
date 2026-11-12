from __future__ import annotations

import re
import uuid
from typing import Any


class ClaimExtractor:
    """Agent 1: Extracts atomic factual claims from AI-generated text or documents.
    
    Separates verifiable factual assertions from subjective opinions,
    extracts key entities, numerical figures, and temporal markers,
    and prioritizes the most information-dense factual statements.
    """

    MAX_CLAIMS_PER_RUN = 10

    def __init__(self) -> None:
        self.sentence_regex = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")
        # Markers indicating subjective opinion rather than verifiable fact
        self.opinion_patterns = [
            r"\b(i think|i believe|in my opinion|in my view|arguably|probably|perhaps)\b",
            r"\b(it seems|it feels like|beautiful|wonderful|terrible|superior|inferior)\b",
            r"\b(might be|could possibly be|should consider|best overall|personal favorite)\b",
        ]
        # Regex for dates, versions, and numerical values
        self.date_regex = re.compile(r"\b((?:19|20)\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)\b", re.IGNORECASE)
        self.version_regex = re.compile(r"\bv?\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9]+)?\b")
        self.number_regex = re.compile(r"\b(?:\$|€|£)?\d+(?:,\d{3})*(?:\.\d+)?%?\b")

    async def extract_claims(self, text: str) -> list[dict[str, Any]]:
        """Splits text into atomic claims, scores them for factual density, and selects top claims."""
        if not text or not text.strip():
            return []

        # Parse page & section markers while preserving line context
        page_re = re.compile(r"^\[Page\s+(\d+)\]$", re.IGNORECASE)
        section_re = re.compile(r"^\[Section:\s*(.+?)\]$", re.IGNORECASE)
        md_heading_re = re.compile(r"^#{1,6}\s+(.+)$")

        segments: list[tuple[int | None, str | None, str]] = []
        current_page: int | None = None
        current_section: str | None = None
        buffer: list[str] = []

        def _flush_buffer() -> None:
            if buffer:
                segments.append((current_page, current_section, " ".join(buffer)))
                buffer.clear()

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("---") or line.startswith("==="):
                continue
            pm = page_re.match(line)
            if pm:
                _flush_buffer()
                current_page = int(pm.group(1))
                continue
            sm = section_re.match(line)
            if sm:
                _flush_buffer()
                current_section = sm.group(1).strip()[:255]
                continue
            hm = md_heading_re.match(line)
            if hm:
                _flush_buffer()
                current_section = hm.group(1).strip()[:255]
                continue
            buffer.append(line)
        _flush_buffer()

        candidates: list[dict[str, Any]] = []
        global_idx = 0
        for seg_page, seg_section, seg_text in segments:
            raw_sentences = [
                s.strip()
                for s in self.sentence_regex.split(seg_text)
                if s.strip()
            ]
            for sentence in raw_sentences:
                idx = global_idx
                global_idx += 1
                # Split compound conjunctions into atomic clauses
                sub_clauses = re.split(r";|\s+(?:and\s+also|moreover|furthermore)\s+", sentence)
                for clause in sub_clauses:
                    clause = clause.strip()
                    # Ignore very short or trivial fragments
                    if len(clause) < 15 or len(clause.split()) < 3:
                        continue

                    # Detect if subjective opinion
                    is_opinion = any(re.search(pat, clause, re.IGNORECASE) for pat in self.opinion_patterns)
                    if is_opinion:
                        continue

                    # Detect time-sensitivity & historical markers
                    is_time_sensitive = bool(
                        re.search(
                            r"\b(currently|today|now|latest|recent|as of|v\d+|\d{4}|active|status|pricing|costs?)\b",
                            clause,
                            re.IGNORECASE,
                        )
                    )
                    is_historical = bool(
                        re.search(
                            r"\b(in (?:19|20)\d{2}|released in|founded in|originally|historically|prior to|formerly)\b",
                            clause,
                            re.IGNORECASE,
                        )
                    )
                    is_vague = len(clause.split()) < 4 or bool(re.search(r"\b(things|stuff|various|some people)\b", clause, re.IGNORECASE))

                    # Extract dates, versions, numbers
                    dates = self.date_regex.findall(clause)
                    versions = self.version_regex.findall(clause)
                    numbers = self.number_regex.findall(clause)

                    # Density scoring for sorting
                    density_score = 0
                    if versions:
                        density_score += 3
                    if numbers:
                        density_score += 2
                    if dates:
                        density_score += 2
                    if is_time_sensitive or is_historical:
                        density_score += 1
                    if not is_vague:
                        density_score += 1

                    candidates.append(
                        {
                            "id": str(uuid.uuid4()),
                            "claim_text": clause,
                            "original_sentence": sentence,
                            "position_in_text": idx,
                            "page_number": seg_page,
                            "section_title": seg_section,
                            "is_time_sensitive": is_time_sensitive,
                            "is_historical": is_historical,
                            "is_vague": is_vague,
                            "is_opinion": False,
                            "dates": list(set(dates)),
                            "versions": list(set(versions)),
                            "numbers": list(set(numbers)),
                            "density_score": density_score,
                        }
                    )

        # Deduplicate candidates with identical text
        seen_texts = set()
        deduped = []
        for c in candidates:
            norm = c["claim_text"].lower().strip()
            if norm not in seen_texts:
                seen_texts.add(norm)
                deduped.append(c)

        # Sort by density score descending and return up to MAX_CLAIMS_PER_RUN
        deduped.sort(key=lambda x: x["density_score"], reverse=True)
        return deduped[: self.MAX_CLAIMS_PER_RUN]
