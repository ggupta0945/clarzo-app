// Discovery data — sectors and companies. Lifted from the marketing-site
// Stock Discovery page so the same content shows up here. We keep this as a
// static module so the page is fast and works without any backend.
//
// Educational only — no investment advice. Numbers are illustrative; refresh
// before launch if any of them get stale.

export type Company = {
  name: string
  full: string
  bse: string
  price: string
  change: string
  up: boolean
  mcap: string
  pe: string
  roe: string
  div: string
  rev: string
  about: string
  facts: Record<string, string>
  pros: string[]
  cons: string[]
  gptSugs: string[]
}

export type Sector = {
  id: string
  name: string
  emoji: string
  desc: string
  views: string
  trending: boolean
  companies: number
  updated: string
  overview: string
  pros: string[]
  cons: string[]
  cos: Company[]
}

export const sectors: Sector[] = [
  {
    id: 'it',
    name: 'Information Technology',
    emoji: '💻',
    desc: 'Companies providing IT services, software products, cloud computing, and digital transformation solutions.',
    views: '4.2k',
    trending: true,
    companies: 12,
    updated: 'Apr 10, 2026',
    overview:
      "India's IT sector remains a global powerhouse, contributing ~8% to GDP. Strong dollar earnings, digital adoption tailwinds, and AI integration are key growth drivers.",
    pros: [
      'Strong USD revenue hedge against rupee depreciation',
      'High margins with asset-light business models',
      'Growing demand for AI/ML and cloud services',
      'Consistent dividend payers',
    ],
    cons: [
      'Slowing growth in traditional services',
      'Visa policy risks in US/Europe',
      'High attrition rates increasing costs',
      'Valuation premiums make entry timing important',
    ],
    cos: [
      {
        name: 'TCS',
        full: 'Tata Consultancy Services',
        bse: 'BSE:532540',
        price: '₹4,180',
        change: '+1.8%',
        up: true,
        mcap: '₹15.2L Cr',
        pe: '32.4',
        roe: '48.2%',
        div: '1.2%',
        rev: '₹2.41L Cr',
        about:
          "India's largest IT services company. Part of the Tata Group. Serves clients across banking, retail, manufacturing, and telecom globally.",
        facts: { Founded: '1968', Employees: '614,000+', HQ: 'Mumbai', Sector: 'IT Services' },
        pros: [
          'Market leader with diversified client base',
          'Strong order book and deal pipeline',
          'Consistent dividend payouts',
          'Low debt, high cash generation',
        ],
        cons: [
          'Premium valuation limits upside',
          'Slower growth vs mid-cap IT peers',
          'Dependence on BFSI sector',
          'Attrition pressure on margins',
        ],
        gptSugs: [
          'What was TCS revenue growth last quarter?',
          'How does TCS compare to Infosys?',
          'What are the risks of investing in TCS?',
          'What is TCS dividend history?',
        ],
      },
      {
        name: 'Infosys',
        full: 'Infosys Limited',
        bse: 'BSE:500209',
        price: '₹1,890',
        change: '+2.1%',
        up: true,
        mcap: '₹7.8L Cr',
        pe: '28.6',
        roe: '32.1%',
        div: '2.3%',
        rev: '₹1.62L Cr',
        about:
          'Second largest Indian IT company. Known for strong corporate governance and digital transformation capabilities.',
        facts: { Founded: '1981', Employees: '317,000+', HQ: 'Bengaluru', Sector: 'IT Services' },
        pros: [
          'Strong digital revenue growth',
          'Excellent corporate governance track record',
          'Higher dividend yield than peers',
          'AI and automation investments paying off',
        ],
        cons: [
          'Management transitions can create uncertainty',
          'Lower margins than TCS',
          'Client concentration risks',
          'Growth guidance often conservative',
        ],
        gptSugs: [
          'What is Infosys guidance for FY27?',
          'How is Infosys positioned in AI?',
          'Infosys vs TCS — which is better?',
          'What are Infosys quarterly results?',
        ],
      },
      {
        name: 'Wipro',
        full: 'Wipro Limited',
        bse: 'BSE:507685',
        price: '₹580',
        change: '-0.4%',
        up: false,
        mcap: '₹3.0L Cr',
        pe: '24.1',
        roe: '15.8%',
        div: '1.5%',
        rev: '₹90,500 Cr',
        about:
          'Third largest Indian IT company. Diversified across IT services, consulting, and business process services.',
        facts: { Founded: '1945', Employees: '234,000+', HQ: 'Bengaluru', Sector: 'IT Services' },
        pros: [
          'Attractive valuation vs peers',
          'Turnaround under new leadership',
          'Strong consulting capabilities',
          'Growing in cloud and cybersecurity',
        ],
        cons: [
          'Slower organic growth than peers',
          'Multiple restructurings create uncertainty',
          'Lower margins than TCS/Infosys',
          'Market share loss in key verticals',
        ],
        gptSugs: [
          'Is Wipro a turnaround story?',
          'Wipro margins vs industry average?',
          "What is Wipro's cloud strategy?",
          'Latest Wipro quarterly results?',
        ],
      },
    ],
  },
  {
    id: 'banking',
    name: 'Banking & Financial Services',
    emoji: '🏦',
    desc: 'Banks, NBFCs, and financial institutions offering lending, deposits, insurance, and wealth management services.',
    views: '5.1k',
    trending: true,
    companies: 15,
    updated: 'Apr 12, 2026',
    overview:
      'Indian banking is in a golden period — clean balance sheets, strong credit growth (15%+ YoY), and digital adoption. Private banks lead in technology while PSU banks show improving asset quality.',
    pros: [
      'Strong credit growth driven by consumption and infrastructure',
      'Improving asset quality across the sector',
      'Digital banking adoption accelerating',
      'Net interest margins remain healthy',
    ],
    cons: [
      'Rising interest rates may slow loan growth',
      'Unsecured lending risks building up',
      'Regulatory tightening on NBFCs',
      'Global recession could impact corporate lending',
    ],
    cos: [
      {
        name: 'HDFC Bank',
        full: 'HDFC Bank Limited',
        bse: 'BSE:500180',
        price: '₹1,720',
        change: '+0.9%',
        up: true,
        mcap: '₹13.1L Cr',
        pe: '20.2',
        roe: '16.8%',
        div: '1.1%',
        rev: '₹2.85L Cr',
        about:
          "India's largest private sector bank by market cap. Known for consistent growth, strong asset quality, and technology-driven banking.",
        facts: { Founded: '1994', Employees: '213,000+', HQ: 'Mumbai', Sector: 'Private Banking' },
        pros: [
          'Best-in-class asset quality (low NPAs)',
          'Consistent 18-20% profit growth track record',
          'Largest branch network among private banks',
          'Strong deposit franchise and CASA ratio',
        ],
        cons: [
          'Post-merger integration with HDFC Ltd ongoing',
          'Premium valuation leaves less room for error',
          'Slowing growth in unsecured retail lending',
          'Increasing competition from fintechs',
        ],
        gptSugs: [
          'How is HDFC Bank post-merger integration going?',
          'HDFC Bank vs ICICI Bank comparison?',
          'What are HDFC Bank NPA trends?',
          'HDFC Bank dividend yield history?',
        ],
      },
      {
        name: 'ICICI Bank',
        full: 'ICICI Bank Limited',
        bse: 'BSE:532174',
        price: '₹1,280',
        change: '+1.5%',
        up: true,
        mcap: '₹9.0L Cr',
        pe: '18.5',
        roe: '18.2%',
        div: '0.8%',
        rev: '₹2.10L Cr',
        about:
          "India's second largest private bank. Has undergone a remarkable turnaround under current management with focus on retail banking and digital.",
        facts: { Founded: '1994', Employees: '145,000+', HQ: 'Mumbai', Sector: 'Private Banking' },
        pros: [
          'Strongest ROE improvement in the sector',
          'Aggressive digital banking initiatives',
          'Well-diversified loan book',
          'Clean-up of legacy stressed assets complete',
        ],
        cons: [
          'Retail loan growth may slow with rate hikes',
          'Insurance subsidiary performance variable',
          'Exposure to stressed sectors historically',
          'Valuation catching up to peers',
        ],
        gptSugs: [
          'ICICI Bank ROE trend last 5 years?',
          "How is ICICI Bank's digital strategy?",
          'ICICI Bank asset quality update?',
          'Is ICICI Bank overvalued?',
        ],
      },
      {
        name: 'SBI',
        full: 'State Bank of India',
        bse: 'BSE:500112',
        price: '₹820',
        change: '+0.6%',
        up: true,
        mcap: '₹7.3L Cr',
        pe: '10.8',
        roe: '20.1%',
        div: '1.8%',
        rev: '₹3.50L Cr',
        about:
          "India's largest bank by total assets. Government-owned PSU bank with the most extensive branch network in the country.",
        facts: { Founded: '1955', Employees: '230,000+', HQ: 'Mumbai', Sector: 'Public Banking' },
        pros: [
          'Cheapest valuation among large banks',
          'Highest ROE among PSU banks',
          'Massive branch and digital reach',
          'Subsidiary value (SBI Life, SBI Cards) unlocking',
        ],
        cons: [
          'Government ownership limits agility',
          'Historically prone to PSU lending mandates',
          'Lower margins than private peers',
          'NPAs higher than private banks',
        ],
        gptSugs: [
          'SBI vs HDFC Bank — which is cheaper?',
          'SBI subsidiary valuations?',
          'SBI NPA trend last 3 years?',
          'Is SBI a good dividend stock?',
        ],
      },
    ],
  },
  {
    id: 'pharma',
    name: 'Pharmaceuticals & Healthcare',
    emoji: '💊',
    desc: 'Pharmaceutical companies, hospitals, diagnostics, and healthcare technology providers serving domestic and global markets.',
    views: '2.8k',
    trending: false,
    companies: 10,
    updated: 'Apr 8, 2026',
    overview:
      'India is the pharmacy of the world — supplying 20% of global generic medicines. Domestic healthcare spend is growing at 15%+ as insurance penetration rises.',
    pros: [
      'India supplies 20% of global generics — structural advantage',
      'Domestic healthcare demand rising with insurance penetration',
      'R&D pipeline in biosimilars and specialty drugs',
      'Defensive sector — performs well in market downturns',
    ],
    cons: [
      'USFDA regulatory risks and warning letters',
      'Price controls on essential medicines limit pricing power',
      'R&D investment heavy with uncertain outcomes',
      'Currency fluctuation impacts export revenues',
    ],
    cos: [
      {
        name: 'Sun Pharma',
        full: 'Sun Pharmaceutical Industries',
        bse: 'BSE:524715',
        price: '₹1,680',
        change: '+1.2%',
        up: true,
        mcap: '₹4.0L Cr',
        pe: '35.2',
        roe: '14.5%',
        div: '0.8%',
        rev: '₹48,500 Cr',
        about:
          "India's largest pharmaceutical company and the world's fourth largest specialty generics company. Strong presence in US, India, and emerging markets.",
        facts: { Founded: '1983', Employees: '41,000+', HQ: 'Mumbai', Sector: 'Pharmaceuticals' },
        pros: [
          'Market leader in Indian pharma',
          'Specialty portfolio (Ilumya, Cequa) gaining traction',
          'Strong cash flows and low debt',
          'Diversified across geographies',
        ],
        cons: [
          'US generic pricing pressure ongoing',
          'USFDA compliance remains a risk',
          'Promoter governance concerns historically',
          'High PE relative to growth rate',
        ],
        gptSugs: [
          'Sun Pharma specialty revenue growth?',
          'USFDA inspection status for Sun Pharma?',
          "Sun Pharma vs Dr Reddy's comparison?",
          "What is Sun Pharma's US pipeline?",
        ],
      },
    ],
  },
  {
    id: 'ev',
    name: 'Electric Vehicles & Clean Energy',
    emoji: '⚡',
    desc: 'Companies manufacturing EVs, EV components, batteries, solar, wind, and clean energy infrastructure.',
    views: '3.5k',
    trending: true,
    companies: 8,
    updated: 'Apr 11, 2026',
    overview:
      "India's EV market is growing at 40%+ CAGR. Government subsidies (FAME III), falling battery costs, and rising fuel prices are accelerating adoption.",
    pros: [
      '40%+ CAGR in EV adoption in India',
      'Government subsidies and policy tailwinds (FAME III)',
      'Falling battery costs improving unit economics',
      'First-mover advantage in two-wheeler EVs',
    ],
    cons: [
      'Most companies are still pre-profit or early-stage',
      'Charging infrastructure still underdeveloped',
      'Technology risk — battery tech evolving rapidly',
      'High competition from established automakers entering EVs',
    ],
    cos: [],
  },
  {
    id: 'fmcg',
    name: 'FMCG & Consumer Goods',
    emoji: '🛒',
    desc: 'Companies producing everyday consumer products — food, beverages, personal care, household goods.',
    views: '2.1k',
    trending: false,
    companies: 10,
    updated: 'Apr 5, 2026',
    overview:
      "India's FMCG sector is the 4th largest globally. Rural recovery, premiumization, and D2C brands are key themes driving the next phase of growth.",
    pros: [
      'Recession-resistant — essential goods demand is stable',
      'Premiumization trend boosting margins',
      'Rural India recovery driving volume growth',
      'Strong brand moats and pricing power',
    ],
    cons: [
      'Input cost inflation (palm oil, crude) squeezing margins',
      'Intense competition from D2C brands',
      'Slow urban growth in mature categories',
      'High valuations across the sector',
    ],
    cos: [],
  },
  {
    id: 'realestate',
    name: 'Real Estate & Infrastructure',
    emoji: '🏗️',
    desc: "Real estate developers, construction companies, and infrastructure builders creating India's urban landscape.",
    views: '1.8k',
    trending: false,
    companies: 8,
    updated: 'Apr 7, 2026',
    overview:
      "India's real estate is in a cyclical upturn — best affordability in a decade, low inventory, and government infrastructure push (highways, metros, smart cities).",
    pros: [
      'Best housing affordability in a decade',
      'Government infrastructure spending at all-time high',
      'Low unsold inventory in key cities',
      'Commercial real estate demand strong from GCCs',
    ],
    cons: [
      'Interest rate sensitive — rate hikes hurt demand',
      'Long project cycles and execution risks',
      'Regulatory and approval delays common',
      'High leverage in some developers',
    ],
    cos: [],
  },
]

