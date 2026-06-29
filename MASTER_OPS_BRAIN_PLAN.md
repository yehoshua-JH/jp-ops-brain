# JivePilot Master Ops Brain - Comprehensive Data App

## VISION

Transform the Ops Brain from a **session-focused tool** into a **comprehensive operational data hub** that consolidates:
- All sessions (with full context and searchability)
- All employees (profiles, contracts, status, KPIs)
- All clients (engagement details, team assignments, SOW status)
- All issues (blockers, risks, critical incidents)
- All workflows (onboarding, offboarding, transitions)
- All documents (SOWs, MSAs, invoices, contracts)
- All timelines (project milestones, transitions, key dates)

**Goal:** Single source of truth for all JivePilot operational intelligence

---

## DATA MODEL EXPANSION

### Current Database (Session-Focused)
```
- sessions (meeting transcripts, notes)
- domains (operational areas)
- action_items (tasks)
- blockers (issues)
- timeline (milestones)
- quick_notes (observations)
```

### NEW Database Tables (Master Ops Brain)

#### 1. **EMPLOYEES TABLE**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(100),
  status ENUM('active', 'inactive', 'on_leave', 'offboarding'),
  hire_date DATE,
  location VARCHAR(100),
  timezone VARCHAR(50),
  phone VARCHAR(20),
  
  -- Contracts & Compensation
  contracts JSON, -- [{client_id, hours_per_week, rate, currency, type}]
  
  -- Capabilities
  skills JSON, -- ['skill1', 'skill2']
  certifications JSON,
  
  -- Performance
  kpi_status ENUM('not_set', 'pending', 'active', 'under_review'),
  time_tracking_enabled BOOLEAN DEFAULT true,
  max_hours_per_week INT,
  
  -- Metadata
  profile_picture_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_activity TIMESTAMP,
  notes TEXT
);
```

#### 2. **CLIENTS TABLE**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status ENUM('prospect', 'active', 'paused', 'inactive', 'churned'),
  
  -- Contact
  primary_contact_name VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(20),
  
  -- Engagement
  engagement_type ENUM('full_delivery', 'managed_team', 'staffing'),
  team_size INT,
  employee_ids JSON, -- ['emp1', 'emp2']
  
  -- Financial
  monthly_revenue DECIMAL(10,2),
  contract_value DECIMAL(10,2),
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Documents
  sow_status ENUM('not_started', 'draft', 'pending_signature', 'signed', 'expired'),
  msa_status ENUM('not_started', 'draft', 'pending_signature', 'signed', 'expired'),
  sow_document_url VARCHAR(500),
  msa_document_url VARCHAR(500),
  
  -- Health
  health_score INT, -- 1-10
  risk_level ENUM('low', 'medium', 'high', 'critical'),
  last_check_in DATE,
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  notes TEXT,
  tags JSON -- ['tag1', 'tag2']
);
```

#### 3. **ISSUES TABLE**
```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('blocker', 'risk', 'incident', 'opportunity'),
  severity ENUM('low', 'medium', 'high', 'critical'),
  status ENUM('open', 'in_progress', 'resolved', 'deferred'),
  
  -- Related Entities
  related_employee_id UUID,
  related_client_id UUID,
  related_domain VARCHAR(100),
  
  -- Tracking
  first_appeared_session_id UUID,
  first_appeared_date DATE,
  times_appeared INT DEFAULT 1,
  last_mentioned_date DATE,
  
  -- Resolution
  owner_id UUID,
  assigned_to_id UUID,
  resolution_notes TEXT,
  resolved_date DATE,
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  priority INT -- 1-10
);
```

#### 4. **WORKFLOWS TABLE**
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('onboarding', 'offboarding', 'transition', 'promotion', 'contract_renewal'),
  status ENUM('not_started', 'in_progress', 'completed', 'blocked'),
  
  -- Related Entities
  employee_id UUID,
  client_id UUID,
  
  -- Timeline
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Steps
  steps JSON, -- [{step_name, status, due_date, owner}]
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  notes TEXT
);
```

#### 5. **DOCUMENTS TABLE**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('sow', 'msa', 'invoice', 'contract', 'agreement', 'other'),
  
  -- Related Entities
  employee_id UUID,
  client_id UUID,
  
  -- Document Details
  document_url VARCHAR(500),
  status ENUM('draft', 'pending_signature', 'signed', 'executed', 'expired'),
  signature_status ENUM('not_signed', 'pending', 'signed_by_one', 'fully_signed'),
  
  -- Dates
  created_date DATE,
  signed_date DATE,
  expiration_date DATE,
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  notes TEXT
);
```

