import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const STARTING_METRICS = {
  revenue: 100,
  profit: 5,
  debt: 60,
  cash: 8,
  shareholder: 50,
  roiBias: 0,
  liquidityBias: 0,
  debtBias: 0,
}

const CAPITAL_OPTIONS = [
  {
    id: 'bank',
    eyebrow: 'Debt capital',
    title: 'Borrow from a bank',
    summary: 'Secure ₹20 cr now. The expansion is funded, but leverage climbs with it.',
    tag: 'Fastest route',
    icon: '↗',
    impact: { cash: 20, debt: 20, profit: -1, shareholder: -2, roiBias: -2, debtBias: -9, liquidityBias: 5 },
    feedback: 'You bought runway with borrowed money. Liquidity is safer today, but the interest bill will keep showing up every quarter.',
  },
  {
    id: 'shares',
    eyebrow: 'Equity capital',
    title: 'Issue new shares',
    summary: 'Raise ₹20 cr without new debt. Existing shareholders accept some dilution.',
    tag: 'Balanced play',
    icon: '◈',
    impact: { cash: 20, debt: 0, profit: 0, shareholder: 4, roiBias: 2, debtBias: 6, liquidityBias: 5 },
    feedback: 'You traded a slice of ownership for a cleaner balance sheet. This is a patient move: less leverage, more room to execute.',
  },
  {
    id: 'retained',
    eyebrow: 'Internal funds',
    title: 'Use retained earnings',
    summary: 'Keep control and avoid new claims, but take ₹5 cr straight out of cash.',
    tag: 'High conviction',
    icon: '◒',
    impact: { cash: -5, debt: 0, profit: 0, shareholder: 2, roiBias: 4, debtBias: 3, liquidityBias: -5 },
    feedback: 'You protected ownership and avoided fresh obligations. The cost is immediate: your margin for error just got thinner.',
  },
]

const WORKING_CAPITAL_OPTIONS = [
  {
    id: 'inventory',
    eyebrow: 'Release cash',
    title: 'Reduce inventory',
    summary: 'Free ₹8 cr tied up in stock, accepting a small risk of stock-outs.',
    tag: 'Cash-first',
    icon: '▥',
    impact: { cash: 8, debt: 0, profit: -0.4, shareholder: 1, roiBias: 2, debtBias: 1, liquidityBias: 9 },
    feedback: 'You turned idle stock into cash. The warehouse is leaner now, but the operations team will need tighter forecasting to avoid missed orders.',
  },
  {
    id: 'suppliers',
    eyebrow: 'Extend payables',
    title: 'Negotiate supplier terms',
    summary: 'Keep ₹6 cr in the business longer by paying suppliers on a later cycle.',
    tag: 'Quiet lever',
    icon: '⇥',
    impact: { cash: 6, debt: 0, profit: 0.1, shareholder: 2, roiBias: 3, debtBias: 1, liquidityBias: 7 },
    feedback: 'A disciplined negotiation bought breathing room without raising finance. Watch supplier trust: a cash win can become an operating loss if overplayed.',
  },
  {
    id: 'customers',
    eyebrow: 'Collect faster',
    title: 'Shorten customer credit',
    summary: 'Pull ₹5 cr forward by asking customers to pay sooner.',
    tag: 'Commercial trade-off',
    icon: '◌',
    impact: { cash: 5, debt: 0, profit: -0.2, shareholder: 1, roiBias: 2, debtBias: 0, liquidityBias: 6 },
    feedback: 'You improved collections without borrowing. Some customers may push back, so the sales team must protect the relationships behind the numbers.',
  },
  {
    id: 'shortTerm',
    eyebrow: 'Bridge finance',
    title: 'Arrange short-term financing',
    summary: 'Add ₹10 cr of quick liquidity, with a higher rate and a shorter fuse.',
    tag: 'Emergency lever',
    icon: '⚡',
    impact: { cash: 10, debt: 10, profit: -0.8, shareholder: -1, roiBias: -2, debtBias: -7, liquidityBias: 8 },
    feedback: 'You solved the cash squeeze, but the clock is now louder. Short-term debt is useful as a bridge—not as a business model.',
  },
]

