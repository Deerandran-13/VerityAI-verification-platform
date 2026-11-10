document.addEventListener('DOMContentLoaded', async () => {
  const inputEl = document.getElementById('verify-input');
  const btnEl = document.getElementById('verify-btn');
  const resultBox = document.getElementById('result-box');
  const freshnessEl = document.getElementById('freshness-val');
  const confidenceEl = document.getElementById('confidence-val');
  const claimsCountEl = document.getElementById('claims-count');
  const claimsListEl = document.getElementById('claims-list');
  const fullReportLink = document.getElementById('full-report-link');

  // If text was passed from storage or active tab selection
  chrome.storage.local.get(['selectedText'], (res) => {
    if (res.selectedText) {
      inputEl.value = res.selectedText;
      chrome.storage.local.remove(['selectedText']);
    }
  });

  btnEl.addEventListener('click', async () => {
    const text = inputEl.value.trim();
    if (!text) return;

    btnEl.disabled = true;
    btnEl.textContent = 'Verifying live evidence...';
    resultBox.style.display = 'none';

    try {
      const resp = await fetch('http://localhost:8000/api/v1/extension/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      freshnessEl.textContent = `${Math.round(data.overall_freshness_score || 0)}%`;
      confidenceEl.textContent = `${Math.round(data.overall_confidence_score || 0)}%`;
      claimsCountEl.textContent = data.total_claims || (data.claims ? data.claims.length : 0);

      claimsListEl.innerHTML = '';
      (data.claims || []).forEach((c) => {
        const item = document.createElement('div');
        item.className = 'claim-item';
        const vClass = (c.verdict || 'unsupported').toLowerCase();
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span class="status-badge ${vClass}">${c.verdict}</span>
            <span style="color:#64748b; font-size:10px;">Conf: ${Math.round(c.confidence || 0)}%</span>
          </div>
          <div style="color:#e2e8f0; font-size:11px;">"${c.text}"</div>
          ${c.correction ? `<div style="color:#fbbf24; font-size:10px; margin-top:3px;">Correction: ${c.correction}</div>` : ''}
        `;
        claimsListEl.appendChild(item);
      });

      fullReportLink.href = data.full_report_url || `http://localhost:5173/results?id=${data.job_id}`;
      resultBox.style.display = 'block';
    } catch (err) {
      alert(`Verification failed: Could not reach backend server at localhost:8000. Is VerityAI running? (${err.message})`);
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Verify Facts with Live Research';
    }
  });
});

