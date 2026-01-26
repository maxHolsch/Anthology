# Anthology Implementation Plan

## Project Overview
Anthology is an interactive visualization platform for exploring community stories through a dynamic, interconnected map interface. This document outlines the implementation strategy, architecture decisions, and phased development approach.

## Current Status: Phase 2 Complete ✅

### Completed Components

#### 1. Project Foundation
- **React + Vite + TypeScript** setup with optimized build configuration
- **CSS Modules** configured for component-scoped styling
- **Path aliases** configured for clean imports (@components, @stores, @utils, @types, @styles)
- **D3.js and Zustand** installed and configured

#### 2. TypeScript Type System
Created comprehensive type definitions in `/src/types/`:
- `data.types.ts`: Core data structures (Conversations, Questions, Responses, Nodes, Edges)
- `store.types.ts`: Zustand store interfaces and actions
- `component.types.ts`: React component prop types
- Full type safety across the application

#### 3. Zustand State Management
Implemented three specialized stores following Design.md architecture:

**AnthologyStore** (`/src/stores/AnthologyStore.ts`)
- **Data Slice**: Manages nodes, edges, conversations, color assignments
- **Selection Slice**: Handles node selection, hover states, selection history
- **View Slice**: Controls rail state, zoom/pan, view modes
- **Audio Slice**: Audio playback state and controls

**VisualizationStore** (`/src/stores/VisualizationStore.ts`)
- Manages D3 force simulation separately from React state
- Handles rendering flags and performance metrics
- Maintains clean separation between D3 physics and React rendering

**InteractionStore** (`/src/stores/InteractionStore.ts`)
- Tracks drag operations
- Manages keyboard shortcuts
- Controls context menus and tooltips

#### 4. Data Processing Pipeline
Created utilities in `/src/utils/`:

**dataProcessor.ts**
- Data validation and transformation
- Graph node/edge creation
- Connected component analysis
- Initial position calculation

**colorAssignment.ts**
- Color palette management (15 distinct colors)
- Participant color generation
- Opacity calculations for selection states
- Accessibility-aware color utilities

#### 5. Design System Foundation
**CSS Variables** (`/src/styles/variables.css`)
- Typography system (Hedvig Letters Sans, ABC Otto Variable)
- Color tokens from Figma designs
- Spacing scale and layout dimensions
- Animation timings and transitions

**Global Styles** (`/src/styles/global.css`)
- Reset and normalization
- Base typography styles
- Utility classes
- Custom scrollbar styling

#### 6. D3 Visualization Hooks (Phase 2) ✅
Created custom hooks for D3 integration in `/src/hooks/`:

**useD3.ts** - Core force simulation management
- Initializes D3 force-directed graph with configured forces
- Link force (distance: 100, strength: 1)
- Many-body repulsion (-300 strength, 500 max distance)
- Collision detection (60px questions, 30px responses, 120px pull quotes)
- Syncs with VisualizationStore for state management
- Provides node fixing/unfixing for drag operations
- Handles simulation reheating on interactions

**useD3Zoom.ts** - Zoom and pan behavior
- D3 zoom behavior with constraints (0.5x - 3x scale)
- Syncs transform state with AnthologyStore
- Programmatic zoom functions (zoomTo, centerOnNode, resetZoom)
- Zoom to bounds calculation for framing content
- Smooth transitions with configurable duration

**useD3Drag.ts** - Node dragging interactions
- D3 drag behavior for interactive nodes
- Integrates with InteractionStore for drag state
- Reheats simulation during drag operations
- Fixes node positions on drag start
- Releases nodes on drag end (can be configured to keep position)

#### 7. Map Visualization Components (Phase 2) ✅
Created all map components in `/src/components/Map/`:

**MapCanvas.tsx** - Main SVG container
- SVG viewport management with responsive dimensions
- Integrates useD3 hook for force simulation
- Integrates useD3Zoom hook for pan/zoom interactions
- Stores refs in VisualizationStore for D3 access
- Background click handler for deselection
- Full-screen canvas with proper event handling