const PROJECTS = [
  {
    id: 'precision',
    name: 'Project Precision',
    descriptor: 'Automation + margin control',
    cost: 18,
    cashFlow: 7,
    years: 4,
    discount: 0.1,
    risk: 'Low',
    returnRate: '14.8%',
    color: 'lime',
    bullets: ['Predictable B2B demand', 'Lower execution risk', 'Starts paying back in year 2'],
    feedback: 'Precision is the steadier operator. It compounds quietly: less upside than a moonshot, but more resilience if the market turns.',
  },
  {
    id: 'frontier',
    name: 'Project Frontier',
    descriptor: 'New market entry',
    cost: 26,
    cashFlow: 11,
    years: 4,
    discount: 0.16,
    risk: 'High',
    returnRate: '19.4%',
    color: 'orange',
    bullets: ['Large addressable market', 'Brand-building upside', 'Demand and launch risk'],
    feedback: 'Frontier offers the bigger narrative and the bigger wobble. If demand arrives, shareholder value jumps; if not, cash gets trapped in the launch.',
  },
]

const number = (value, digits = 1) => `₹${value.toFixed(digits)} cr`
const signed = (value, digits = 1) => `${value >= 0 ? '+' : '−'}₹${Math.abs(value).toFixed(digits)} cr`
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const npv = (project) => project.cashFlow * ((1 - Math.pow(1 + project.discount, -project.years)) / project.discount) - project.cost
const formatNpv = (value) => `₹${value.toFixed(1)} cr`

function createInitialState() {
  return {
    round: 0,
    metrics: { ...STARTING_METRICS },
    decisions: { capital: null, workingCapital: null, project: null },
    feedback: null,
  }
}

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>
}

function MetricCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  )
}

function MiniTrajectory({ metrics }) {
  const points = [8, 10, Math.max(4, metrics.cash), Math.max(5, metrics.cash + 3)]
  const max = Math.max(...points, 12)
  const coords = points.map((point, index) => `${index * 48 + 4},${50 - (point / max) * 38}`).join(' ')
  return (
    <svg className="trajectory" viewBox="0 0 148 56" role="img" aria-label="Cash trajectory">
      <defs>
        <linearGradient id="cashGradient" x1="0" x2="1">
          <stop offset="0" stopColor="#dcff42" />
          <stop offset="1" stopColor="#7bd5b4" />
        </linearGradient>
      </defs>
      <path d="M4 50 H144" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <polyline points={coords} fill="none" stroke="url(#cashGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => {
        const cy = 50 - (point / max) * 38
        return <circle key={index} cx={index * 48 + 4} cy={cy} r="3.5" fill="#0d1415" stroke="#dcff42" strokeWidth="2" />
      })}
    </svg>
  )
}

function Intro({ onStart }) {
  return (
    <main className="intro-shell">
      <nav className="topbar">
        <div className="wordmark"><span className="wordmark-mark">K</span><span>THE CFO GAME</span></div>
        <div className="topbar-meta"><span className="status-dot" /> Simulation / 01</div>
      </nav>
      <section className="intro-hero">
        <div className="intro-copy">
          <div className="kicker"><span className="kicker-line" /> Financial management, made consequential</div>
          <h1>Run the company.<br /><em>Feel the balance sheet.</em></h1>
          <p className="intro-lede">You are stepping into the CFO seat of a ₹100 crore business. Every decision has a second-order effect. Keep the company liquid, fund the next move, and do not blink at the debt line.</p>
          <button className="primary-cta" onClick={onStart}><span>Take the seat</span><span className="cta-arrow">↗</span></button>
          <div className="intro-footnote"><span>12–15 MIN SIMULATION</span><span>•</span><span>NO FINANCE DEGREE REQUIRED</span></div>
        </div>
        <div className="briefing-card">
          <div className="briefing-top"><span>BOARD PACKET / 01</span><span className="packet-mark">+</span></div>
          <div className="briefing-title">Your inherited<br /><strong>company</strong></div>
          <div className="position-block">
            <div className="position-row"><span>Revenue</span><strong>₹100 cr</strong></div>
            <div className="position-row"><span>Net profit</span><strong>₹5 cr</strong></div>
            <div className="position-row"><span>Debt</span><strong className="orange-text">₹60 cr</strong></div>
            <div className="position-row"><span>Cash balance</span><strong>₹8 cr</strong></div>
          </div>
          <div className="briefing-callout"><span className="callout-icon">!</span><span>Expansion is approved. Cash flow is not.</span></div>
          <div className="briefing-stamp">CONFIDENTIAL<br />CFO OFFICE</div>
        </div>
      </section>
      <section className="intro-bottom">
        <div className="intro-bottom-label">THE MANDATE</div>
        <div className="mandate-copy">Grow without breaking the company that gets you there.</div>
        <div className="intro-stat"><strong>04</strong><span>decisions<br />to make</span></div>
        <div className="intro-stat"><strong>05</strong><span>metrics<br />to protect</span></div>
      </section>
    </main>
  )
}

