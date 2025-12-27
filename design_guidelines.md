# Design Guidelines: EVM Blockchain Explorer (Etherscan-Style)

## Design Approach

**Reference-Based Approach:** Etherscan as primary design reference
**Rationale:** User explicitly requested "explorer should be like etherscan" - this is a proven, trusted pattern for blockchain explorers that prioritizes data clarity and professional presentation.

**Core Design Principles:**
- Data-first design: Information legibility over decorative elements
- Professional trust: Clean, corporate aesthetic that conveys reliability
- Density with clarity: Pack information efficiently while maintaining scanability
- Instant access: Search and navigation as primary interaction points

## Typography System

**Font Stack:** Inter or System UI fonts (GitHub, Roboto as fallbacks) via Google Fonts CDN
- **Headlines (H1):** 2xl to 3xl, font-semibold - page titles, chain name
- **Section Headers (H2):** xl to 2xl, font-semibold - "Latest Blocks", "Transactions"
- **Subsections (H3):** lg to xl, font-medium - card headers, table categories
- **Body Text:** base (16px), font-normal - descriptions, labels
- **Data Values:** sm to base, font-mono - hashes, addresses, numbers
- **Labels:** xs to sm, font-medium, uppercase tracking-wide - "Block Height", "Gas Used"

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16 consistently
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4
- Table cell padding: px-4 py-3

**Grid System:**
- Container: max-w-7xl mx-auto px-4
- Dashboard stats: 3-4 column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Content area: Single column with full-width tables/cards
- Detail pages: 2-column layout for metadata (grid-cols-1 lg:grid-cols-3, with main content span-2)

## Component Library

### Navigation & Search
**Header:**
- Fixed top navigation with site logo/chain name
- Prominent search bar (50% width on desktop) with dropdown for search type (Block/Tx/Address)
- Main navigation links: Blocks, Transactions, Addresses, Validators, Charts
- Network stats ticker (Latest Block, Gas Price, Active Validators)

### Dashboard Components

**Stats Cards (Grid of 4):**
- Large metric number (text-2xl to text-3xl, font-bold)
- Descriptive label below (text-sm, muted)
- Small trend indicator (arrow + percentage change)
- Minimal borders, subtle background differentiation

**Latest Blocks Table:**
- Compact, dense rows (12-15 visible)
- Columns: Block #, Age, Proposer/Miner, Txn Count, Gas Used, Gas Limit
- Clickable block numbers and proposer addresses
- Real-time updates indication (subtle pulse animation on new rows)

**Latest Transactions Table:**
- Similar density to blocks table
- Columns: Tx Hash (truncated with copy), Method, From, To, Value, Fee
- Status badges (Success/Failed with appropriate styling)
- Method tags (Transfer, Swap, etc.) as small pills

### Detail Pages

**Block Detail Layout:**
- Top card: Primary block info (Height, Timestamp, Transactions, Hash, Parent Hash)
- Secondary metrics card: Gas metrics, Difficulty, Size
- Full-width transactions table below
- Info presented as key-value pairs in 2-column grid within cards

**Transaction Detail Layout:**
- Hero card: Status badge, Hash, Block confirmation
- Transaction overview: From/To addresses with identicons, Value, Fee breakdown
- Technical details accordion/expandable: Input Data, Logs & Events (if contract interaction)
- Tab interface for: Overview, Logs, State Changes

**Address Page:**
- Balance card (prominent display of ETH balance)
- Address info: Total transactions, contract status
- Tabbed interface: Transactions, Token Transfers, Internal Txns, Contract Code (if contract)
- Transaction table with filtering options

### Data Display Patterns

**Hash Display:**
- Truncated with ellipsis (0x1234...5678)
- Copy-to-clipboard icon on hover
- Full hash in tooltip
- Monospace font

**Address Display:**
- Identicon/blockie icon (8x8 px) beside truncated address
- Clickable links to address pages
- Different visual treatment for contracts vs EOAs

**Tables:**
- Striped rows for better scanability (alternating subtle background)
- Hover state highlighting entire row
- Fixed header on scroll for long tables
- Pagination controls at bottom (showing "Page 1 of 523")

**Badges & Tags:**
- Rounded-full pills for status (Success, Failed, Pending)
- Rounded badges for method names and transaction types
- Small text (text-xs to text-sm)

### Forms & Inputs

**Search Input:**
- Large, prominent with icon prefix
- Placeholder: "Search by Address / Txn Hash / Block / Token"
- Search button or enter-to-search
- Recent searches dropdown

**Filter Controls:**
- Dropdown selects for date ranges, transaction types
- Applied filters shown as removable chips
- Clear all filters option

## Animations

**Minimal & Purposeful:**
- Skeleton loading states for data fetching (shimmer effect)
- New row highlight (brief background pulse for real-time updates)
- Smooth transitions on hover states (150ms)
- No scroll-triggered or decorative animations

## Images

**No Hero Image Required** - This is a data-focused application

**Supporting Graphics:**
- Chain logo/icon in header (32x32 to 40x40 px)
- Address identicons (generated, 24x24 px)
- Empty state illustrations for: No transactions, No results, Error states (centered, max-w-md)
- Optional: Light network visualization graphic on dashboard (subtle, non-distracting)

## Page Structures

**Dashboard (Home):**
1. Stats overview (4-column grid)
2. Two-column section: Latest Blocks | Latest Transactions
3. Optional: Charts section (Block sizes, Gas prices over time)

**Search Results:**
- Results count header
- Filtered table with results
- Pagination

**Detail Pages:**
- Breadcrumb navigation
- Primary info card
- Supporting data sections
- Related items table

## Key Differentiators from Generic Apps

- **Information density:** Pack more data per screen than typical apps
- **Monospace prevalence:** Heavy use for technical data
- **Table-centric:** Tables are primary UI, not supplementary
- **Minimal decoration:** Every pixel serves data display
- **Professional palette:** Avoid playful elements, maintain corporate trust
- **Real-time updates:** Live data streaming without page refreshes