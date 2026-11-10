from __future__ import annotations

import io
import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("verityai.services.extractor")

# Blocked private and reserved network CIDRs for SSRF protection
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


class DocumentExtractorService:
    """Extracts clean textual claims and content from Documents (PDF, DOCX, TXT) and Webpages (URLs).
    Enforces strict SSRF defense, file size limits, and sanitization.
    """

    MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit

    @classmethod
    def validate_url_safety(cls, url: str) -> None:
        """Validates that a URL does not target localhost, private subnets, or internal cloud metadata services."""
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Unsupported URL scheme: {parsed.scheme}. Only HTTP/HTTPS allowed.")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid URL: Missing hostname.")

        if hostname.lower() in ("localhost", "metadata.google.internal", "instance-data"):
            raise ValueError(f"SSRF Protection: Access to restricted hostname '{hostname}' is denied.")

        try:
            # Resolve DNS to check if it points to private network
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)
            for blocked_net in BLOCKED_IP_NETWORKS:
                if ip_obj in blocked_net:
                    raise ValueError(f"SSRF Protection: Hostname resolves to private/reserved IP {ip_str}.")
        except socket.gaierror as e:
            raise ValueError(f"DNS resolution failed for hostname '{hostname}': {e}")

    @classmethod
    async def extract_from_url(cls, url: str) -> dict[str, str]:
        """Fetches and extracts primary textual content and title from a web URL safely."""
        cls.validate_url_safety(url)

        headers = {
            "User-Agent": "VerityAI-Bot/1.0 (+https://verityai.dev/bot; information verification engine)"
        }

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                raise ValueError(f"Failed to fetch URL. Remote server returned HTTP {resp.status_code}.")

            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type and "text" not in content_type:
                raise ValueError(f"Unsupported content type '{content_type}'. Expected HTML or text document.")

            html_text = resp.text

        soup = BeautifulSoup(html_text, "html.parser")

        # Strip non-text elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
            element.extract()

        # Extract title
        page_title = soup.title.string.strip() if soup.title and soup.title.string else url

        # Extract main text
        main_content = soup.find("article") or soup.find("main") or soup.find("body") or soup
        text = main_content.get_text(separator="\n", strip=True)

        # Normalize redundant newlines and whitespace
        clean_text = re.sub(r"\n{3,}", "\n\n", text)

        if len(clean_text) < 50:
            raise ValueError("Extracted page content is too short to verify. The page might require JavaScript or login.")

        return {
            "url": url,
            "title": page_title,
            "text": clean_text[:25000],  # Clamp to top 25,000 characters
        }

    @classmethod
    def extract_from_pdf(cls, file_bytes: bytes) -> str:
        """Extracts text from PDF bytes using pypdf."""
        import pypdf

        if len(file_bytes) > cls.MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size exceeds maximum allowed {cls.MAX_FILE_SIZE_BYTES // (1024*1024)}MB.")

        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"[Page {page_num + 1}]\n{page_text.strip()}")

            full_text = "\n\n".join(text_parts)
            if not full_text.strip():
                raise ValueError("PDF does not contain extractable text (may be scanned images).")
            return full_text
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise ValueError(f"Failed to parse PDF document: {e}")

    @classmethod
    def extract_from_docx(cls, file_bytes: bytes) -> str:
        """Extracts text from DOCX bytes using python-docx."""
        import docx

        if len(file_bytes) > cls.MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size exceeds maximum allowed {cls.MAX_FILE_SIZE_BYTES // (1024*1024)}MB.")

        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            text_parts = []
            for p in doc.paragraphs:
                if p.text.strip():
                    text_parts.append(p.text.strip())

            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        text_parts.append(row_text)

            full_text = "\n\n".join(text_parts)
            if not full_text.strip():
                raise ValueError("DOCX document is empty.")
            return full_text
        except Exception as e:
            logger.error(f"Error parsing DOCX: {e}")
            raise ValueError(f"Failed to parse DOCX document: {e}")

    @classmethod
    def extract_from_txt(cls, file_bytes: bytes) -> str:
        """Extracts text from TXT or Markdown bytes."""
        if len(file_bytes) > cls.MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size exceeds maximum allowed {cls.MAX_FILE_SIZE_BYTES // (1024*1024)}MB.")

        for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
            try:
                return file_bytes.decode(encoding).strip()
            except UnicodeDecodeError:
                continue
        raise ValueError("Could not decode plain text file with supported character encodings.")

