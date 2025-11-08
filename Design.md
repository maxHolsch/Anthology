# Anthology - Community Story Visualizer Design Document

todo:
[ ] Would we like the nodes to look better than this? Go through figma mcp, see if this is actually in line with that is described
[ ] prompt node logic for clicks (with multiple prompts)
[X] have it be pull quotes instead of nodes?
[ ] what if there were shooting stars across the network?

## Project Overview

**Anthology** is an interactive visualization platform for exploring community stories through a dynamic, interconnected map interface. The system presents conversations and narratives as a network of nodes, allowing users to navigate through questions, and responses in an intuitive visual format.

## Core Components

### 1. Visual Map System

#### Node Types and Behavior

**Question Nodes**
- **Visual Representation**: Displayed as floating text only (no visible node shape or marker)
- **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=95-17718&m=dev
- **Positioning Logic**:
  - Question nodes are actual nodes in the D3 force-directed graph
  - Response nodes have direct connections (links) to their question node
  - D3 force simulation naturally positions questions based on connected responses
- **Text Display**:
  - Question text renders directly on the map canvas without any containing shape
  - Text maintains consistent screen-relative size regardless of zoom level (semantic zoom)
  - Text acts as clickable area for interaction

- **Data Structure**:
  - Contains question text
  - Maintains array of pointers to related response nodes
  - Acts as a node in the force-directed graph

**Response Nodes** 
- **Visual Representation**: Displayed as visible geometric shapes that users can interact with
  - **Standard Nodes** (without pull_quote): Circles for responses
  - **Pull Quote Nodes** (with pull_quote): Rectangles displaying the quoted text
  - **Standard Nodes** (without pull_quote): Circles for responses
    - **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17609&m=dev
  - **Pull Quote Nodes** (with pull_quote): Slightly rounded rectangles displaying the quoted text
    - **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17598&m=dev
- **Visual States**:
  - Default (All unselected): Full color
  - Selected/Active: Full color, while all other nodes are faded (50% opacity)
    - Visual Reference for faded Circle Nodes: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=103-242&m=dev
    - Visual Reference for faded Prompt Nodes: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=103-251&m=dev
- **Visibility Rules**:
  - Always visible at all zoom levels (no progressive disclosure)
  - Node shapes scale with zoom (get bigger when zooming in)
  - All nodes remain interactive and clickable at any zoom level
- **Interaction**:
  - Clickin on node zooms in on and centers node, and triggers node view in comment rail
- **Data Structure**:
  - Type: prompt/response. Prompt nodes are ignored, only response nodes are used
  - Type field: "response" (transcrit of what is said)
  - "responds_to" field: pointer to parent question node, or (if responding to a different response node) pointing to parent response node
  - Speaker name
  - Speaker text content
  - Pointer to partent conversation
  - Audio timestamps (start and end)
  - Pull quote (optional): featured text excerpt for rectangle visualization

#### Spatial Organization
- **Graph Structure**: Two node types (questions, responses) with two link types:
  - Question ← Response links (responses connect directly to questions)
  - Response ← response links (response connects to a previous response)
  - **Link Visualization**: Connections rendered with slight curvature for visual elegance
    - Curved paths using cubic Bézier curves
    - Subtle arc to prevent overlapping connections
    - Curvature adapts based on node positioning
- **D3 Force-Directed Layout**: Automatic positioning based on node connections
  - Force simulation handles all spatial calculations. Generally, we want the nodes to feel fairly spread out.
  - Questions naturally cluster with their connected responses
  - Response groups form around their associated questions
- **Zoom Behavior**:
  - Standard D3 zoom applies to the entire map canvas
  - All nodes remain visible at all zoom levels
  - Response nodes scale proportionally with zoom
  - Question text maintains constant screen size (semantic zoom)

### 2. Comment Rail Interface

#### Display Modes

**Initial Conversations View** (Default on Page Load)
- **Purpose**: Entry point to the visualization, displayed when page first opens
- **Content Display**:
  - Shows all question nodes present in the map
  - List format in the comment rail
  - Each question is clickable
- **Interaction**:
  - Clicking on a question zooms in on that question on the map and transitions to Question Node View
  - Returns to this view when all nodes are deselected (clicking on empty map space)
  - **Important**: Returning to this view does NOT zoom out the map - only changes comment rail content
- **Navigation**: Acts as the home state for the comment rail

**Single Node View**
- **Response Node Selected**:
  - Full text display of the selected response
  - Speaker name
  - Response audo player 
  - Beautiful, readable formatting optimized for content consumption
  - Visual Reference: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17452&m=dev
    - Response Play Button: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17564&m=dev

