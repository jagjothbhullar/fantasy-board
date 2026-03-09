import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const anthropic = new Anthropic();
let lastClaudeRun = null;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[WARNING] ANTHROPIC_API_KEY not set — Claude analysis will not work!');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ============================================================
// FANTASY BIG BOARD - Top 150 Players for 2026-2027 Season
// ============================================================
// Base rankings sourced from PFF's Way-Too-Early Top 300 PPR Big Board
// Adjusted for all known FA moves as of March 9, 2026
// 2026 NFL Draft rookies (Love, Mendoza, Concepcion, Price, Sadiq) included

const initialBoard = [
  // --- TIER 1: ELITE (1-12) ---
  { rank: 1, name: "Bijan Robinson", pos: "RB", team: "ATL", note: "Consensus RB1. Tua pursuit could supercharge this offense." },
  { rank: 2, name: "Jahmyr Gibbs", pos: "RB", team: "DET", note: "Elite pass-catcher in best offense in football." },
  { rank: 3, name: "Christian McCaffrey", pos: "RB", team: "SF", note: "When healthy, no ceiling. Evans arrival boosts passing game." },
  { rank: 4, name: "Puka Nacua", pos: "WR", team: "LAR", note: "Best WR in football last 2 years. Target volume king." },
  { rank: 5, name: "Ja'Marr Chase", pos: "WR", team: "CIN", note: "Elite WR1. Burrow stack is cheat code." },
  { rank: 6, name: "Jaxon Smith-Njigba", pos: "WR", team: "SEA", note: "🔥 Walker departure = more passing volume in SEA. Top-5 WR.", trend: "up", trendAmt: 4 },
  { rank: 7, name: "De'Von Achane", pos: "RB", team: "MIA", note: "⬇️ Electric talent but Willis at QB = downgrade from Tua.", trend: "down", trendAmt: 3 },
  { rank: 8, name: "Amon-Ra St. Brown", pos: "WR", team: "DET", note: "PPR machine in best offense in the league." },
  { rank: 9, name: "James Cook III", pos: "RB", team: "BUF", note: "Allen's backfield partner. Consistent RB1." },
  { rank: 10, name: "Drake London", pos: "WR", team: "ATL", note: "🔥 Tua pursuit could make this a top-5 WR situation.", trend: "up", trendAmt: 4 },
  { rank: 11, name: "CeeDee Lamb", pos: "WR", team: "DAL", note: "Target monster. Pickens tagged keeps WR corps loaded." },
  { rank: 12, name: "Josh Jacobs", pos: "RB", team: "GB", note: "Workhorse volume in Green Bay." },

  // --- TIER 2: FIRST ROUND RANGE (13-24) ---
  { rank: 13, name: "Jonathan Taylor", pos: "RB", team: "IND", note: "Bounce-back year. Pierce re-signing helps scheme." },
  { rank: 14, name: "Trey McBride", pos: "TE", team: "ARI", note: "TE1 overall. Target monster in Arizona." },
  { rank: 15, name: "Nico Collins", pos: "WR", team: "HOU", note: "Alpha WR1. Stroud's top weapon." },
  { rank: 16, name: "Justin Jefferson", pos: "WR", team: "MIN", note: "Generational talent. Sam Darnold/QB situation only concern." },
  { rank: 17, name: "Saquon Barkley", pos: "RB", team: "PHI", note: "Workhorse in Philly's dominant rushing attack." },
  { rank: 18, name: "Rashee Rice", pos: "WR", team: "KC", note: "🔥 Walker arrival lightens boxes. Mahomes' clear WR1.", trend: "up", trendAmt: 3 },
  { rank: 19, name: "Brock Bowers", pos: "TE", team: "LV", note: "Generational TE. Elite PPR floor." },
  { rank: 20, name: "Josh Allen", pos: "QB", team: "BUF", note: "QB1 overall. Rushing + passing ceiling unmatched." },
  { rank: 21, name: "Kyren Williams", pos: "RB", team: "LAR", note: "Lead back in McVay offense with Nacua + Adams." },
  { rank: 22, name: "Ashton Jeanty", pos: "RB", team: "LV", note: "Sophomore stud. Explosive talent with Bowers." },
  { rank: 23, name: "A.J. Brown", pos: "WR", team: "PHI", note: "Elite WR1. Hurts' top target." },
  { rank: 24, name: "Malik Nabers", pos: "WR", team: "NYG", note: "🔥 Likely signing boosts entire offense. Star WR.", trend: "up", trendAmt: 2 },

  // --- TIER 3: EARLY-MID ROUNDS (25-48) ---
  { rank: 25, name: "Omarion Hampton", pos: "RB", team: "LAC", note: "Sophomore workhorse. Chargers lean on the run." },
  { rank: 26, name: "George Pickens", pos: "WR", team: "DAL", note: "Franchise tagged. Career year in '25 (93/1,429/9)." },
  { rank: 27, name: "Chase Brown", pos: "RB", team: "CIN", note: "Lead back in elite Burrow/Chase offense." },
  { rank: 28, name: "Derrick Henry", pos: "RB", team: "BAL", note: "Age-defying. Dominant in Lamar's offense." },
  { rank: 29, name: "Tee Higgins", pos: "WR", team: "CIN", note: "WR2 in best passing game in the NFL." },
  { rank: 30, name: "Davante Adams", pos: "WR", team: "LAR", note: "Moved to Rams. Stafford + McVay = WR revival." },
  { rank: 31, name: "DeVonta Smith", pos: "WR", team: "PHI", note: "Reliable WR2 in Philly." },
  { rank: 32, name: "Bucky Irving", pos: "RB", team: "TB", note: "⬇️ Gainwell signing (2yr/$14M) creates committee. Upside capped.", trend: "down", trendAmt: 8 },
  { rank: 33, name: "Chris Olave", pos: "WR", team: "NO", note: "Elite talent trapped in bad situation. Saints need QB." },
  { rank: 34, name: "Tetairoa McMillan", pos: "WR", team: "CAR", note: "Sophomore WR. Big-bodied red zone threat." },
  { rank: 35, name: "Kenneth Walker III", pos: "RB", team: "KC", note: "🔥 Super Bowl MVP → Chiefs 3yr/$45M. RB1 for Mahomes!", trend: "up", trendAmt: 15 },
  { rank: 36, name: "Ladd McConkey", pos: "WR", team: "LAC", note: "Breakout WR. Herbert's top target." },
  { rank: 37, name: "Jameson Williams", pos: "WR", team: "DET", note: "Deep threat in best offense in the NFL." },
  { rank: 38, name: "Jalen Hurts", pos: "QB", team: "PHI", note: "Rushing upside. Safe QB1 floor." },
  { rank: 39, name: "TreVeyon Henderson", pos: "RB", team: "NE", note: "Sophomore back. Lead role in New England." },
  { rank: 40, name: "Garrett Wilson", pos: "WR", team: "NYJ", note: "Talent is obvious. QB situation is the variable." },
  { rank: 41, name: "Jaylen Waddle", pos: "WR", team: "MIA", note: "⬇️ Willis at QB = downgrade from Tua. Was Tua-dependent.", trend: "down", trendAmt: 6 },
  { rank: 42, name: "Joe Burrow", pos: "QB", team: "CIN", note: "Elite passer. Chase + Higgins + Brown backfield." },
  { rank: 43, name: "Terry McLaurin", pos: "WR", team: "WAS", note: "Daniels' WR1. Reliable every week." },
  { rank: 44, name: "Cam Skattebo", pos: "RB", team: "NYG", note: "Sophomore power back. Giants building around him." },
  { rank: 45, name: "Lamar Jackson", pos: "QB", team: "BAL", note: "Dual-threat king. Henry + Flowers weapons." },
  { rank: 46, name: "George Kittle", pos: "TE", team: "SF", note: "Still top-3 TE. CMC opens things up." },
  { rank: 47, name: "Zay Flowers", pos: "WR", team: "BAL", note: "Likely gone opens more slot work. Lamar's guy." },
  { rank: 48, name: "Drake Maye", pos: "QB", team: "NE", note: "Year 2 leap. Henderson gives him a backfield." },

  // --- TIER 4: MID ROUNDS (49-72) ---
  { rank: 49, name: "D.K. Metcalf", pos: "WR", team: "PIT", note: "Traded to Steelers. Big-play WR in new home." },
  { rank: 50, name: "Jeremiyah Love", pos: "RB", team: "ROOKIE", note: "🎓 2026 RB1. Three-down workhorse. Projected top-10 pick." },
  { rank: 51, name: "Courtland Sutton", pos: "WR", team: "DEN", note: "Nix's top target. R.J. Harvey helps offense." },
  { rank: 52, name: "Breece Hall", pos: "RB", team: "NYJ", note: "Franchise tagged $14.3M. Locked in as Jets RB1." },
  { rank: 53, name: "Brian Thomas Jr.", pos: "WR", team: "JAX", note: "Breakout WR. Travis Hunter on other side helps." },
  { rank: 54, name: "Michael Pittman Jr.", pos: "WR", team: "PIT", note: "Traded to Steelers. Reunites with Metcalf." },
  { rank: 55, name: "Quinshon Judkins", pos: "RB", team: "CLE", note: "Sophomore workhorse for Browns." },
  { rank: 56, name: "Michael Wilson", pos: "WR", team: "ARI", note: "WR2 next to MHJ. McBride takes TE targets." },
  { rank: 57, name: "D'Andre Swift", pos: "RB", team: "CHI", note: "Lead back. DJ Moore gone could shift gameplan." },
  { rank: 58, name: "Marvin Harrison Jr.", pos: "WR", team: "ARI", note: "Generational talent. Year 2 leap expected." },
  { rank: 59, name: "Zach Charbonnet", pos: "RB", team: "SEA", note: "🔥 Walker gone = SEA RB1! Huge volume boost.", trend: "up", trendAmt: 18 },
  { rank: 60, name: "Sam LaPorta", pos: "TE", team: "DET", note: "TE in best offense. High floor." },
  { rank: 61, name: "Emeka Egbuka", pos: "WR", team: "TB", note: "Sophomore WR. Evans departure could mean WR1." },
  { rank: 62, name: "Tyler Allgeier", pos: "RB", team: "FA", note: "Free agent. Landing spot is everything." },
  { rank: 63, name: "Rico Dowdle", pos: "RB", team: "FA", note: "Free agent RB. Could land lead role somewhere." },
  { rank: 64, name: "Jaxson Dart", pos: "QB", team: "NYG", note: "Sophomore QB. Nabers + Likely = weapons galore." },
  { rank: 65, name: "R.J. Harvey", pos: "RB", team: "DEN", note: "Sophomore back in Denver. Shares with Javonte?" },
  { rank: 66, name: "Tucker Kraft", pos: "TE", team: "GB", note: "Emerging TE in Love's offense." },
  { rank: 67, name: "Jaylen Warren", pos: "RB", team: "PIT", note: "PPR upside. Metcalf/Pittman arrival boosts offense." },
  { rank: 68, name: "Harold Fannin Jr.", pos: "TE", team: "CLE", note: "Sophomore TE. Huge target share potential." },
  { rank: 69, name: "Jayden Daniels", pos: "QB", team: "WAS", note: "Dual-threat. Year 2 leap with McLaurin." },
  { rank: 70, name: "Tyler Warren", pos: "TE", team: "IND", note: "Sophomore TE on Colts. All-around weapon." },
  { rank: 71, name: "Travis Etienne Jr.", pos: "RB", team: "FA", note: "Unsigned. Broncos, Seahawks interested. Landing spot = value.", trend: "neutral", trendAmt: 0 },
  { rank: 72, name: "Jakobi Meyers", pos: "WR", team: "JAX", note: "Reliable slot. PPR value." },

  // --- TIER 5: LATE-MID ROUNDS (73-100) ---
  { rank: 73, name: "Colston Loveland", pos: "TE", team: "CHI", note: "Sophomore TE. Caleb Williams' safety valve." },
  { rank: 74, name: "Mike Evans", pos: "WR", team: "FA", note: "Free agent. Ageless WR. Landing spot matters." },
  { rank: 75, name: "Luther Burden III", pos: "WR", team: "CHI", note: "🔥 DJ Moore traded = more targets for Burden.", trend: "up", trendAmt: 6 },
  { rank: 76, name: "Jauan Jennings", pos: "WR", team: "FA", note: "Free agent WR. Produced in SF." },
  { rank: 77, name: "David Montgomery", pos: "RB", team: "HOU", note: "🔥 Traded to Texans. Lead back in strong offense.", trend: "up", trendAmt: 10 },
  { rank: 78, name: "Blake Corum", pos: "RB", team: "LAR", note: "Kyren's backup. Handcuff value in McVay's offense." },
  { rank: 79, name: "Christian Watson", pos: "WR", team: "GB", note: "Boom-bust deep threat for Love." },
  { rank: 80, name: "Jordan Addison", pos: "WR", team: "MIN", note: "Deep threat opposite Jefferson." },
  { rank: 81, name: "Rome Odunze", pos: "WR", team: "CHI", note: "🔥 DJ Moore gone = WR1 role for Caleb Williams.", trend: "up", trendAmt: 10 },
  { rank: 82, name: "Kyle Pitts", pos: "TE", team: "ATL", note: "🔥 Franchise tagged. Tua arrival = massive unlock.", trend: "up", trendAmt: 8 },
  { rank: 83, name: "Jordan Mason", pos: "RB", team: "MIN", note: "Moved to Vikings. Lead back potential." },
  { rank: 84, name: "Ricky Pearsall", pos: "WR", team: "SF", note: "Emerging WR in SF. Evans arrival makes him WR2." },
  { rank: 85, name: "Chuba Hubbard", pos: "RB", team: "CAR", note: "Workhorse volume on weak team." },
  { rank: 86, name: "Chris Godwin", pos: "WR", team: "TB", note: "If healthy, still a PPR monster." },
  { rank: 87, name: "Alvin Kamara", pos: "RB", team: "NO", note: "Aging but elite pass-catcher. PPR gold." },
  { rank: 88, name: "Rachaad White", pos: "RB", team: "FA", note: "⬇️ Left TB. Free agent. Gainwell took his spot.", trend: "down", trendAmt: 5 },
  { rank: 89, name: "DJ Moore", pos: "WR", team: "BUF", note: "🔥 Traded to Bills. Reunites with Joe Brady. Josh Allen + Moore.", trend: "up", trendAmt: 8 },
  { rank: 90, name: "Brock Purdy", pos: "QB", team: "SF", note: "Efficient QB. CMC + weapons = safe floor." },
  { rank: 91, name: "James Conner", pos: "RB", team: "ARI", note: "Veteran RB. Shares with Benson." },
  { rank: 92, name: "Patrick Mahomes", pos: "QB", team: "KC", note: "🔥 Walker gives him a real RB weapon. Less negative gamescript.", trend: "up", trendAmt: 3 },
  { rank: 93, name: "Woody Marks", pos: "RB", team: "HOU", note: "⬇️ Montgomery trade means backup role.", trend: "down", trendAmt: 5 },
  { rank: 94, name: "Kenneth Gainwell", pos: "RB", team: "TB", note: "🔥 2yr/$14M in Tampa. Committee with Irving.", trend: "up", trendAmt: 8 },
  { rank: 95, name: "Fernando Mendoza", pos: "QB", team: "ROOKIE", note: "🎓 2026 Heisman winner. 41 TDs, 90.3 QBR. Day 1 starter upside." },
  { rank: 96, name: "Deebo Samuel", pos: "WR", team: "FA", note: "Free agent. Versatile weapon wherever he lands." },
  { rank: 97, name: "Trevor Lawrence", pos: "QB", team: "JAX", note: "Bounce back? Hunter + Thomas gives him weapons." },
  { rank: 98, name: "Mark Andrews", pos: "TE", team: "BAL", note: "Lamar's safety blanket. TD upside." },
  { rank: 99, name: "KC Concepcion", pos: "WR", team: "ROOKIE", note: "🎓 2026 top WR prospect. 27.2% target share at Texas A&M." },
  { rank: 100, name: "Alec Pierce", pos: "WR", team: "IND", note: "Re-signed. Career year '25 (21.3 YPR). WR1 locked in." },

  // --- TIER 6: LATE ROUNDS (101-130) ---
  { rank: 101, name: "Oronde Gadsden", pos: "TE", team: "LAC", note: "Sophomore TE. Athletic freak in LAC." },
  { rank: 102, name: "Dak Prescott", pos: "QB", team: "DAL", note: "Pickens + Lamb = weapons. Safe QB." },
  { rank: 103, name: "Kayshon Boutte", pos: "WR", team: "NE", note: "Breakout candidate with Maye." },
  { rank: 104, name: "Aaron Jones", pos: "RB", team: "MIN", note: "Veteran. Shares with Mason." },
  { rank: 105, name: "Matthew Stafford", pos: "QB", team: "LAR", note: "Nacua + Adams weapons. Elite passing." },
  { rank: 106, name: "Stefon Diggs", pos: "WR", team: "NE", note: "Bounce back from injury. Maye's veteran." },
  { rank: 107, name: "Jadarian Price", pos: "RB", team: "ROOKIE", note: "🎓 2026 RB2. 4.13 YAC. Pass-catching upside." },
  { rank: 108, name: "Khalil Shakir", pos: "WR", team: "BUF", note: "PPR darling. Allen's reliable target." },
  { rank: 109, name: "Jacory Croskey-Merritt", pos: "RB", team: "WAS", note: "Sophomore back in Daniels' offense." },
  { rank: 110, name: "Tony Pollard", pos: "RB", team: "TEN", note: "Solid volume. Shares with Spears." },
  { rank: 111, name: "Jayden Reed", pos: "WR", team: "GB", note: "Slot WR in Love's offense." },
  { rank: 112, name: "Dalton Kincaid", pos: "TE", team: "BUF", note: "TE upside with Allen. Inconsistent targets." },
  { rank: 113, name: "Dylan Sampson", pos: "RB", team: "CLE", note: "Sophomore speed back. Shares with Judkins." },
  { rank: 114, name: "Xavier Worthy", pos: "WR", team: "KC", note: "🔥 Walker eases stacked boxes. Speed kills.", trend: "up", trendAmt: 4 },
  { rank: 115, name: "Bo Nix", pos: "QB", team: "DEN", note: "Year 2 starter. Rushing upside." },
  { rank: 116, name: "Trey Benson", pos: "RB", team: "ARI", note: "Conner's backup. Breakout candidate." },
  { rank: 117, name: "Travis Hunter", pos: "WR", team: "JAX", note: "Two-way star settling into WR role." },
  { rank: 118, name: "Jared Goff", pos: "QB", team: "DET", note: "Game manager in best offense. Safe QB2." },
  { rank: 119, name: "Tyjae Spears", pos: "RB", team: "TEN", note: "Split with Pollard. PPR upside." },
  { rank: 120, name: "Tyreek Hill", pos: "WR", team: "MIA", note: "⬇️ Willis at QB = massive downgrade from Tua. Age 32.", trend: "down", trendAmt: 8 },
  { rank: 121, name: "Dallas Goedert", pos: "TE", team: "FA", note: "Free agent TE. Solid floor wherever he lands." },
  { rank: 122, name: "Josh Downs", pos: "WR", team: "IND", note: "Slot value. Richardson's safety valve." },
  { rank: 123, name: "Jake Ferguson", pos: "TE", team: "DAL", note: "TE1 in Dallas. Lamb + Pickens draw coverage." },
  { rank: 124, name: "Jordan Love", pos: "QB", team: "GB", note: "Weapons everywhere. Watson + Reed + Jacobs." },
  { rank: 125, name: "Keaton Mitchell", pos: "RB", team: "BAL", note: "Explosive when healthy. Henry handcuff." },
  { rank: 126, name: "Romeo Doubs", pos: "WR", team: "FA", note: "Free agent. PPR WR wherever he lands." },
  { rank: 127, name: "Rhamondre Stevenson", pos: "RB", team: "NE", note: "Shares with Henderson. Veteran presence." },
  { rank: 128, name: "Matthew Golden", pos: "WR", team: "GB", note: "Sophomore WR. Deep threat for Love." },
  { rank: 129, name: "J.K. Dobbins", pos: "RB", team: "FA", note: "Free agent RB. Injury history concern." },
  { rank: 130, name: "Rashid Shaheed", pos: "WR", team: "FA", note: "Free agent deep threat." },

  // --- TIER 7: DEEP SLEEPERS & STASHES (131-150) ---
  { rank: 131, name: "Justin Herbert", pos: "QB", team: "LAC", note: "Safe QB2. Hampton + McConkey weapons." },
  { rank: 132, name: "Braelon Allen", pos: "RB", team: "NYJ", note: "Hall backup. Stash in dynasty." },
  { rank: 133, name: "Hunter Henry", pos: "TE", team: "NE", note: "Veteran TE. Safe PPR floor." },
  { rank: 134, name: "Brenton Strange", pos: "TE", team: "JAX", note: "Emerging TE. Lawrence's middle-field target." },
  { rank: 135, name: "Caleb Williams", pos: "QB", team: "CHI", note: "⬇️ DJ Moore traded. Needs new WR1. Odunze/Burden step up?", trend: "down", trendAmt: 5 },
  { rank: 136, name: "Kimani Vidal", pos: "RB", team: "LAC", note: "Hampton backup. Deep stash." },
  { rank: 137, name: "Baker Mayfield", pos: "QB", team: "TB", note: "Solid QB2. Evans leaving hurts.", trend: "down", trendAmt: 3 },
  { rank: 138, name: "Jonathon Brooks", pos: "RB", team: "CAR", note: "Hubbard backup. Health is concern." },
  { rank: 139, name: "Kenyon Sadiq", pos: "TE", team: "ROOKIE", note: "🎓 2026 top TE prospect. Oregon pass-catcher." },
  { rank: 140, name: "Jalen Coker", pos: "WR", team: "CAR", note: "Deep sleeper WR in Carolina." },
  { rank: 141, name: "Isaiah Likely", pos: "TE", team: "NYG", note: "🔥 3yr/$40M. Reunited with Harbaugh. TE1 upside.", trend: "up", trendAmt: 10 },
  { rank: 142, name: "Tank Dell", pos: "WR", team: "HOU", note: "Big-play threat. Montgomery arrival helps gameflow." },
  { rank: 143, name: "Malik Willis", pos: "QB", team: "MIA", note: "🔥 3yr/$67.5M. Starting QB. Rushing upside in MIA.", trend: "up", trendAmt: 20 },
  { rank: 144, name: "Kendre Miller", pos: "RB", team: "NO", note: "Lead back potential if Kamara ages out." },
  { rank: 145, name: "Quentin Johnston", pos: "WR", team: "LAC", note: "Year 3. Herbert's deep threat." },
  { rank: 146, name: "Wan'Dale Robinson", pos: "WR", team: "FA", note: "Free agent slot WR." },
  { rank: 147, name: "Sean Tucker", pos: "RB", team: "TB", note: "⬇️ Gainwell arrival pushes him down depth chart.", trend: "down", trendAmt: 4 },
  { rank: 148, name: "Calvin Ridley", pos: "WR", team: "TEN", note: "Veteran. Declining production." },
  { rank: 149, name: "Jerry Jeudy", pos: "WR", team: "CLE", note: "Talent stuck in bad offense." },
  { rank: 150, name: "Emanuel Wilson", pos: "RB", team: "GB", note: "Jacobs handcuff. Deep league stash." },
];

