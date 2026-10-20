/* ==========================================================================
   India New Tax Regime Optimizer - JavaScript Logic Engine
   ========================================================================== */

/* ===================== TAX ENGINE ===================== */
const SLABS = [
  { min: 0, max: 400000, rate: 0.00 },
  { min: 400000, max: 800000, rate: 0.05 },
  { min: 800000, max: 1200000, rate: 0.10 },
  { min: 1200000, max: 1600000, rate: 0.15 },
  { min: 1600000, max: 2000000, rate: 0.20 },
  { min: 2000000, max: 2400000, rate: 0.25 },
  { min: 2400000, max: Infinity, rate: 0.30 },
];
const STD_DEDUCTION = 75000;
const CESS_RATE = 0.04;

function calcTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  // 87A rebate: full tax rebate if taxable income <= 12,00,000
  let tax = 0;
  for (const s of SLABS) {
    if (taxableIncome > s.min) {
      const chunk = Math.min(taxableIncome, s.max === Infinity ? taxableIncome : s.max) - s.min;
      tax += chunk * s.rate;
    }
  }
  // Section 87A: if taxable income <= 12,00,000, rebate up to 60,000
  if (taxableIncome <= 1200000) {
    const rebate = Math.min(tax, 60000);
    tax = Math.max(0, tax - rebate);
  }
  return tax;
}

function calcTaxWithCess(taxableIncome) {
  const tax = calcTax(taxableIncome);
  const cess = tax * CESS_RATE;
  return { tax, cess, total: tax + cess };
}

function calcSlabBreakdown(taxableIncome) {
  return SLABS.map(s => {
    if (taxableIncome <= s.min) return { ...s, amount: 0, tax: 0 };
    const amount = Math.min(taxableIncome, s.max === Infinity ? taxableIncome : s.max) - s.min;
    return { ...s, amount, tax: amount * s.rate };
  }).filter(s => s.amount > 0);
}

/* ===================== FORMATTER ===================== */
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
const fmtPct = n => (n * 100).toFixed(1) + '%';

/* ===================== STATE ===================== */
let G = 0, N = 0, DATA = null;
let charts = {};
// simulator state
let simState = { nps: 0, insurance: 0, meals: 0, fuel: 0, internet: 0 };

/* ===================== DARK MODE ===================== */
let dark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark');

// Sync on load
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('site-theme');
  if (saved) {
    dark = saved === 'dark';
    document.body.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', saved);
    const darkToggleEl = document.getElementById('darkToggle');
    if (darkToggleEl) darkToggleEl.classList.toggle('on', dark);
  }

  // Listen to header theme toggle button
  const headerThemeBtn = document.getElementById('theme-toggle-btn');
  if (headerThemeBtn) {
    headerThemeBtn.addEventListener('click', () => {
      setTimeout(() => {
        dark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.body.classList.toggle('dark', dark);
        const darkToggleEl = document.getElementById('darkToggle');
        if (darkToggleEl) darkToggleEl.classList.toggle('on', dark);
        if (DATA) rebuildCharts();
      }, 50);
    });
  }
});

/* ===================== TABS ===================== */
function switchTab(id) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ['overview', 'optimizer', 'scenarios', 'simulator', 'learn'][i] === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
}

/* ===================== INPUT ===================== */
function onInputChange() {
  document.getElementById('grossErr').classList.add('hidden');
  document.getElementById('netErr').classList.add('hidden');
  document.getElementById('grossSalary').classList.remove('error');
  document.getElementById('netSalary').classList.remove('error');
}

function validate() {
  G = parseFloat(document.getElementById('grossSalary').value) || 0;
  N = parseFloat(document.getElementById('netSalary').value) || 0;
  let ok = true;
  if (!G || G <= 0) { showErr('grossErr', 'grossSalary', 'Enter a valid gross salary'); ok = false; }
  if (!N || N <= 0) { showErr('netErr', 'netSalary', 'Enter a valid net salary'); ok = false; }
  if (ok && N > G) { showErr('netErr', 'netSalary', 'Net salary cannot exceed gross salary'); ok = false; }
  return ok;
}