#### 6. **TRANSITIONS TABLE**
```sql
CREATE TABLE transitions (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type ENUM('promotion', 'role_change', 'client_change', 'hours_increase', 'hours_decrease', 'termination'),
  
  -- Related Entities
  employee_id UUID,
  client_id UUID,
  
  -- Transition Details
  from_state JSON, -- {role, hours, rate, client}
  to_state JSON,   -- {role, hours, rate, client}
  
  -- Timeline
  effective_date DATE,
  notification_date DATE,
  completion_date DATE,
  
  -- Status
  status ENUM('planned', 'in_progress', 'completed', 'cancelled'),
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  notes TEXT
);
```

---

## NEW PAGES & FEATURES

### 1. **Master Dashboard**
- **Summary Cards:** Total employees, active clients, open issues, pending workflows
- **Quick Stats:** Revenue this month, utilization rate, health score
- **Risk Heatmap:** Critical issues by domain
- **Recent Activity:** Latest sessions, transitions, issues
- **Search Bar:** Global search across all data

### 2. **Employee Directory**
- **List View:** Name, role, status, clients, hours, last activity
- **Search & Filter:** By name, role, client, status, location, skills
- **Employee Card:** Full profile, contracts, KPIs, activity log
- **Bulk Actions:** Export, status change, email templates
- **Employee Timeline:** Career history, transitions, achievements

### 3. **Client Management**
- **List View:** Name, status, team size, revenue, health score, risk level
- **Search & Filter:** By name, status, engagement type, revenue range, health
- **Client Card:** Full profile, team members, documents, financials, health
- **Client Timeline:** Key dates, transitions, milestones
- **Document Management:** SOW/MSA status, upload, signature tracking
- **Churn Risk:** Identify at-risk clients with early warning system

### 4. **Issues & Risks Board**
- **Kanban View:** Not Started → In Progress → Resolved
- **Issue Types:** Blockers, Risks, Incidents, Opportunities
- **Search & Filter:** By type, severity, status, related entity, date range
- **Issue Detail:** Full context, related sessions, resolution notes
- **Chronic Issues:** Flag issues appearing 3+ times
- **Risk Scoring:** Severity × Impact calculation

### 5. **Workflows & Transitions**
- **Active Workflows:** Onboarding, offboarding, transitions, promotions
- **Workflow Timeline:** Visual Gantt chart of all active workflows
- **Workflow Detail:** Steps, owners, due dates, status
- **Transition Tracker:** Planned transitions with effective dates
- **Workflow Templates:** Reusable templates for common workflows

### 6. **Documents Hub**
- **Document Library:** All SOWs, MSAs, invoices, contracts
- **Search & Filter:** By type, status, related entity, date range
- **Document Status:** Track signature status, expiration dates
- **Upload & Manage:** Upload, version control, signature tracking
- **Export:** Bulk export by type or date range

### 7. **Advanced Search**
- **Global Search:** Search across sessions, employees, clients, issues, documents
- **Filters:** Multi-select filters for all entity types
- **Saved Searches:** Save and reuse common searches
- **Search Results:** Unified view with entity type indicators
- **Related Items:** Show connections between entities

### 8. **Analytics & Reporting**
- **Employee Analytics:** Utilization, hours tracked, KPI performance
- **Client Analytics:** Revenue, team size, health trends, churn risk
- **Financial Analytics:** Monthly revenue, invoice status, outstanding payments
- **Workflow Analytics:** Completion rates, timeline adherence
- **Custom Reports:** Build custom reports with filters and exports

### 9. **Timeline & Milestones**
- **Master Timeline:** All key dates, transitions, milestones
- **Calendar View:** Visual calendar of upcoming events
- **Milestone Tracking:** Project milestones, contract renewals, transitions
- **Alerts:** Upcoming dates, overdue items, expiring contracts

### 10. **Ops Brain Chat (Enhanced)**
- **Context-Aware Queries:** "Show me all at-risk clients"
- **Cross-Entity Analysis:** "Which employees are working on multiple clients?"
- **Historical Queries:** "What issues did we have with this client?"
- **Predictive:** "Who might churn next?"
- **Reporting:** "Generate monthly summary for this domain"

---

## SEARCH & FILTERING CAPABILITIES

### Global Search
```
- Full-text search across all entities
- Search by name, email, domain, tags
- Search by date range
- Search by status
- Fuzzy matching for typos
```

### Advanced Filters
```
Employees:
- Role, status, location, client, skills, hire date range

Clients:
- Status, engagement type, revenue range, health score, risk level, team size

Issues:
- Type, severity, status, related entity, date range, domain

Workflows:
- Type, status, employee, client, date range

Documents:
- Type, status, related entity, date range, signature status
```

### Saved Searches
```
- "At-risk clients" (health_score < 5 AND risk_level = 'high')
- "Overdue workflows" (target_completion_date < TODAY AND status != 'completed')
- "Expiring contracts" (contract_end_date < DATE_ADD(TODAY, 30 DAYS))
- "Untracked time" (time_tracked < 30 HOURS AND status = 'active')
```