**Question Node View**
  - **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17360&m=dev
- **Question Text Selected** (when user clicks on Question Node on Map, or on Question Tile on Comment Rail):
  - Display question text prominently in comment rail
  - Show all directly connected response nodes in the scrollable comment rail
  - Brief overview/preview of each response node
  - Enable quick navigation between response nodes. When you click on a response node in the comment rail, it zooms into that one and goes into the single node view
  - when you hover over a node in the comment rail, it is temporarily highlighted on the map
  - **Audio Playback**: Random "shuffle" playback button that plays one connected response node at a time
  - Reference: [Figma Frame 4-3428](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3428&t=JN4qdlt1xDfI1Af0-4)

#### Interface Features
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Smooth Transitions**: Animated transitions between different view modes
- **Audio Playback Controls**: Integrated audio player for nodes with associated audio
- **Scalable Multi-Node Handling**:
  - Virtualized scrolling for performance with hundreds of selected nodes
  - Compact card view for large selections (showing speaker name and first line, along with a view more text)
  - Smart grouping by parent node (responses grouped under their question)

### 3. Audio Playback System

#### Unified Audio Playback Logic

**Core Playback Behaviors**:
- **Single Response Node View**:
  - Plays only the specific timestamped audio segment (audio_start to audio_end) of parent conversation
  - Shows individual play/pause button with progress indicator
  - Highlights only that node on the map during playback

- **Question Node View**:
  - Random "shuffle" button that plays one connected response at a time
  - Each click plays a different random response from connected nodes
  - Does NOT auto-advance to next response - requires manual click for each
  - Currently playing response is highlighted on the map

**Audio Controls**:
- **Play/Pause Button**:
  - Toggles between play and pause states
  - Shows current playback state with standard media icons

- **Progress Indicator**:
  - Visual bar showing current position within audio segment
  - Displays time remaining in countdown format
  - Acts as scrubber for seeking within the segment
  - Updates in real-time during playback

**Visual Feedback During Playback**:
- **Map Highlighting**:
  - Currently playing node shown at full opacity
  - All other nodes fade to 50% opacity
  - Smooth transitions between node highlights

- **Comment Rail Sync**:
  - Playing text segment highlighted in rail, word by word
  - Word-level highlighting: Each word from word-timestamped transcript JSON (containing text, start/end timestamps in milliseconds, speaker, confidence) is highlighted when audio playback time matches that word's timestamp range
  - Continuous time matching: Audio player's current time (in milliseconds) is compared against each word's start/end range to determine which word to highlight
  - Auto-scrolls to keep current content in view
  - Visual indicator of active playback state

#### Audio Data Management

**Audio File Handling**:
- Support for common formats: MP3, WAV, M4A, OGG
- Streaming capability for large audio files
- Preloading strategy for smooth playback
- Fallback for unsupported formats

**Playback State Management**:
- Each node references its parent conversation's audio file
- Multiple conversations supported (each with its own audio file)

### 4. Multi-Conversation Color System

The system supports displaying multiple conversations simultaneously on the same map, with each conversation differentiated by a unique color. This visual distinction helps users understand relationships and navigate between different narrative threads.

**Automatic Color Assignment (Default)**
- **Predefined Palette**: Uses a curated set of 10-15 visually distinct colors optimized for accessibility. If a conversation set does not already have a color, it will be assigned a unique one
- Colors assigned in order as conversations are loaded
- **Collision Prevention**: Ensure that no two conversations share the same color

#### Visuals 

**Response Node Coloring**
- **Response Nodes**:
  - Fill color uses assigned conversation color
  - Pull quote rectangles use color as background with adjusted opacity
- **Question Nodes**:
  - Text color remains black

- Edges inherit color from source conversation of child response node

**Selection States**
- **Selected**: Full saturation and opacity
- **Unselected (same conversation)**: 70% opacity
- **Unselected (different conversation)**: 40% opacity
- **Playing**: Full saturation and opacity (state does not change from selected)

### 5. Data Processing Pipeline

#### Decoupled Architecture
**Design Principle**: The system uses an adapter pattern to decouple the input JSON structure from the internal data representation. Json formatting and organization will be handled in a seperate program

#### Input Handling
**Supported Input Formats**:
- JSON files with various configurations
- Plain text files (.txt)
- Future extensibility for other formats
- Seperate system will convert audio and transcripts into the correct format

**Processing Workflow**:
1. Accept raw input file (JSON or TXT)
2. Apply format-specific adapter/transformer
3. Utilize LLM for intelligent parsing and structuring (if needed)
4. Convert to standardized internal data model



