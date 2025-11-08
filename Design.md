# Anthology - Community Story Visualizer Design Document

todo:
[X] question nodes
[ ] Would we like the nodes to look better than this? Go through figma mcp, see if this is actually in line with that is described
[ ] prompt node logic for clicks (with multiple prompts)
[X] have it be pull quotes instead of nodes?
[ ] what if there were shooting stars across the network?
[X] What is our stack?

## Project Overview

**Anthology** is an interactive visualization platform for exploring community stories through a dynamic, interconnected map interface. The system presents conversations and narratives as a network of nodes, allowing users to navigate through questions, responses, and excerpts in an intuitive visual format.

## Core Components
testing
### 1. Visual Map System

#### Node Types and Behavior

**Question Nodes**
- **Visual Representation**: Displayed as floating text only (no visible node shape or marker)
- **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=95-17718&m=dev
- **Positioning Logic**:
  - Question nodes are actual nodes in the D3 force-directed graph
  - Prompt nodes have direct connections (links) to their question node
  - D3 force simulation naturally positions questions based on connected prompts
- **Text Display**:
  - Question text renders directly on the map canvas without any containing shape
  - Text maintains consistent screen-relative size regardless of zoom level (semantic zoom)
  - Text acts as clickable area for interaction
- **Visibility Rules**:
  - Text visible when zoomed out (zoom level < 25%)
  - Act as navigational landmarks for the overall story structure through text positioning
- **Data Structure**:
  - Contains question text
  - Maintains array of pointers to related prompt nodes
  - Acts as a node in the force-directed graph with x/y coordinates

**Excerpt Nodes**
- **Visual Representation**: Displayed as visible geometric shapes that users can interact with
  - **Standard Nodes** (without pull_quote): Circles for responses
    - **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17609&m=dev
  - **Pull Quote Nodes** (with pull_quote): Slightly rounded rectangles displaying the quoted text
    - **Visual Reference**: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=94-17598&m=dev
- **Visual States**:
  - Unselected: Full color
  - Selected/Active: Full color, while all other nodes are faded (50% opacity)
    - Visual Reference for faded Circle Nodes: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=103-242&m=dev
    - Visual Reference for faded Prompt Nodes: https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=103-251&m=dev
- **Visibility Rules**:
  - Always visible at all zoom levels (no progressive disclosure)
  - Node shapes scale with zoom (get bigger when zooming in)
  - All nodes remain interactive and clickable at any zoom level
- **Node Types**:
  - Prompt nodes: Not displayed.
  - Response nodes: Trigger full individual excerpt display when clicked.
- **Data Structure**:
  - Type field: "prompt" or "response"
  - "responds_to" field: pointer to parent node
  - Speaker name
  - Speaker text content
  - Audio timestamps (start and end)
  - Pull quote (optional): featured text excerpt for rectangle visualization

#### Spatial Organization
- **Graph Structure**: Three node types (questions, prompts, responses) with two link types:
  - Question ← Prompt links (prompts connect to questions)
  - Prompt ← Response links (responses connect to prompts)
- **D3 Force-Directed Layout**: Automatic positioning based on node connections
  - Force simulation handles all spatial calculations
  - Questions naturally cluster with their connected prompts
  - Prompts cluster with their connected responses
- **Zoom Behavior**:
  - Standard D3 zoom applies to the entire map canvas
  - All nodes remain visible at all zoom levels
  - Excerpt nodes (prompts/responses) scale proportionally with zoom
  - Question text maintains constant screen size (semantic zoom)

### 2. Comment Rail Interface

#### Display Modes

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
  - Show all connected Response Nodes in the comment rail

  - **Conversation Audio Player**: Prominent play button to play 'Conversation Medley', a montage of most relevant excerpts
  - **Audio Playlist Behavior**:
    - When play is clicked
    - Plays that response node, then randomly selects another connected response
    - Continues random selection through all connected response nodes
    - Prompt nodes remain visible in comment rail during playback
    - Currently playing response node is highlighted on the map in real-time
    - **Simplified Navigation**: Only previous/next buttons available
  - **Auto-play Option**: Setting to automatically start playing when question text is clicked
  - Reference: [Figma Frame 4-3428](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3428&t=JN4qdlt1xDfI1Af0-4)

