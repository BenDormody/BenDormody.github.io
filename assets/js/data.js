/* ============================================================
   data.js — single source of truth for every card on the site.
   To add a project: add an object here. Nothing else to touch.

   category: sports-analytics | software | research | philosophy | poetry
   links.page  — internal page, relative to site root (no leading slash)
   links.live  — live app/site: internal path (no scheme) or full URL
   links.repo / links.pdf — external or asset URLs
   proprietary: true — renders a "details on request" note instead of repo
   career: true — built during a professional role (club/team/firm)
   skills: normalized skill names used by the work-page skill filter
   ============================================================ */

const CATEGORY_META = {
  "sports-analytics": { label: "Sports Analytics", tone: "pitch" },
  software: { label: "Software", tone: "signal" },
  research: { label: "Research", tone: "graphite" },
  philosophy: { label: "Philosophy", tone: "oxblood" },
  poetry: { label: "Poetry", tone: "amber" },
};

const PROJECTS = [
  /* ---------- research (shown only on /research/) ---------- */
  {
    id: "elo-dissertation",
    title: "Evaluating 1v1 Ability with Elo Rating Models",
    category: "research",
    ml: true,
    career: false,
    skills: ["Python", "Pandas", "StatsBomb"],
    tags: ["StatsBomb", "Python", "Elo", "1,140 matches"],
    overview:
      "Success-rate dribbling metrics treat every defender as interchangeable. This MSc dissertation builds separate attacking and defensive Elo ratings from 37,759 duel pairs across the Premier League, La Liga, and Serie A, so a winger who beats elite full-backs finally outranks one who farms weak ones.",
    outcome: "MSc dissertation · Middlesex University",
    duel: true,
    links: {
      page: "research/elo-dissertation/",
      repo: "https://github.com/BenDormody/Evo-Research",
    },
  },

  /* ---------- sports analytics ---------- */
  {
    id: "blackhawks-pricing",
    title: "Dynamic Ticket Pricing Dashboard & RAG Assistant",
    category: "sports-analytics",
    ml: true,
    career: true,
    skills: ["Python", "SQL", "Snowflake", "Streamlit", "Azure OpenAI"],
    tags: ["Snowflake", "Python", "Streamlit", "Azure OpenAI"],
    overview:
      "Built for the Chicago Blackhawks: a Snowflake-backed Streamlit dashboard that surfaces demand signals for ticket pricing, paired with a retrieval-augmented LLM that answers pricing questions against the club's own criteria and data.",
    outcome: "Data Analyst Internship · Chicago Blackhawks",
    proprietary: true,
    duel: false,
    links: {},
    featured: true,
  },
  {
    id: "westham-setpiece",
    title: "Set-Piece & Opposition Analysis, Women's First Team",
    category: "sports-analytics",
    career: true,
    skills: ["Sportscode", "StatsBomb", "Impect"],
    tags: ["Sportscode", "StatsBomb", "Impect", "IDP"],
    overview:
      "Season-long placement leading set-piece, individual development, and data analysis for West Ham United Women. Opposition, set-piece, and post-match profiles in Sportscode; StatsBomb- and Impect-driven dashboards and player ratings for first-team meetings.",
    outcome: "Analyst Placement · West Ham United",
    proprietary: true,
    duel: true,
    links: {},
  },
  {
    id: "ab-transfers",
    title: "Transfer Target & Set-Piece Analysis",
    category: "sports-analytics",
    career: true,
    skills: ["Python", "Pandas", "Wyscout"],
    tags: ["Wyscout", "Python", "Pandas"],
    overview:
      "Eighteen months of statistical due diligence on potential signings for Akademisk Boldklub, mining large Wyscout datasets in Python, plus video analysis of corners and set pieces to squeeze out extra scoring chances.",
    outcome: "Match & Transfer Analyst · Akademisk Boldklub",
    proprietary: true,
    duel: true,
    links: {},
  },
  {
    id: "reds-pitch-mix",
    title: "Pitch-Mix Prediction for Opposing Batters",
    category: "sports-analytics",
    ml: true,
    career: false,
    skills: ["Python", "Pandas"],
    tags: ["Python", "ML", "Baseball"],
    overview:
      "A machine-learning model that predicts the pitch-type probabilities a batter will face next, built from historical pitch data — delivered twice: as a technical report and as a plain-English brief a coaching staff can act on.",
    outcome: "Reds Hackathon project",
    links: { repo: "https://github.com/BenDormody/reds-pitch-mix" },
  },
  {
    id: "fpl-season",
    title: "FPL Season-Long Points Prediction",
    category: "sports-analytics",
    ml: true,
    career: false,
    skills: ["Python", "Pandas"],
    tags: ["Python", "ML", "Fantasy Premier League"],
    overview:
      "Machine-learning pipeline that forecasts Fantasy Premier League returns over a full season — feature engineering on player history, fixtures, and form to rank who is actually worth owning.",
    outcome: "Independent project",
    links: { repo: "https://github.com/BenDormody/FPL-Season-Predict" },
  },
  {
    id: "fpl-gameweek",
    title: "FPL Gameweek Points Prediction",
    category: "sports-analytics",
    ml: true,
    career: false,
    skills: ["Python", "Pandas"],
    tags: ["Python", "ML", "Fantasy Premier League"],
    overview:
      "The short-horizon sibling of the season model: data formatting and machine learning on Fantasy Premier League data to predict individual gameweek hauls and inform weekly transfers and captaincy.",
    outcome: "Independent project",
    links: { repo: "https://github.com/BenDormody/FPL-GameWeek-Predict" },
  },

  /* ---------- software ---------- */
  {
    id: "daily-football-puzzle",
    title: "Daily Football Puzzle",
    category: "software",
    career: false,
    skills: ["JavaScript", "React"],
    tags: ["React 18", "Webpack", "CSS Grid"],
    overview:
      "A daily tactical puzzle: study a real pitch scenario on FIFA-standard coordinates, pick the optimal pass, and get the tactical reasoning back. Pass, move, shot, and through-ball puzzle types with a deterministic daily rotation.",
    outcome: "Web game · React",
    duel: true,
    links: { repo: "https://github.com/BenDormody/daily-football-puzzle" },
    featured: true,
  },
  {
    id: "knowitall",
    title: "Know It All New Yorker",
    category: "software",
    career: false,
    skills: ["Python", "JavaScript", "HTML/CSS"],
    tags: ["Python", "Live site", "NYC events"],
    overview:
      "A running events-and-entertainment guide to New York City — stage, sports, music, museums, and more — that I build and operate end to end: the site, the data pipeline behind the listings, and the social channels around it.",
    outcome: "Live product · knowitallnewyorker.com",
    links: {
      live: "https://knowitallnewyorker.com",
      repo: "https://github.com/BenDormody/KnowItAllNewYork",
    },
    featured: true,
  },
  {
    id: "filmranker",
    title: "FilmRanker",
    category: "software",
    career: false,
    skills: ["JavaScript", "HTML/CSS", "TMDB API"],
    tags: ["JavaScript", "TMDB API", "Live app"],
    overview:
      "Rank any director's or actor's filmography through quick head-to-head choices — binary-insertion comparisons resolve into a defensible ordered list you can copy and share. Try it right here on the site.",
    outcome: "Live web app",
    links: {
      live: "filmranker/",
      repo: "https://github.com/BenDormody/FilmRanker",
    },
  },
  {
    id: "neural-network",
    title: "Neural Network from Scratch",
    category: "software",
    ml: true,
    career: false,
    skills: ["Python", "NumPy"],
    tags: ["Python", "MNIST", "CIFAR"],
    overview:
      "A neural network implemented from first principles and tested against MNIST and CIFAR — the mathematician's route to understanding backpropagation by building it, not importing it.",
    outcome: "Learning project",
    links: { repo: "https://github.com/BenDormody/Neural_Network" },
  },
  {
    id: "trading-platform",
    title: "Live Options Trading Platform",
    category: "software",
    career: true,
    skills: ["Python", "SQL", "ColdFusion", "IBKR API"],
    tags: ["Python", "SQL", "IBKR API", "ColdFusion"],
    overview:
      "A fully functional live trading platform built during a quant internship: trade execution through the Interactive Brokers API, positions and analytics in SQL, and a monitoring layer used to place real trades against a 50% annual return target.",
    outcome: "Quant Trading Internship · Distance Capital",
    proprietary: true,
    links: {},
  },

  /* ---------- philosophy ---------- */
  {
    id: "schrodinger-essay",
    title: "Schrödinger Moral Disengagement",
    category: "philosophy",
    career: false,
    skills: [],
    tags: ["Willful ignorance", "Milgram", "Bandura", "Working draft"],
    overview:
      "An essay on Bandura's mechanisms of moral disengagement, arguing that willful ignorance — choosing not to know — does its moral work before any of those mechanisms are needed.",
    outcome: "Essay · working draft",
    links: { page: "writing/schrodinger-moral-disengagement/" },
    featured: true,
  },
];

/* Featured order on the home page */
const FEATURED_IDS = [
  "blackhawks-pricing",
  "daily-football-puzzle",
  "knowitall",
  "schrodinger-essay",
];