---

## DATA INGESTION PIPELINE

### Automatic Data Population

**From Sessions:**
- Extract employee mentions → Create/update employee records
- Extract client mentions → Create/update client records
- Extract issues → Create issue records
- Extract action items → Link to workflows
- Extract dates → Create timeline entries

**From Manual Input:**
- Employee onboarding form → Create employee record
- Client intake form → Create client record
- Document upload → Create document record
- Workflow creation → Create workflow record

**From External Sources:**
- Time tracking system → Update employee hours
- Invoice system → Update client financials
- Document signing service → Update document status

---

## IMPLEMENTATION ROADMAP (NEW PHASES)

### Phase 1: Database Expansion
- [ ] Create new tables (employees, clients, issues, workflows, documents, transitions)
- [ ] Run migrations via webdev_execute_sql
- [ ] Create query helpers in server/db.ts

### Phase 2: Backend API
- [ ] Create tRPC procedures for all CRUD operations
- [ ] Implement search and filter procedures
- [ ] Implement aggregation procedures (analytics, reporting)

### Phase 3: Frontend - Master Dashboard
- [ ] Build summary cards with real data
- [ ] Implement global search bar
- [ ] Create quick access navigation
- [ ] Add recent activity feed

### Phase 4: Frontend - Employee Directory
- [ ] Build employee list with search/filter
- [ ] Create employee detail card
- [ ] Implement employee timeline
- [ ] Add bulk actions

### Phase 5: Frontend - Client Management
- [ ] Build client list with search/filter
- [ ] Create client detail card
- [ ] Implement churn risk detection
- [ ] Add document management

### Phase 6: Frontend - Issues & Risks
- [ ] Build Kanban board
- [ ] Implement issue detail view
- [ ] Add risk scoring
- [ ] Create chronic issue flagging

### Phase 7: Frontend - Workflows & Transitions
- [ ] Build workflow list and timeline
- [ ] Implement workflow detail view
- [ ] Create transition tracker
- [ ] Add workflow templates

### Phase 8: Frontend - Documents Hub
- [ ] Build document library
- [ ] Implement document upload
- [ ] Add signature tracking
- [ ] Create bulk export

### Phase 9: Frontend - Advanced Search
- [ ] Implement global search
- [ ] Build advanced filter UI
- [ ] Create saved searches
- [ ] Add search results view

### Phase 10: Frontend - Analytics & Reporting
- [ ] Build analytics dashboard
- [ ] Implement custom report builder
- [ ] Add data export
- [ ] Create visualization charts

### Phase 11: Integration & Testing
- [ ] Integrate all pages into navigation
- [ ] Test search and filtering
- [ ] Test data ingestion pipeline
- [ ] Write comprehensive vitest tests

### Phase 12: Final Polish & Delivery
- [ ] UI/UX polish
- [ ] Performance optimization
- [ ] Documentation
- [ ] Final checkpoint and delivery

---

## KEY FEATURES

### 1. **Unified Search**
- Search across all entities with single query
- Filter by type, date, status, related entities
- Saved search templates
- Search history

### 2. **Relationship Mapping**
- Show connections between employees, clients, issues
- Visual relationship graphs
- Impact analysis (if this changes, what else is affected?)

### 3. **Timeline Integration**
- All events on master timeline
- Drill down to related sessions, issues, workflows
- Historical context for all entities

### 4. **Automation & Alerts**
- Alert when contract expires
- Alert when workflow overdue
- Alert when client health drops
- Alert when issue appears again

### 5. **Export & Integration**
- Export data to CSV, JSON, PDF
- Export to Cowork folder
- API for external integrations
- Webhook support for real-time updates

### 6. **AI-Powered Insights**
- Predictive churn scoring
- Anomaly detection (unusual hours, missing time entries)
- Recommendation engine (who should be promoted, who needs support)
- Automatic issue categorization and prioritization

---

## SUCCESS METRICS

- [ ] All operational data searchable and filterable
- [ ] Sub-second search response time
- [ ] 100% data accuracy from sessions
- [ ] Zero data loss during migrations
- [ ] All workflows tracked and visualized
- [ ] All issues tracked and resolved
- [ ] All documents centralized and accessible
- [ ] User satisfaction score > 4.5/5

---

## NEXT STEPS

1. **Approve Data Model:** Review and approve new database tables
2. **Create Migrations:** Generate SQL migrations for new tables
3. **Implement Backend:** Create tRPC procedures for all CRUD operations
4. **Build Frontend:** Start with Master Dashboard, then Employee Directory
5. **Integrate Search:** Implement global search and advanced filters
6. **Test & Validate:** Comprehensive testing of all features
7. **Deploy & Monitor:** Deploy to production and monitor performance

---

**This Master Ops Brain will become the single source of truth for all JivePilot operational intelligence.**