**Home View View**
- Display abridged versions of all selected nodes (unlimited capacity)
- Accommodate any number of selected nodes via scrolling
- "Click for full text" expansion capability for each node, which opens individual node view.
- Efficient scrollable container with smart space usage
- **Selection Hierarchy** (non-cascading):
  - Clicking a prompt node: Selects ONLY response nodes directly attached to that prompt (no further cascading)
  - Clicking a question node: Selects ONLY prompt nodes directly attached to that question (responses NOT included)
  - No automatic cascade: Each click selects only one level of the hierarchy
- Intelligent grouping: Automatically organizes related nodes visually in the rail
- **Audio Playback**: When prompt node clicked, plays connected response nodes in chronological order

#### Interface Features
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Smooth Transitions**: Animated transitions between different view modes
- **Audio Playback Controls**: Integrated audio player for nodes with associated audio
- **Scalable Multi-Node Handling**:
  - Virtualized scrolling for performance with hundreds of selected nodes
  - Compact card view for large selections (showing speaker name and first line)
  - Smart grouping by parent node (responses grouped under their prompt)
  - Filter/sort options: By speaker or conversation
  - Batch operations: Play all selected audio, export selected text, etc.

### 3. Audio Playback System

#### Audio Player Components

**Play Button Design**
- **Big Medley / Summary Button**:
  - Rectangular play/pause button with standard media icons and time display
  - Displays countdown timer counting seconds until end of excerpt
  - Located prominently in the comment rail when viewing nodes with audio
  - Fills container width
  - Visual states: idle, playing, paused
  - Progress indicator showing current position in audio, can act as timeline scrubber for seeking
  - Reference: [Figma Frame 4-3428](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3428&t=JN4qdlt1xDfI1Af0-4)

- **Individual Node Play Button**:
  - Small ectangular play/pause button with standard media icons and time display
  - Visual states: idle, playing, paused
  - Displays countdown timer counting seconds until end of excerpt
  - Progress indicator showing current position in audio, can act as timeline scrubber for seeking
    - Reference: [Figma Frame 4-3428](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3428&t=JN4qdlt1xDfI1Af0-4)


**Audio-Text Synchronization**
- **Highlight System**:
  - Currently playing node highlighted on the map (all other nodes are faded to 50% opacity)
  - Currently playing text segment highlighted in comment rail
  - Smooth scrolling to keep current audio position in view
- **Node Highlighting Logic**:
  - Single response node playback: Only that node highlighted
  - Prompt node playlist: Highlight changes dynamically as audio moves from prompt to each response
  - Highlight transitions smoothly between nodes based on audio timestamps
- **Interaction**:
  - Click on text to jump to that position in audio
  - Audio continues when selecting different nodes (optional setting)
  - Queue system for playing multiple nodes sequentially

#### Audio Data Management

**Audio File Handling**
- Support for common formats: MP3, WAV, M4A, OGG
- Streaming capability for large audio files
- Preloading strategy for smooth playback
- Fallback for unsupported formats

**Timestamp Precision**
- Millisecond-level precision for audio start/end times
- Support for overlapping audio segments
- Graceful handling of gaps between segments

**Conversation Playlist Management**
- **Playback Behavior by Node Type**:
  - **Individual Response Node**: Plays only that specific audio segment (audio_start to audio_end)
  - **Prompt Node**: Creates chronological playlist of directly connected response nodes
  - **Question Node**: Creates randomized playlist of all connected response nodes
- **Playlist Generation**:
  - Prompt node click → Chronological playlist of directly connected responses (sorted by audio_start timestamp)
  - Question node click → Random playlist creation from all connected responses (via question → prompt → response path)
  - Question playlist plays responses in random order (not chronological)
  - Each node references its parent conversation's audio file
  - Multiple conversations supported (each with its own audio file)
- **Dynamic Node Highlighting**:
  - As audio plays through playlist, the currently playing node gets highlighted on the map
  - Highlight transitions occur at timestamp boundaries (prompt → response1 → response2, etc.)
  - Visual feedback shows which specific node's audio is currently playing
  - Comment rail scrolls to keep currently playing node's text in view
