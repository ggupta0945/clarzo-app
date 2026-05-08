/**
 * Enriches company_profile rows (created by seed-nifty1000.ts) with:
 * CEO, headquarters, employees, business_summary, thematic_tags,
 * listing_date, BSE code, founded_year — for Nifty 50 + user portfolio stocks.
 *
 * Run:  npx tsx scripts/seed-company-details.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

type Detail = {
  symbol: string
  company_name: string
  sector: string
  industry: string
  mcap_category: string
  nse_symbol: string
  bse_code: string
  isin: string
  founded_year: number
  headquarters: string
  ceo_name: string
  employees: number
  business_summary: string
  thematic_tags: string[]
  index_membership: string[]
  listing_date: string
}

const DETAILS: Detail[] = [
  // ── ENERGY ──────────────────────────────────────────────────────────────
  { symbol:'RELIANCE', company_name:'Reliance Industries', sector:'Energy', industry:'Refineries & Petrochemicals', mcap_category:'large',
    nse_symbol:'RELIANCE', bse_code:'500325', isin:'INE002A01018', founded_year:1966, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Mukesh Ambani', employees:236334,
    business_summary:"India's largest private-sector company operating across energy, petrochemicals, retail (Reliance Retail), and digital services (Jio Platforms).",
    thematic_tags:['conglomerate','energy','retail','telecom','5G','new-energy'],
    index_membership:['Nifty 50','Nifty 100','Sensex'], listing_date:'1977-11-15' },

  // ── IT ───────────────────────────────────────────────────────────────────
  { symbol:'TCS', company_name:'Tata Consultancy Services', sector:'IT', industry:'IT Services & Consulting', mcap_category:'large',
    nse_symbol:'TCS', bse_code:'532540', isin:'INE467B01029', founded_year:1968, headquarters:'Mumbai, Maharashtra',
    ceo_name:'K Krithivasan', employees:601546,
    business_summary:"India's largest IT services company providing IT, digital, and business solutions globally across banking, retail, manufacturing, and government sectors.",
    thematic_tags:['IT','outsourcing','cloud','AI','digital-transformation'],
    index_membership:['Nifty 50','Nifty 100','Sensex'], listing_date:'2004-08-25' },

  { symbol:'INFY', company_name:'Infosys', sector:'IT', industry:'IT Services & Consulting', mcap_category:'large',
    nse_symbol:'INFY', bse_code:'500209', isin:'INE009A01021', founded_year:1981, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Salil Parekh', employees:317240,
    business_summary:'Global technology services company offering IT consulting, software, BPO and engineering services. Strong presence in AI, cloud and digital transformation.',
    thematic_tags:['IT','cloud','AI','digital-transformation','ESG-leader'],
    index_membership:['Nifty 50','Nifty 100','Sensex'], listing_date:'1993-06-14' },

  { symbol:'HCLTECH', company_name:'HCL Technologies', sector:'IT', industry:'IT Services & Consulting', mcap_category:'large',
    nse_symbol:'HCLTECH', bse_code:'532281', isin:'INE860A01027', founded_year:1976, headquarters:'Noida, Uttar Pradesh',
    ceo_name:'C Vijayakumar', employees:225944,
    business_summary:'IT services and products company known for HCLSoftware and strong engineering services. Focus on cloud-native, cybersecurity and digital process operations.',
    thematic_tags:['IT','cloud','cybersecurity','engineering-services'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'1999-11-10' },

  { symbol:'WIPRO', company_name:'Wipro', sector:'IT', industry:'IT Services & Consulting', mcap_category:'large',
    nse_symbol:'WIPRO', bse_code:'507685', isin:'INE075A01022', founded_year:1945, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Srinivas Pallia', employees:221000,
    business_summary:'Global IT, consulting and business-process company. Strong in cloud infrastructure, data analytics and cybersecurity.',
    thematic_tags:['IT','cloud','cybersecurity','ESG-leader'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'1946-01-01' },

  { symbol:'TECHM', company_name:'Tech Mahindra', sector:'IT', industry:'IT Services & Consulting', mcap_category:'large',
    nse_symbol:'TECHM', bse_code:'532755', isin:'INE669C01036', founded_year:1986, headquarters:'Pune, Maharashtra',
    ceo_name:'Mohit Joshi', employees:145000,
    business_summary:'IT and BPO company with deep expertise in telecom, media and entertainment. Part of the Mahindra Group.',
    thematic_tags:['IT','telecom-tech','5G','AI'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2006-08-28' },

  { symbol:'PERSISTENT', company_name:'Persistent Systems', sector:'IT', industry:'IT Services', mcap_category:'large',
    nse_symbol:'PERSISTENT', bse_code:'533179', isin:'INE262H01021', founded_year:1990, headquarters:'Pune, Maharashtra',
    ceo_name:'Sandeep Kalra', employees:22000,
    business_summary:'Fast-growing IT services company strong in digital engineering, AI and BFSI verticals. Among the best-performing IT companies in revenue growth.',
    thematic_tags:['IT','digital-engineering','AI','BFSI-tech'],
    index_membership:['Nifty Midcap 50'], listing_date:'2010-03-06' },

  // ── BANKING & FINANCIALS ─────────────────────────────────────────────────
  { symbol:'HDFCBANK', company_name:'HDFC Bank', sector:'Financial Services', industry:'Banking', mcap_category:'large',
    nse_symbol:'HDFCBANK', bse_code:'500180', isin:'INE040A01034', founded_year:1994, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Sashidhar Jagdishan', employees:213527,
    business_summary:"India's largest private-sector bank by assets. Offers retail banking, wholesale banking and treasury operations. Merged with HDFC Ltd in 2023.",
    thematic_tags:['banking','retail-credit','mortgage','digital-banking'],
    index_membership:['Nifty 50','Nifty Bank','Sensex'], listing_date:'1995-05-20' },

  { symbol:'ICICIBANK', company_name:'ICICI Bank', sector:'Financial Services', industry:'Banking', mcap_category:'large',
    nse_symbol:'ICICIBANK', bse_code:'532174', isin:'INE090A01021', founded_year:1994, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Sandeep Bakhshi', employees:129876,
    business_summary:"India's second-largest private-sector bank with a full suite of financial products including retail, corporate and international banking.",
    thematic_tags:['banking','retail-credit','digital-banking','insurance'],
    index_membership:['Nifty 50','Nifty Bank','Sensex'], listing_date:'1997-09-17' },

  { symbol:'KOTAKBANK', company_name:'Kotak Mahindra Bank', sector:'Financial Services', industry:'Banking', mcap_category:'large',
    nse_symbol:'KOTAKBANK', bse_code:'500247', isin:'INE237A01036', founded_year:2003, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Ashok Vaswani', employees:92000,
    business_summary:'Private-sector bank known for premium retail banking and wealth management. Expanded via merger with ING Vysya Bank in 2015.',
    thematic_tags:['banking','wealth-management','digital-banking'],
    index_membership:['Nifty 50','Nifty Bank'], listing_date:'2003-12-20' },

  { symbol:'SBIN', company_name:'State Bank of India', sector:'Financial Services', industry:'Banking', mcap_category:'large',
    nse_symbol:'SBIN', bse_code:'500112', isin:'INE062A01020', founded_year:1955, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Challa Sreenivasulu Setty', employees:232296,
    business_summary:"India's largest public-sector bank with an unparalleled branch and ATM network. Offers retail, corporate, agriculture and government banking services.",
    thematic_tags:['banking','PSU','rural-banking','government'],
    index_membership:['Nifty 50','Nifty Bank','Sensex'], listing_date:'1993-03-01' },

  { symbol:'AXISBANK', company_name:'Axis Bank', sector:'Financial Services', industry:'Banking', mcap_category:'large',
    nse_symbol:'AXISBANK', bse_code:'532215', isin:'INE238A01034', founded_year:1993, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Amitabh Chaudhry', employees:85000,
    business_summary:'Third-largest private-sector bank in India. Strong in corporate banking, retail loans and digital payments. Acquired Citibank India retail business in 2023.',
    thematic_tags:['banking','digital-banking','retail-credit'],
    index_membership:['Nifty 50','Nifty Bank'], listing_date:'1998-02-16' },

  { symbol:'BAJFINANCE', company_name:'Bajaj Finance', sector:'Financial Services', industry:'NBFC', mcap_category:'large',
    nse_symbol:'BAJFINANCE', bse_code:'500034', isin:'INE296A01024', founded_year:1987, headquarters:'Pune, Maharashtra',
    ceo_name:'Rajeev Jain', employees:50000,
    business_summary:"India's largest NBFC offering consumer finance, SME lending, commercial lending and deposits. Pioneer in EMI-based retail financing.",
    thematic_tags:['NBFC','consumer-credit','SME-lending','fintech'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2010-04-01' },

  { symbol:'BAJAJFINSV', company_name:'Bajaj Finserv', sector:'Financial Services', industry:'Diversified Financial Services', mcap_category:'large',
    nse_symbol:'BAJAJFINSV', bse_code:'532978', isin:'INE918I01026', founded_year:2007, headquarters:'Pune, Maharashtra',
    ceo_name:'S S Rajagopal', employees:80000,
    business_summary:'Holding company for Bajaj Finance and Bajaj Allianz general/life insurance. One of the most diversified financial services conglomerates in India.',
    thematic_tags:['NBFC','insurance','financial-conglomerate'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2008-05-26' },

  { symbol:'INDUSINDBK', company_name:'IndusInd Bank', sector:'Financial Services', industry:'Banking', mcap_category:'large',
    nse_symbol:'INDUSINDBK', bse_code:'532187', isin:'INE095A01012', founded_year:1994, headquarters:'Pune, Maharashtra',
    ceo_name:'Sumant Kathpalia', employees:30000,
    business_summary:'Private-sector bank known for commercial vehicle financing, microfinance and corporate banking. Acquired Bharat Financial Inclusion in 2019.',
    thematic_tags:['banking','vehicle-finance','microfinance'],
    index_membership:['Nifty 50','Nifty Bank'], listing_date:'1997-01-21' },

  { symbol:'SHRIRAMFIN', company_name:'Shriram Finance', sector:'Financial Services', industry:'NBFC', mcap_category:'large',
    nse_symbol:'SHRIRAMFIN', bse_code:'511218', isin:'INE721A01047', founded_year:1974, headquarters:'Chennai, Tamil Nadu',
    ceo_name:'Y S Chakravarti', employees:74000,
    business_summary:"India's largest vehicle financing NBFC, especially for used commercial vehicles. Merged with Shriram City Union Finance in 2023.",
    thematic_tags:['NBFC','vehicle-finance','rural-lending'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2005-12-15' },

  { symbol:'HDFCLIFE', company_name:'HDFC Life Insurance', sector:'Financial Services', industry:'Life Insurance', mcap_category:'large',
    nse_symbol:'HDFCLIFE', bse_code:'540777', isin:'INE795G01014', founded_year:2000, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Vibha Padalkar', employees:20000,
    business_summary:"One of India's leading private life insurance companies offering individual and group insurance, pension and investment products.",
    thematic_tags:['insurance','life-insurance','wealth-management'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2017-11-17' },

  { symbol:'SBILIFE', company_name:'SBI Life Insurance', sector:'Financial Services', industry:'Life Insurance', mcap_category:'large',
    nse_symbol:'SBILIFE', bse_code:'540719', isin:'INE123W01016', founded_year:2001, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Amit Jhingran', employees:20000,
    business_summary:"Joint venture between SBI and BNP Paribas Cardif. One of India's top private life insurers with wide bancassurance network.",
    thematic_tags:['insurance','life-insurance','bancassurance'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2017-10-03' },

  { symbol:'CHOLAFIN', company_name:'Cholamandalam Investment and Finance', sector:'Financial Services', industry:'NBFC', mcap_category:'large',
    nse_symbol:'CHOLAFIN', bse_code:'590005', isin:'INE121A01024', founded_year:1978, headquarters:'Chennai, Tamil Nadu',
    ceo_name:'D Arul Selvan', employees:18000,
    business_summary:"Murugappa Group NBFC offering vehicle finance, home loans and SME finance. One of India's best-managed NBFCs with consistent asset quality.",
    thematic_tags:['NBFC','vehicle-finance','home-loans','Murugappa-group'],
    index_membership:['Nifty 100'], listing_date:'1976-01-01' },

  { symbol:'MUTHOOTFIN', company_name:'Muthoot Finance', sector:'Financial Services', industry:'Gold Loans', mcap_category:'large',
    nse_symbol:'MUTHOOTFIN', bse_code:'533398', isin:'INE414G01012', founded_year:1939, headquarters:'Kochi, Kerala',
    ceo_name:'George Alexander Muthoot', employees:28000,
    business_summary:"India's largest gold loan NBFC. Over 5,600 branches. Key beneficiary of gold price rises and unorganised lending formalization.",
    thematic_tags:['gold-loan','NBFC','rural-lending','financial-inclusion'],
    index_membership:['Nifty 100'], listing_date:'2011-05-06' },

  { symbol:'IRFC', company_name:'Indian Railway Finance Corporation', sector:'Financial Services', industry:'Government Financing', mcap_category:'large',
    nse_symbol:'IRFC', bse_code:'543257', isin:'INE053F01010', founded_year:1986, headquarters:'New Delhi, Delhi',
    ceo_name:'Manoj Kumar Dubey', employees:30,
    business_summary:'Dedicated market borrowing arm of Indian Railways. Raises funds for rolling stock and infrastructure. Zero credit risk as GoI-guaranteed entity.',
    thematic_tags:['railways','government','PSU','infrastructure-finance','high-dividend'],
    index_membership:['Nifty 100','Nifty PSE'], listing_date:'2021-01-29' },

  { symbol:'RECLTD', company_name:'REC Limited', sector:'Financial Services', industry:'Infrastructure Finance', mcap_category:'large',
    nse_symbol:'RECLTD', bse_code:'532955', isin:'INE020B01018', founded_year:1969, headquarters:'New Delhi, Delhi',
    ceo_name:'Vivek Kumar Dewangan', employees:700,
    business_summary:'Government NBFC financing power sector projects including generation, transmission and distribution. Co-finances renewable energy with PFC.',
    thematic_tags:['power-finance','PSU','renewable-energy','infrastructure-finance','high-dividend'],
    index_membership:['Nifty 100','Nifty PSE'], listing_date:'2008-03-12' },

  { symbol:'PFC', company_name:'Power Finance Corporation', sector:'Financial Services', industry:'Infrastructure Finance', mcap_category:'large',
    nse_symbol:'PFC', bse_code:'532810', isin:'INE134E01011', founded_year:1986, headquarters:'New Delhi, Delhi',
    ceo_name:'Parminder Chopra', employees:600,
    business_summary:'Navratna PSU NBFC providing long-term finance to power sector entities. Holds majority stake in REC Ltd. Key enabler of India\'s power sector investments.',
    thematic_tags:['power-finance','PSU','renewable-energy','infrastructure-finance','high-dividend'],
    index_membership:['Nifty 100','Nifty PSE'], listing_date:'2007-02-23' },

  // ── CONSUMER / FMCG ─────────────────────────────────────────────────────
  { symbol:'HINDUNILVR', company_name:'Hindustan Unilever', sector:'FMCG', industry:'FMCG', mcap_category:'large',
    nse_symbol:'HINDUNILVR', bse_code:'500696', isin:'INE030A01027', founded_year:1933, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Rohit Jawa', employees:21000,
    business_summary:"India's largest FMCG company owning brands like Dove, Lux, Surf Excel, Horlicks, Knorr. Subsidiary of Unilever PLC.",
    thematic_tags:['FMCG','consumer-staples','D2C','ESG-leader'],
    index_membership:['Nifty 50','Nifty FMCG','Sensex'], listing_date:'1995-01-01' },

  { symbol:'ITC', company_name:'ITC', sector:'FMCG', industry:'Diversified FMCG', mcap_category:'large',
    nse_symbol:'ITC', bse_code:'500875', isin:'INE154A01025', founded_year:1910, headquarters:'Kolkata, West Bengal',
    ceo_name:'Sanjiv Puri', employees:31000,
    business_summary:"Diversified conglomerate with dominant cigarette business and fast-growing FMCG brands (Aashirvaad, Sunfeast, Bingo). Also in hotels, agribusiness and paperboards.",
    thematic_tags:['FMCG','cigarettes','hospitality','agri','ESG-leader'],
    index_membership:['Nifty 50','Nifty FMCG','Sensex'], listing_date:'1954-01-01' },

  { symbol:'BRITANNIA', company_name:'Britannia Industries', sector:'FMCG', industry:'Food Processing', mcap_category:'large',
    nse_symbol:'BRITANNIA', bse_code:'500825', isin:'INE216A01030', founded_year:1892, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Rajneet Kohli', employees:4100,
    business_summary:"India's leading biscuits and dairy company. Brands include Good Day, Marie Gold, Milkman.",
    thematic_tags:['FMCG','food','bakery','consumer-staples'],
    index_membership:['Nifty 50','Nifty FMCG'], listing_date:'1946-01-01' },

  { symbol:'NESTLEIND', company_name:'Nestle India', sector:'FMCG', industry:'Food Processing', mcap_category:'large',
    nse_symbol:'NESTLEIND', bse_code:'500790', isin:'INE239A01016', founded_year:1912, headquarters:'Gurugram, Haryana',
    ceo_name:'Suresh Narayanan', employees:8000,
    business_summary:"Subsidiary of Nestle S.A. producing Maggi, KitKat, Munch and infant nutrition products. High-margin FMCG with strong pricing power.",
    thematic_tags:['FMCG','food','nutrition','global-MNC'],
    index_membership:['Nifty 50','Nifty FMCG'], listing_date:'1990-01-01' },

  { symbol:'TATACONSUM', company_name:'Tata Consumer Products', sector:'FMCG', industry:'Beverages', mcap_category:'large',
    nse_symbol:'TATACONSUM', bse_code:'500800', isin:'INE192A01025', founded_year:1962, headquarters:'Kolkata, West Bengal',
    ceo_name:"Sunil D'Souza", employees:4500,
    business_summary:"FMCG arm of the Tata Group managing brands like Tata Tea, Tata Salt, Tetley, Eight O'Clock Coffee and Tata Sampann.",
    thematic_tags:['FMCG','tea','food','Tata-group'],
    index_membership:['Nifty 50','Nifty FMCG'], listing_date:'1998-07-03' },

  { symbol:'GODREJCP', company_name:'Godrej Consumer Products', sector:'FMCG', industry:'FMCG', mcap_category:'large',
    nse_symbol:'GODREJCP', bse_code:'532424', isin:'INE102D01028', founded_year:2001, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Sudhir Sitapati', employees:13000,
    business_summary:"India's largest household insecticides and hair colour company. Brands include Godrej No.1, HIT, Good Knight, Cinthol. Strong Africa/Asia presence.",
    thematic_tags:['FMCG','home-care','personal-care','Godrej-group'],
    index_membership:['Nifty 100'], listing_date:'2001-06-01' },

  { symbol:'MARICO', company_name:'Marico', sector:'FMCG', industry:'Personal Care Products', mcap_category:'large',
    nse_symbol:'MARICO', bse_code:'531642', isin:'INE196A01026', founded_year:1990, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Saugata Gupta', employees:8000,
    business_summary:'Maker of Parachute coconut oil and Saffola cooking oil. Expanding in digital-first beauty brands and premium foods. Strong Bangladesh and South Africa presence.',
    thematic_tags:['FMCG','hair-care','edible-oil','D2C','international'],
    index_membership:['Nifty 100'], listing_date:'1996-05-01' },

  { symbol:'DABUR', company_name:'Dabur India', sector:'FMCG', industry:'Ayurveda & FMCG', mcap_category:'large',
    nse_symbol:'DABUR', bse_code:'500096', isin:'INE016A01026', founded_year:1884, headquarters:'Gurugram, Haryana',
    ceo_name:'Mohit Malhotra', employees:9000,
    business_summary:"World's largest Ayurvedic and natural healthcare company. Brands include Dabur Chyawanprash, Real juices, Vatika, Hajmola and Odomos.",
    thematic_tags:['FMCG','ayurveda','healthcare','consumer-staples'],
    index_membership:['Nifty 100'], listing_date:'1994-08-04' },

  { symbol:'EMAMILTD', company_name:'Emami', sector:'FMCG', industry:'Personal Care Products', mcap_category:'large',
    nse_symbol:'EMAMILTD', bse_code:'531162', isin:'INE548C01032', founded_year:1974, headquarters:'Kolkata, West Bengal',
    ceo_name:'Harsha V Agarwal', employees:3000,
    business_summary:'Niche FMCG player owning BoroPlus, Navratna, Fair and Handsome, Zandu and Mentho Plus. Strong in Ayurvedic and winter care.',
    thematic_tags:['FMCG','personal-care','ayurveda'],
    index_membership:['Nifty 100'], listing_date:'2010-10-20' },

  // ── AUTO ─────────────────────────────────────────────────────────────────
  { symbol:'MARUTI', company_name:'Maruti Suzuki India', sector:'Automobile', industry:'Passenger Vehicles', mcap_category:'large',
    nse_symbol:'MARUTI', bse_code:'532500', isin:'INE585B01010', founded_year:1981, headquarters:'New Delhi, Delhi',
    ceo_name:'Hisashi Takeuchi', employees:22000,
    business_summary:'India\'s largest passenger vehicle manufacturer with over 40% market share. Joint venture with Suzuki Motor Corporation of Japan.',
    thematic_tags:['auto','passenger-vehicles','EV-transition','rural'],
    index_membership:['Nifty 50','Nifty Auto','Sensex'], listing_date:'2003-07-09' },

  { symbol:'TATAMOTORS', company_name:'Tata Motors', sector:'Automobile', industry:'Diversified Auto', mcap_category:'large',
    nse_symbol:'TATAMOTORS', bse_code:'500570', isin:'INE155A01022', founded_year:1945, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Shailesh Chandra', employees:81000,
    business_summary:'Largest commercial vehicle maker in India; also owns Jaguar Land Rover (JLR). Pioneer in Indian EV with Nexon EV and Tiago EV.',
    thematic_tags:['auto','EV','commercial-vehicles','JLR','Tata-group'],
    index_membership:['Nifty 50','Nifty Auto'], listing_date:'1998-09-10' },

  { symbol:'M&M', company_name:'Mahindra & Mahindra', sector:'Automobile', industry:'Diversified Auto', mcap_category:'large',
    nse_symbol:'M&M', bse_code:'500520', isin:'INE101A01026', founded_year:1945, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Anish Shah', employees:79000,
    business_summary:"India's leading SUV maker and world's largest tractor manufacturer. Diversified across farm equipment, IT (Tech Mahindra), real estate and aerospace.",
    thematic_tags:['auto','SUV','EV','farm-equipment','conglomerate'],
    index_membership:['Nifty 50','Nifty Auto'], listing_date:'1996-01-01' },

  { symbol:'BAJAJ-AUTO', company_name:'Bajaj Auto', sector:'Automobile', industry:'Two & Three Wheelers', mcap_category:'large',
    nse_symbol:'BAJAJ-AUTO', bse_code:'532977', isin:'INE917I01010', founded_year:1945, headquarters:'Pune, Maharashtra',
    ceo_name:'Rajiv Bajaj', employees:10000,
    business_summary:'World\'s largest three-wheeler manufacturer and India\'s second-largest two-wheeler maker. Strong export franchise covering 70+ countries.',
    thematic_tags:['auto','two-wheelers','three-wheelers','EV','exports'],
    index_membership:['Nifty 50','Nifty Auto'], listing_date:'2008-05-26' },

  { symbol:'HEROMOTOCO', company_name:'Hero MotoCorp', sector:'Automobile', industry:'Two-Wheelers', mcap_category:'large',
    nse_symbol:'HEROMOTOCO', bse_code:'500182', isin:'INE158A01026', founded_year:1984, headquarters:'New Delhi, Delhi',
    ceo_name:'Niranjan Gupta', employees:10000,
    business_summary:'World\'s largest two-wheeler manufacturer by volume. Separated from Honda in 2010. Strong rural India presence.',
    thematic_tags:['auto','two-wheelers','EV','rural'],
    index_membership:['Nifty 50','Nifty Auto'], listing_date:'1991-01-01' },

  { symbol:'EICHERMOT', company_name:'Eicher Motors', sector:'Automobile', industry:'Two-Wheelers & Commercial Vehicles', mcap_category:'large',
    nse_symbol:'EICHERMOT', bse_code:'505200', isin:'INE066A01021', founded_year:1948, headquarters:'New Delhi, Delhi',
    ceo_name:'Siddhartha Lal', employees:12000,
    business_summary:'Parent of Royal Enfield, the iconic premium motorcycle brand. Also a JV partner in VE Commercial Vehicles (trucks).',
    thematic_tags:['auto','premium-motorcycles','commercial-vehicles','lifestyle'],
    index_membership:['Nifty 50','Nifty Auto'], listing_date:'1997-08-12' },

  { symbol:'TVSMOTOR', company_name:'TVS Motor Company', sector:'Automobile', industry:'Two-Wheelers', mcap_category:'large',
    nse_symbol:'TVSMOTOR', bse_code:'532343', isin:'INE494B01023', founded_year:1978, headquarters:'Chennai, Tamil Nadu',
    ceo_name:'Sudarshan Venu', employees:15000,
    business_summary:'Third-largest two-wheeler maker in India. Known for Apache and Jupiter brands. Expanding into EVs with iQube and acquired Norton Motorcycles.',
    thematic_tags:['auto','two-wheelers','EV','premium-bikes'],
    index_membership:['Nifty 100'], listing_date:'2000-08-02' },

  { symbol:'MOTHERSON', company_name:'Samvardhana Motherson International', sector:'Automobile', industry:'Auto Components', mcap_category:'large',
    nse_symbol:'MOTHERSON', bse_code:'517334', isin:'INE775A01035', founded_year:1975, headquarters:'Noida, Uttar Pradesh',
    ceo_name:'Vivek Chaand Sehgal', employees:150000,
    business_summary:"World's largest auto components company by revenue. Makes wiring harnesses, mirrors, bumpers and vision systems for global OEMs.",
    thematic_tags:['auto-components','global-OEM','EV-components'],
    index_membership:['Nifty 100'], listing_date:'2001-11-08' },

  // ── PHARMA ──────────────────────────────────────────────────────────────
  { symbol:'SUNPHARMA', company_name:'Sun Pharmaceutical Industries', sector:'Pharma & Healthcare', industry:'Pharmaceuticals', mcap_category:'large',
    nse_symbol:'SUNPHARMA', bse_code:'524715', isin:'INE044A01036', founded_year:1983, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Dilip Shanghvi', employees:43000,
    business_summary:"India's largest pharma company by revenue. Strong in specialty branded generics globally. Acquired Ranbaxy in 2015.",
    thematic_tags:['pharma','specialty-drugs','dermatology','oncology','exports'],
    index_membership:['Nifty 50','Nifty Pharma'], listing_date:'1994-02-16' },

  { symbol:'DRREDDY', company_name:"Dr. Reddy's Laboratories", sector:'Pharma & Healthcare', industry:'Pharmaceuticals', mcap_category:'large',
    nse_symbol:'DRREDDY', bse_code:'500124', isin:'INE089A01023', founded_year:1984, headquarters:'Hyderabad, Telangana',
    ceo_name:'Erez Israeli', employees:24000,
    business_summary:"Integrated pharma company with manufacturing, generics, branded generics and biosimilars business across 66 countries.",
    thematic_tags:['pharma','generics','biosimilars','CDMO','exports'],
    index_membership:['Nifty 50','Nifty Pharma'], listing_date:'2001-04-11' },

  { symbol:'CIPLA', company_name:'Cipla', sector:'Pharma & Healthcare', industry:'Pharmaceuticals', mcap_category:'large',
    nse_symbol:'CIPLA', bse_code:'500087', isin:'INE059A01026', founded_year:1935, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Umang Vohra', employees:25000,
    business_summary:'Pioneered affordable AIDS drugs globally. Major respiratory, cardiovascular and anti-infective pharma portfolio.',
    thematic_tags:['pharma','generics','respiratory','affordable-medicines'],
    index_membership:['Nifty 50','Nifty Pharma'], listing_date:'1995-02-22' },

  { symbol:'DIVISLAB', company_name:"Divi's Laboratories", sector:'Pharma & Healthcare', industry:'CDMO', mcap_category:'large',
    nse_symbol:'DIVISLAB', bse_code:'532488', isin:'INE361B01024', founded_year:1990, headquarters:'Hyderabad, Telangana',
    ceo_name:'Nilima Motaparti', employees:20000,
    business_summary:"World's largest producer of several generic API molecules. Strong CDMO and nutraceuticals business. Key supplier to global innovator pharma companies.",
    thematic_tags:['pharma','API','CDMO','exports','quality-manufacturer'],
    index_membership:['Nifty 50','Nifty Pharma'], listing_date:'2003-03-12' },

  { symbol:'APOLLOHOSP', company_name:'Apollo Hospitals Enterprise', sector:'Pharma & Healthcare', industry:'Hospitals & Diagnostics', mcap_category:'large',
    nse_symbol:'APOLLOHOSP', bse_code:'508869', isin:'INE437A01024', founded_year:1983, headquarters:'Chennai, Tamil Nadu',
    ceo_name:'Suneeta Reddy', employees:100000,
    business_summary:"India's largest private hospital chain with 70+ hospitals. Pioneer of corporate healthcare in India. Expanding digital health via Apollo 24|7.",
    thematic_tags:['healthcare','hospitals','digital-health','diagnostics'],
    index_membership:['Nifty 50','Nifty Healthcare'], listing_date:'1979-01-01' },

  { symbol:'AUROPHARMA', company_name:'Aurobindo Pharma', sector:'Pharma & Healthcare', industry:'Pharmaceuticals', mcap_category:'large',
    nse_symbol:'AUROPHARMA', bse_code:'524804', isin:'INE406A01037', founded_year:1986, headquarters:'Hyderabad, Telangana',
    ceo_name:'Santhanam Subramanian', employees:22000,
    business_summary:"One of India's largest pharma exporters with 30%+ revenue from the US market. Strong in injectables, anti-retroviral and CNS drugs.",
    thematic_tags:['pharma','generics','injectables','US-FDA','exports'],
    index_membership:['Nifty 100'], listing_date:'1995-12-19' },

  // ── CONSUMER DURABLES ────────────────────────────────────────────────────
  { symbol:'TITAN', company_name:'Titan Company', sector:'Consumer Durables', industry:'Jewellery & Watches', mcap_category:'large',
    nse_symbol:'TITAN', bse_code:'500114', isin:'INE685A01028', founded_year:1984, headquarters:'Bengaluru, Karnataka',
    ceo_name:'C K Venkataraman', employees:13000,
    business_summary:"India's largest jewellery brand (Tanishq) and watch brand (Titan, Fastrack). Diversified into eyewear (Titan Eye+) and fragrances. Part of Tata Group.",
    thematic_tags:['jewellery','watches','luxury','consumer-discretionary','Tata-group'],
    index_membership:['Nifty 50','Nifty Consumer Durables'], listing_date:'1995-08-01' },

  { symbol:'ASIANPAINT', company_name:'Asian Paints', sector:'Consumer Durables', industry:'Paints & Coatings', mcap_category:'large',
    nse_symbol:'ASIANPAINT', bse_code:'500820', isin:'INE021A01026', founded_year:1942, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Amit Syngle', employees:8000,
    business_summary:'India\'s largest paint company with 50%+ domestic market share. Present in 15 countries. Premium pricing power and strong distribution moat.',
    thematic_tags:['paints','consumer-durables','brand-moat','premiumisation'],
    index_membership:['Nifty 50','Nifty Consumer Durables','Sensex'], listing_date:'1995-01-01' },

  { symbol:'HAVELLS', company_name:'Havells India', sector:'Consumer Durables', industry:'Electrical Equipment', mcap_category:'large',
    nse_symbol:'HAVELLS', bse_code:'517354', isin:'INE176B01034', founded_year:1958, headquarters:'Gurugram, Haryana',
    ceo_name:'Anil Rai Gupta', employees:16000,
    business_summary:'Leading electrical equipment company owning brands like Havells, Lloyd (AC), Crabtree and Standard. Strong dealer network across India.',
    thematic_tags:['electrical-equipment','consumer-durables','AC','EV-charging'],
    index_membership:['Nifty 100'], listing_date:'1992-01-01' },

  { symbol:'VOLTAS', company_name:'Voltas', sector:'Consumer Durables', industry:'Air Conditioning', mcap_category:'large',
    nse_symbol:'VOLTAS', bse_code:'500575', isin:'INE226A01021', founded_year:1954, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Pradeep Bakshi', employees:7000,
    business_summary:"India's largest room air conditioner brand. Tata Group company also doing MEP engineering projects globally.",
    thematic_tags:['air-conditioning','consumer-durables','HVAC','Tata-group'],
    index_membership:['Nifty 100'], listing_date:'1956-01-01' },

  { symbol:'BLUESTAR', company_name:'Blue Star', sector:'Consumer Durables', industry:'Air Conditioning', mcap_category:'mid',
    nse_symbol:'BLUESTAR', bse_code:'500067', isin:'INE472A01039', founded_year:1943, headquarters:'Mumbai, Maharashtra',
    ceo_name:'B Thiagarajan', employees:6500,
    business_summary:"India's leading commercial air-conditioning company. Growing fast in residential AC market. Also in refrigeration and MEP contracting.",
    thematic_tags:['air-conditioning','HVAC','consumer-durables','cooling','summer-play'],
    index_membership:['Nifty 500','Nifty Midcap 100'], listing_date:'1992-01-01' },

  { symbol:'ORIENTELEC', company_name:'Orient Electric', sector:'Consumer Durables', industry:'Consumer Electronics & Appliances', mcap_category:'mid',
    nse_symbol:'ORIENTELEC', bse_code:'541301', isin:'INE142Z01019', founded_year:1954, headquarters:'New Delhi, Delhi',
    ceo_name:'Rakesh Khanna', employees:3000,
    business_summary:'CK Birla Group company making fans, lighting, home appliances and EV chargers. Market leader in ceiling fans.',
    thematic_tags:['fans','lighting','consumer-durables','EV-charging','CK-Birla-group'],
    index_membership:['Nifty 500'], listing_date:'2018-05-21' },

  // ── CAPITAL GOODS / INFRA ────────────────────────────────────────────────
  { symbol:'LT', company_name:'Larsen & Toubro', sector:'Capital Goods', industry:'Engineering & Construction', mcap_category:'large',
    nse_symbol:'LT', bse_code:'500510', isin:'INE018A01030', founded_year:1938, headquarters:'Mumbai, Maharashtra',
    ceo_name:'S N Subrahmanyan', employees:57000,
    business_summary:"India's largest engineering and construction conglomerate. Operates in infrastructure, power, defence, hydrocarbon and IT (L&T Technology, LTIMindtree).",
    thematic_tags:['infrastructure','defence','EPC','IT-services','government-projects'],
    index_membership:['Nifty 50','Nifty Infra','Sensex'], listing_date:'1950-01-01' },

  { symbol:'ULTRACEMCO', company_name:'UltraTech Cement', sector:'Construction Materials', industry:'Cement', mcap_category:'large',
    nse_symbol:'ULTRACEMCO', bse_code:'532538', isin:'INE481G01011', founded_year:2004, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Kailash Jhanwar', employees:25000,
    business_summary:"India's largest cement company and the third-largest in the world (ex-China). Aditya Birla Group flagship in construction materials.",
    thematic_tags:['cement','infrastructure','construction','Aditya-Birla-group'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2004-07-29' },

  { symbol:'GRASIM', company_name:'Grasim Industries', sector:'Diversified', industry:'Diversified', mcap_category:'large',
    nse_symbol:'GRASIM', bse_code:'500300', isin:'INE047A01021', founded_year:1948, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Himanshu Kapila', employees:40000,
    business_summary:"Aditya Birla Group flagship. World's largest producer of viscose staple fibre; also controls UltraTech Cement and has paints JV (Birla Opus).",
    thematic_tags:['cement','textiles','paints','conglomerate','Aditya-Birla-group'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'1947-01-01' },

  { symbol:'SIEMENS', company_name:'Siemens India', sector:'Capital Goods', industry:'Industrial Automation & Digitalization', mcap_category:'large',
    nse_symbol:'SIEMENS', bse_code:'500550', isin:'INE003A01024', founded_year:1867, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Sunil Mathur', employees:11000,
    business_summary:'Indian subsidiary of Siemens AG. Manufactures power distribution equipment, industrial automation, smart infrastructure and mobility solutions.',
    thematic_tags:['automation','power-grid','smart-infra','global-MNC','digitalization'],
    index_membership:['Nifty 100'], listing_date:'1958-01-01' },

  { symbol:'ABB', company_name:'ABB India', sector:'Capital Goods', industry:'Electrical Equipment', mcap_category:'large',
    nse_symbol:'ABB', bse_code:'500002', isin:'INE117A01022', founded_year:1949, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Sanjeev Sharma', employees:6000,
    business_summary:'Indian subsidiary of ABB Ltd Switzerland. Provides electrification, automation and robotics solutions to utilities, industry and transport.',
    thematic_tags:['automation','robotics','electrification','global-MNC'],
    index_membership:['Nifty 100'], listing_date:'1949-01-01' },

  { symbol:'POLYCAB', company_name:'Polycab India', sector:'Capital Goods', industry:'Wires & Cables', mcap_category:'large',
    nse_symbol:'POLYCAB', bse_code:'542652', isin:'INE704P01022', founded_year:1964, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Inder T Jaisinghani', employees:9500,
    business_summary:"India's largest wires and cables company. Also manufactures FMEG products (fans, lights, switches). Key beneficiary of infra and real estate boom.",
    thematic_tags:['wires-cables','electricals','infra-play','real-estate-proxy'],
    index_membership:['Nifty 100'], listing_date:'2019-04-16' },

  { symbol:'HAL', company_name:'Hindustan Aeronautics', sector:'Capital Goods', industry:'Defence Aerospace', mcap_category:'large',
    nse_symbol:'HAL', bse_code:'541153', isin:'INE066F01020', founded_year:1940, headquarters:'Bengaluru, Karnataka',
    ceo_name:'C B Ananthakrishnan', employees:30000,
    business_summary:"India's premier defence aerospace company manufacturing aircraft, helicopters, engines and avionics for Indian armed forces. Core to Atmanirbhar Bharat.",
    thematic_tags:['defence','aerospace','PSU','government-contracts','Make-in-India'],
    index_membership:['Nifty 100','Nifty Defence','Nifty PSE'], listing_date:'2018-03-28' },

  { symbol:'BEL', company_name:'Bharat Electronics', sector:'Capital Goods', industry:'Defence Electronics', mcap_category:'large',
    nse_symbol:'BEL', bse_code:'263534', isin:'INE263A01024', founded_year:1954, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Bhanu Prakash Srivastava', employees:11000,
    business_summary:'Navratna PSU manufacturing defence electronics including radars, sonars, EW systems, communication equipment and civilian electronics.',
    thematic_tags:['defence','electronics','PSU','radar','government-contracts','Make-in-India'],
    index_membership:['Nifty 50','Nifty Defence','Nifty PSE'], listing_date:'1992-08-19' },

  { symbol:'CUMMINS', company_name:'Cummins India', sector:'Capital Goods', industry:'Industrial Engines', mcap_category:'large',
    nse_symbol:'CUMMINS', bse_code:'500480', isin:'INE298A01020', founded_year:1962, headquarters:'Pune, Maharashtra',
    ceo_name:'Ashwath Ram', employees:6000,
    business_summary:'Subsidiary of Cummins Inc. USA. Manufactures diesel and natural gas engines and power generation equipment. Strong in data-center gensets.',
    thematic_tags:['engines','power-generation','data-center','industrial','global-MNC'],
    index_membership:['Nifty 100'], listing_date:'1995-01-01' },

  // ── METALS ──────────────────────────────────────────────────────────────
  { symbol:'TATASTEEL', company_name:'Tata Steel', sector:'Metals & Mining', industry:'Steel', mcap_category:'large',
    nse_symbol:'TATASTEEL', bse_code:'500470', isin:'INE081A01020', founded_year:1907, headquarters:'Mumbai, Maharashtra',
    ceo_name:'T V Narendran', employees:81000,
    business_summary:"One of world's top 10 steel producers. Operations in India, Europe (Tata Steel Netherlands) and South-East Asia. Tata Group flagship.",
    thematic_tags:['steel','metals','Tata-group','Europe-operations'],
    index_membership:['Nifty 50','Nifty Metal'], listing_date:'1995-01-01' },

  { symbol:'JSWSTEEL', company_name:'JSW Steel', sector:'Metals & Mining', industry:'Steel', mcap_category:'large',
    nse_symbol:'JSWSTEEL', bse_code:'500228', isin:'INE019A01038', founded_year:1982, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Jayant Acharya', employees:50000,
    business_summary:"India's largest steelmaker by capacity. Expanding into US via Ohio operations; strong focus on EV-grade steel and downstream processing.",
    thematic_tags:['steel','metals','auto-steel','EV-material'],
    index_membership:['Nifty 50','Nifty Metal'], listing_date:'1994-01-01' },

  { symbol:'HINDALCO', company_name:'Hindalco Industries', sector:'Metals & Mining', industry:'Aluminium', mcap_category:'large',
    nse_symbol:'HINDALCO', bse_code:'500440', isin:'INE038A01020', founded_year:1958, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Satish Pai', employees:65000,
    business_summary:'World\'s largest aluminium rolling company. Owns Novelis (largest recycled aluminium producer globally). Aditya Birla Group.',
    thematic_tags:['aluminium','copper','Novelis','auto-materials','Aditya-Birla-group'],
    index_membership:['Nifty 50','Nifty Metal'], listing_date:'1958-01-01' },

  { symbol:'COALINDIA', company_name:'Coal India', sector:'Metals & Mining', industry:'Coal Mining', mcap_category:'large',
    nse_symbol:'COALINDIA', bse_code:'533278', isin:'INE522F01014', founded_year:1975, headquarters:'Kolkata, West Bengal',
    ceo_name:'P M Prasad', employees:227500,
    business_summary:"World's largest coal producer and India's largest miner by volume. Supplies ~80% of India's thermal coal requirements. High-dividend PSU.",
    thematic_tags:['coal','PSU','high-dividend','energy-security'],
    index_membership:['Nifty 50','Nifty PSE'], listing_date:'2010-11-04' },

  // ── ENERGY / OIL & GAS ──────────────────────────────────────────────────
  { symbol:'ONGC', company_name:'Oil & Natural Gas Corporation', sector:'Energy', industry:'Oil Exploration & Production', mcap_category:'large',
    nse_symbol:'ONGC', bse_code:'500312', isin:'INE213A01029', founded_year:1956, headquarters:'New Delhi, Delhi',
    ceo_name:'Arun Kumar Singh', employees:33000,
    business_summary:"India's largest oil and gas exploration company. Produces ~70% of India's domestic crude. Also holds HPCL stake and overseas assets via OVL.",
    thematic_tags:['oil-gas','exploration','PSU','energy-security'],
    index_membership:['Nifty 50','Nifty Energy','Nifty PSE'], listing_date:'2004-08-17' },

  { symbol:'BPCL', company_name:'Bharat Petroleum Corporation', sector:'Energy', industry:'Oil Refining & Marketing', mcap_category:'large',
    nse_symbol:'BPCL', bse_code:'500547', isin:'INE029A01011', founded_year:1952, headquarters:'Mumbai, Maharashtra',
    ceo_name:'G Krishnakumar', employees:12000,
    business_summary:"India's second-largest public-sector fuel retailer with refineries in Mumbai, Kochi and Bina. Owns Bharat Gas and Petronet LNG stake.",
    thematic_tags:['oil-gas','refinery','petrol-retail','PSU'],
    index_membership:['Nifty 50','Nifty Energy','Nifty PSE'], listing_date:'1977-01-01' },

  { symbol:'IOC', company_name:'Indian Oil Corporation', sector:'Energy', industry:'Oil Refining & Marketing', mcap_category:'large',
    nse_symbol:'IOC', bse_code:'530965', isin:'INE242A01010', founded_year:1959, headquarters:'New Delhi, Delhi',
    ceo_name:'Shrikant Madhav Vaidya', employees:33000,
    business_summary:"India's largest oil company by revenue with the highest refining capacity (1.4 mbpd). Operates IndianOil petrol stations and IndianOil Gas.",
    thematic_tags:['oil-gas','refinery','petrol-retail','PSU','Indane-LPG'],
    index_membership:['Nifty 100','Nifty PSE','Nifty Energy'], listing_date:'1995-06-01' },

  { symbol:'PIDILITIND', company_name:'Pidilite Industries', sector:'Chemicals', industry:'Specialty Chemicals', mcap_category:'large',
    nse_symbol:'PIDILITIND', bse_code:'500331', isin:'INE318A01026', founded_year:1959, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Bharat Puri', employees:14000,
    business_summary:'Maker of Fevicol, Dr. Fixit and Fevikwik with near-monopoly in adhesives. Expanding into construction chemicals and waterproofing.',
    thematic_tags:['adhesives','specialty-chemicals','brand-moat','construction-chemicals'],
    index_membership:['Nifty 100'], listing_date:'1995-01-01' },

  // ── POWER ────────────────────────────────────────────────────────────────
  { symbol:'NTPC', company_name:'NTPC', sector:'Power', industry:'Thermal & Renewable Power', mcap_category:'large',
    nse_symbol:'NTPC', bse_code:'532555', isin:'INE733E01010', founded_year:1975, headquarters:'New Delhi, Delhi',
    ceo_name:'Gurdeep Singh', employees:20000,
    business_summary:"India's largest power utility with ~70 GW installed capacity (thermal + solar). Aggressively expanding into renewables targeting 60 GW by 2032.",
    thematic_tags:['power','PSU','coal','solar','renewable-energy','new-energy'],
    index_membership:['Nifty 50','Nifty Energy','Nifty PSE'], listing_date:'2004-11-05' },

  { symbol:'POWERGRID', company_name:'Power Grid Corporation of India', sector:'Power', industry:'Power Transmission', mcap_category:'large',
    nse_symbol:'POWERGRID', bse_code:'532898', isin:'INE752E01010', founded_year:1989, headquarters:'Gurugram, Haryana',
    ceo_name:'Ravindra Kumar Tyagi', employees:12000,
    business_summary:'Central transmission utility of India owning and operating ~1.72 lakh circuit km of transmission lines with 99.97% grid availability.',
    thematic_tags:['power','transmission','PSU','InvIT','regulated-utility'],
    index_membership:['Nifty 50','Nifty Energy','Nifty PSE'], listing_date:'2007-10-05' },

  { symbol:'ADANIGREEN', company_name:'Adani Green Energy', sector:'Power', industry:'Renewable Power', mcap_category:'large',
    nse_symbol:'ADANIGREEN', bse_code:'541450', isin:'INE364U01010', founded_year:2015, headquarters:'Ahmedabad, Gujarat',
    ceo_name:'Ashish Garg', employees:5000,
    business_summary:"World's largest solar energy company by market cap. Targets 50 GW renewable capacity by 2030. Adani Group's clean-energy flagship.",
    thematic_tags:['solar','wind','renewable-energy','ESG','new-energy','Adani-group'],
    index_membership:['Nifty 100','Nifty Energy'], listing_date:'2018-06-18' },

  { symbol:'ADANIPOWER', company_name:'Adani Power', sector:'Power', industry:'Thermal Power Generation', mcap_category:'large',
    nse_symbol:'ADANIPOWER', bse_code:'533096', isin:'INE814H01011', founded_year:1996, headquarters:'Ahmedabad, Gujarat',
    ceo_name:'Anil Sardana', employees:7000,
    business_summary:"India's largest private thermal power producer. Operates ~15.2 GW of coal-based capacity across Gujarat, Maharashtra, Rajasthan and Jharkhand.",
    thematic_tags:['thermal-power','coal','Adani-group'],
    index_membership:['Nifty 100'], listing_date:'2009-08-20' },

  { symbol:'NHPC', company_name:'NHPC', sector:'Power', industry:'Hydroelectric Power', mcap_category:'large',
    nse_symbol:'NHPC', bse_code:'533098', isin:'INE848E01016', founded_year:1975, headquarters:'Faridabad, Haryana',
    ceo_name:'Rajendra Prasad Goyal', employees:14000,
    business_summary:"India's largest hydroelectric power generator and Navratna PSU. Expanding into solar and wind with 10 GW renewable target by 2030.",
    thematic_tags:['hydro-power','renewable-energy','PSU','government-contracts'],
    index_membership:['Nifty 100','Nifty PSE'], listing_date:'2009-08-01' },

  { symbol:'RPOWER', company_name:'Reliance Power', sector:'Power', industry:'Power Generation', mcap_category:'small',
    nse_symbol:'RPOWER', bse_code:'500390', isin:'INE614G01033', founded_year:1995, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Anil Ambani', employees:3000,
    business_summary:'Anil Ambani Group power company with thermal, gas and renewable capacity. Went through significant financial stress; restructuring ongoing.',
    thematic_tags:['power','thermal','renewable-energy','debt-restructuring'],
    index_membership:['Nifty 500'], listing_date:'2008-02-15' },

  // ── TELECOM ──────────────────────────────────────────────────────────────
  { symbol:'BHARTIARTL', company_name:'Bharti Airtel', sector:'Telecom', industry:'Telecom Services', mcap_category:'large',
    nse_symbol:'BHARTIARTL', bse_code:'532454', isin:'INE397D01024', founded_year:1995, headquarters:'New Delhi, Delhi',
    ceo_name:'Gopal Vittal', employees:21000,
    business_summary:"India's largest telecom company by revenue. Operates in 18 African countries via Airtel Africa. Key player in 5G rollout and home broadband.",
    thematic_tags:['telecom','5G','Africa','broadband','enterprise'],
    index_membership:['Nifty 50','Nifty Telecom','Sensex'], listing_date:'2002-02-15' },

  // ── INTERNET / NEW-AGE ───────────────────────────────────────────────────
  { symbol:'ZOMATO', company_name:'Zomato', sector:'Consumer Services', industry:'Online Food Delivery', mcap_category:'large',
    nse_symbol:'ZOMATO', bse_code:'543320', isin:'INE758T01015', founded_year:2008, headquarters:'Gurugram, Haryana',
    ceo_name:'Deepinder Goyal', employees:5500,
    business_summary:"India's largest food delivery platform with Blinkit quick commerce. Expanding into dining-out, hyperpure B2B supplies and events (District).",
    thematic_tags:['food-tech','quick-commerce','D2C','internet','new-age'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2021-07-23' },

  { symbol:'NYKAA', company_name:'FSN E-Commerce Ventures (Nykaa)', sector:'Consumer Services', industry:'Online Beauty & Fashion Retail', mcap_category:'large',
    nse_symbol:'NYKAA', bse_code:'543401', isin:'INE388Y01029', founded_year:2012, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Falguni Nayar', employees:4000,
    business_summary:"India's leading online beauty and lifestyle retailer. Operates Nykaa (beauty), Nykaa Fashion and B2B brand platform.",
    thematic_tags:['e-commerce','beauty','D2C','internet','new-age'],
    index_membership:['Nifty 100'], listing_date:'2021-11-10' },

  { symbol:'POLICYBZR', company_name:'PB Fintech (PolicyBazaar)', sector:'Financial Services', industry:'Insurtech', mcap_category:'large',
    nse_symbol:'POLICYBZR', bse_code:'543390', isin:'INE417T01026', founded_year:2008, headquarters:'Gurugram, Haryana',
    ceo_name:'Yashish Dahiya', employees:8000,
    business_summary:"India's largest online insurance aggregator. Operates PolicyBazaar (insurance) and PaisaBazaar (credit). Profitable and fast-growing.",
    thematic_tags:['insurtech','fintech','internet','new-age'],
    index_membership:['Nifty 100'], listing_date:'2021-11-15' },

  // ── ADANI GROUP ──────────────────────────────────────────────────────────
  { symbol:'ADANIENT', company_name:'Adani Enterprises', sector:'Diversified', industry:'Diversified', mcap_category:'large',
    nse_symbol:'ADANIENT', bse_code:'512599', isin:'INE423A01024', founded_year:1988, headquarters:'Ahmedabad, Gujarat',
    ceo_name:'Gautam Adani', employees:45000,
    business_summary:'Flagship of the Adani Group acting as incubator for new businesses including airports, roads, data centers, solar manufacturing and defence.',
    thematic_tags:['airports','defence','green-energy','data-centers','conglomerate','Adani-group'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'1994-06-28' },

  { symbol:'ADANIPORTS', company_name:'Adani Ports & SEZ', sector:'Services', industry:'Port & Logistics', mcap_category:'large',
    nse_symbol:'ADANIPORTS', bse_code:'532921', isin:'INE742F01042', founded_year:1998, headquarters:'Ahmedabad, Gujarat',
    ceo_name:'Karan Adani', employees:30000,
    business_summary:"India's largest commercial port operator managing 13+ ports. Also operates logistics, industrial SEZ and warehousing via APSEZ.",
    thematic_tags:['ports','logistics','SEZ','infrastructure','Adani-group'],
    index_membership:['Nifty 50','Nifty 100'], listing_date:'2008-05-27' },

  { symbol:'AMBUJACEM', company_name:'Ambuja Cements', sector:'Construction Materials', industry:'Cement', mcap_category:'large',
    nse_symbol:'AMBUJACEM', bse_code:'500425', isin:'INE079A01024', founded_year:1983, headquarters:'Ahmedabad, Gujarat',
    ceo_name:'Ajay Kapur', employees:6000,
    business_summary:'Second-largest cement company in India by capacity. Acquired by Adani Group from Holcim in 2022. Strong in western and northern India.',
    thematic_tags:['cement','infrastructure','Adani-group'],
    index_membership:['Nifty 100'], listing_date:'1993-09-14' },

  { symbol:'ACC', company_name:'ACC', sector:'Construction Materials', industry:'Cement', mcap_category:'large',
    nse_symbol:'ACC', bse_code:'500410', isin:'INE012A01025', founded_year:1936, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Ajay Kapur', employees:10000,
    business_summary:"One of India's oldest cement companies. Acquired by Adani Group from Holcim in 2022. Pioneer in sustainable cement and Ready Mix Concrete.",
    thematic_tags:['cement','infrastructure','Adani-group','RMC'],
    index_membership:['Nifty 100'], listing_date:'1947-01-01' },

  // ── REAL ESTATE ──────────────────────────────────────────────────────────
  { symbol:'DLF', company_name:'DLF', sector:'Real Estate', industry:'Real Estate Development', mcap_category:'large',
    nse_symbol:'DLF', bse_code:'532868', isin:'INE271C01023', founded_year:1946, headquarters:'New Delhi, Delhi',
    ceo_name:'Ashok Tyagi', employees:4000,
    business_summary:"India's largest real estate developer by market cap. Known for DLF Cyber City (premium offices) and luxury residential projects in NCR.",
    thematic_tags:['real-estate','commercial-offices','luxury-residential','REITs'],
    index_membership:['Nifty 100','Nifty Realty'], listing_date:'2007-07-05' },

  { symbol:'GODREJIND', company_name:'Godrej Industries', sector:'Diversified', industry:'Diversified', mcap_category:'large',
    nse_symbol:'GODREJIND', bse_code:'500164', isin:'INE233A01035', founded_year:1897, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Pirojsha Godrej', employees:40000,
    business_summary:'Holding company of the Godrej Group with businesses in chemicals, real estate (Godrej Properties), consumer products and agriculture (Agrovet).',
    thematic_tags:['chemicals','real-estate','consumer-products','agriculture','conglomerate','Godrej-group'],
    index_membership:['Nifty 500'], listing_date:'1994-01-01' },

  // ── RETAIL / CONSUMER SERVICES ───────────────────────────────────────────
  { symbol:'DMART', company_name:'Avenue Supermarts (D-Mart)', sector:'Consumer Services', industry:'Supermarkets', mcap_category:'large',
    nse_symbol:'DMART', bse_code:'540376', isin:'INE192R01011', founded_year:2002, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Neville Noronha', employees:13000,
    business_summary:"India's most profitable supermarket chain operating D-Mart stores. EDLP model with owned properties drives very high returns on capital.",
    thematic_tags:['retail','FMCG-distribution','supermarket','EDLP'],
    index_membership:['Nifty 100'], listing_date:'2017-03-21' },

  { symbol:'TRENT', company_name:'Trent', sector:'Consumer Services', industry:'Fashion Retail', mcap_category:'large',
    nse_symbol:'TRENT', bse_code:'500251', isin:'INE849A01020', founded_year:1998, headquarters:'Mumbai, Maharashtra',
    ceo_name:'P V Sheshadri', employees:14000,
    business_summary:'Tata Group fashion retailer owning Westside and fast-fashion brand Zudio. One of the fastest-growing organized retail chains in India.',
    thematic_tags:['retail','fashion','fast-fashion','Zudio','Tata-group'],
    index_membership:['Nifty 100'], listing_date:'1998-08-04' },

  // ── MEDIA / TELECOM ──────────────────────────────────────────────────────
  { symbol:'HATHWAY', company_name:'Hathway Cable & Datacom', sector:'Telecom', industry:'Cable TV & Broadband', mcap_category:'small',
    nse_symbol:'HATHWAY', bse_code:'533162', isin:'INE982F01036', founded_year:1959, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Rajan Gupta', employees:5000,
    business_summary:"One of India's largest cable TV operators and growing broadband ISP. Backed by Reliance Industries post-2019 acquisition.",
    thematic_tags:['cable-TV','broadband','last-mile','Reliance-backed'],
    index_membership:['Nifty 500'], listing_date:'2010-02-25' },

  // ── HEALTHCARE ───────────────────────────────────────────────────────────
  { symbol:'ASTERDM', company_name:'Aster DM Healthcare', sector:'Pharma & Healthcare', industry:'Hospitals', mcap_category:'mid',
    nse_symbol:'ASTERDM', bse_code:'540975', isin:'INE914M01019', founded_year:1987, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Alisha Moopen', employees:23000,
    business_summary:'Multi-specialty hospital chain primarily in South India with significant presence in GCC countries. Owns Aster hospitals, clinics and pharmacies.',
    thematic_tags:['healthcare','hospitals','GCC','diagnostics','pharma-retail'],
    index_membership:['Nifty 500','Nifty Healthcare'], listing_date:'2018-02-26' },

  // ── SPECIALITY / SMALL-CAP ───────────────────────────────────────────────
  { symbol:'STERLINW', company_name:'Sterling and Wilson Renewable Energy', sector:'Power', industry:'EPC Solar', mcap_category:'mid',
    nse_symbol:'STERLINW', bse_code:'543209', isin:'INE00M201021', founded_year:1979, headquarters:'Mumbai, Maharashtra',
    ceo_name:'Khurshed Daruvala', employees:4000,
    business_summary:'Global solar EPC company executing large-scale utility solar projects across India, Middle East, Africa and South-East Asia.',
    thematic_tags:['solar','EPC','renewable-energy','international-projects'],
    index_membership:['Nifty 500'], listing_date:'2019-08-20' },

  { symbol:'APEX', company_name:'Apex Frozen Foods', sector:'Food Processing', industry:'Seafood Processing & Export', mcap_category:'small',
    nse_symbol:'APEX', bse_code:'540695', isin:'INE346W01013', founded_year:1995, headquarters:'Kakinada, Andhra Pradesh',
    ceo_name:'A Satish Kumar', employees:2000,
    business_summary:'Leading shrimp and seafood processor and exporter. Sells branded frozen shrimp to USA, EU and Japan. Integrated from hatchery to processing.',
    thematic_tags:['seafood','aquaculture','exports','food-processing','small-cap'],
    index_membership:['Nifty 500'], listing_date:'2017-08-09' },

  { symbol:'MEESHO', company_name:'Meesho', sector:'Consumer Services', industry:'Social Commerce', mcap_category:'small',
    nse_symbol:'MEESHO', bse_code:'543571', isin:'INE0VDM01015', founded_year:2015, headquarters:'Bengaluru, Karnataka',
    ceo_name:'Vidit Aatrey', employees:15000,
    business_summary:"India's largest social commerce / reseller marketplace targeting Tier 2+ towns. Backed by SoftBank and Fidelity. Profitable as of FY24.",
    thematic_tags:['e-commerce','social-commerce','Tier2-India','new-age','internet'],
    index_membership:[], listing_date:'2024-01-01' },
]

async function main() {
  console.log(`Enriching ${DETAILS.length} stocks in company_profile with full details …`)

  let ok = 0
  for (const row of DETAILS) {
    const { error } = await supabase
      .from('company_profile')
      .upsert(row, { onConflict: 'symbol' })

    if (error) {
      console.error(`  ✗ ${row.symbol}: ${error.message}`)
    } else {
      ok++
      process.stdout.write(`  ${ok}/${DETAILS.length} (${row.symbol})\r`)
    }
  }

  console.log(`\n✅  ${ok}/${DETAILS.length} stocks enriched in company_profile`)

  // Also update companies table corp_group field for known groups
  const groups: Array<{ isin: string; corp_group: string }> = [
    { isin:'INE423A01024', corp_group:'Adani' }, { isin:'INE742F01042', corp_group:'Adani' },
    { isin:'INE814H01011', corp_group:'Adani' }, { isin:'INE364U01010', corp_group:'Adani' },
    { isin:'INE079A01024', corp_group:'Adani' }, { isin:'INE012A01025', corp_group:'Adani' },
    { isin:'INE467B01029', corp_group:'Tata'  }, { isin:'INE155A01022', corp_group:'Tata'  },
    { isin:'INE081A01020', corp_group:'Tata'  }, { isin:'INE192A01025', corp_group:'Tata'  },
    { isin:'INE685A01028', corp_group:'Tata'  }, { isin:'INE849A01020', corp_group:'Tata'  },
    { isin:'INE002A01018', corp_group:'Reliance' },
    { isin:'INE296A01024', corp_group:'Bajaj' }, { isin:'INE918I01026', corp_group:'Bajaj' },
    { isin:'INE047A01021', corp_group:'Aditya Birla' }, { isin:'INE481G01011', corp_group:'Aditya Birla' },
    { isin:'INE038A01020', corp_group:'Aditya Birla' },
    { isin:'INE233A01035', corp_group:'Godrej' }, { isin:'INE102D01028', corp_group:'Godrej' },
  ]

  for (const g of groups) {
    await supabase.from('companies').update({ corp_group: g.corp_group }).eq('isin', g.isin)
  }
  console.log('✅  corp_group updated for major groups in companies table')
}

main().catch((e) => { console.error(e); process.exit(1) })