function showErr(eid, fid, msg) {
  const e = document.getElementById(eid); e.textContent = msg; e.classList.remove('hidden');
  document.getElementById(fid).classList.add('error');
}

function loadDemo() {
  document.getElementById('grossSalary').value = 1500000;
  document.getElementById('netSalary').value = 1100000;
  analyze();
}

/* ===================== ANALYZE ===================== */
function analyze() {
  if (!validate()) return;
  const taxPaid = G - N;
  const taxableIncome = G - STD_DEDUCTION;
  const { tax, cess, total: totalTax } = calcTaxWithCess(taxableIncome);
  const effectiveTaxRate = totalTax / G;
  const monthlyInHand = N / 12;
  const estimatedDeductions = G - taxableIncome;

  DATA = { G, N, taxPaid, taxableIncome, tax, cess, totalTax, effectiveTaxRate, monthlyInHand, estimatedDeductions };
  simState = { nps: 0, insurance: 0, meals: 0, fuel: 0, internet: 0 };

  renderStatCards();
  renderGauge();
  renderSlabBreakdown();
  renderRecommendations();
  renderScenarios();
  renderSalaryStructure();
  renderSimulator();
  renderAccordions();
  renderAllCharts();

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ===================== STAT CARDS ===================== */
function renderStatCards() {
  const d = DATA;
  const cards = [
    { label: 'Gross Salary', value: fmt(d.G), sub: 'Annual CTC', cls: 'blue' },
    { label: 'Tax Paid (Estimated)', value: fmt(d.taxPaid), sub: `Effective ${fmtPct(d.effectiveTaxRate)}`, cls: 'red' },
    { label: 'Taxable Income', value: fmt(d.taxableIncome), sub: `After ₹75k std. deduction`, cls: 'orange' },
    { label: 'Monthly In-Hand', value: fmt(d.monthlyInHand), sub: 'Take-home per month', cls: 'green' },
    { label: 'Income Tax', value: fmt(d.tax), sub: 'Before cess', cls: 'red' },
    { label: 'Health & Ed. Cess', value: fmt(d.cess), sub: '4% on tax', cls: 'orange' },
    { label: 'Total Tax Liability', value: fmt(d.totalTax), sub: 'Tax + cess', cls: 'red' },
    { label: 'Effective Tax Rate', value: fmtPct(d.effectiveTaxRate), sub: 'Of gross salary', cls: 'purple' },
  ];
  document.getElementById('statCards').innerHTML = cards.map(c =>
    `<div class="stat-card ${c.cls}"><div class="stat-label">${c.label}</div><div class="stat-value">${c.value}</div><div class="stat-sub">${c.sub}</div></div>`
  ).join('');
}

/* ===================== GAUGE ===================== */
function renderGauge() {
  const d = DATA;
  const currentScore = Math.max(0, Math.round(100 - (d.effectiveTaxRate * 100) * 3.5));
  const potentialScore = Math.min(100, currentScore + 25);
  drawGauge(currentScore, potentialScore);
}

function drawGauge(current, potential) {
  const svg = document.getElementById('gaugeSvg');
  const cx = 110, cy = 120, r = 90;
  const startAngle = Math.PI; const endAngle = 2 * Math.PI;

  function arcPath(pct, stroke, width = 14) {
    const a = startAngle + (pct / 100) * (Math.PI);
    const ex = cx + r * Math.cos(a - Math.PI), ey = cy + r * Math.sin(a - Math.PI);
    return `<path d="M ${cx - r},${cy} A ${r},${r} 0 ${pct > 50 ? 1 : 0} 1 ${ex},${ey}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
  }

  const col = current < 40 ? '#dc2626' : current < 65 ? '#d97706' : '#059669';
  svg.innerHTML = `
    <path d="M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="var(--bg3)" stroke-width="14" stroke-linecap="round"/>
    ${arcPath(potential, 'rgba(79,70,229,0.25)', 14)}
    ${arcPath(current, col, 14)}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="28" font-weight="800" fill="${col}">${current}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" fill="var(--text3)">/ 100</text>
  `;
  document.getElementById('gaugeInfo').innerHTML = `
    <div class="gauge-stat"><div class="gs-val" style="color:${col}">${current}</div><div class="gs-lbl">Current</div></div>
    <div class="gauge-stat"><div class="gs-val" style="color:var(--accent)">${potential}</div><div class="gs-lbl">Potential</div></div>
    <div class="gauge-stat"><div class="gs-val" style="color:var(--green)">+${potential - current}%</div><div class="gs-lbl">Improvement</div></div>
  `;
}

/* ===================== SLAB BREAKDOWN ===================== */
function renderSlabBreakdown() {
  const breakdown = calcSlabBreakdown(DATA.taxableIncome);
  const totalTax = breakdown.reduce((a, b) => a + b.tax, 0);
  document.getElementById('slabBreakdown').innerHTML = breakdown.map(s => {
    const pct = totalTax > 0 ? (s.tax / totalTax * 100) : 0;
    return `<div class="slab-row">
      <div>
        <div style="font-weight:600;font-size:0.85rem">${fmt(s.min + 1)} – ${s.max === Infinity ? 'Above' : fmt(s.max)}</div>
        <div style="font-size:0.75rem;color:var(--text3)">${s.amount > 0 ? fmt(s.amount) : ''} @ ${(s.rate * 100).toFixed(0)}%</div>
        <div class="slab-bar" style="width:${Math.max(4, pct * 2)}px"></div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800;color:var(--accent)">${fmt(s.tax)}</div>
        <div style="font-size:0.75rem;color:var(--text3)">${pct.toFixed(1)}% of tax</div>
      </div>
    </div>`;
  }).join('');
}

/* ===================== RECOMMENDATIONS ===================== */
const RECS = [
  { cat: 'Employer Benefit', icon: '🏢', title: 'NPS Employer Contribution (80CCD(2))', calc: g => Math.min(g * 0.10, g * 0.10) * 0.30, saving: g => Math.min(g * 0.10, g * 0.10) * 0.30, difficulty: 'Easy', condition: 'Ask your employer to restructure CTC to include NPS contribution.', steps: ['Request HR to add NPS (Tier-I) contribution as a CTC component', 'Employer contributes up to 10% of Basic salary to NPS on your behalf', 'This is exempt from tax under 80CCD(2) even in New Tax Regime', 'Can save ₹30,000+ annually on a ₹10L salary'] },
  { cat: 'Employer Benefit', icon: '🍽️', title: 'Meal Cards / Food Coupons', calc: g => Math.min(26400, g * 0.025) * 0.30, saving: g => Math.min(26400, g * 0.025) * 0.30, difficulty: 'Easy', condition: 'Ask HR to add meal card (Sodexo/Ticket) to CTC. ₹2,200/month exemption.', steps: ['Request employer to provide meal cards (₹2,200/month)', 'Up to ₹26,400/year is exempt from tax', 'Replace cash allowance with meal cards', 'Saves ~₹7,920 annually in 30% bracket'] },
  { cat: 'Employer Benefit', icon: '⛽', title: 'Fuel & Vehicle Reimbursement', calc: g => g >= 600000 ? 21600 * 0.20 : 0, saving: g => g >= 600000 ? 21600 * 0.20 : 0, difficulty: 'Medium', condition: 'Applicable if you use personal vehicle for work. Submit fuel bills to employer.', steps: ['Submit fuel bills monthly to employer', 'Claim ₹1,800–₹3,000/month depending on car CC', 'Company reimburses against bills — not taxed', 'Saves ₹4,000–₹12,000 annually'] },
  { cat: 'Employer Benefit', icon: '📱', title: 'Telephone & Internet Reimbursement', calc: g => 36000 * 0.20, saving: g => 36000 * 0.20, difficulty: 'Easy', condition: 'Submit phone/internet bills. Most companies allow ₹1,500–₹3,000/month.', steps: ['Submit mobile and broadband bills to HR', 'Claim up to ₹3,000/month as reimbursement', 'Tax-free if used partly for work purposes', 'Annual saving: ₹7,200–₹14,400'] },
  { cat: 'Retirement', icon: '📊', title: 'Additional NPS Contribution (Tier-I)', calc: g => 0, saving: g => 0, difficulty: 'Medium', condition: 'No extra deduction available under New Tax Regime beyond employer NPS.', steps: ['NPS Tier-I self contributions no longer deductible under New Regime', 'However, maturity and withdrawal benefits remain tax-efficient', 'Consider NPS for long-term wealth creation, not tax saving alone'] },
  { cat: 'Employer Benefit', icon: '🏥', title: 'Corporate Health Insurance Top-Up', calc: g => Math.min(g * 0.015, 30000) * 0.20, saving: g => Math.min(g * 0.015, 30000) * 0.20, difficulty: 'Easy', condition: 'Premiums paid by employer are not added to your taxable salary.', steps: ['Request employer-paid health cover for family', 'Premium paid by company is not taxable income for you', 'Reduces out-of-pocket insurance cost', 'Save on personal insurance premiums too'] },
  { cat: 'Employer Benefit', icon: '✈️', title: 'Leave Travel Allowance (LTA)', calc: g => Math.min(g * 0.04, 60000) * 0.20, saving: g => Math.min(g * 0.04, 60000) * 0.20, difficulty: 'Medium', condition: 'Claim LTA once in a 2-year block. Submit travel bills. Economy travel only.', steps: ['Submit travel tickets (air/train/bus) to employer', 'Available twice in a 4-year block period', 'Covers domestic travel only for self and family', 'Employer reimburses fare — not taxed'] },
  { cat: 'Salary Restructuring', icon: '🏗️', title: 'Optimize Basic Salary Ratio', calc: g => g * 0.005, saving: g => g * 0.005, difficulty: 'Hard', condition: 'Work with HR to restructure salary with lower Basic and higher allowances.', steps: ['Lower basic (40-50% of CTC) reduces PF deductions', 'Higher special allowances are fully taxable but reduce statutory deductions', 'Negotiate with HR at time of appraisal or joining', 'Consult CA before restructuring'] },
];

function renderRecommendations() {
  const g = DATA.G;
  const recs = RECS.map(r => ({ ...r, savingAmt: r.calc(g) }))
                   .filter(r => r.savingAmt >= 0)
                   .sort((a, b) => b.savingAmt - a.savingAmt);
  const diffColors = { Easy: 'badge-green', Medium: 'badge-orange', Hard: 'badge-red' };
  document.getElementById('recommendations').innerHTML = recs.map(r => `
    <div class="rec-card">
      <div class="rec-header">
        <div>
          <div class="rec-title">${r.icon} ${r.title}</div>
          <div class="rec-cat">${r.cat} &nbsp;<span class="badge ${diffColors[r.difficulty]}">${r.difficulty}</span></div>
        </div>
        <div class="rec-saving">${r.savingAmt > 0 ? 'Save ' + fmt(r.savingAmt) + '/yr' : 'Long-term benefit'}</div>
      </div>
      ${r.savingAmt > 0 ? `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${Math.min(100, r.savingAmt / 500)}%"></div></div>` : ''}
      <div class="rec-body">
        <ul class="rec-steps">${r.steps.map(s => `<li>${s}</li>`).join('')}</ul>
        <div class="rec-condition">📌 ${r.condition}</div>
      </div>
    </div>
  `).join('');
}

/* ===================== SCENARIOS ===================== */
function calcScenario(label, adjustments) {
  const g = DATA.G;
  const deductions = STD_DEDUCTION + adjustments;
  const taxable = Math.max(0, g - deductions);
  const { total } = calcTaxWithCess(taxable);
  const netTakeHome = g - total;
  const saved = DATA.totalTax - total;
  return { label, taxPayable: total, netTakeHome, taxSaved: saved, effectiveTax: total / g };
}

function renderScenarios() {
  const scenarios = [
    calcScenario('Current Structure', 0),
    calcScenario('Optimized (NPS + Reimbursements)', Math.min(DATA.G * 0.10, 150000) + 26400 + 36000),
    calcScenario('Maximum Tax Efficient', Math.min(DATA.G * 0.10, 150000) + 26400 + 36000 + 21600 + Math.min(DATA.G * 0.04, 60000)),
  ];
  const labels = ['🟡 Current', '🔵 Optimized', '🟢 Max Efficient'];
  document.getElementById('scenarioTable').innerHTML = `<table>
    <thead><tr><th>Scenario</th><th>Tax Payable</th><th>Net Take-Home</th><th>Tax Saved</th><th>Eff. Rate</th></tr></thead>
    <tbody>${scenarios.map((s, i) => `<tr>
      <td class="scenario-label">${labels[i]}</td>
      <td>${fmt(s.taxPayable)}</td>
      <td>${fmt(s.netTakeHome)}</td>
      <td style="color:var(--green);font-weight:700">${i === 0 ? '—' : '+' + fmt(s.taxSaved)}</td>
      <td>${fmtPct(s.effectiveTax)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
  DATA._scenarios = scenarios;
}

/* ===================== SALARY STRUCTURE ===================== */
function renderSalaryStructure() {
  const g = DATA.G;
  const basic = Math.round(g * 0.40);
  const nps = Math.round(g * 0.10);
  const hra = Math.round(g * 0.12);
  const meals = 26400;
  const internet = 36000;
  const lta = Math.round(Math.min(g * 0.04, 60000));
  const special = g - basic - nps - hra - meals - internet - lta;
  const rows = [
    ['Basic Salary', basic, '40% of CTC'],
    ['HRA', hra, '12% of CTC'],
    ['Employer NPS (80CCD(2))', nps, '10% of Basic/CTC'],
    ['Meal Allowance', meals, '₹2,200/month'],
    ['Internet Reimbursement', internet, '₹3,000/month'],
    ['LTA', lta, 'Twice in 4-year block'],
    ['Special Allowance', Math.max(0, special), 'Balancing figure'],
  ];
  document.getElementById('salaryStructure').innerHTML = `<table>
    <thead><tr><th>Component</th><th>Amount</th><th>Note</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td style="font-weight:700">${fmt(r[1])}</td><td style="color:var(--text3)">${r[2]}</td></tr>`).join('')}</tbody>
  </table>`;
}

/* ===================== SIMULATOR ===================== */
function renderSimulator() {
  const g = DATA.G;
  const controls = [
    { key: 'nps', label: 'Employer NPS Contribution', max: Math.round(g * 0.10 / 1000) * 1000, step: 10000, unit: '₹' },
    { key: 'insurance', label: 'Insurance Benefits', max: 50000, step: 5000, unit: '₹' },
    { key: 'meals', label: 'Meal Card', max: 26400, step: 2200, unit: '₹' },
    { key: 'fuel', label: 'Fuel Reimbursement', max: 36000, step: 3000, unit: '₹' },
    { key: 'internet', label: 'Internet Reimbursement', max: 36000, step: 3000, unit: '₹' },
  ];
  document.getElementById('simControls').innerHTML = controls.map(c => `
    <div class="form-group">
      <label class="form-label">${c.label}</label>
      <div class="range-wrap">
        <input type="range" min="0" max="${c.max}" step="${c.step}" value="${simState[c.key]}"
          oninput="simState['${c.key}']=+this.value; document.getElementById('sv_${c.key}').textContent=fmt(+this.value); updateSim()">
        <span class="range-val" id="sv_${c.key}">${fmt(simState[c.key])}</span>
      </div>
    </div>
  `).join('');
  updateSim();
}

function updateSim() {
  const total = Object.values(simState).reduce((a, b) => a + b, 0);
  const g = DATA.G;
  const taxable = Math.max(0, g - STD_DEDUCTION - total);
  const { total: newTax } = calcTaxWithCess(taxable);
  const saved = DATA.totalTax - newTax;
  const newNet = g - newTax;
  document.getElementById('simResults').innerHTML = `
    <div class="grid2">
      <div class="stat-card green"><div class="stat-label">Tax Saved</div><div class="stat-value">${fmt(saved)}</div><div class="stat-sub">vs current</div></div>
      <div class="stat-card blue"><div class="stat-label">New Tax</div><div class="stat-value">${fmt(newTax)}</div><div class="stat-sub">With optimizations</div></div>
      <div class="stat-card purple"><div class="stat-label">New Take-Home</div><div class="stat-value">${fmt(newNet / 12)}/mo</div><div class="stat-sub">Monthly net</div></div>
      <div class="stat-card orange"><div class="stat-label">Deductions Added</div><div class="stat-value">${fmt(total)}</div><div class="stat-sub">Total restructuring</div></div>
    </div>
  `;
  renderCashFlowChart(newTax, saved);
}

function resetSim() {
  simState = { nps: 0, insurance: 0, meals: 0, fuel: 0, internet: 0 };
  renderSimulator();
}

/* ===================== ACCORDIONS ===================== */
function renderAccordions() {
  const items = [
    { q: 'What is the New Tax Regime?', a: 'Introduced in Budget 2020 and revamped in 2023, the New Tax Regime offers lower tax rates but removes most exemptions and deductions (like 80C, 80D, HRA). It became the default regime from FY 2023-24. It suits those with fewer investments or who prefer simplicity.' },
    { q: 'What is Standard Deduction?', a: 'A flat deduction of ₹75,000 (increased from ₹50,000 in Budget 2024) is available to all salaried employees under the New Tax Regime. No proof or investment required — it is automatically deducted from your gross salary to arrive at taxable income.' },
    { q: 'What is Section 87A Rebate?', a: 'If your total taxable income (after standard deduction) does not exceed ₹12,00,000, you are eligible for a tax rebate under Section 87A of up to ₹60,000. This effectively means zero tax for incomes up to ₹12.75 lakh (including ₹75k standard deduction).' },
    { q: 'What is NPS Employer Contribution (80CCD(2))?', a: 'Even under the New Tax Regime, if your employer contributes to your NPS Tier-I account, that amount (up to 10% of Basic + DA) is deductible from taxable income. This is one of the very few deductions allowed in the New Tax Regime and is highly effective for high earners.' },
    { q: 'What is Salary Restructuring?', a: 'Salary restructuring means reorganizing your CTC into components that attract lower or zero tax. Examples include replacing taxable cash allowances with meal cards, fuel reimbursements, internet bills, LTA, or NPS contributions. This reduces your effective taxable income without reducing your CTC.' },
    { q: 'What is Effective Tax Rate?', a: 'Effective Tax Rate = (Total Tax Paid / Gross Income) × 100. It differs from the marginal tax rate (the slab rate at which your last rupee is taxed). For example, someone in the 30% slab may have an effective rate of only 15-18% due to lower slabs applying to earlier portions of income.' },
  ];
  document.getElementById('accordions').innerHTML = items.map((item, i) => `
    <div class="accordion">
      <div class="accordion-header" onclick="toggleAcc(${i})">
        <span>${item.q}</span>
        <span class="chevron" id="chev${i}">▼</span>
      </div>
      <div class="accordion-body" id="acc${i}">${item.a}</div>
    </div>
  `).join('');
}

function toggleAcc(i) {
  const body = document.getElementById('acc' + i);
  const chev = document.getElementById('chev' + i);
  const open = body.classList.toggle('open');
  chev.classList.toggle('open', open);
}

/* ===================== CHARTS ===================== */
function getColors() {
  return dark
    ? { grid: 'rgba(255,255,255,0.08)', text: '#94a3b8', bg: '#1e293b' }
    : { grid: 'rgba(0,0,0,0.06)', text: '#718096', bg: '#ffffff' };
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function renderAllCharts() {
  renderPieChart();
  renderBarChart();
  renderSavingsChart();
  renderScenarioChart();
  renderCashFlowChart(DATA.totalTax, 0);
}

function rebuildCharts() {
  Object.keys(charts).forEach(k => { if (charts[k]) charts[k].destroy(); });
  charts = {};
  renderAllCharts();
}

function renderPieChart() {
  destroyChart('pie');
  const d = DATA;
  const remaining = d.G - d.totalTax;
  const ctx = document.getElementById('pieChart').getContext('2d');
  charts.pie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Take-Home', 'Income Tax', 'Cess'],
      datasets: [{
        data: [remaining, d.tax, d.cess],
        backgroundColor: ['#4f46e5', '#dc2626', '#f59e0b'],
        borderColor: dark ? '#1e293b' : '#fff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: getColors().text, font: { size: 11 } } } }
    }
  });
}

function renderBarChart() {
  destroyChart('bar');
  const labels = ['0–4L', '4–8L', '8–12L', '12–16L', '16–20L', '20–24L', '24L+'];
  const rates = [0, 5, 10, 15, 20, 25, 30];
  const slabs = calcSlabBreakdown(DATA.taxableIncome);
  const taxAmts = [0, 0, 0, 0, 0, 0, 0];
  slabs.forEach(s => {
    const idx = SLABS.findIndex(sl => sl.min === s.min);
    if (idx >= 0) taxAmts[idx] = s.tax;
  });
  const ctx = document.getElementById('barChart').getContext('2d');
  const c = getColors();
  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Tax Paid (₹)', data: taxAmts, backgroundColor: 'rgba(79,70,229,0.8)', borderRadius: 6, yAxisID: 'y' },
        { label: 'Rate (%)', data: rates, type: 'line', borderColor: '#dc2626', pointBackgroundColor: '#dc2626', tension: 0.4, yAxisID: 'y1', pointRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { color: c.text, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
        y1: { position: 'right', ticks: { color: c.text, callback: v => v + '%' }, grid: { display: false } },
        x: { ticks: { color: c.text }, grid: { display: false } }
      },
      plugins: { legend: { labels: { color: c.text } } }
    }
  });
}

function renderSavingsChart() {
  destroyChart('savings');
  const g = DATA.G;
  const recs = RECS.map(r => ({ title: r.icon + ' ' + r.title.split('(')[0].trim(), saving: r.calc(g) }))
                   .filter(r => r.saving > 0).sort((a, b) => b.saving - a.saving).slice(0, 6);
  const ctx = document.getElementById('savingsChart').getContext('2d');
  const c = getColors();
  charts.savings = new Chart(ctx, {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: recs.map(r => r.title),
      datasets: [{
        label: 'Potential Tax Saving (₹)',
        data: recs.map(r => r.saving),
        backgroundColor: ['#4f46e5', '#7c3aed', '#059669', '#2563eb', '#d97706', '#dc2626'].map(c => c + 'cc'),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: c.text, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { size: 11 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderScenarioChart() {
  destroyChart('scenario');
  if (!DATA._scenarios) return;
  const sc = DATA._scenarios;
  const ctx = document.getElementById('scenarioChart').getContext('2d');
  const c = getColors();
  charts.scenario = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Current', 'Optimized', 'Max Efficient'],
      datasets: [
        { label: 'Tax Payable', data: sc.map(s => s.taxPayable), backgroundColor: 'rgba(220,38,38,0.75)', borderRadius: 6 },
        { label: 'Net Take-Home', data: sc.map(s => s.netTakeHome), backgroundColor: 'rgba(79,70,229,0.75)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { color: c.text, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
        x: { ticks: { color: c.text }, grid: { display: false } }
      },
      plugins: { legend: { labels: { color: c.text } } }
    }
  });
}

function renderCashFlowChart(newTax, saved) {
  destroyChart('cashFlow');
  const g = DATA.G;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyNet = (g - newTax) / 12;
  const monthlyTax = newTax / 12;
  const ctx = document.getElementById('cashFlowChart').getContext('2d');
  const c = getColors();
  charts.cashFlow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Monthly Take-Home', data: Array(12).fill(Math.round(monthlyNet)), backgroundColor: 'rgba(5,150,105,0.7)', borderRadius: 4 },
        { label: 'Monthly Tax', data: Array(12).fill(Math.round(monthlyTax)), backgroundColor: 'rgba(220,38,38,0.6)', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { stacked: true, ticks: { color: c.text, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: c.grid } },
        x: { stacked: true, ticks: { color: c.text }, grid: { display: false } }
      },
      plugins: { legend: { labels: { color: c.text } } }
    }
  });
}

// Expose globals for inline onclick / oninput
window.fmt = fmt;
window.analyze = analyze;
window.loadDemo = loadDemo;
window.switchTab = switchTab;
window.onInputChange = onInputChange;
window.resetSim = resetSim;
window.toggleAcc = toggleAcc;
window.updateSim = updateSim;