// ============================================================
// BOARD STATE MANAGEMENT
// ============================================================

let board = JSON.parse(JSON.stringify(initialBoard));
let moves = [];
let lastFetchTime = new Date().toISOString();
let newsItems = [];
let fetchCount = 0;

// Track free agency moves and their fantasy impact
const knownMoves = [
  { time: "2026-03-09T12:05:00Z", player: "Kenneth Walker III", from: "SEA", to: "KC", deal: "3yr/$45M", impact: "Super Bowl MVP → Chiefs. RB1 for Mahomes. Massive upgrade.", fantasyChange: "up" },
  { time: "2026-03-09T12:10:00Z", player: "Malik Willis", from: "GB", to: "MIA", deal: "3yr/$67.5M ($45M gtd)", impact: "Starting QB in Miami. Running upside. Replaces Tua.", fantasyChange: "up" },
  { time: "2026-03-09T12:15:00Z", player: "Kenneth Gainwell", from: "PIT", to: "TB", deal: "2yr/$14M ($10M gtd)", impact: "Steelers MVP → committee role in Tampa with Irving.", fantasyChange: "up" },
  { time: "2026-03-09T12:20:00Z", player: "Tua Tagovailoa", from: "MIA", to: "FA → ATL (frontrunner)", deal: "Released ($99.2M dead cap)", impact: "Falcons pursuing. Could unlock Robinson, London, Pitts.", fantasyChange: "up" },
  { time: "2026-03-09T12:25:00Z", player: "Isaiah Likely", from: "BAL", to: "NYG", deal: "3yr/$40M", impact: "Reunited with Harbaugh. TE1 upside in New York.", fantasyChange: "up" },
  { time: "2026-03-09T12:30:00Z", player: "David Montgomery", from: "DET", to: "HOU", deal: "Trade", impact: "Lead back for Texans. Stroud + weapons = great offense.", fantasyChange: "up" },
  { time: "2026-03-09T12:35:00Z", player: "Michael Pittman Jr.", from: "IND", to: "PIT", deal: "Trade", impact: "Steelers adding weapons. Reunites with Metcalf trade.", fantasyChange: "neutral" },
  { time: "2026-03-09T12:40:00Z", player: "DJ Moore", from: "CHI", to: "BUF", deal: "Trade (CHI gets 2nd, BUF gets Moore + 5th)", impact: "Reunites with Joe Brady. Josh Allen + Moore is dangerous.", fantasyChange: "up" },
  { time: "2026-03-09T12:45:00Z", player: "D.K. Metcalf", from: "SEA", to: "PIT", deal: "Trade", impact: "Steelers loading up. New deep threat for Pittsburgh.", fantasyChange: "neutral" },
  { time: "2026-03-09T12:50:00Z", player: "Trent McDuffie", from: "KC", to: "LAR", deal: "4yr/$124M (record CB deal)", impact: "IDP: Record CB contract. Elite corner in LA.", fantasyChange: "neutral" },
  { time: "2026-03-09T12:55:00Z", player: "Minkah Fitzpatrick", from: "MIA", to: "NYJ", deal: "3yr/$40M", impact: "IDP: Safety upgrade for Jets defense.", fantasyChange: "neutral" },
  { time: "2026-03-09T13:00:00Z", player: "Danielle Hunter", from: "HOU", to: "HOU", deal: "1yr/$40.1M extension", impact: "IDP: Elite edge stays in Houston.", fantasyChange: "neutral" },
  { time: "2026-03-09T13:05:00Z", player: "Alec Pierce", from: "IND", to: "IND", deal: "Re-signed", impact: "WR1 role locked in. Career year coming.", fantasyChange: "up" },
  { time: "2026-03-09T13:10:00Z", player: "Tyler Biadasz", from: "WAS", to: "LAC", deal: "3yr/$30M", impact: "OL upgrade for Chargers. Helps Herbert, Hampton, McConkey.", fantasyChange: "neutral" },
  { time: "2026-03-09T13:15:00Z", player: "Khalil Mack", from: "LAC", to: "LAC", deal: "1yr/$18M fully gtd", impact: "IDP: Returns to Chargers edge.", fantasyChange: "neutral" },
  { time: "2026-03-09T13:20:00Z", player: "Sheldon Rankins", from: "FA", to: "HOU", deal: "2yr/$12M gtd", impact: "IDP: DT upgrade for Texans defense.", fantasyChange: "neutral" },
  { time: "2026-03-09T13:25:00Z", player: "Rashan Gary", from: "GB", to: "DAL", deal: "Trade (for 2027 4th)", impact: "IDP: Edge rusher to Cowboys.", fantasyChange: "neutral" },
  { time: "2026-03-09T13:30:00Z", player: "Jaylen Watson", from: "KC", to: "LAR", deal: "3yr/$51M ($34M gtd)", impact: "CB follows McDuffie to Rams.", fantasyChange: "neutral" },
];