function ProgressRail({ round }) {
  const steps = [
    ['01', 'Raise capital'],
    ['02', 'Working capital'],
    ['03', 'Invest'],
    ['04', 'Results'],
  ]
  return (
    <aside className="progress-rail">
      <div className="rail-caption">YOUR MANDATE</div>
      <div className="rail-title">Protect the<br /><em>downside.</em></div>
      <div className="rail-steps">
        {steps.map(([num, title], index) => (
          <div className={`rail-step ${round === index + 1 ? 'active' : ''} ${round > index + 1 ? 'done' : ''}`} key={num}>
            <div className="rail-step-number">{round > index + 1 ? '✓' : num}</div>
            <div className="rail-step-copy"><span>ROUND {num}</span><strong>{title}</strong></div>
          </div>
        ))}
      </div>
      <div className="rail-bottom"><div className="rail-bottom-label">COMPANY HEALTH</div><div className="health-chip"><span className="pulse-dot" /> {round === 4 ? 'Board review' : round === 0 ? 'Awaiting CFO' : 'Under pressure'}</div></div>
    </aside>
  )
}

function Snapshot({ metrics, round, latestFeedback }) {
  const health = metrics.cash < 4 ? 'Fragile' : metrics.debt > 75 ? 'Levered' : metrics.cash > 16 ? 'Resilient' : 'Tight but live'
  const healthTone = health === 'Resilient' ? 'good' : health === 'Fragile' ? 'bad' : 'warn'
  return (
    <aside className="snapshot-column">
      <div className="snapshot-heading"><span>LIVE SNAPSHOT</span><span className="tiny-status">● LIVE</span></div>
      <div className="snapshot-card">
        <div className="snapshot-card-top"><span>Company position</span><span className={`health-pill ${healthTone}`}>{health}</span></div>
        <div className="snapshot-metrics">
          <div><span>Cash balance</span><strong>{number(metrics.cash)}</strong></div>
          <div><span>Net debt</span><strong>{number(metrics.debt)}</strong></div>
          <div><span>Net profit</span><strong>{number(metrics.profit)}</strong></div>
        </div>
        <div className="snapshot-chart-label"><span>Cash trajectory</span><span>₹ cr</span></div>
        <MiniTrajectory metrics={metrics} />
        <div className="chart-axis"><span>Start</span><span>Now</span><span>Next</span></div>
      </div>
      <div className="signal-card">
        <div className="signal-label">DECISION SIGNAL</div>
        <div className="signal-title">{round === 1 ? 'You choose the fuel.' : round === 2 ? 'Cash is a strategy.' : round === 3 ? 'Returns have a price.' : round === 4 ? 'The board is listening.' : 'The chair is waiting.'}</div>
        <p>{latestFeedback || 'Your first decision sets the tone for the rest of the simulation.'}</p>
      </div>
      {round > 0 && round < 4 && <div className="snapshot-note"><span>↯</span><span>A good CFO does not optimize one number. They protect the system.</span></div>}
    </aside>
  )
}

