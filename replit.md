# Telebit Blockchain Explorer

## Overview
The Telebit Blockchain Explorer is a production-ready, lightweight Etherscan-style blockchain explorer designed for the Telebit Blockchain (TBT). It features a React frontend and an Express backend, with a high-performance indexer capable of parallel block fetching, reorg detection, and cursor-based pagination. The project aims to provide comprehensive blockchain data access, an intuitive user interface, and an "Explorer as a Service" deployment model for other EVM-compatible chains.

## User Preferences
- **Communication Style**: I prefer clear and concise explanations, avoiding overly technical jargon where possible.
- **Workflow**: I value iterative development and expect to be consulted before any major architectural changes or significant code refactoring.
- **Interaction**: Please ask clarifying questions if anything is unclear. I prefer detailed explanations for complex issues or decisions.
- **Codebase Changes**: Do not make changes to files or folders without explicit approval, especially concerning core infrastructure or deployment scripts.

## System Architecture

### UI/UX Decisions
The frontend, built with React, features an Etherscan-inspired dark theme with blue (#3498db) accents, ensuring a professional and familiar user experience. It includes pages for Dashboard, Blocks, Transactions, Addresses, Tokens, Analytics, and a comprehensive search function. Key UI components include responsive design, dark/light mode support, smart search dropdowns, and a watchlist feature for favorite addresses. Branding consistently uses "TBT" for the native token and supports both 0x hex and tbt1... bech32 address formats.

### Design System
The explorer supports a triple-design system that admins can switch between in the Admin Dashboard:
- **Design 1 (Classic)**: Standard blockchain explorer with subtle blue accents
- **Design 2 (Premium)**: Modern sapphire/teal theme with glass effects and coral/amber accents
- **Design 3 (Ocean)**: Deep ocean blues and aqua greens, designed for OseanChain (Chain ID 13601, Token OGX)

Each design has its own CSS class prefix (d2-, d3-) for header, icon boxes, gradient text, pills, and glow lines. The design context provides `isDesign2` and `isDesign3` booleans for conditional styling. Design selection persists to localStorage and syncs with admin settings.

### Technical Implementations
- **Frontend**: React application for dynamic and responsive user interfaces.
- **Backend**: Express/Node.js API server for handling requests, data retrieval, and business logic.
- **Indexer**: High-performance blockchain indexer with configurable parallel workers, adaptive batch sizing, and robust chain reorganization detection. It extracts ERC20/ERC721/ERC1155 token transfers, traces internal transactions, and tracks token holder balances.
- **Database**: PostgreSQL 15 for robust data persistence, utilizing Drizzle ORM. The schema includes comprehensive indexing strategies for efficient querying.
- **Caching**: In-memory TTL-based caching for frequently accessed data and hot endpoints to reduce database load.

### Feature Specifications
- **Indexing**: Parallel block fetching, reorg detection, ERC20/721/1155 token transfer extraction, resumable sync, internal transaction tracing, token holder balance tracking, and NFT metadata fetching.
- **API**: Supports both cursor-based and offset-based pagination, comprehensive search, token transfer tracking, contract verification, and `eth_call` functionality.
- **Frontend**: Real-time display of blocks and transactions, detailed block and transaction views, address pages with history and token holdings, contract verification forms, and read/write contract interfaces.
- **Multi-Chain Support**: Dynamic configuration for multiple EVM-compatible chains with a UI chain selector.
- **Explorer as a Service**: A self-service deployment wizard enables automated, one-command deployment of branded explorers for other blockchain projects using Docker.

### System Design Choices
- **Pagination**: Cursor-based pagination for efficient deep history queries, supplemented by offset-based pagination.
- **Performance**: Parallel indexing and adaptive batch sizing for rapid chain synchronization.
- **Data Persistence**: PostgreSQL with comprehensive indexing (composite, functional, descending, topic-specific) for optimized data retrieval.
- **Real-time Data**: Data refresh at 15-second intervals for up-to-date information.
- **Security**: Authentication with bcrypt hashing, `express-session` with PostgreSQL store, robust rate limiting, Helmet.js for security headers (including CSP), and an API key system with quotas.

## External Dependencies
- **EVM RPC**: `https://rpc.telemeet.space` for blockchain interaction.
- **Database**: PostgreSQL 15.
- **ORM**: Drizzle ORM for database interactions.
- **Containerization**: Docker for deploying the "Explorer as a Service."
- **Authentication**: `bcrypt` for password hashing, `express-session` for session management, and `connect-pg-simple` for PostgreSQL session store.
- **Security Middleware**: `express-rate-limit` for API rate limiting and `helmet.js` for setting security headers.
- **Metrics**: Prometheus-compatible metrics endpoint.
- **UI Libraries**: React for frontend development.
- **Build Tool**: Vite for frontend development server.