moves = [...knownMoves];

// ============================================================
// NEWS FETCHING — Multiple sources, every 30 seconds
// ============================================================

const RSS_FEEDS = [
  // Major sports outlets
  'https://www.espn.com/espn/rss/nfl/news',
  'https://api.foxsports.com/bifrost/v1/nfl/feed?type=rss',
  'https://www.cbssports.com/rss/headlines/nfl/',
  // Fantasy-specific sources
  'https://www.fantasypros.com/nfl/rss/news.php',
  'https://www.rotowire.com/rss/nfl.xml',
  'https://www.rotoworld.com/rss/nfl',
  'https://ftnfantasy.com/rss/nfl',
  'https://www.4for4.com/rss.xml',
  'https://www.draftsharks.com/rss/news.xml',
];

async function fetchLatestNews() {
  fetchCount++;
  const allItems = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'FantasyBigBoard/1.0' }
      });
      clearTimeout(timeout);

      if (!response.ok) continue;
      const text = await response.text();

      // Parse RSS items
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null) {
        const titleMatch = match[1].match(/<title>([\s\S]*?)<\/title>/);
        const descMatch = match[1].match(/<description>([\s\S]*?)<\/description>/);
        const linkMatch = match[1].match(/<link>([\s\S]*?)<\/link>/);
        if (titleMatch) {
          allItems.push({
            title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
            description: descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim() : '',
            link: linkMatch ? linkMatch[1].trim() : '',
            time: new Date().toISOString(),
            source: feedUrl.includes('espn') ? 'ESPN' : feedUrl.includes('fox') ? 'FOX' : feedUrl.includes('cbs') ? 'CBS' : feedUrl.includes('fantasypros') ? 'FantasyPros' : feedUrl.includes('rotowire') ? 'RotoWire' : feedUrl.includes('rotoworld') ? 'RotoWorld' : feedUrl.includes('ftn') ? 'FTN' : feedUrl.includes('4for4') ? '4for4' : feedUrl.includes('draftsharks') ? 'DraftSharks' : 'NFL'
          });
        }
      }
    } catch (err) {
      // Silent fail per feed
    }
  }

  // Filter for free agency / signing / trade keywords
  const faKeywords = ['sign', 'trade', 'release', 'cut', 'deal', 'agree', 'free agent', 'contract', 'extension', 'franchise', 'waiv', 'claim'];
  const relevantNews = allItems.filter(item => {
    const text = (item.title + ' ' + item.description).toLowerCase();
    return faKeywords.some(kw => text.includes(kw));
  });

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = relevantNews.filter(item => {
    const key = item.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length > 0) {
    newsItems = unique.slice(0, 25);
  }
  lastFetchTime = new Date().toISOString();
  console.log(`[Fetch #${fetchCount}] ${new Date().toLocaleTimeString()} — ${allItems.length} items, ${unique.length} FA-related`);

  // Queue new headlines for Claude analysis and run immediately
  if (unique.length > 0) {
    pendingHeadlines.push(...unique);
    // Run Claude right away instead of waiting for the 10-min timer
    runClaudeAnalysis();
  }
}