- **Playback Continuity**:
  - Gapless transitions between nodes based on timestamps
  - Memory of playback position if user navigates away and returns
  - Handles timestamp gaps gracefully (skip)

### 4. Data Processing Pipeline

#### Input Handling
**Supported Input Formats**:
- JSON files with various configurations
- Plain text files (.txt)
- Future extensibility for other formats

**Processing Workflow**:
1. Accept raw input file (JSON or TXT)
2. Utilize LLM for intelligent parsing and structuring
3. Convert to standardized internal JSON format
4. Validate data integrity and relationships
5. Generate visualization-ready data structure

#### Data Schema

**Conversation Structure**:
```
{
  "conversation_id": unique_identifier,
  "audio_file": string (URL or file path to conversation audio),
  "duration": number (total duration in milliseconds),
  "metadata": {
    "title": string (optional),
    "date": string (optional),
    "participants": [array of speaker names]
  }
}
```

**Excerpt Node Structure**:
```
{
  "type": "prompt" | "response",
  "responds_to": [node_id],
  "speaker_name": string,
  "speaker_text": string,
  "pull_quote": string (optional - if present, node displays as rectangle with this text),
  "audio_start": timestamp (milliseconds),
  "audio_end": timestamp (milliseconds),
  "conversation_id": string (reference to parent conversation for audio file),
  "id": unique_identifier
}
```

**Pull Quote Visualization**:
- When `pull_quote` field is present: Node renders as a rectangle displaying the pull_quote text
- When `pull_quote` field is absent: Node renders as standard shape (circle for response, square for prompt)
- Pull quote rectangles maintain same interaction behaviors as standard nodes (clickable, selectable, audio playback)

**Question Node Structure**:
```
{
  "type": "question",
  "question_text": string,
  "related_prompts": [array of prompt node IDs],
  "id": unique_identifier
}
```

## User Interaction Patterns

