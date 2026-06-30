# JivePilot Ops Brain - Implementation Roadmap

## Phase 1: Database & Core Infrastructure
- [x] Design and implement database schema (sessions, domains, action_items, blockers, timeline, quick_notes)
- [x] Create database migration SQL and apply via webdev_execute_sql
- [x] Implement query helpers in server/db.ts for all core entities
- [x] All processing via Manus LLM (no Claude API needed)
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
- [x] Implement 4-stage prompt system (Single Meeting, Daily Batch, Weekly Review, Monthly Review) - via llmProcessing.ts
- [x] Create Manus LLM integration (no Claude)
- [x] Improved Stage 1 prompt for better speaker attribution in garbled transcripts
- [x] Implement vitest tests for LLM processing with speaker attribution validation
- [ ] Implement true streaming LLM output with SSE
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
- [x] Build Domain Tracker page with domain selector (tabs/dropdown)
- [x] Implement maturity timeline chart (session number vs maturity level)
- [x] Display all key points, blockers, action items, decisions per domain
- [x] Add ideal end state display with edit capability (non-deletable)
- [x] Implement domain filtering and sorting

## Phase 6: Action Items & Blockers Board
- [x] Build unified task board with two views (Action Items | Blockers)
- [x] Action Items view: owner, task, deadline, priority, status columns
- [x] Implement sorting by priority (HIGH first) and deadline
- [x] Add overdue highlighting (red) and HIGH+overdue combined indicator
- [x] Implement status toggle (open/complete) with one-click marking
- [x] Blockers view: description, first appeared, times appeared, status, domain tag
- [x] Implement chronic blocker flag (3+ appearances)
- [x] Add resolution note capability for blockers
- [x] Implement filtering by owner, status, domain, priority, date range - full filtering UI with search, date range, and clear buttons. 15 vitest tests all passing.

## Phase 7: Reports & Rollups
- [x] Build Reports page with three rollup generators
- [ ] Implement Daily Rollup generation (Prompt 2: Daily Batch)
- [ ] Implement Weekly Review generation (Prompt 3: Weekly Review)
- [ ] Implement Monthly Review generation (Prompt 4: Monthly Review)
- [ ] Auto-generate timeline stamp from monthly reviews
- [ ] Add save functionality for all rollup types
- [x] Display generated reports with proper formatting

## Phase 8: Master Timeline
- [x] Build Master Timeline page with vertical chronological display
- [x] Display monthly timeline stamps with expand button for full review
- [ ] Add manual milestone creation with date and domain tag
- [ ] Display domain maturity pills on timeline entries
- [x] Implement timeline export to PDF/markdown - buttons present

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
- [ ] PRIORITY: Session 1 must be auto-loaded on first server start

## Phase 12: Export & Integration Features
- [ ] PRIORITY: Build Cowork folder export button
- [ ] PRIORITY: Implement session export as individual .md files (session-NNN-YYYY-MM-DD.md)
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

## Phase 15: Master Ops Brain - Data Model Expansion
- [ ] Create employees table with contracts, skills, KPI tracking
- [ ] Create clients table with engagement, financials, health scoring
- [ ] Create issues table with severity, tracking, resolution
- [ ] Create workflows table with steps and timeline
- [ ] Create documents table with signature tracking
- [ ] Create transitions table for employee/client changes
- [ ] Implement database migrations via webdev_execute_sql
- [ ] Create query helpers in server/db.ts for all new entities

## Phase 16: Master Ops Brain - Backend API
- [ ] Create tRPC procedures for employee CRUD
- [ ] Create tRPC procedures for client CRUD
- [ ] Create tRPC procedures for issue CRUD
- [ ] Create tRPC procedures for workflow CRUD
- [ ] Create tRPC procedures for document CRUD
- [ ] Implement search procedures (global search across all entities)
- [ ] Implement filter procedures (advanced filtering)
- [ ] Implement analytics procedures (aggregations, reporting)

## Phase 17: Master Ops Brain - Frontend Dashboard
- [ ] Build Master Dashboard with summary cards
- [ ] Implement global search bar
- [ ] Create quick access navigation
- [ ] Add recent activity feed
- [ ] Build risk heatmap visualization
- [ ] Create quick stats (revenue, utilization, health)