// Buffer headlines between Claude runs
let pendingHeadlines = [];

// ============================================================
// CLAUDE AI — Parse headlines into board moves automatically
// ============================================================

// Track headlines we've already analyzed to avoid duplicates
const analyzedHeadlines = new Set();

async function analyzeNewsWithClaude(headlines) {
  // Only analyze headlines we haven't seen before
  const newHeadlines = headlines.filter(h => !analyzedHeadlines.has(h.title));
  if (newHeadlines.length === 0) return;

  // Build the current board player list for Claude's context
  const playerList = board.map(p => `${p.name} (${p.pos}, ${p.team})`).join(', ');

  const headlineText = newHeadlines.map(h =>
    `- [${h.source}] ${h.title}${h.description ? ': ' + h.description.slice(0, 150) : ''}`
  ).join('\n');

  try {
    lastClaudeRun = new Date().toISOString();
    console.log(`[Claude] Analyzing ${newHeadlines.length} new headlines...`);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a fantasy football analyst. Parse these NFL news headlines and extract ONLY concrete player moves (signings, trades, releases, franchise tags). Ignore rumors, speculation, and non-fantasy-relevant moves (coaches, punters, long snappers, practice squad).

HEADLINES:
${headlineText}

CURRENT BOARD PLAYERS:
${playerList}

For each concrete move found, return a JSON array. Each object must have:
- "player": full player name (must match board name if on board)
- "from": previous team abbreviation (or "FA")
- "to": new team abbreviation
- "deal": contract details if mentioned (e.g. "3yr/$45M") or "Trade" or "Released"
- "impact": one sentence fantasy football impact analysis
- "fantasyChange": "up" if the move helps their fantasy value, "down" if it hurts, "neutral" if minimal impact
- "affectedPlayers": array of objects for OTHER players on the board affected by this move, each with {"name", "impact", "fantasyChange"} — e.g. if a WR signs with a team, the existing WR1 there might trend down

Return ONLY valid JSON array. If no concrete moves found, return [].
Do NOT include moves for players already tracked with these exact teams: ${moves.map(m => `${m.player}→${m.to}`).join(', ')}`
      }]
    });

    const text = response.content[0].text.trim();
    console.log(`[Claude] Raw response (${text.length} chars):`, text.slice(0, 500));

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('[Claude] No JSON array found in response');
      return;
    }

    let parsedMoves;
    try {
      parsedMoves = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[Claude] JSON parse error:', parseErr.message);
      console.log('[Claude] Raw JSON:', jsonMatch[0].slice(0, 300));
      return;
    }

    if (!Array.isArray(parsedMoves) || parsedMoves.length === 0) {
      console.log('[Claude] Parsed but empty array');
      newHeadlines.forEach(h => analyzedHeadlines.add(h.title));
      return;
    }

    console.log(`[Claude] Found ${parsedMoves.length} new moves!`);

    // Mark headlines as analyzed only after successful extraction
    newHeadlines.forEach(h => analyzedHeadlines.add(h.title));

    for (const m of parsedMoves) {
      // Check if we already have this exact move
      const isDuplicate = moves.some(existing =>
        existing.player.toLowerCase() === m.player.toLowerCase() &&
        existing.to.toLowerCase() === m.to.toLowerCase()
      );
      if (isDuplicate) continue;

      // Add to moves list
      const move = {
        time: new Date().toISOString(),
        player: m.player,
        from: m.from || 'FA',
        to: m.to,
        deal: m.deal || 'TBD',
        impact: m.impact || '',
        fantasyChange: m.fantasyChange || 'neutral',
        auto: true // flag that Claude added this
      };
      moves.push(move);
      console.log(`  → ${m.player}: ${m.from} → ${m.to} (${m.deal}) [${m.fantasyChange}]`);

      // Update the player on the board
      const idx = board.findIndex(p =>
        p.name.toLowerCase() === m.player.toLowerCase() ||
        p.name.toLowerCase().includes(m.player.toLowerCase()) ||
        m.player.toLowerCase().includes(p.name.toLowerCase())
      );
      if (idx !== -1) {
        board[idx].team = m.to;
        board[idx].note = `🤖 ${m.deal || 'Signed'} with ${m.to}. ${m.impact || ''}`;
        if (m.fantasyChange === 'up') {
          board[idx].trend = 'up';
          board[idx].trendAmt = (board[idx].trendAmt || 0) + 5;
        } else if (m.fantasyChange === 'down') {
          board[idx].trend = 'down';
          board[idx].trendAmt = (board[idx].trendAmt || 0) + 5;
        }
      }

      // Handle affected players (ripple effects)
      if (m.affectedPlayers && Array.isArray(m.affectedPlayers)) {
        for (const affected of m.affectedPlayers) {
          const aIdx = board.findIndex(p =>
            p.name.toLowerCase() === affected.name?.toLowerCase() ||
            p.name.toLowerCase().includes(affected.name?.toLowerCase()) ||
            affected.name?.toLowerCase().includes(p.name.toLowerCase())
          );
          if (aIdx !== -1) {
            const arrow = affected.fantasyChange === 'up' ? '🔥' : affected.fantasyChange === 'down' ? '⬇️' : '';
            board[aIdx].note = `${arrow} ${affected.impact || 'Affected by ' + m.player + ' move.'}`;
            if (affected.fantasyChange === 'up' || affected.fantasyChange === 'down') {
              board[aIdx].trend = affected.fantasyChange;
              board[aIdx].trendAmt = (board[aIdx].trendAmt || 0) + 3;
            }
          }
        }
      }
    }

    lastFetchTime = new Date().toISOString();
  } catch (err) {
    console.error(`[Claude] Error: ${err.message}`, err.status || '');
  }
}

// Schedule-aware polling: active 6:30 AM - 1:00 AM PT, single catch-up at 6:30 AM
function isActiveHours() {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const hour = pt.getHours();
  const min = pt.getMinutes();
  const timeVal = hour * 60 + min; // minutes since midnight
  // Active: 6:30 AM (390) to 1:00 AM next day (treat as 25:00 = 1500)
  // Inactive: 1:00 AM (60) to 6:30 AM (390)
  return timeVal >= 390 || timeVal < 60;
}

let overnightCatchUpDone = false;

function scheduledFetch() {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const hour = pt.getHours();
  const min = pt.getMinutes();
  const timeVal = hour * 60 + min;

  if (isActiveHours()) {
    overnightCatchUpDone = false; // reset for next overnight
    fetchLatestNews();
  } else if (!overnightCatchUpDone && timeVal >= 390) {
    // 6:30 AM catch-up fetch for overnight news
    console.log('[Schedule] 6:30 AM catch-up — fetching overnight news');
    overnightCatchUpDone = true;
    fetchLatestNews();
  }
  // Otherwise: sleeping (1 AM - 6:30 AM), skip fetch
}

setInterval(scheduledFetch, 60000);
fetchLatestNews(); // Initial fetch on startup

async function runClaudeAnalysis() {
  if (pendingHeadlines.length === 0) {
    console.log('[Claude] No new headlines to analyze. Skipping.');
    return;
  }
  const batch = [...pendingHeadlines];
  pendingHeadlines = [];
  await analyzeNewsWithClaude(batch);
}

// Backup Claude run every 10 minutes during active hours
setInterval(() => { if (isActiveHours()) runClaudeAnalysis(); }, 10 * 60 * 1000);

// ============================================================
// API ENDPOINTS
// ============================================================

app.get('/api/board', (req, res) => {
  res.json({
    board,
    lastUpdated: lastFetchTime,
    moveCount: moves.length,
    fetchCount,
    lastClaudeRun,
    pendingHeadlineCount: pendingHeadlines.length,
    timestamp: new Date().toISOString()
  });
});

// Manually trigger Claude analysis
app.post('/api/analyze', async (req, res) => {
  const count = pendingHeadlines.length;
  if (count === 0) {
    return res.json({ success: false, message: 'No pending headlines to analyze.' });
  }
  await runClaudeAnalysis();
  res.json({ success: true, analyzed: count, totalMoves: moves.length });
});

app.get('/api/debug', (req, res) => {
  res.json({
    lastClaudeRun,
    fetchCount,
    pendingHeadlines: pendingHeadlines.length,
    analyzedHeadlines: analyzedHeadlines.size,
    totalMoves: moves.length,
    autoMoves: moves.filter(m => m.auto).length,
    manualMoves: moves.filter(m => !m.auto).length,
    newsItems: newsItems.length,
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    activeHours: isActiveHours(),
  });
});

app.get('/api/moves', (req, res) => {
  res.json({
    moves: [...moves].sort((a, b) => new Date(b.time) - new Date(a.time)),
    news: newsItems
  });
});

// Add a new move and auto-adjust the board
app.post('/api/moves', (req, res) => {
  const { player, from, to, deal, impact, fantasyChange } = req.body;
  if (!player || !to) return res.status(400).json({ error: 'player and to are required' });

  const move = {
    time: new Date().toISOString(),
    player,
    from: from || '?',
    to,
    deal: deal || 'TBD',
    impact: impact || '',
    fantasyChange: fantasyChange || 'neutral'
  };
  moves.push(move);

  // Find player on board and update
  const idx = board.findIndex(p => p.name.toLowerCase().includes(player.toLowerCase()) || player.toLowerCase().includes(p.name.toLowerCase()));
  if (idx !== -1) {
    board[idx].team = to;
    board[idx].note = `🔥 NEW: ${deal || 'Signed'} with ${to}. ${impact || ''}`;
    if (fantasyChange === 'up') {
      board[idx].trend = 'up';
      board[idx].trendAmt = (board[idx].trendAmt || 0) + 5;
    } else if (fantasyChange === 'down') {
      board[idx].trend = 'down';
      board[idx].trendAmt = (board[idx].trendAmt || 0) + 5;
    }
  }

  lastFetchTime = new Date().toISOString();
  res.json({ success: true, move, boardPosition: idx !== -1 ? board[idx].rank : null });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`\n🏈 Fantasy Big Board running at http://localhost:${PORT}`);
  console.log(`   Auto-refreshing every 30 seconds from ${RSS_FEEDS.length} news sources`);
  console.log(`   ${board.length} players on the board`);
  console.log(`   ${moves.length} FA moves tracked\n`);
});