### Navigation
- **Click Selection** (Single-Level Hierarchy):
  - Click response node (circle): Selects ONLY that response + displays in comment rail + plays individual audio segment (new clicks replace previous selection)
  - Click prompt node (square): Selects ONLY its direct response nodes (not other prompts/questions) + displays responses in rail + plays responses in chronological order 
  - Click question text: Selects ONLY its direct prompt nodes (not the prompts' responses) + displays prompts in rail + randomized audio playlist option 
- **Audio Behavior Summary**:
  - Response nodes → Play individual segment only
  - Prompt nodes → Chronological playlist of directly connected responses
  - Question nodes → Random playlist of all connected responses
  - Currently playing node highlighted on map in real-time
- **Zoom Controls**:
  - Smooth zoom in/out to explore the map at different scales
  - All nodes remain visible and interactive at any zoom level
  - Excerpt nodes scale with zoom, question text remains constant size
- **Pan and Explore**: Free movement through the story map

### Information Architecture
- **Full Visibility**: All nodes visible at all zoom levels for complete context
- **Context Preservation**: Maintain user's place in the narrative
- **Multi-path Exploration**: Allow non-linear story navigation

- **Keyboard Shortcuts**:
  - Space: Play/Pause
  - Arrow keys: Skip forward/backward
  - Shift+Arrow: Next/previous response in conversation
  - Numbers 1-5: Jump to response N in current conversation

## Technical Considerations

### Performance Requirements
- Smooth rendering of potentially hundreds of nodes
- Efficient zoom and pan operations with semantic zoom for question text
- Quick response to user interactions
- Optimize rendering for all visible nodes (no lazy loading based on zoom)

### Scalability
- Support for stories with varying complexity
- Efficient memory management for large node networks
- Performance optimization for rendering all nodes simultaneously

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode options
- Text size adjustments

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


## Future Enhancements (Not in MVP)

### Planned Features
- **Advanced Distance Logic**: Sophisticated algorithms for node positioning beyond basic force-directed graph
- **Export Capabilities**: Save visualizations or story paths
- **Collaborative Features**: Multi-user exploration
- **Search and Filter**: Find specific content within the story network

### Extensibility Considerations
- Plugin architecture for custom node types
- API for external data sources
- Theming and customization options
- Integration with other storytelling platforms

## Implementation Decisions

### Technology Stack
- **Frontend Framework**: React
- **Visualization Library**: D3.js for node rendering and interactions
- **Graph Layout**: Force-directed graph algorithm for organic node positioning
- **Zoom Implementation**: D3 zoom with semantic zoom for question text (constant size)
- **State Management**: Zustand for centralized state management
- **Styling**: CSS Modules or Styled Components for component styling
- **Audio Playback**: Web Audio API with HTML5 audio element for controls
- **Audio Libraries**: Howler.js or WaveSurfer.js for advanced audio features

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
  - All nodes (questions, prompts, responses)
  - Edge relationships between nodes
  - Conversation metadata and audio file references
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

#### Bidirectional Data Flow Patterns

**Map → Rail Flow**:
1. User clicks node on map
2. Map component calls store action
3. Store updates selected nodes and rail display mode
4. Rail component reacts to selection change
5. Rail auto-scrolls to show selected content
6. Audio queue updates if applicable

**Rail → Map Flow**:
1. User clicks node in comment rail
2. Rail component calls store action
3. Store updates selected nodes and map highlight
4. Map component reacts to selection change
5. Map pans/zooms to center selected node
6. D3 force simulation adjusts if needed

**Audio → Both Components**:
1. Audio playback progresses
2. Store updates current playing node
3. Map highlights currently playing node with pulse effect
4. Rail highlights corresponding text and scrolls
5. Both components stay synchronized

#### Performance Optimization Strategies

- **Selective Subscriptions**: Components use selector functions to subscribe only to needed state slices
- **Memorized Selectors**: Complex derived state (like connected nodes) cached until dependencies change
- **Shallow Equality Checks**: Prevent unnecessary re-renders with shallow comparison
- **Batched Updates**: Multiple rapid state changes batched into single update
- **Lazy State Initialization**: Heavy computations deferred until needed

#### State Persistence and Hydration

- **Session Persistence**: Critical state (selections, audio position) saved to sessionStorage
- **User Preferences**: Settings (if any) saved to localStorage
- **URL State Sync**: Shareable states (selected nodes, zoom level) reflected in URL parameters
- **Rehydration**: On app load, state restored from various sources in priority order

#### DevTools Integration

- **Time-Travel Debugging**: Navigate through state changes during development
- **Action Logging**: Track which actions triggered which state updates
- **Performance Monitoring**: Identify expensive state updates and re-renders
- **State Inspection**: View complete state tree and subscriptions

### UI/UX Specifications
- **Comment Rail**: Adjustable right sidebar (resizable 20-50% width), map occupies remaining space; responsive breakpoints for mobile/tablet/desktop
- **Selection Behavior** (Non-Cascading Hierarchy):
  - **Single-Level Selection Rule**: Each click selects only one level of the hierarchy
  - **Prompt nodes**: Clicking selects ONLY its direct response nodes (no cascade to other levels)
  - **Question nodes**: Clicking selects ONLY its direct prompt nodes (responses remain unselected)
  - **Response nodes**: Clicking selects only that individual response
  - **No Automatic Cascade**: Selection never automatically propagates beyond the immediate children
  - **Single Selection**: Each new click replaces the previous selection
  - **Clear selection**: Click on empty map space or use Clear button in comment rail
- **Node Display**:
  - Excerpt nodes: Circles
  - Question nodes: Text-only display without visible node markers
- **Animation Priority**: Smooth transitions for zoom, pan, and node selection
- **Visual Feedback**: Hover states, selection highlights, and smooth morphing

- **Audio Visual Integration**:
  - Play button prominently displayed when node has audio
  - Waveform visualization (optional) showing audio timeline
  - Text highlights sync with audio playback position
  - Mini player mode when comment rail is minimized

### Data Processing
- **LLM Integration**: Claude API (Anthropic) for intelligent data parsing
- **Processing Flow**: Client uploads file → Server sends to Claude → Structured JSON returned → Visualization rendered
- **Error Handling**: Validation and user feedback for malformed data

## Summary

Anthology transforms community narratives into explorable visual landscapes. By combining an intuitive node-based visualization with a responsive comment rail interface, users can discover connections, follow story threads, and engage with content in a non-linear, immersive way. The system's intelligent data processing ensures that various input formats can be seamlessly converted into rich, interactive story maps.