## Phase 18: Master Ops Brain - Employee Directory
- [ ] Build employee list with search/filter
- [ ] Create employee detail card with contracts
- [ ] Implement employee timeline (career history)
- [ ] Add bulk actions (export, status change)
- [ ] Create KPI tracking view
- [ ] Build employee relationship mapping

## Phase 19: Master Ops Brain - Client Management
- [ ] Build client list with search/filter
- [ ] Create client detail card with team members
- [ ] Implement churn risk detection
- [ ] Add document management (SOW/MSA tracking)
- [ ] Build client timeline (key dates, transitions)
- [ ] Create health score visualization
- [ ] Implement early warning system for at-risk clients

## Phase 20: Master Ops Brain - Issues & Risks Board
- [ ] Build Kanban board (Not Started → In Progress → Resolved)
- [ ] Implement issue detail view with context
- [ ] Add risk scoring (severity × impact)
- [ ] Create chronic issue flagging (3+ appearances)
- [ ] Build issue relationship mapping
- [ ] Implement resolution tracking

## Phase 21: Master Ops Brain - Workflows & Transitions
- [ ] Build workflow list and timeline
- [ ] Implement workflow detail view with steps
- [ ] Create transition tracker
- [ ] Add workflow templates (onboarding, offboarding, etc.)
- [ ] Build Gantt chart visualization
- [ ] Implement workflow automation alerts

## Phase 22: Master Ops Brain - Documents Hub
- [ ] Build document library with search/filter
- [ ] Implement document upload and versioning
- [ ] Add signature tracking (pending, signed, expired)
- [ ] Create document status dashboard
- [ ] Build bulk export functionality
- [ ] Implement document expiration alerts

## Phase 23: Master Ops Brain - Advanced Search
- [ ] Implement global search across all entities
- [ ] Build advanced filter UI (multi-select, date ranges)
- [ ] Create saved searches functionality
- [ ] Build unified search results view
- [ ] Implement search history
- [ ] Add entity relationship display in results

## Phase 24: Master Ops Brain - Analytics & Reporting
- [ ] Build employee analytics dashboard
- [ ] Create client analytics dashboard
- [ ] Implement financial analytics (revenue, invoices)
- [ ] Build workflow analytics (completion rates)
- [ ] Create custom report builder
- [ ] Implement data export (CSV, JSON, PDF)

## Phase 25: Master Ops Brain - Integration & Testing
- [ ] Integrate all pages into navigation
- [ ] Test search and filtering across all entities
- [ ] Test data ingestion pipeline
- [ ] Write comprehensive vitest tests
- [ ] Test relationship mapping and cross-entity queries
- [ ] Performance testing (sub-second search)

## Phase 26: Final Delivery & Checkpoint
- [ ] Verify all features working end-to-end
- [ ] Confirm Session 1 pre-loads on first launch
- [ ] Test complete user workflow (login → process → query → export)
- [ ] Test Master Ops Brain search and filtering
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

## Edit & Voice Update System
- [ ] Backend: updateBlocker mutation (description, severity, status, resolution note, mark resolved, escalate)
- [ ] Backend: updateActionItem mutation (status, owner, deadline, completion note)
- [ ] Backend: updateDomainMaturity mutation (manual override of maturity level + note)
- [ ] Backend: updateSession mutation (edit summary, key points, decisions)
- [ ] Backend: updateClient mutation (status, health score, risk notes)
- [ ] Backend: updateEmployee mutation (criticality score, notes, risk flags)
- [ ] UI: Blockers page — inline edit panel (click blocker → edit description, add update, mark resolved, escalate)
- [ ] UI: Action Items page — inline status toggle + edit drawer
- [ ] UI: Domain Health page — maturity override button per domain
- [ ] UI: Session detail — edit summary, key points, decisions inline
- [ ] UI: Clients page — inline risk status update
- [ ] UI: Employees page — inline criticality/risk update
- [ ] Voice: Context-aware voice update — tap any item anywhere in app → opens voice recorder → Whisper transcribes → GPT-4o interprets intent and routes update to correct DB field
- [ ] Voice: Global floating "Voice Update" button accessible from all pages
- [ ] Voice: Voice assistant understands context (which item was tapped) and asks clarifying questions if needed
- [ ] Voice: Confirmation step before saving voice-driven updates