5. Validate data integrity and relationships (we want in our program + graceful error handling)



6. Generate visualization-ready data structure


#### Data Schema

**Conversation Structure**:
```
{
  "conversation_id": unique_identifier,
  "audio_file": string (URL or file path to conversation audio),
  "duration": number (total duration in milliseconds),
  "color": string (hex color value, e.g., "#FF6B6B"),
  "metadata": {
    "title": string (optional),
    "date": string (optional),
    "participants": [array of speaker names],
    "color_scheme": string (optional - predefined theme name)
  }
}
```

**Response Node Structure**:
```
{
  "type": "response" | "prompt",  // Node type determines visibility and interaction
  "responds_to": question_node_id,
  "speaker_name": string,
  "speaker_text": string,
  "pull_quote": string (optional - if present, node displays as rectangle with this text),
  "audio_start": timestamp (milliseconds),
  "audio_end": timestamp (milliseconds),
  "conversation_id": string (reference to parent conversation for audio file),
  "id": unique_identifier
}
```


**Node Type Behavior**:
- **type: "response"**: Full visualization and interaction enabled
  - Displayed on map as circle or if pull_quote present, rectangle
  - Clickable and selectable
  - Shows in comment rail
  - Audio playback enabled
- **type: "prompt"**: Data storage only, no visualization
  - Not displayed on map
  - Not selectable or clickable
  - Not shown in comment rail
  - No audio playback
  - Preserved in data structure for context/processing

**Question Node Structure**:
```
{
  "type": "question",
  "question_text": string,
  "related_responses": [array of response node IDs],  // Only includes type:"response" nodes
  "id": unique_identifier,
  "path_to_recording": string
}
```

## User Interaction Patterns

### Navigation
- **Initial State**:
  - Page loads with Initial Conversations View in comment rail
  - All questions displayed as clickable list
  - Map shows full visualization at default zoom level
- **Click Selection**:
  - Click question in Initial Conversations View: Zooms in on question + transitions to Question Node View
  - Click response node (circle): Selects ONLY that response + displays in comment rail with play button for individual audio segment
  - Click question text on map, or comment rail (in Conversations View): Shows all directly connected response nodes + displays responses in rail with shuffle button for random playback
  - Click empty map space: Deselects all + returns to Initial Conversations View (without zooming out)
- **Audio Behavior Summary**:
  - Response nodes → Play individual segment only (timestamped portion)
  - Question nodes → Shuffle button plays one random connected response per click
  - Currently playing node highlighted on map in real-time
- **Zoom Controls**:
  - Smooth zoom in/out to explore the map at different scales
  - All nodes remain visible and interactive at any zoom level
  - Excerpt nodes scale with zoom, question text remains constant size
- **Pan and Explore**: Free movement through the story map

### Information Architecture
- **Full Visibility**: All nodes visible at all zoom levels for complete context
- **Multi-path Exploration**: Allow story navigation to happen from either comment rail or map, maintaing cogent state throughout
- **Three-Mode System**: Initial Conversations View (home) ↔ Question Node View ↔ Single Node View


## Technical Considerations

### Performance Requirements
- Smooth rendering of potentially hundreds of nodes
- Efficient zoom and pan operations with semantic zoom for question text
- Quick response to user interactions
- Optimize rendering for all visible nodes (no lazy loading based on zoom)

### Visual Design References

The interface should follow the aesthetic and interaction patterns demonstrated in the Figma designs:

## Comment Rail

- **Home View**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17264&m=dev

  -**Question Tile**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17536&m=dev
    - Stack these to display multiple Questions in Home View


- **Question View**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17360&m=dev

  - **Medley Play Button**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17537&m=dev
    - Display this at the top of the Question View to summarize multiple Responses

  -**Response Tile**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17579&t=rUzvQQbCdborDjmH-4
    - Stack these to display multiple Responses in Question View 
    
    -**Response Tile Play Button**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17564&m=dev
      - Always display this above Response text

- **Single View**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17452&m=dev

  - **Question Context Text**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17597&t=rUzvQQbCdborDjmH-4
    - Display this above the full Response text in Single View to describe which Question is being responded to

- **Back Button**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17555&m=dev
  - Display this at the top left of the Question View to enable going back to Home View
  - Display this at the top left of Single View to enable going back to Question View


## Visual Map

- **Pull Quote Node**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17598&t=rUzvQQbCdborDjmH-4

- **Circle Node**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17609&t=rUzvQQbCdborDjmH-4

- **Question Node**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=95-17718&t=rUzvQQbCdborDjmH-4

- **Visual Map Layout**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=106-463&m=dev



## Implementation Decisions

