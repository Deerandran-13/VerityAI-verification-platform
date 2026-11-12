from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.models.verification import VerificationJob


class VerificationReportGenerator:
    """Agent 12: Final Report Agent.
    
    Consolidates multi-agent verification outputs into transparent, evidence-backed reports.
    Supports complete JSON export and printable HTML/Markdown dossiers.
    """

    def generate_json_report(
        self,
        job: VerificationJob,
    ) -> dict[str, Any]:
        """Generates comprehensive verification report payload for API and export."""
        claims_data = []
        for c in job.claims:
            evidence_data = [
                {
                    "title": ev.source_title,
                    "url": ev.source_url,
                    "domain": ev.source_domain,
                    "publication_date": ev.publication_date.isoformat() if ev.publication_date else None,
                    "retrieval_date": ev.retrieval_date.isoformat(),
                    "snippet": ev.content_snippet,
                    "is_supporting": ev.is_supporting,
                    "is_contradicting": ev.is_contradicting,
                    "is_primary": ev.is_primary_source,
                    "reliability_score": ev.reliability_score,
                }
                for ev in c.evidence_items
            ]

            claims_data.append({
                "id": str(c.id),
                "claim_text": c.claim_text,
                "original_sentence": c.original_sentence,
                "category": c.category.value if c.category else "general_fact",
                "verdict": c.status.value if c.status else "unsupported",
                "freshness_score": c.freshness_score,
                "confidence_score": c.confidence_score,
                "explanation": c.explanation,
                "suggested_correction": c.suggested_correction,
                "page_number": getattr(c, "page_number", None),
                "section_title": getattr(c, "section_title", None),
                "evidence_count": len(c.evidence_items),
                "evidence_sources": evidence_data,
            })

        return {
            "verityai_report_version": "2.0.0",
            "report_id": str(job.id),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "job_summary": {
                "id": str(job.id),
                "mode": job.mode.value if hasattr(job.mode, "value") else str(job.mode),
                "status": job.status.value if hasattr(job.status, "value") else str(job.status),
                "historical_date": job.historical_date.isoformat() if job.historical_date else None,
                "overall_freshness_score": job.overall_freshness_score,
                "overall_confidence_score": job.overall_confidence_score,
                "total_claims": job.total_claims,
                "verified_claims": job.verified_claims,
                "outdated_claims": job.outdated_claims,
                "contradicted_claims": job.contradicted_claims,
                "unsupported_claims": job.unsupported_claims,
                "processing_time_ms": job.processing_time_ms,
                "submitted_at": job.created_at.isoformat() if job.created_at else None,
            },
            "audited_claims": claims_data,
            "methodology": {
                "weights": {
                    "evidence_agreement": 0.45,
                    "source_reliability": 0.25,
                    "temporal_relevance": 0.20,
                    "citation_consistency": 0.10,
                },
                "search_engine": "Tavily Live Web Search",
                "ai_gateway": "Bifrost Gateway",
                "primary_model": "Google Gemini 2.5 Flash",
                "zero_hallucination_rule": "Every factual verdict strictly grounded in retrieved evidence.",
            },
        }

    def generate_csv_report(self, job: VerificationJob) -> str:
        """Generates RFC 4180 compliant CSV export for spreadsheet analysis."""
        import csv
        import io

        report = self.generate_json_report(job)
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_ALL)

        # Header
        writer.writerow([
            "Claim ID",
            "Claim Text",
            "Category",
            "Verdict",
            "Freshness Score",
            "Confidence Score",
            "Explanation",
            "Suggested Correction",
            "Evidence Count",
            "Primary Evidence Title",
            "Primary Evidence Domain",
            "Primary Evidence URL",
        ])

        for c in report["audited_claims"]:
            sources = c.get("evidence_sources", [])
            top_src = sources[0] if sources else {}
            writer.writerow([
                c.get("id"),
                c.get("claim_text"),
                c.get("category"),
                c.get("verdict"),
                c.get("freshness_score"),
                c.get("confidence_score"),
                c.get("explanation"),
                c.get("suggested_correction") or "",
                c.get("evidence_count", 0),
                top_src.get("title", ""),
                top_src.get("domain", ""),
                top_src.get("url", ""),
            ])

        return output.getvalue()

    def generate_html_report(self, job: VerificationJob) -> str:
        """Generates self-contained, clean printable HTML report."""
        report = self.generate_json_report(job)
        summary = report["job_summary"]
        claims = report["audited_claims"]

        claims_html = ""
        for c in claims:
            verdict_badge_color = (
                "#10b981" if c["verdict"] in ("verified", "historically_correct")
                else ("#f59e0b" if c["verdict"] == "outdated"
                else ("#ef4444" if c["verdict"] == "contradicted" else "#6b7280"))
            )

            sources_html = ""
            for s in c["evidence_sources"][:3]:
                sources_html += f"""
                <li style="margin-bottom: 8px;">
                    <a href="{s['url']}" target="_blank" style="color: #06b6d4; text-decoration: none; font-weight: 600;">{s['title']}</a>
                    <span style="color: #64748b; font-size: 11px;">({s['domain']} • Reliability {s['reliability_score']}%)</span>
                    <p style="margin: 4px 0; color: #94a3b8; font-size: 12px; font-style: italic;">"{s['snippet'][:250]}..."</p>
                </li>
                """

            correction_html = ""
            if c.get("suggested_correction"):
                correction_html = f"""
                <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 8px 12px; margin-top: 8px; border-radius: 4px;">
                    <strong style="color: #fbbf24; font-size: 12px;">Suggested Correction:</strong>
                    <span style="color: #fde68a; font-size: 12px;">{c['suggested_correction']}</span>
                </div>
                """

            claims_html += f"""
            <div style="background: #111827; border: 1px solid #1e3a5f; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="background: {verdict_badge_color}; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{c['verdict']}</span>
                    <span style="color: #94a3b8; font-size: 12px;">Category: <strong>{c['category']}</strong> • Freshness: {c['freshness_score']}%</span>
                </div>
                <h3 style="color: #f8fafc; font-size: 14px; margin: 0 0 8px 0;">"{c['claim_text']}"</h3>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">{c['explanation']}</p>
                {correction_html}
                <div style="margin-top: 12px; border-top: 1px solid #1e293b; padding-top: 10px;">
                    <h4 style="color: #94a3b8; font-size: 11px; text-transform: uppercase; margin: 0 0 6px 0;">Corroborating Evidence Sources ({len(c['evidence_sources'])}):</h4>
                    <ul style="padding-left: 18px; margin: 0;">
                        {sources_html}
                    </ul>
                </div>
            </div>
            """

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>VerityAI Intelligence Report - {summary['id'][:8]}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0e1a; color: #f8fafc; padding: 30px; margin: 0; }}
        .header {{ border-bottom: 1px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 24px; }}
        .metric-card {{ background: #111827; border: 1px solid #1e3a5f; border-radius: 10px; padding: 14px; display: inline-block; min-width: 140px; margin-right: 12px; margin-bottom: 12px; }}
        @media print {{ body {{ background: white; color: black; }} .metric-card, div {{ border-color: #cbd5e1 !important; }} }}
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: #38bdf8; margin: 0 0 6px 0;">VerityAI Verification Report</h1>
        <p style="color: #94a3b8; margin: 0; font-size: 13px;">Report ID: {summary['id']} • Generated: {report['generated_at']}</p>
    </div>
    <div style="margin-bottom: 24px;">
        <div class="metric-card">
            <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block;">Overall Freshness</span>
            <span style="color: #38bdf8; font-size: 24px; font-weight: bold;">{summary['overall_freshness_score']}%</span>
        </div>
        <div class="metric-card">
            <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block;">Confidence Score</span>
            <span style="color: #10b981; font-size: 24px; font-weight: bold;">{summary['overall_confidence_score']}%</span>
        </div>
        <div class="metric-card">
            <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block;">Audited Claims</span>
            <span style="color: #f8fafc; font-size: 24px; font-weight: bold;">{summary['total_claims']}</span>
        </div>
        <div class="metric-card">
            <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block;">Processing Time</span>
            <span style="color: #f8fafc; font-size: 24px; font-weight: bold;">{summary['processing_time_ms']}ms</span>
        </div>
    </div>
    <h2 style="color: #e2e8f0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Audited Claim Findings</h2>
    {claims_html}
    <div style="margin-top: 30px; border-top: 1px solid #1e3a5f; padding-top: 15px; color: #64748b; font-size: 11px;">
        VerityAI Enterprise Engine • Powered by Tavily Live Web Research & Bifrost AI Gateway
    </div>
</body>
</html>"""
        return html

    @staticmethod
    def _pdf_safe(text: Any) -> str:
        """Convert arbitrary Unicode text to Latin-1 safe string for built-in PDF fonts."""
        s = str(text or "")
        replacements = {
            "\u2014": "-",
            "\u2013": "-",
            "\u2018": "'",
            "\u2019": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2022": "*",
            "\u2192": "->",
        }
        for k, v in replacements.items():
            s = s.replace(k, v)
        return s.encode("latin-1", "replace").decode("latin-1")

    def generate_pdf_report(self, job: VerificationJob) -> bytes:
        """Generates a structured, downloadable PDF verification report using fpdf2."""
        from fpdf import FPDF
        from fpdf.enums import XPos, YPos

        report = self.generate_json_report(job)
        summary = report["job_summary"]
        claims = report["audited_claims"]

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        # Title Banner
        pdf.set_fill_color(17, 24, 39)
        pdf.rect(10, 10, 190, 24, "F")
        pdf.set_xy(14, 14)
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(56, 189, 248)
        pdf.cell(0, 8, "VerityAI Verification Report", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_x(14)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(203, 213, 225)
        pdf.cell(
            0,
            6,
            self._pdf_safe(
                f"Report ID: {summary['id']} | Mode: {summary['mode']} | Generated: {report['generated_at']}"
            ),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

        pdf.ln(8)
        pdf.set_x(pdf.l_margin)
        pdf.set_text_color(15, 23, 42)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "Executive Summary", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(
            0,
            6,
            self._pdf_safe(
                f"Overall Freshness: {summary['overall_freshness_score']}%   |   "
                f"Confidence: {summary['overall_confidence_score']}%   |   "
                f"Total Claims: {summary['total_claims']}   |   "
                f"Processing: {summary['processing_time_ms']}ms"
            ),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.cell(
            0,
            6,
            self._pdf_safe(
                f"Verified: {summary['verified_claims']} | Outdated: {summary['outdated_claims']} | "
                f"Contradicted: {summary['contradicted_claims']} | Unsupported: {summary['unsupported_claims']}"
            ),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

        pdf.ln(5)
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "Audited Claims & Evidence", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        for idx, c in enumerate(claims, start=1):
            pdf.ln(2)
            pdf.set_x(pdf.l_margin)
            loc_parts = []
            if c.get("page_number"):
                loc_parts.append(f"Page {c['page_number']}")
            if c.get("section_title"):
                loc_parts.append(f"Section: {c['section_title']}")
            loc_str = f" ({', '.join(loc_parts)})" if loc_parts else ""

            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(30, 58, 138)
            pdf.multi_cell(
                pdf.epw,
                5,
                self._pdf_safe(
                    f"{idx}. [{str(c['verdict']).upper()}] ({c['category']}){loc_str} "
                    f"- Freshness: {c['freshness_score']}% | Confidence: {c['confidence_score']}%"
                ),
            )
            pdf.set_x(pdf.l_margin)
            pdf.set_text_color(15, 23, 42)
            pdf.set_font("Helvetica", "B", 9.5)
            pdf.multi_cell(pdf.epw, 5, self._pdf_safe(f"Claim: {c['claim_text']}"))
            if c.get("explanation"):
                pdf.set_x(pdf.l_margin)
                pdf.set_font("Helvetica", "", 9)
                pdf.multi_cell(pdf.epw, 4.5, self._pdf_safe(f"Explanation: {c['explanation']}"))
            if c.get("suggested_correction"):
                pdf.set_x(pdf.l_margin)
                pdf.set_font("Helvetica", "I", 9)
                pdf.multi_cell(pdf.epw, 4.5, self._pdf_safe(f"Correction: {c['suggested_correction']}"))
            for ev in c.get("evidence_sources", [])[:2]:
                pdf.set_x(pdf.l_margin)
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(71, 85, 105)
                pdf.multi_cell(pdf.epw, 4, self._pdf_safe(f"  - Source: {ev.get('title')} ({ev.get('url')})"))
                pdf.set_text_color(15, 23, 42)

        raw = pdf.output()
        return bytes(raw) if isinstance(raw, (bytes, bytearray)) else raw.encode("latin-1")