// Mock CompanyGPT replies. Same set as the marketing site so the demo flow
// stays familiar — anything outside the keyed entries falls back to a
// generic templated answer in the page.
export const gptResponses: Record<string, string> = {
  'What was TCS revenue growth last quarter?':
    'TCS reported Q3 FY26 revenue of ₹64,259 Cr, growing 5.2% YoY in constant currency terms. The growth was led by BFSI (+7.1%) and Life Sciences (+8.3%) verticals. Management maintained FY26 guidance of 6-8% CC growth.\n\n📄 Source: TCS Q3 FY26 Earnings Report, Jan 2026',
  'How does TCS compare to Infosys?':
    'TCS vs Infosys — key differences:\n\n• Revenue: TCS (₹2.41L Cr) is ~49% larger than Infosys (₹1.62L Cr)\n• Margins: TCS has higher EBIT margins (~26%) vs Infosys (~21%)\n• Growth: Infosys digital revenue growing faster at 32% vs TCS 28%\n• Valuation: TCS trades at 32x PE vs Infosys at 28x — making Infosys relatively cheaper\n• Dividend: Infosys yields 2.3% vs TCS 1.2%\n\nBoth are strong — TCS for stability, Infosys for growth-at-value.\n\n📄 Source: FY26 Annual Reports, Screener.in',
  'What are the risks of investing in TCS?':
    "Key risks for TCS investors:\n\n1. Premium valuation (32x PE) — limited margin of safety if growth disappoints\n2. BFSI sector dependence (~33% of revenue) — banking slowdown in US/Europe could hurt\n3. Attrition at 12.5% — while improving, talent costs remain elevated\n4. Currency hedging — strong rupee would reduce reported earnings\n5. Generative AI disruption — could reduce demand for traditional IT services\n\nHowever, TCS's diversified client base (1,200+ clients) and strong deal pipeline provide resilience.\n\n📄 Source: TCS FY26 Annual Report, Investor Presentation",
  'What is TCS dividend history?':
    'TCS dividend track record (last 5 years):\n\n• FY26: ₹115/share (including ₹73 special dividend)\n• FY25: ₹91/share\n• FY24: ₹75/share\n• FY23: ₹115/share (including special)\n• FY22: ₹43/share\n\nTCS has a consistent dividend policy with ~50-80% payout ratio. Additionally, TCS has conducted multiple buybacks totaling ₹72,000 Cr since 2017.\n\n📄 Source: TCS Annual Reports, BSE Filings',
}