function OptionCard({ option, selected, onSelect }) {
  return (
    <button className={`option-card ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <div className="option-card-top"><Icon>{option.icon}</Icon><span className="option-tag">{option.tag}</span></div>
      <div className="option-eyebrow">{option.eyebrow}</div>
      <h3>{option.title}</h3>
      <p>{option.summary}</p>
      <div className="option-select"><span>{selected ? 'Selected' : 'Select this move'}</span><span>{selected ? '✓' : '↗'}</span></div>
    </button>
  )
}

function RoundHeader({ eyebrow, title, description, round }) {
  return (
    <div className="round-header">
      <div className="round-header-meta"><span className="round-number">0{round}</span><span className="round-slash">/ 04</span><span className="round-label">{eyebrow}</span></div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}

function DecisionFooter({ selected, onCommit, actionLabel }) {
  return (
    <div className="decision-footer">
      <div className="decision-footer-hint"><span className="hint-mark">i</span><span>There is no perfect answer. There is only the cost you are willing to carry.</span></div>
      <button className="lock-button" disabled={!selected} onClick={onCommit}><span>{actionLabel}</span><span>→</span></button>
    </div>
  )
}

function CapitalRound({ selected, onSelect, onCommit }) {
  return (
    <section className="game-panel">
      <RoundHeader round={1} eyebrow="Raise capital" title="How will you fund the next move?" description="The expansion needs ₹20 crore. Choose the source of capital—and the risk you want to put on the table." />
      <div className="decision-grid three-up">{CAPITAL_OPTIONS.map(option => <OptionCard key={option.id} option={option} selected={selected === option.id} onSelect={() => onSelect(option.id)} />)}</div>
      <DecisionFooter selected={selected} onCommit={onCommit} actionLabel="Lock capital decision" />
    </section>
  )
}

function WorkingCapitalRound({ selected, onSelect, onCommit }) {
  return (
    <section className="game-panel">
      <RoundHeader round={2} eyebrow="Manage working capital" title="Cash is trapped in the operating cycle." description="Sales are growing, but invoices arrive late and inventory is sitting idle. Choose the lever you trust most." />
      <div className="problem-strip"><div className="problem-icon">↯</div><div><strong>Cash-flow warning</strong><span>Current assets are growing faster than cash collections. A short-term fix now can prevent a long-term financing problem.</span></div><div className="problem-value">₹14 cr<span>cash gap</span></div></div>
      <div className="decision-grid four-up">{WORKING_CAPITAL_OPTIONS.map(option => <OptionCard key={option.id} option={option} selected={selected === option.id} onSelect={() => onSelect(option.id)} />)}</div>
      <DecisionFooter selected={selected} onCommit={onCommit} actionLabel="Lock working-capital move" />
    </section>
  )
}

function ProjectCard({ project, selected, onSelect }) {
  const projectNpv = npv(project)
  return (
    <button className={`project-card ${project.color} ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <div className="project-card-top"><div><span className="option-eyebrow">{project.descriptor}</span><h3>{project.name}</h3></div><span className="project-radio">{selected ? '✓' : ''}</span></div>
      <div className="project-numbers"><div><span>Initial cost</span><strong>{number(project.cost)}</strong></div><div><span>Annual cash flow</span><strong>{number(project.cashFlow)}</strong></div><div><span>NPV</span><strong className="npv-value">{formatNpv(projectNpv)}</strong></div></div>
      <div className="project-bar"><span style={{ width: `${clamp(projectNpv / 7 * 100, 35, 92)}%` }} /></div>
      <div className="project-detail-row"><span className="risk-pill">{project.risk} risk</span><span>{project.returnRate} expected return</span></div>
      <div className="project-bullets">{project.bullets.map(bullet => <span key={bullet}><i>+</i>{bullet}</span>)}</div>
    </button>
  )
}

function InvestmentRound({ selected, onSelect, onCommit }) {
  return (
    <section className="game-panel">
      <RoundHeader round={3} eyebrow="Investment decision" title="Which future earns its place?" description="The board will approve one project. Compare the cash flows, risk profile, and NPV before you put the company behind it." />
      <div className="npv-method"><span className="method-label">NPV METHOD</span><span>Present value of future cash flows − initial investment</span><span className="method-rate">Discount rates reflect risk</span></div>
      <div className="project-grid">{PROJECTS.map(project => <ProjectCard key={project.id} project={project} selected={selected === project.id} onSelect={() => onSelect(project.id)} />)}</div>
      <DecisionFooter selected={selected} onCommit={onCommit} actionLabel="Approve selected project" />
    </section>
  )
}

function ScoreBar({ label, value, note, tone }) {
  return <div className="score-row"><div className="score-row-top"><span>{label}</span><strong>{value}<small>/ 100</small></strong></div><div className="score-track"><span className={tone} style={{ width: `${value}%` }} /></div><p>{note}</p></div>
}

function Results({ state, onRestart }) {
  const project = PROJECTS.find(item => item.id === state.decisions.project) || PROJECTS[0]
  const m = state.metrics
  const scores = useMemo(() => {
    const profitability = clamp(Math.round(54 + m.profit * 4 + m.roiBias * 2 + npv(project) * 2.4), 18, 98)
    const liquidity = clamp(Math.round(34 + m.cash * 3.2 + m.liquidityBias - m.debt * 0.12), 12, 98)
    const debtScore = clamp(Math.round(88 - m.debt * 0.42 + m.debtBias), 12, 98)
    const roi = clamp(Math.round(46 + m.roiBias * 5 + npv(project) * 3 + m.profit * 2), 15, 98)
    const shareholder = clamp(Math.round(m.shareholder + m.roiBias * 3 + npv(project) * 2.7), 12, 98)
    return { profitability, liquidity, debtScore, roi, shareholder }
  }, [m, project])
  const overall = Math.round((scores.profitability + scores.liquidity + scores.debtScore + scores.roi + scores.shareholder) / 5)
  const verdict = overall >= 78 ? 'You kept the company in the game.' : overall >= 58 ? 'You bought time—and a next decision.' : 'The balance sheet is asking for a reset.'
  const narrative = overall >= 78
    ? 'You treated cash, leverage, and growth as one system. The company ends the simulation with enough resilience to keep investing without making the next quarter a gamble.'
    : overall >= 58
      ? 'Your choices created a workable path, but the company is not out of the woods. The next CFO meeting would focus on converting this breathing room into repeatable cash generation.'
      : 'Growth got ahead of financial control. The business can still recover, but the next move must be defensive: rebuild liquidity, slow the burn, and earn back stakeholder confidence.'
  const scoreTone = value => value >= 75 ? 'good' : value >= 55 ? 'warn' : 'bad'
  return (
    <section className="game-panel results-panel">
      <RoundHeader round={4} eyebrow="Board review" title={verdict} description="Here is what your decision trail did to the company. The score is not a grade—it is a map of the trade-offs you made." />
      <div className="results-hero"><div className="overall-score"><span>YOUR CFO SCORE</span><strong>{overall}</strong><em>/ 100</em><div className="score-ring" /></div><div className="results-summary"><div className="selected-project-label">SELECTED PROJECT <span>{project.name}</span></div><p>{narrative}</p><div className="results-tags"><span>{state.decisions.capital === 'shares' ? 'Low leverage' : state.decisions.capital === 'bank' ? 'Debt funded' : 'Self funded'}</span><span>{state.decisions.workingCapital === 'shortTerm' ? 'Short-term bridge' : 'Operating cash unlocked'}</span><span>{project.risk} risk / {formatNpv(npv(project))} NPV</span></div></div></div>
      <div className="score-grid">
        <ScoreBar label="Profitability" value={scores.profitability} tone={scoreTone(scores.profitability)} note={`${number(m.profit)} projected net profit after decisions`} />
        <ScoreBar label="Liquidity" value={scores.liquidity} tone={scoreTone(scores.liquidity)} note={`${number(m.cash)} cash left on the balance sheet`} />
        <ScoreBar label="Debt levels" value={scores.debtScore} tone={scoreTone(scores.debtScore)} note={`${number(m.debt)} total debt to manage`} />
        <ScoreBar label="Return on investment" value={scores.roi} tone={scoreTone(scores.roi)} note={`${formatNpv(npv(project))} NPV created by your project`} />
        <ScoreBar label="Shareholder value" value={scores.shareholder} tone={scoreTone(scores.shareholder)} note="Value reflects dilution, risk, and returns" />
      </div>
      <div className="postmortem"><div className="postmortem-label">CFO POSTMORTEM</div><div className="postmortem-copy"><strong>{scores.liquidity >= scores.debtScore ? 'Your best instinct was protecting cash.' : 'Your best instinct was keeping leverage visible.'}</strong><span>{project.feedback}</span></div></div>
      <div className="results-footer"><span>Ready to run the company again?</span><button className="secondary-cta" onClick={onRestart}>Play again <span>↻</span></button></div>
    </section>
  )
}

function Game({ onExit }) {
  const [state, setState] = useState({ ...createInitialState(), round: 1 })
  const [selected, setSelected] = useState(null)
  const activeRound = state.round
  const commit = () => {
    if (!selected) return
    const source = activeRound === 1 ? CAPITAL_OPTIONS : activeRound === 2 ? WORKING_CAPITAL_OPTIONS : PROJECTS
    const choice = source.find(item => item.id === selected)
    if (!choice) return
    if (activeRound === 3) {
      const project = choice
      setState(previous => ({ ...previous, round: 4, decisions: { ...previous.decisions, project: project.id }, metrics: { ...previous.metrics, cash: previous.metrics.cash - project.cost, profit: previous.metrics.profit + project.cashFlow * 0.35, roiBias: previous.metrics.roiBias + (project.id === 'frontier' ? 3 : 2), shareholder: previous.metrics.shareholder + (project.id === 'frontier' ? 3 : 2) }, feedback: project.feedback }))
    } else {
      const impact = choice.impact
      const decisionKey = activeRound === 1 ? 'capital' : 'workingCapital'
      setState(previous => ({ ...previous, round: activeRound + 1, decisions: { ...previous.decisions, [decisionKey]: choice.id }, metrics: { ...previous.metrics, cash: previous.metrics.cash + impact.cash, debt: previous.metrics.debt + impact.debt, profit: previous.metrics.profit + impact.profit, shareholder: previous.metrics.shareholder + impact.shareholder, roiBias: previous.metrics.roiBias + impact.roiBias, liquidityBias: previous.metrics.liquidityBias + impact.liquidityBias, debtBias: previous.metrics.debtBias + impact.debtBias }, feedback: choice.feedback }))
    }
    setSelected(null)
  }
  const restart = () => { setState({ ...createInitialState(), round: 1 }); setSelected(null) }
  return (
    <main className="game-shell">
      <nav className="topbar game-topbar"><button className="wordmark wordmark-button" onClick={onExit}><span className="wordmark-mark">K</span><span>THE CFO GAME</span></button><div className="topbar-center">BOARDROOM SIMULATION / FY26</div><button className="exit-button" onClick={onExit}>Exit game <span>×</span></button></nav>
      <div className="game-layout">
        <ProgressRail round={activeRound} />
        <div className="game-content">
          {activeRound === 1 && <CapitalRound selected={selected} onSelect={setSelected} onCommit={commit} />}
          {activeRound === 2 && <WorkingCapitalRound selected={selected} onSelect={setSelected} onCommit={commit} />}
          {activeRound === 3 && <InvestmentRound selected={selected} onSelect={setSelected} onCommit={commit} />}
          {activeRound === 4 && <Results state={state} onRestart={restart} />}
        </div>
        <Snapshot metrics={state.metrics} round={activeRound} latestFeedback={state.feedback} />
      </div>
    </main>
  )
}

function App() {
  const [started, setStarted] = useState(false)
  return started ? <Game onExit={() => setStarted(false)} /> : <Intro onStart={() => setStarted(true)} />
}

createRoot(document.getElementById('root')).render(<App />)