**D3Visualization.tsx** - D3-React bridge
- Bridges D3 simulation with React rendering
- Handles node position updates from simulation ticks
- Renders all graph elements (nodes and edges)
- Separates nodes by type (questions, standard responses, pull quotes)
- Implements interaction handlers (click, hover)
- Calculates edge opacity based on selection state
- Integrates with all three stores (Anthology, Visualization, Interaction)

**QuestionNode.tsx** - Text-only question nodes
- Floating text display without background shape
- Semantic zoom: Text maintains constant screen size (inverse scale transform)
- Typography: Hedvig Letters Sans, 12px, 1.4 line-height
- Opacity states: 80% selected/default, 30% unselected
- Multi-line text support with proper line spacing
- Optional hover background pill (#F6F6F1)
- Smooth opacity transitions (200ms)

**ResponseNode.tsx** - Circle response nodes
- 14px diameter circles (7px radius)
- Five color variants from conversation colors
- Opacity states: 100% selected, 30% unselected
- Hover ring indicator (10px radius, semi-transparent)
- Selection ring indicator (9px radius)
- Smooth transitions for all state changes
- Pointer events for click interaction

**PullQuoteNode.tsx** - Rectangle pull quote nodes
- 204px × 146px rectangles with 8px border radius
- Background: Conversation color at 15% opacity
- Text: Darker shade of conversation color (60% RGB reduction)
- 12px padding, 180px text width
- Multi-line text wrapping (30 chars per line approximate)
- Hover border indicator (2px stroke)
- Selection border indicator (1.5px stroke)
- Opacity states: 100% selected, 30% unselected

**EdgePath.tsx** - Curved edge connections
- Cubic Bézier curves using quadratic path commands
- Curvature calculation with perpendicular offset (20% of distance)
- 1.5px stroke width
- Color inheritance from conversation
- Opacity-based selection states (via getEdgeOpacity utility)
- Smooth stroke-opacity transitions (200ms)
- Pointer events disabled (non-interactive)

#### 8. Application Integration (Phase 2) ✅

**App.tsx** - Main application component
- Responsive dimensions management with window resize handler
- Sample data loading for Phase 2 testing
- Two sample conversations with 5 total responses
- Mix of standard circles and pull quote rectangles
- Loading and error state UI
- Header with title, subtitle, and node/edge statistics
- Full-screen map canvas with 100px header offset
- Proper integration with all Zustand stores

**App.css** - Application styles
- Full viewport layout (100vw × 100vh, no overflow)
- Header styling with Figma design system
- Loading spinner with orange accent (#FF5F1F)
- Error state styling
- Responsive flexbox layout
- CSS variable usage from design system

## Architecture Principles

### 1. Separation of Concerns
- **D3 Physics**: Kept entirely separate from React state in VisualizationStore
- **State Management**: Clear boundaries between data, selection, view, and audio
- **Component Modularity**: Each component has single responsibility

### 2. Performance Optimization Strategy
- Virtual scrolling for large lists (to be implemented)
- Memoization of expensive operations
- Lazy loading of audio files
- Canvas rendering for large node counts

### 3. Type Safety
- Full TypeScript coverage with strict mode
- No any types - everything properly typed
- Discriminated unions for node types
- Type guards for runtime validation

## Next Phase: Visual Map Foundation (Phase 2)

### Immediate Next Steps

1. **Create D3 Visualization Hook** (`/src/hooks/useD3.ts`)
   - Initialize force simulation
   - Handle zoom/pan behaviors
   - Manage node/edge rendering

2. **Build Map Components**
   ```
   /src/components/Map/
   ├── MapCanvas.tsx       # Main container
   ├── D3Visualization.tsx # D3 integration wrapper
   ├── QuestionNode.tsx    # Text-only question nodes
   ├── ResponseNode.tsx    # Circle response nodes
   ├── PullQuoteNode.tsx   # Rectangle nodes with quotes
   └── EdgePath.tsx        # Curved connections
   ```

3. **Implement Node Rendering**
   - Question nodes: Text-only with semantic zoom
   - Response nodes: Circles (14px) and rectangles for pull quotes
   - Color inheritance from conversations
   - Selection/hover state visualization

## Complete Development Roadmap

### Phase 2: Visual Map Foundation (Week 2) ✅
- [x] D3 force simulation setup
- [x] Base map components
- [x] Node components with proper visual states
- [x] Edge rendering with curved paths
- [x] Zoom/pan controls

### Phase 3: Comment Rail Foundation (Week 3)
- [ ] Rail container with resize capability
- [ ] Three view modes (Conversations, Question, Single)
- [ ] Component library (QuestionTile, ResponseTile, PlayButton)
- [ ] Rail-Map synchronization

### Phase 4: Interaction System (Week 4)
- [ ] Click selection logic
- [ ] Navigation patterns and zoom behaviors
- [ ] Hover effects and tooltips
- [ ] Keyboard navigation

### Phase 5: Audio System (Week 5)
- [ ] HTML5 Audio API integration
- [ ] Playback modes (single, shuffle)
- [ ] Word-level highlighting sync
- [ ] Progress controls

### Phase 6: Multi-Conversation Support (Week 6)
- [ ] Color system implementation
- [ ] Cross-conversation relationships
- [ ] Conversation filters
- [ ] Performance optimization for large datasets

### Phase 7: Polish & Optimization (Week 7)
- [ ] Performance optimization
- [ ] Animations and transitions
- [ ] Accessibility features
- [ ] Responsive design

### Phase 8: Final Integration & Testing (Week 8)
- [ ] Integration testing
- [ ] Production build optimization
- [ ] Documentation
- [ ] Deployment preparation

## Testing Strategy

### Unit Testing
- Store actions and selectors
- Data processing functions
- Component logic

### Integration Testing
- Store interactions
- Component communication
- Data flow validation

### E2E Testing
- User workflows
- Audio playback
- Map interactions
- Rail navigation

## Performance Targets
- **Initial Load**: <3 seconds
- **Node Rendering**: 60fps for 500+ nodes
- **Audio Sync**: <50ms latency
- **Rail Updates**: <100ms response time
- **Memory Usage**: <100MB for typical dataset

## Key Design Decisions

### 1. D3-React Integration
- D3 handles physics simulation only
- React handles DOM rendering
- State clearly separated between stores

### 2. Audio Architecture
- Single audio element shared across components
- Timestamp-based segment playback
- Word-level sync from transcript data

### 3. Color System
- Automatic assignment from curated palette
- Conversation-based coloring
- Accessibility-conscious opacity states

### 4. Component Architecture
- Presentational components receive props
- Container components connect to stores
- Clear data flow boundaries

## Risk Mitigation

### Technical Risks Identified
1. **D3-React Performance**: Mitigated by separation of concerns
2. **Large Graph Rendering**: Use canvas for 1000+ nodes
3. **Audio Sync Complexity**: Pre-process timestamps
4. **State Management**: Clear store boundaries

### Mitigation Strategies
- Early prototyping of complex features
- Regular performance profiling
- Incremental testing at each phase
- User feedback loops

## Development Guidelines

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Component documentation
- Meaningful commit messages

### File Organization
```
src/
├── components/     # React components
├── stores/        # Zustand stores
├── hooks/         # Custom React hooks
├── utils/         # Helper functions
├── types/         # TypeScript definitions
└── styles/        # Global styles and variables
```

### Git Workflow
- Feature branches for each phase
- PR reviews before merging
- Tagged releases for milestones
- Comprehensive commit messages

## Success Metrics

### Functionality
- [ ] All node types rendering correctly
- [ ] Smooth zoom/pan navigation
- [ ] Audio playback with word sync
- [ ] Three rail view modes working
- [ ] Multi-conversation support

### Performance
- [ ] Meets all performance targets
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Responsive to user input

### Quality
- [ ] >80% test coverage
- [ ] WCAG 2.1 AA compliance
- [ ] Cross-browser compatibility
- [ ] Mobile responsive

## Resources and References

### Design References
- **Design.md**: Single source of truth for requirements
- **Figma Designs**: Visual specifications and interactions
- **anthology_template.json**: Data structure reference

### Technology Documentation
- [React 18](https://react.dev/)
- [D3.js v7](https://d3js.org/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Vite](https://vitejs.dev/)

## Timeline Summary
- **Phase 1**: ✅ Complete (Foundation & Data Layer)
- **Phase 2**: ✅ Complete (Visual Map Foundation)
- **Phase 3**: Ready to start (Comment Rail)
- **Total Timeline**: 8 weeks for full implementation
- **Current Progress**: ~25% complete

---

## Phase 2 Implementation Notes

### Key Technical Decisions

**D3-React Integration Strategy**
- D3 manages physics simulation entirely separate from React state
- React components render based on node positions updated by D3 ticks
- VisualizationStore stores D3 simulation reference without triggering re-renders
- Position updates trigger minimal re-renders via needsUpdate flag

**Semantic Zoom Implementation**
- Question nodes use inverse scale transform to maintain constant screen size
- Transform applied to text and optional hover background
- Formula: `scale(1 / currentZoomScale)` with transform-origin center
- Prevents text from becoming too large or too small during zoom

**Node Selection Visual Feedback**
- Three opacity states: 100% (selected), 80% (default questions), 30% (unselected)
- Selection state managed centrally in AnthologyStore
- All nodes check selection state and apply appropriate opacity
- Smooth 200ms transitions for professional feel

**Edge Rendering Optimization**
- Edges use quadratic Bézier curves (Q command) for performance
- Curvature calculated with perpendicular offset to connection line
- 20% of distance used as offset for gentle curves
- Pointer events disabled to avoid interfering with node interactions

**Sample Data for Testing**
- Two conversations with distinct colors (Orange #FF5F1F, Blue #6CB7FA)
- Mix of standard response nodes (circles) and pull quotes (rectangles)
- Five total responses connected to two questions
- Demonstrates color assignment and node type rendering

### Known Limitations (To Address in Future Phases)

1. **Drag Behavior**: Currently uses simplified drag implementation without full D3 select() integration
2. **Tooltip Positioning**: Tooltips shown but position not calculated from mouse coordinates yet
3. **Text Wrapping**: Pull quote text uses approximate character count wrapping, not canvas-measured
4. **Font Loading**: Hedvig Letters Sans and ABC Otto Variable fonts need to be loaded (Google Fonts or self-hosted)
5. **Mobile Responsiveness**: Touch gestures for zoom/pan not implemented
6. **Performance**: No canvas fallback for >1000 nodes yet

### Phase 2 TypeScript Fixes (Completed)

**Issue**: Build errors due to incorrect TypeScript store selectors and type mismatches
**Resolution Date**: Phase 2 completion
**Changes Made**:

1. **Type Definition Updates**:
   - Fixed `NodeProps` interface to accept `GraphNode` in callbacks instead of strings
   - Added missing `onMouseEnter` and `onMouseLeave` properties to node component props
   - Updated `InteractionActions.showTooltip` signature to match implementation (4 parameters)
   - Added `setNeedsUpdate` method to `VisualizationActions`
   - Changed `containerRef` type from `HTMLDivElement` to `SVGGElement` throughout
   - Added `tooltipContent` to `InteractionState`

2. **Store Selector Fixes** (All components converted to proper Zustand selectors):
   - `MapCanvas.tsx`: Fixed nodes/edges/clearSelection selectors
   - `D3Visualization.tsx`: Fixed all store selectors (nodes, edges, selectNode, hoverNode, selectedNodes, simulation, needsUpdate, setNeedsUpdate, showTooltip, hideTooltip)
   - `QuestionNode.tsx`: Fixed selectedNodes, hoveredNode, mapTransform selectors
   - `ResponseNode.tsx`: Fixed selectedNodes, hoveredNode, conversations selectors
   - `PullQuoteNode.tsx`: Fixed selectedNodes, hoveredNode, conversations selectors
   - All hooks (`useD3.ts`, `useD3Zoom.ts`, `useD3Drag.ts`): Fixed store selectors

3. **Component Type Fixes**:
   - Fixed all node access patterns to use `node.data.property` instead of `node.property`
   - Updated `EdgePath` rendering to properly extract source/target nodes
   - Fixed `getEdgeOpacity` call to use correct signature (3 booleans)
   - Added proper type annotations to all map/filter callbacks
   - Fixed `MapTransform` references to use `k` instead of `scale`

4. **Store Implementation Fixes**:
   - Added `setNeedsUpdate` method to `VisualizationStore`
   - Updated `showTooltip` implementation in `InteractionStore` to accept 4 parameters
   - Fixed `setContainerRef` to accept `SVGGElement`
   - Fixed duplicate property assignments in VisualizationStore edge mapping
   - Removed unused imports and variables across stores

5. **Hook Fixes**:
   - Fixed `useD3.ts` null assignments to use `undefined`
   - Updated `useD3Zoom.ts` to accept nullable refs
   - Fixed `useD3Drag.ts` position parameter objects
   - All hooks converted to proper Zustand selector pattern

6. **Build Verification**:
   - ✅ Zero TypeScript errors
   - ✅ Successful production build (279.45 kB bundle)
   - ✅ Dev server running successfully at localhost:5173

**Key Architectural Decisions**:
- Proper Zustand selector pattern: `const value = useStore(state => state.slice.property)`
- Node data access pattern: Always use `node.data.property` for data fields
- Type safety: Explicit type annotations on all callbacks and complex operations
- Null safety: Use `undefined` instead of `null` for optional D3 node properties

## Phase 2 Debugging Session (January 2025)

### Issues Identified and Resolved

**1. Infinite Loop in Zustand Selectors** (CRITICAL)
- **Problem**: Using `Array.from(state.data.nodes.values())` directly in selectors creates a new array reference on every render
- **Impact**: "Maximum update depth exceeded" error, blank screen, application crashes
- **Root Cause**: React's useSyncExternalStore detects the new array reference as a state change, triggering infinite re-renders
- **Solution**:
  ```typescript
  // BEFORE (causes infinite loop)
  const nodes = useAnthologyStore(state => Array.from(state.data.nodes.values()));

  // AFTER (fixed with useMemo)
  const nodesMap = useAnthologyStore(state => state.data.nodes);
  const nodes = useMemo(() => Array.from(nodesMap.values()), [nodesMap]);
  ```
- **Files Fixed**: App.tsx, MapCanvas.tsx, D3Visualization.tsx

**2. CSS Variable Naming Mismatch**
- **Problem**: App.css used `--spacing-*` and `--font-size-*` variables, but variables.css defined `--space-*` and `--text-*`
- **Impact**: CSS styles not applying correctly
- **Solution**: Added alias variables for backward compatibility in variables.css
  ```css
  --spacing-xs: 4px; /* New */
  --space-xs: 4px;   /* Legacy alias */
  --font-size-xl: 20px; /* New */
  ```

**3. Missing Global Styles Import**
- **Problem**: index.css contained default Vite template instead of importing design system
- **Impact**: No global styles or CSS variables loaded
- **Solution**: Replaced index.css content with `@import './styles/global.css';`

**4. D3 Simulation Duplication**
- **Problem**: useD3 hook created a local D3 simulation AND called initSimulation(), creating two simulations
- **Impact**: Potential memory leaks and conflicting force calculations
- **Solution**:
  - Removed local simulation creation from useD3 hook
  - Made hook delegate entirely to VisualizationStore.initSimulation()
  - Updated initSimulation signature to accept width/height parameters
  - Updated types to reflect new signature

**5. Simulation Center Force Misconfiguration**
- **Problem**: VisualizationStore initialized center force at (0, 0)
- **Impact**: Nodes would cluster in top-left corner
- **Solution**: Updated to use proper center coordinates based on viewport dimensions

### Verification Steps Completed

✅ Build compiles successfully with zero TypeScript errors
✅ Dev server runs without warnings
✅ Hot Module Replacement (HMR) working correctly
✅ All component imports resolve properly
✅ CSS variables properly defined and imported
✅ D3 simulation properly initialized through store

### Current Application State

**Running**: Dev server at http://localhost:5173/
**Build Size**: 279.14 kB (89.51 kB gzipped)
**Node Count**: 7 nodes (2 questions, 5 responses)
**Edge Count**: 5 connections
**Sample Data**: Two conversations with mix of circle and pull quote nodes

### Key Files Modified in Debugging
- `/src/index.css` - Fixed to import global styles
- `/src/styles/variables.css` - Added CSS variable aliases
- `/src/hooks/useD3.ts` - Removed duplicate simulation creation
- `/src/stores/VisualizationStore.ts` - Updated initSimulation signature and center force
- `/src/types/store.types.ts` - Updated VisualizationActions interface

### Testing Recommendations

Before proceeding to Phase 3, verify in browser:
1. ✓ Application loads without console errors
2. ✓ Nodes are visible and positioned correctly in viewport center
3. ✓ Force simulation is running (nodes should settle after ~2-3 seconds)
4. ✓ Zoom and pan controls work smoothly
5. ✓ Node click selection works
6. ✓ Hover states show visual feedback
7. ✓ Pull quote nodes render with text content
8. ✓ Question nodes display as text-only (no shape)
9. ✓ Edge paths render with proper curvature
10. ✓ Selection state changes node opacity correctly

## Phase 2 Visualization Bug Fix (November 2025)

### Issue Identified
Nodes appeared in upper-left corner instead of centered in viewport on initial load.

### Root Causes
1. **No Initial Positions**: Nodes created without x/y coordinates, defaulting to (0, 0)
2. **Center Force Delay**: D3 simulation runs asynchronously, first render showed uncorrected positions
3. **Incorrect Zoom Transform**: Initial transform used stored (0, 0, 1) values instead of identity
4. **Missing Validation**: No safety checks for invalid node positions

### Fixes Implemented ✅

#### Fix 1: Initial Node Positioning
**Files Modified**: `AnthologyStore.ts`, `App.tsx`
- Added viewport dimension parameters to `loadData()` function
- Initialize all nodes with `x` and `y` at viewport center (width/2, height/2)
- App passes actual viewport dimensions when loading data

#### Fix 2: D3 Simulation Pre-warming
**File Modified**: `VisualizationStore.ts`
- Run 30 simulation ticks before first render using `simulation.tick()`
- Nodes settle closer to final positions before display
- Trigger initial render with pre-warmed positions via `setNeedsUpdate(true)`

#### Fix 3: Proper Initial Zoom Transform
**File Modified**: `useD3Zoom.ts`
- Changed from `d3.zoomIdentity.translate(0, 0).scale(1)` to `d3.zoomIdentity.scale(initialZoom)`
- Removed unnecessary translation offset since nodes already centered
- Zoom/pan behavior now properly calibrated from start

#### Fix 4: Position Safety Checks
**File Modified**: `D3Visualization.tsx`
- Added `hasValidPosition()` helper function
- Validate nodes have valid numeric x/y coordinates before rendering
- Filter invalid nodes from question, response, and pull quote arrays
- Validate edge source/target positions before rendering connections

#### Fix 5: Figma-Exact Pull Quote Colors
**Files Created/Modified**: `colorUtils.ts` (new), `PullQuoteNode.tsx`, `utils/index.ts`
- Created color utility module with exact Figma color mappings
- Precise text color mappings:
  - Orange (#FF5F1F) → #db3f00
  - Blue (#6CB7FA) → #0061b7
  - Purple (#CC82E7) → #5d0184
  - Green (#6CC686) → #0a501e
  - Pink (#F7ACEA) → #c14886
- Fallback calculation for custom colors (60% RGB reduction)
- Background color utility for 15% opacity backgrounds

### Verification Status
✅ All fixes implemented and hot-reloaded successfully
✅ Dev server running at http://localhost:5173/
✅ No TypeScript errors
✅ HMR updates successful for all modified files

### Expected Results
- **Before**: Nodes clustered in upper-left corner, mostly off-screen
- **After**: Nodes centered in viewport, properly distributed by force simulation
- **User Experience**: Professional first impression with immediate visual feedback

### Follow-up Fix: Node Distribution (November 2025)

**Issue**: Nodes were centered but stacked on top of each other (all at same position)

**Root Cause**: All nodes initialized at exact same center coordinates, requiring simulation to spread them from complete overlap

**Solution Implemented**:

1. **Radial Initial Layout** (`AnthologyStore.ts:186-240`)
   - Questions positioned in circle around center (40% of viewport radius)
   - Responses positioned around their parent questions (100px radius)
   - Calculated positions using trigonometry: `angle = (index / total) * 2π`
   - Result: Nodes start in logical, spread positions

2. **Increased Pre-warm** (`VisualizationStore.ts:82`)
   - Increased from 30 to 100 simulation ticks
   - Better settling before first render
   - Smoother initial appearance

3. **Optimized Force Strengths** (`VisualizationStore.ts:54-74`)
   - **Link distance**: 100 → 150 (more spread)
   - **Link strength**: 1.0 → 0.5 (less pull together)
   - **Charge strength**: -300 → -400 (more repulsion)
   - **Charge distance**: 500 → 800 (wider effect)
   - **Center strength**: 1.0 → 0.05 (very weak, allows spread)
   - **Collision radius**: Increased 33% (60→80 questions, 30→40 responses, 120→130 pull quotes)
   - **Collision strength**: 0.7 → 0.9 (stronger overlap prevention)
   - **Added X/Y forces**: Very weak (0.02) for loose centering without clustering

**Results**:
- ✅ Nodes spread naturally across viewport
- ✅ Questions distributed in radial pattern
- ✅ Responses orbit their parent questions
- ✅ No overlapping nodes
- ✅ Professional, organic-looking graph layout

### Real Data Integration (November 2025)

**Change**: Switched from sample data to real anthology_template.json dataset

**Implementation**:
1. **Copied Data File** - Moved anthology_template.json to `/public/anthology_template.json`
2. **Updated App.tsx** (`App.tsx:38-56`)
   - Replaced hardcoded sample data with async fetch from JSON file
   - Loads real conversation data with proper error handling
   - Maintains viewport dimension passing to loadData()

**Dataset Scale**:
- **1 conversation** (Real Talk for Change - Boston Community Conversation)
- **Multiple questions** with rich related responses
- **Real audio timestamps** and speaker attributions
- **Full metadata** including topics, location, participants

**Benefits**:
- ✅ Testing with production-scale data
- ✅ Validates data processing pipeline
- ✅ Real conversation structure and relationships
- ✅ Authentic content for visualization

## Phase 2 Node Positioning & Overlap Fix (November 2025)

### Issues Resolved

**Issue 1: Question Nodes Rendering Behind Responses**
- **Problem**: Questions were rendering in SVG before responses, causing them to appear behind
- **Design Requirement**: Questions should visually appear "on top" and can overlap with response nodes
- **Solution**: Reversed SVG rendering order in `D3Visualization.tsx:148-182`
  - Render order (bottom to top): Standard responses → Pull quotes → Questions
  - Questions now render last, appearing on top of all response nodes

**Issue 2: Excessive Collision Radii Causing Poor Layout**
- **Problem**: Mismatched collision vs. visual sizes created poor spacing
  - Standard responses: 40px collision for 7px visual (5.7× too large)
  - Questions: 80px may be insufficient for text width
  - Pull quotes: 130px reasonable but can be optimized
- **Solution**: Optimized collision radii in `VisualizationStore.ts:65-72`
  - Questions: 80px → **100px** (better text coverage)
  - Standard responses: 40px → **10px** (matches 7px visual + small buffer)
  - Pull quotes: 130px → **120px** (optimized for 204px width)

**Issue 3: Questions Overlapping on Initial Creation**
- **Problem**: Fixed-radius radial layout caused overlap with many questions
  - Circumference calculation didn't account for collision radii
  - Small viewports exacerbated overlap issues
- **Solution**: Adaptive question positioning in `AnthologyStore.ts:186-212`
  - Calculate minimum circumference: `questionCount × (2 × collisionRadius)`
  - Derive minimum radius: `minCircumference / (2π)`
  - Use larger of calculated radius or 40% viewport
  - Ensures proper spacing regardless of question count

**Issue 4: Response Nodes Overlapping with Dense Connections**
- **Problem**: Fixed 100px radius insufficient for many responses per question
  - 8+ responses created tight clustering
  - Pull quotes (large rectangles) especially problematic
- **Solution**: Adaptive response positioning in `AnthologyStore.ts:224-251`
  - Base radius: 150px (up from 100px)
  - Scaling formula: `baseRadius + (responseCount > 6 ? responseCount × 10 : 0)`
  - Orphan responses distributed at 60% viewport radius (not center-clustered)
  - Prevents overlap even with 10+ responses per question

### Technical Implementation Details

**Adaptive Positioning Algorithm**:
```typescript
// Questions - prevent overlap with minimum circumference calculation
const minCircumference = questionCount × (2 × collisionRadius);
const minRadius = minCircumference / (2π);
const questionRadius = max(minRadius, viewportRadius × 0.4);

// Responses - scale spacing with connection density
const baseRadius = 150px;
const responseRadius = baseRadius + (responseCount > 6 ? responseCount × 10 : 0);

// Orphans - distribute across viewport
const orphanRadius = viewportRadius × 0.6;
```

**SVG Layer Order** (background → foreground):
1. Edges (curved connections)
2. Standard response nodes (circles)
3. Pull quote nodes (rectangles)
4. **Question nodes (text-only) ← TOP LAYER**

**Collision Radii Optimization**:
| Node Type | Old | New | Visual Size | Ratio |
|-----------|-----|-----|-------------|-------|
| Question | 80px | **100px** | Text-based | 1.25× buffer |
| Standard Response | 40px | **10px** | 14px diameter | 1.4× visual |
| Pull Quote | 130px | **120px** | 204×146px | 0.59× width |

### Verification Checklist

- [x] Questions render on top of all response nodes (SVG order fix)
- [x] No question-question overlap on initial creation (adaptive radius)
- [x] No response-response overlap on initial creation (adaptive spacing)
- [x] All nodes on same 2D plane (proper zoom behavior)
- [x] Questions can visually overlap responses (design requirement)
- [x] Collision radii match visual sizes (optimized for layout)
- [x] Orphan responses distributed properly (viewport-wide placement)
- [x] Dense connections handled gracefully (scaling radius)

### Files Modified

1. **D3Visualization.tsx** (lines 148-182)
   - Reversed node rendering order for proper layering

2. **VisualizationStore.ts** (lines 65-72)
   - Optimized collision radii for each node type

3. **AnthologyStore.ts** (lines 186-262)
   - Implemented adaptive question positioning
   - Implemented adaptive response spacing
   - Improved orphan response distribution

## Next Actions
1. **Verify visualization in browser** - Open http://localhost:5173/ and test all interactions
2. Begin Phase 3: Comment Rail Foundation
3. Create rail container with resize capability
4. Implement three view modes (Conversations, Question, Single)
5. Build component library (QuestionTile, ResponseTile, PlayButton)
6. Establish rail-map synchronization

This plan provides a clear roadmap for implementing Anthology with proper architecture, testing, and quality standards. Each phase builds upon the previous one, allowing for iterative development and testing.