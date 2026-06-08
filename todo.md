# JivePilot Ops Brain - Implementation Roadmap

## Phase 1: Database & Core Infrastructure
- [x] Design and implement database schema (sessions, domains, action_items, blockers, timeline, quick_notes)
- [x] Create database migration SQL and apply via webdev_execute_sql
- [x] Implement query helpers in server/db.ts for all core entities
- [ ] Set up Anthropic API integration for Claude AI processing
- [x] Create tRPC procedures for session CRUD operations

## Phase 2: Authentication & Security
- [x] Implement single-user password authentication (Reef only) - via Manus OAuth
- [x] Add session persistence across browser visits
- [x] Create login page with password input - Home page with login redirect
- [x] Implement logout functionality
- [x] Add auth middleware to protect all routes
- [ ] DEFERRED: Anthropic API key setup (user will integrate manually from Claude work account)

## Phase 3: Input Processor & AI Integration
- [x] Build Input Processor page UI (textarea, meeting type selector, participants field)
- [ ] Implement 4-stage prompt system (Single Meeting, Daily Batch, Weekly Review, Monthly Review)
- [ ] DEFERRED: Create Claude API integration with streaming response support (manual integration later)
- [x] Build real-time streaming UI for AI output display - placeholder with save functionality
- [x] Implement session save functionality after processing - saves to database
- [ ] Add format detection for meeting input (transcript, AI notes, bullet points)

## Phase 4: Session Library
- [x] Build Session Library page with list view
- [x] Implement search and filter functionality (by date, type, domain tags)
- [x] Create session detail view - collapsible cards
- [x] Add session metadata display (date, type, participants)
- [x] Implement full output view with formatting - shows all session details

## Phase 5: Domain Tracker
- [x] Pre-load all 10 operational domains with ideal end states - via seedDomains procedure
- [x] Build Domain Tracker page with domain selector (tabs/dropdown) - placeholder created
- [ ] Implement maturity timeline chart (session number vs maturity level)
- [ ] Display all key points, blockers, action items, decisions per domain
- [ ] Add ideal end state display with edit capability (non-deletable)
- [ ] Implement domain filtering and sorting

## Phase 6: Action Items & Blockers Board
- [x] Build unified task board with two views (Action Items | Blockers) - placeholder created
- [ ] Action Items view: owner, task, deadline, priority, status columns
- [ ] Implement sorting by priority (HIGH first) and deadline
- [ ] Add overdue highlighting (red) and HIGH+overdue combined indicator
- [ ] Implement status toggle (open/complete) with one-click marking
- [ ] Blockers view: description, first appeared, times appeared, status, domain tag
- [ ] Implement chronic blocker flag (3+ appearances)
- [ ] Add resolution note capability for blockers
- [ ] Implement filtering by owner, status, domain, priority, date range

## Phase 7: Reports & Rollups
- [x] Build Reports page with three rollup generators - placeholder created
- [ ] Implement Daily Rollup generation (Prompt 2: Daily Batch)
- [ ] Implement Weekly Review generation (Prompt 3: Weekly Review)
- [ ] Implement Monthly Review generation (Prompt 4: Monthly Review)
- [ ] Auto-generate timeline stamp from monthly reviews
- [ ] Add save functionality for all rollup types
- [ ] Display generated reports with proper formatting

## Phase 8: Master Timeline
- [x] Build Master Timeline page with vertical chronological display - placeholder created
- [ ] Display monthly timeline stamps with expand button for full review
- [ ] Add manual milestone creation with date and domain tag
- [ ] Display domain maturity pills on timeline entries
- [ ] Implement timeline export to PDF/markdown

## Phase 9: Ops Brain Chat Interface
- [x] Build chat UI with message history display
- [x] Implement natural language query input
- [ ] Create context injection system (relevant sessions + quick notes)
- [ ] Implement cross-session analysis queries
- [ ] Implement simple factual recall queries
- [ ] Add session reference links in responses
- [ ] Implement streaming response display - placeholder working

## Phase 10: Dashboard Home
- [x] Build Dashboard home page with summary layout
- [x] Display domain maturity grid with color-coded pills - now clickable with maturity level
- [x] Show open action item count and overdue count
- [x] Display recent sessions list
- [x] Surface HIGH priority items at top
- [x] Surface overdue items with red highlighting
- [x] Add quick access navigation to all pages - functional quick action buttons

## Phase 11: Pre-loaded Data & First Launch
- [ ] Create Session 1 data from May 30 2026 GM Handover meeting
- [ ] Implement first-launch detection and auto-load Session 1
- [ ] Verify all domain tags and maturity notes are correct
- [ ] Test that Session 1 appears without manual import

## Phase 12: Export & Integration Features
- [ ] Build Cowork folder export button
- [ ] Implement session export as individual .md files (session-NNN-YYYY-MM-DD.md)
- [ ] Implement rollup export to subfolders (rollups/daily/, rollups/weekly/, rollups/monthly/)
- [ ] Implement action items, blockers, timeline export as .md files
- [ ] Add local path configuration in app settings
- [ ] Test Cowork export functionality

## Phase 13: UI/UX Polish & Navigation
- [ ] Implement left sidebar navigation with all 8 pages
- [ ] Apply domain color scheme consistently throughout app
- [ ] Implement maturity level color coding (Not started → World-class)
- [ ] Add loading states and error handling
- [ ] Implement responsive design for desktop browsers
- [ ] Add empty states for all list views
- [ ] Polish typography and spacing

## Phase 14: Testing & Quality Assurance
- [ ] Write vitest tests for database queries
- [ ] Write vitest tests for tRPC procedures
- [ ] Write vitest tests for AI prompt generation
- [ ] Test session creation and retrieval
- [ ] Test domain tracker functionality
- [ ] Test action items and blockers board
- [ ] Test reports generation
- [ ] Test Ops Brain chat queries
- [ ] Test export functionality
- [ ] Browser testing (Chrome/Safari)

## Phase 15: Final Delivery & Checkpoint
- [ ] Verify all features working end-to-end
- [ ] Confirm Session 1 pre-loads on first launch
- [ ] Test complete user workflow (login → process → query → export)
- [ ] Create final checkpoint
- [ ] Deliver to user with documentation

---

## Color Scheme (Domains)
- TIME-TRACKING: teal
- INVOICING: blue
- TALENT-OPS: purple
- TECH-PLATFORM: gray
- CLIENT-OPS: amber
- CLIENT-PORTAL: green
- FINANCE: coral/orange
- TEAM-MGMT: pink
- SALES-BD: indigo
- AI-SYSTEMS: cyan

## Maturity Level Colors
- Not started: light gray
- Early: red/coral
- Developing: amber/orange
- Functional with gaps: yellow
- Solid: teal/green
- World-class: deep green