### Technology Stack
- **Frontend Framework**: React
- **Visualization Library**: D3.js for node rendering and interactions
- **Graph Layout**: Force-directed graph algorithm for organic node positioning
- **State Management**: Zustand for centralized state management
- **Styling**: CSS Modules or Styled Components for component styling. Make sure to reference figma first always, even to get context for new components
- **Audio Playback**: Native HTML5 Audio API for all audio playback and control

### State Management Architecture (Zustand)

#### Core Design Principles
- **Single Source of Truth**: All shared state lives in Zustand stores, eliminating conflicts between map and comment rail
- **Unidirectional Data Flow**: User actions → Store updates → Component re-renders
- **Granular Subscriptions**: Components only subscribe to specific state slices they need

- **Bidirectional Exploration**: Map and rail can both initiate state changes that affect the other

#### Store Structure

**Primary Store (AnthologyStore)**
Manages the main application state with logical separation of concerns:

- **Data Slice**: Core data structures
  - All nodes (questions, responses)
  - Edge relationships between nodes
  - Conversation metadata and audio file references
  - Conversation color assignments (Map<conversation_id, color>)
  - Processed and validated data from LLM pipeline

- **Selection Slice**: User selection state
  - Currently selected nodes (Set for efficient operations)
  - Hovered node for preview states
  - Focused node for keyboard navigation
  - Selection mode (single, multi, auto-cascade)
  - Selection history for undo/redo capability

- **View Slice**: UI presentation state
  - Map transform (pan x/y, zoom scale)
  - Comment rail expanded/collapsed state
  - Rail display mode (single, multi, question view)
  - Active Figma design references for current views
  - Current zoom scale for semantic zoom calculations

- **Audio Slice**: Playback management
  - Current playback state (idle, playing, paused, buffering)
  - Active audio track and timestamp
  - Playlist queue and ordering
  - Playback mode (single node, chronological, random)
  - Volume and playback speed preferences
  - Node highlighting sync state

**Secondary Store (VisualizationStore)**
Manages D3-specific state and React-D3 bridge:

**IMPORTANT: D3 State Separation**
D3's internal state (force simulation, real-time positions, physics calculations) must remain separate from Zustand's application state. This separation is critical for:
- **Performance**: D3 updates at 60fps without triggering React re-renders
- **Stability**: Prevents state conflicts between D3's physics engine and React's rendering
- **Maintainability**: Clear boundaries between visualization logic and application logic

**D3 manages (keep separate from Zustand):**
- D3 force simulation instance
- Node positions from force simulation (rapidly changing x/y coordinates)
- Link strengths and distances
- Zoom behavior configuration
- Transform matrices for pan/zoom
- Animation states and transitions

**Rule: Never store rapidly-changing D3 position data in Zustand. Let D3 control its own physics/visualization state.**

**Secondary Store (InteractionStore)**
Manages complex user interactions:

- Keyboard shortcut handlers
- Gesture recognition state
- Drag and drop state
- Context menu state and options



#### State Persistence and Hydration

- **Session Persistence**: Critical state (selections, audio position) saved to sessionStorage
- **URL State Sync**: Shareable states (selected nodes, zoom level) reflected in URL parameters
- **Rehydration**: On app load, state restored

#### DevTools Integration

- **Time-Travel Debugging**: Navigate through state changes during development
- **Action Logging**: Track which actions triggered which state updates
- **Performance Monitoring**: Identify expensive state updates and re-renders
- **State Inspection**: View complete state tree and subscriptions

### UI/UX Specifications
- **Comment Rail**: Adjustable right sidebar (resizable 20-50% width), map occupies remaining space; responsive breakpoints for mobile/tablet/desktop
- **Selection Behavior**:
  - **Question nodes**: Clicking shows all directly connected response nodes
  - **Response nodes**: Clicking selects only that individual response
  - **Single Selection**: Each new click replaces the previous selection
  - **Clear selection**: Click on empty map space
- **Node Display**:
  - Response nodes: Circles (or rectangles for pull quotes)
  - Question nodes: Text-only display without visible node markers
- **Animation Priority**: Smooth transitions for zoom, pan, and node selection
- **Visual Feedback**: Hover states, selection highlights, and smooth morphing

- **Audio Visual Integration**:
  - Play button prominently displayed when node has audio
  - Text highlights sync with audio playback position

## Summary

Anthology transforms community narratives into explorable visual landscapes. By combining an intuitive node-based visualization with a responsive comment rail interface, users can discover connections, follow story threads, and engage with content in a non-linear, immersive way. The system's intelligent data processing ensures that various input formats can be seamlessly converted into rich, interactive story maps.
