import { DEMO_CHAPTERS, type DemoChapter } from '../../data/demoWalkthroughChapters';
import type { DashboardStats, VerificationJob } from '../../types';

export interface LiveDemoSnapshot {
  stats: DashboardStats | null;
  latestJob: VerificationJob | null;
  isLive: boolean;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fill: string,
  stroke: string,
  textColor: string,
  font = 'bold 11px monospace'
) {
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + 4);
  ctx.textAlign = 'left';
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  radius = 12,
  lineWidth = 1.5
) {
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function renderDemoScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  snapshot: LiveDemoSnapshot,
  includeCaptions = true
): DemoChapter {
  const idx = DEMO_CHAPTERS.findIndex((c) => timeSec >= c.startSec && timeSec < c.endSec);
  const chapter = DEMO_CHAPTERS[idx === -1 ? DEMO_CHAPTERS.length - 1 : idx];
  const localT = Math.min(
    1,
    Math.max(0, (timeSec - chapter.startSec) / Math.max(0.1, chapter.endSec - chapter.startSec))
  );

  // Canvas background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, width, height);

  // Subtle engineering grid
  ctx.strokeStyle = 'rgba(30, 58, 95, 0.22)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < width; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += 48) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // Top Header Bar
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, 64);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(width, 64);
  ctx.stroke();

  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillText('VerityAI', 40, 40);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px monospace';
  ctx.fillText(`Route: ${chapter.routeHint}`, 145, 39);

  // Live vs Illustrative Data Badge
  const dataLabel = snapshot.isLive ? 'LIVE BACKEND DATA' : 'ILLUSTRATIVE SAMPLE';
  drawPill(
    ctx,
    width - 510,
    18,
    190,
    28,
    dataLabel,
    snapshot.isLive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
    snapshot.isLive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)',
    snapshot.isLive ? '#6ee7b7' : '#fcd34d'
  );

  // Chapter Badge
  drawPill(
    ctx,
    width - 300,
    18,
    256,
    28,
    `CH ${chapter.number}/18 • ${chapter.badge}`,
    'rgba(6, 182, 212, 0.14)',
    'rgba(6, 182, 212, 0.45)',
    '#67e8f9'
  );

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.fillText(chapter.title, 48, 110);

  const stageY = 136;
  const stageW = width - 96;
  const stageH = height - 196;
  drawBox(ctx, 48, stageY, stageW, stageH, '#0f172a', '#1e3a5f', 18, 1.5);

  const padX = 82;
  const innerW = stageW - 68;

  // Render chapter-specific animated visuals
  switch (chapter.id) {
    case 'overview': {
      drawBox(ctx, padX, stageY + 34, innerW, 118, '#111827', '#22d3ee', 14, 2);
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('WHAT IS VERITYAI?', padX + 24, stageY + 66);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.fillText('An Evidence-Driven AI Hallucination & Freshness Verification Platform', padX + 24, stageY + 100);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText('Audits AI responses against live primary web sources via Tavily + Bifrost + Gemini 2.5 Flash.', padX + 24, stageY + 130);

      const pillars = [
        { title: 'Catch Hallucinations', sub: 'Flags fake SDKs & URLs', color: '#ef4444' },
        { title: 'Detect Knowledge Drift', sub: 'Spots outdated prices/APIs', color: '#f59e0b' },
        { title: 'Map Claim Graphs', sub: 'Links premises & evidence', color: '#38bdf8' },
        { title: 'Zero Fabrication', sub: 'Real DB & live citations', color: '#10b981' },
      ];
      const active = Math.floor(localT * 4.5);
      pillars.forEach((b, i) => {
        const bx = padX + i * 282;
        const by = stageY + 180;
        drawBox(ctx, bx, by, 260, 128, '#090d16', i <= active ? b.color : '#1e3a5f', 14, i <= active ? 2 : 1);
        ctx.fillStyle = b.color;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`PILLAR 0${i + 1}`, bx + 18, by + 34);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Inter, system-ui, sans-serif';
        ctx.fillText(b.title, bx + 18, by + 68);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.fillText(b.sub, bx + 18, by + 98);
      });

      const totalJobs = snapshot.stats?.total_jobs ?? 12;
      const totalClaims = snapshot.stats?.total_claims ?? 48;
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        `Indexed in Database: ${totalJobs} verification jobs • ${totalClaims} verified/audited claims`,
        padX,
        stageY + 356
      );
      break;
    }

    case 'inputs': {
      const steps = [
        { num: 'STEP 1', title: 'Provide Input', desc: 'Paste AI text, upload PDF/DOCX/TXT, enter URL, or click a Preset' },
        { num: 'STEP 2', title: 'Select Mode', desc: 'Standard, Adversarial Audit, or Time-Travel Historical Date' },
        { num: 'STEP 3', title: 'Run Pipeline', desc: 'Click Start Verification to extract claims & gather live evidence' },
        { num: 'STEP 4', title: 'Inspect & Export', desc: 'Explore Claim Graph, Timeline, Conflicts, Team Review & PDF/CSV' },
      ];
      const activeStep = Math.min(3, Math.floor(localT * 4.2));
      steps.forEach((s, i) => {
        const sx = padX + i * 282;
        const sy = stageY + 46;
        const on = i <= activeStep;
        drawBox(ctx, sx, sy, 260, 175, on ? '#111827' : '#090d16', on ? '#22d3ee' : '#1e3a5f', 14, on ? 2.5 : 1);
        ctx.fillStyle = on ? '#22d3ee' : '#64748b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(s.num, sx + 18, sy + 32);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Inter, system-ui, sans-serif';
        ctx.fillText(s.title, sx + 18, sy + 64);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter, system-ui, sans-serif';
        wrapText(ctx, s.desc, sx + 18, sy + 96, 224, 22);
      });

      drawBox(ctx, padX, stageY + 250, innerW, 130, '#090d16', '#1e3a5f', 14);
      const sample = snapshot.latestJob?.original_text
        ? snapshot.latestJob.original_text.slice(0, 140)
        : 'Example Input: "Python 3.12 was released in Oct 2023. GPT-4 API costs $30 per 1M tokens."';
      const chars = Math.floor(localT * sample.length);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '16px monospace';
      wrapText(ctx, sample.slice(0, chars), padX + 24, stageY + 294, innerW - 48, 28);

      drawBox(ctx, width - 290, stageY + 332, 206, 42, '#0891b2', '#22d3ee', 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.fillText('▶  Start Verification', width - 262, stageY + 358);
      break;
    }

    case 'pipeline': {
      const stages = [
        { name: '1. Input & Guard', detail: 'Sanitize + Prompt Shield' },
        { name: '2. Claim Extractor', detail: 'Atomic Claims + Page/Sec' },
        { name: '3. Tavily Search', detail: 'Live Primary Evidence' },
        { name: '4. Bifrost / Gemini', detail: 'Cross-Verification' },
        { name: '5. Graph & Scores', detail: 'Quality, Bias, Uncertainty' },
        { name: '6. DB & Report', detail: 'Persist + Export' },
      ];
      const active = Math.min(5, Math.floor(localT * 6.2));
      stages.forEach((s, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const sx = padX + col * 380;
        const sy = stageY + 54 + row * 155;
        const on = i <= active;
        drawBox(ctx, sx, sy, 340, 118, on ? '#111827' : '#090d16', on ? '#22d3ee' : '#1e3a5f', 14, on ? 2 : 1);
        ctx.fillStyle = on ? '#22d3ee' : '#64748b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(on ? 'ACTIVE / COMPLETED' : 'QUEUED', sx + 20, sy + 32);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillText(s.name, sx + 20, sy + 64);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.fillText(s.detail, sx + 20, sy + 92);
      });

      // Progress Bar
      drawBox(ctx, padX, stageY + 382, innerW, 20, '#1e293b', '#334155', 10);
      drawRoundedRect(ctx, padX, stageY + 382, Math.max(24, innerW * localT), 20, 10);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px monospace';
      ctx.fillText(`End-to-End Orchestration Progress: ${Math.round(localT * 100)}%`, padX, stageY + 428);
      break;
    }

    case 'async_cache': {
      drawBox(ctx, padX, stageY + 46, innerW, 130, '#111827', '#1e3a5f', 14);
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('POST /api/v1/verify?async_mode=true  ->  202 Accepted { job_id, status: "pending" }', padX + 24, stageY + 90);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText('GET  /api/v1/verify/{job_id}/status    ->  { status: "processing", progress_pct, stage }', padX + 24, stageY + 130);

      const metrics = [
        { label: 'Polling Interval', val: '1.5s', color: '#38bdf8' },
        { label: 'Bounded Timeouts', val: '30s / call', color: '#f59e0b' },
        { label: 'Auto Retries', val: 'Exponential Backoff', color: '#10b981' },
        { label: 'DB Persistence', val: 'WAL SQLite / Postgres', color: '#818cf8' },
      ];
      metrics.forEach((m, i) => {
        const mx = padX + i * 282;
        const my = stageY + 215;
        drawBox(ctx, mx, my, 260, 150, '#090d16', m.color, 14, 1.5);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(m.label.toUpperCase(), mx + 20, my + 42);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Inter, system-ui, sans-serif';
        ctx.fillText(m.val, mx + 20, my + 95);
      });
      break;
    }

    case 'extraction': {
      drawBox(ctx, padX, stageY + 40, innerW, 88, '#111827', '#1e3a5f', 12);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SOURCE PARAGRAPH (PDF Page 3 • § API Architecture)', padX + 20, stageY + 70);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '15px Inter, system-ui, sans-serif';
      ctx.fillText(
        '"Python 3.12 shipped in Oct 2023. FastAPI 0.115 uses Pydantic v2. Legacy GPT-4 pricing is $30/1M tokens."',
        padX + 20,
        stageY + 102
      );

      const extracted = [
        { text: 'Claim #1: Python 3.12 shipped in Oct 2023', cat: 'SOFTWARE_VERSION', page: 'Page 3', sec: '§ API Architecture' },
        { text: 'Claim #2: FastAPI 0.115 uses Pydantic v2', cat: 'API_INFO', page: 'Page 3', sec: '§ API Architecture' },
        { text: 'Claim #3: Legacy GPT-4 pricing is $30/1M tokens', cat: 'PRICING • TIME-SENSITIVE', page: 'Page 3', sec: '§ Cost Table' },
      ];
      const count = Math.min(3, Math.floor(localT * 3.5) + 1);
      extracted.slice(0, count).forEach((c, i) => {
        const cy = stageY + 154 + i * 94;
        drawBox(ctx, padX, cy, innerW, 78, '#090d16', '#22d3ee', 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillText(c.text, padX + 20, cy + 32);
        drawPill(ctx, padX + 20, cy + 44, 210, 22, c.cat, 'rgba(6,182,212,0.15)', '#0891b2', '#67e8f9');
        drawPill(ctx, padX + 245, cy + 44, 90, 22, c.page, 'rgba(59,130,246,0.15)', '#3b82f6', '#93c5fd');
        drawPill(ctx, padX + 350, cy + 44, 170, 22, c.sec, 'rgba(139,92,246,0.15)', '#8b5cf6', '#c4b5fd');
      });
      break;
    }

    case 'verdicts': {
      const rows = [
        { claim: 'Python 3.12 released in Oct 2023', status: 'VERIFIED', color: '#10b981', risk: 'Low Risk' },
        { claim: 'GPT-4 API costs $30 / 1M tokens', status: 'OUTDATED', color: '#f59e0b', risk: 'Knowledge Drift' },
        { claim: 'app.enable_auto_hallucination_guard()', status: 'CONTRADICTED', color: '#ef4444', risk: 'Hallucinated SDK' },
        { claim: 'Internal proprietary benchmark of 99.9%', status: 'UNSUPPORTED', color: '#94a3b8', risk: 'No Primary Source' },
      ];
      rows.forEach((r, i) => {
        const ry = stageY + 46 + i * 95;
        const shown = localT * 4 >= i;
        drawBox(ctx, padX, ry, innerW, 78, '#111827', shown ? r.color : '#1e3a5f', 12, shown ? 2 : 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.fillText(r.claim, padX + 22, ry + 45);
        drawPill(ctx, width - 480, ry + 24, 150, 30, r.status, 'rgba(15,23,42,0.9)', r.color, r.color);
        drawPill(ctx, width - 310, ry + 24, 175, 30, r.risk, 'rgba(30,41,59,0.7)', '#475569', '#e2e8f0');
      });
      break;
    }

    case 'claim_graph': {
      // Dedicated deep-dive animated Claim Dependency Graph
      drawBox(ctx, padX, stageY + 28, innerW - 340, stageH - 56, '#090d16', '#1e3a5f', 14);
      drawBox(ctx, padX + innerW - 320, stageY + 28, 320, stageH - 56, '#111827', '#22d3ee', 14);

      const c1 = { x: padX + 140, y: stageY + 125, label: 'C1: Python 3.12 (Verified)', color: '#065f46', stroke: '#10b981' };
      const c2 = { x: padX + 140, y: stageY + 255, label: 'C2: Legacy Pricing (Outdated)', color: '#78350f', stroke: '#f59e0b' };
      const c3 = { x: padX + 350, y: stageY + 190, label: 'C3: Cost Estimate (Impacted)', color: '#7f1d1d', stroke: '#ef4444' };
      const e1 = { x: padX + 590, y: stageY + 115, label: 'docs.python.org (Q:94)', color: '#064e3b', stroke: '#10b981' };
      const e2 = { x: padX + 590, y: stageY + 275, label: 'openai.com/pricing (Q:96)', color: '#7f1d1d', stroke: '#ef4444' };

      const edges = [
        { a: c1, b: c3, color: '#10b981', dash: false, label: 'supporting' },
        { a: c2, b: c3, color: '#f59e0b', dash: true, label: 'dependent' },
        { a: e1, b: c1, color: '#10b981', dash: false, label: 'evidence' },
        { a: e2, b: c2, color: '#ef4444', dash: false, label: 'contradicts' },
      ];

      edges.forEach((ed, i) => {
        ctx.save();
        ctx.strokeStyle = ed.color;
        ctx.lineWidth = 2.5;
        if (ed.dash) ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(ed.a.x, ed.a.y);
        ctx.lineTo(ed.b.x, ed.b.y);
        ctx.stroke();
        ctx.restore();

        // Animated signal pulse along edge
        const pt = (localT * 2 + i * 0.22) % 1;
        const px = ed.a.x + (ed.b.x - ed.a.x) * pt;
        const py = ed.a.y + (ed.b.y - ed.a.y) * pt;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = ed.color;
        ctx.fill();
      });

      [c1, c2, c3, e1, e2].forEach((n, i) => {
        const r = i < 3 ? 28 : 20;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.strokeStyle = i === 2 ? '#22d3ee' : n.stroke;
        ctx.lineWidth = i === 2 ? 3.5 : 2;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + r + 18);
        ctx.textAlign = 'left';
      });

      // Legend bar inside graph
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('Legend: Solid Green=Supporting  |  Dashed Amber=Dependent  |  Red=Contradicting', padX + 20, stageY + stageH - 46);

      // Right Inspector Panel
      const ix = padX + innerW - 300;
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('NODE INSPECTOR (CLICKED: C3)', ix, stageY + 62);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('Monthly cost estimate relies on C2', ix, stageY + 96);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText('Impact Alert: Upstream C2 is Outdated.', ix, stageY + 136);
      ctx.fillText('Dependent C3 flagged for review.', ix, stageY + 160);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('Data Source:', ix, stageY + 215);
      ctx.fillText('GET /api/v1/verify/{job_id}/graph', ix, stageY + 238);
      ctx.fillText('Auto-updates after every run.', ix, stageY + 262);
      break;
    }

    case 'relationships': {
      const types = [
        { name: 'Supporting', desc: 'Premise reinforces target claim', color: '#10b981' },
        { name: 'Contradicting', desc: 'Claims assert mutually exclusive facts', color: '#ef4444' },
        { name: 'Dependent', desc: '"Therefore / because" causal premise', color: '#f59e0b' },
        { name: 'Overlapping', desc: 'High semantic/entity overlap or duplicate', color: '#06b6d4' },
        { name: 'Unrelated', desc: 'Independent factual statements', color: '#64748b' },
      ];
      types.forEach((t, i) => {
        const ty = stageY + 42 + i * 76;
        drawBox(ctx, padX, ty, innerW, 62, '#111827', t.color, 12, 1.5);
        drawPill(ctx, padX + 18, ty + 17, 150, 28, t.name.toUpperCase(), 'rgba(15,23,42,0.9)', t.color, t.color);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '15px Inter, system-ui, sans-serif';
        ctx.fillText(t.desc, padX + 190, ty + 37);
      });
      break;
    }

    case 'quality_scoring': {
      const factors = [
        { name: 'Source Authority', score: 23, max: 25, color: '#38bdf8' },
        { name: 'Claim Relevance', score: 24, max: 25, color: '#22d3ee' },
        { name: 'Publication Recency', score: 16, max: 20, color: '#10b981' },
        { name: 'Directness of Evidence', score: 14, max: 15, color: '#818cf8' },
        { name: 'Independent Corroboration', score: 15, max: 15, color: '#a78bfa' },
      ];
      const total = Math.round(92 * Math.min(1, localT * 1.4));
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.fillText(`Composite Evidence Quality Score: ${total} / 100  (Distinct from Claim Correctness)`, padX, stageY + 56);

      factors.forEach((f, i) => {
        const fy = stageY + 94 + i * 64;
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 14px Inter, system-ui, sans-serif';
        ctx.fillText(`${f.name} (max ${f.max})`, padX, fy + 22);

        const barX = padX + 310;
        const barW = innerW - 410;
        drawBox(ctx, barX, fy + 6, barW, 24, '#1e293b', '#334155', 8);
        const fillW = barW * (f.score / f.max) * Math.min(1, localT * 1.5);
        drawRoundedRect(ctx, barX, fy + 6, Math.max(8, fillW), 24, 8);
        ctx.fillStyle = f.color;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${f.score}/${f.max}`, barX + barW + 18, fy + 23);
      });
      break;
    }

    case 'bias_agreement': {
      // Evidence Agreement Bar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px Inter, system-ui, sans-serif';
      ctx.fillText('Evidence Agreement Ratio (Supporting vs. Contradicting vs. Neutral)', padX, stageY + 58);

      drawBox(ctx, padX, stageY + 78, innerW, 34, '#1e293b', '#334155', 10);
      const sW = innerW * 0.65;
      const cW = innerW * 0.25;
      const nW = innerW * 0.1;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(padX, stageY + 78, sW, 34);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(padX + sW, stageY + 78, cW, 34);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(padX + sW + cW, stageY + 78, nW, 34);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px monospace';
      ctx.fillText('65% Supporting (Green)   |   25% Contradicting (Red)   |   10% Neutral (Slate)', padX, stageY + 136);

      // Source Bias Cards
      const biasCards = [
        { domain: 'docs.python.org', label: 'NEUTRAL / PRIMARY', color: '#10b981', note: 'Official language documentation; no commercial COI.' },
        { domain: 'vendor-blog.example', label: 'COMMERCIAL_PROMOTIONAL', color: '#f59e0b', note: 'Sponsored comparison; flagged with rationale, auto_rejected=false.' },
      ];
      biasCards.forEach((b, i) => {
        const by = stageY + 172 + i * 110;
        drawBox(ctx, padX, by, innerW, 92, '#111827', b.color, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(b.domain, padX + 20, by + 35);
        drawPill(ctx, padX + 260, by + 17, 230, 26, b.label, 'rgba(15,23,42,0.9)', b.color, b.color);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillText(b.note, padX + 20, by + 68);
      });
      break;
    }

    case 'uncertainty': {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillText('Model Confidence vs. Actual Evidence Strength', padX, stageY + 58);

      const bars = [
        { label: 'Model Confidence (LLM)', pct: 88, color: '#22d3ee' },
        { label: 'Evidence Strength (Retrieved Web)', pct: 38, color: '#c084fc' },
        { label: 'Uncertainty Score', pct: 64, color: '#f59e0b' },
      ];
      bars.forEach((b, i) => {
        const by = stageY + 95 + i * 76;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 14px Inter, system-ui, sans-serif';
        ctx.fillText(b.label, padX, by + 22);
        const bx = padX + 310;
        const bw = innerW - 400;
        drawBox(ctx, bx, by + 6, bw, 26, '#1e293b', '#334155', 8);
        drawRoundedRect(ctx, bx, by + 6, bw * (b.pct / 100) * Math.min(1, localT * 1.4), 26, 8);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${b.pct}%`, bx + bw + 18, by + 24);
      });

      drawBox(ctx, padX, stageY + 332, innerW, 88, 'rgba(168, 85, 247, 0.12)', '#a855f7', 12);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.fillText('Uncertainty Level: HIGH  ->  Recommendation: insufficient_evidence', padX + 20, stageY + 365);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText('Reason: Model confidence diverges from sparse/conflicting evidence; system refuses to overstate certainty.', padX + 20, stageY + 394);
      break;
    }

    case 'conflicts': {
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.fillText('Claim: "GPT-4 API input pricing is $30 per 1M tokens." — Conflict Detected', padX, stageY + 56);

      drawBox(ctx, padX, stageY + 86, innerW / 2 - 16, 260, 'rgba(16, 185, 129, 0.08)', '#10b981', 14);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('SUPPORTING CITATIONS (Historical 2023)', padX + 20, stageY + 120);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px Inter, system-ui, sans-serif';
      wrapText(ctx, 'Source: blog.archive.example (2023-04-01)\n"Original GPT-4 8K context launched at $30 per million input tokens."', padX + 20, stageY + 158, innerW / 2 - 56, 26);

      const rx = padX + innerW / 2 + 16;
      drawBox(ctx, rx, stageY + 86, innerW / 2 - 16, 260, 'rgba(239, 68, 68, 0.08)', '#ef4444', 14);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('CONTRADICTING CITATIONS (Current 2024+)', rx + 20, stageY + 120);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px Inter, system-ui, sans-serif';
      wrapText(ctx, 'Source: openai.com/api/pricing (2024-11-01)\n"GPT-4o is $2.50 / 1M input tokens; GPT-4 Turbo is $10 / 1M."', rx + 20, stageY + 158, innerW / 2 - 56, 26);

      drawBox(ctx, padX, stageY + 365, innerW, 56, '#111827', '#f59e0b', 10);
      ctx.fillStyle = '#fde68a';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText('Conflict Reason: Different reporting dates & model generations. Both sides preserved with citations.', padX + 20, stageY + 398);
      break;
    }

    case 'timeline': {
      const events = [
        { date: '2023-04-01', type: 'EVIDENCE (Supporting)', text: 'Initial GPT-4 pricing announced at $30/1M tokens', color: '#10b981' },
        { date: '2024-05-13', type: 'EVIDENCE (Contradicting)', text: 'GPT-4o released at $5/1M -> later $2.50/1M', color: '#ef4444' },
        { date: '2025-01-10', type: 'VERSION #1 SNAPSHOT', text: 'Verdict shifted from Verified -> Outdated (Knowledge Drift)', color: '#f59e0b' },
      ];
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(padX + 28, stageY + 60);
      ctx.lineTo(padX + 28, stageY + 370);
      ctx.stroke();

      events.forEach((ev, i) => {
        const ey = stageY + 56 + i * 115;
        ctx.beginPath();
        ctx.arc(padX + 28, ey + 34, 9, 0, Math.PI * 2);
        ctx.fillStyle = ev.color;
        ctx.fill();

        drawBox(ctx, padX + 58, ey, innerW - 60, 88, '#111827', ev.color, 12);
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${ev.date}  •  ${ev.type}`, padX + 80, ey + 32);
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px Inter, system-ui, sans-serif';
        ctx.fillText(ev.text, padX + 80, ey + 64);
      });
      break;
    }

    case 'drift_timetravel': {
      const cards = [
        { title: 'Knowledge Drift (/drift)', desc: 'Detects time-sensitive claims (versions, pricing, laws) whose truth decays over time.', color: '#f59e0b' },
        { title: 'Time-Travel (/time-travel)', desc: 'Evaluates claims as of a user-chosen historical_date (e.g., 2022-06-01 -> Historically Correct).', color: '#38bdf8' },
        { title: 'Expiry Monitoring (/settings)', desc: 'Schedules daily/weekly checks on tracked claims and fires drift alerts on change.', color: '#10b981' },
      ];
      cards.forEach((c, i) => {
        const cx = padX + i * 380;
        drawBox(ctx, cx, stageY + 66, 355, 290, '#111827', c.color, 14, 2);
        ctx.fillStyle = c.color;
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillText(c.title, cx + 22, stageY + 114);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px Inter, system-ui, sans-serif';
        wrapText(ctx, c.desc, cx + 22, stageY + 162, 310, 26);
      });
      break;
    }

    case 'analytics_charts': {
      // Left: ClaimDistributionChart (Donut)
      drawBox(ctx, padX, stageY + 34, innerW / 2 - 16, stageH - 68, '#111827', '#1e3a5f', 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('Claim Status Distribution (Donut Chart)', padX + 20, stageY + 68);

      const vCount = snapshot.stats?.verified_count ?? 18;
      const oCount = snapshot.stats?.outdated_count ?? 6;
      const cCount = snapshot.stats?.contradicted_count ?? 4;
      const uCount = snapshot.stats?.unsupported_count ?? 3;
      const slices = [
        { name: 'Verified', val: Math.max(1, vCount), color: '#10b981' },
        { name: 'Outdated', val: Math.max(1, oCount), color: '#f59e0b' },
        { name: 'Contradicted', val: Math.max(1, cCount), color: '#ef4444' },
        { name: 'Unsupported', val: Math.max(1, uCount), color: '#f97316' },
      ];
      const total = slices.reduce((s, x) => s + x.val, 0);
      const cx = padX + 160;
      const cy = stageY + 210;
      let startAng = -Math.PI / 2;
      slices.forEach((s) => {
        const sweep = (s.val / total) * Math.PI * 2 * Math.min(1, localT * 1.6);
        ctx.beginPath();
        ctx.arc(cx, cy, 92, startAng, startAng + sweep);
        ctx.arc(cx, cy, 56, startAng + sweep, startAng, true);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        startAng += sweep;
      });
      slices.forEach((s, i) => {
        const ly = stageY + 150 + i * 34;
        ctx.fillStyle = s.color;
        ctx.fillRect(padX + 295, ly, 12, 12);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.fillText(`${s.name}: ${s.val}`, padX + 316, ly + 11);
      });

      // Right: FreshnessChart (Bar Chart with Axes)
      const rx = padX + innerW / 2 + 16;
      drawBox(ctx, rx, stageY + 34, innerW / 2 - 16, stageH - 68, '#111827', '#1e3a5f', 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('Freshness Score Cohorts (Bar Chart)', rx + 20, stageY + 68);

      const cohorts = [
        { label: '0-39%', count: 2 },
        { label: '40-64%', count: 4 },
        { label: '65-84%', count: 9 },
        { label: '85-100%', count: 18 },
      ];
      const axX = rx + 58;
      const axY = stageY + 315;
      const chartH = 190;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(axX, axY - chartH);
      ctx.lineTo(axX, axY);
      ctx.lineTo(rx + innerW / 2 - 42, axY);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText('Claims', rx + 12, axY - chartH + 10);

      cohorts.forEach((co, i) => {
        const bx = axX + 32 + i * 102;
        const bh = (co.count / 20) * chartH * Math.min(1, localT * 1.5);
        drawRoundedRect(ctx, bx, axY - bh, 56, Math.max(4, bh), 6);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(co.label, bx + 4, axY + 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${co.count}`, bx + 20, axY - bh - 6);
      });
      break;
    }

    case 'compare': {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.fillText('Side-by-Side Run Diff: Baseline Run A vs. Latest Run B (GET /api/v1/compare)', padX, stageY + 56);

      const diffs = [
        { claim: 'Python 3.12 released in Oct 2023', a: 'verified', b: 'verified', tag: 'UNCHANGED', color: '#64748b' },
        { claim: 'GPT-4 API pricing is $30/1M tokens', a: 'verified', b: 'outdated', tag: 'NEWLY_OUTDATED', color: '#f59e0b' },
        { claim: 'SDK supports async streaming', a: 'unsupported', b: 'verified', tag: 'NEWLY_SUPPORTED', color: '#10b981' },
      ];
      diffs.forEach((d, i) => {
        const dy = stageY + 90 + i * 95;
        drawBox(ctx, padX, dy, innerW, 78, '#111827', d.color, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Inter, system-ui, sans-serif';
        ctx.fillText(d.claim, padX + 20, dy + 35);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px monospace';
        ctx.fillText(`Run A: ${d.a}   --->   Run B: ${d.b}`, padX + 20, dy + 60);
        drawPill(ctx, width - 290, dy + 24, 175, 28, d.tag, 'rgba(15,23,42,0.9)', d.color, d.color);
      });
      break;
    }

    case 'collaboration': {
      drawBox(ctx, padX, stageY + 46, innerW / 2 - 16, 320, '#111827', '#22d3ee', 14);
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('Human Review & Feedback Loop', padX + 20, stageY + 84);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px Inter, system-ui, sans-serif';
      wrapText(
        ctx,
        'Reviewers mark verdicts Correct, Incorrect, or Needs Review with rationale and supporting URLs.\n\nGuardrail: Unverified feedback is logged to AuditActivityLog and NEVER auto-overrides Claim.status.',
        padX + 20,
        stageY + 124,
        innerW / 2 - 56,
        26
      );

      const rx = padX + innerW / 2 + 16;
      drawBox(ctx, rx, stageY + 46, innerW / 2 - 16, 320, '#111827', '#818cf8', 14);
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillText('Team RBAC & Shared Reports (/collaborate)', rx + 20, stageY + 84);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px Inter, system-ui, sans-serif';
      wrapText(
        ctx,
        '• Admin: Share reports, grant roles, assign reviewers.\n• Reviewer: Post official review notes & feedback.\n• Member: Read shared reports & post comments.\n• Unauthorized outsiders receive HTTP 403 Forbidden.',
        rx + 20,
        stageY + 124,
        innerW / 2 - 56,
        28
      );
      break;
    }

    case 'exports_security': {
      const items = [
        { title: 'Report Exports', desc: 'PDF, HTML, CSV, JSON via /verify/{id}/export', color: '#38bdf8' },
        { title: 'Public REST API', desc: 'Versioned /api/v1/*, X-API-Key, Rate Limiter', color: '#22d3ee' },
        { title: 'Security Guardrails', desc: 'SSRF blocking, Prompt-Injection Shield, Masked Keys', color: '#10b981' },
        { title: 'Chrome Extension', desc: 'Verify highlighted text on any webpage in 1 click', color: '#818cf8' },
      ];
      items.forEach((it, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ix = padX + col * 575;
        const iy = stageY + 52 + row * 175;
        drawBox(ctx, ix, iy, 545, 145, '#111827', it.color, 14, 2);
        ctx.fillStyle = it.color;
        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillText(it.title, ix + 24, iy + 48);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillText(it.desc, ix + 24, iy + 90);
      });
      break;
    }
  }

  if (includeCaptions) {
    const capW = width - 160;
    const capH = 56;
    const capX = 80;
    const capY = height - 66;
    drawBox(ctx, capX, capY, capW, capH, 'rgba(10, 14, 26, 0.94)', '#1e3a5f', 12, 1.5);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    wrapTextCentered(ctx, chapter.narration, width / 2, capY + 23, capW - 36, 20);
  }

  return chapter;
}

function wrapTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  ctx.textAlign = 'center';
  lines.slice(0, 2).forEach((l, i) => {
    ctx.fillText(l, centerX, y + i * lineHeight);
  });
  ctx.textAlign = 'left';
}

function idxColor(active: boolean): string {
  return active ? 'rgba(37, 99, 235, 0.25)' : '#111827';
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const paragraphs = text.split('\n');
  let cursorY = y;
  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
  }
}

