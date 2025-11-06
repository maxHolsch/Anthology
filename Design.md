# Anthology - Community Story Visualizer Design Document

todo:
[X] question nodes
[ ] 

## Project Overview

**Anthology** is an interactive visualization platform for exploring community stories through a dynamic, interconnected map interface. The system presents conversations and narratives as a network of nodes, allowing users to navigate through questions, responses, and excerpts in an intuitive visual format.

## Core Components

### 1. Visual Map System

#### Node Types and Behavior

**Question Nodes**
- **Visual Representation**: Displayed as floating text only (no visible node shape or marker) positioned at the geometric midpoint between all connected prompt nodes
- **Text Display**:
  - Question text renders directly on the map canvas without any containing shape
  - Text styling: Larger font size for readability at zoomed-out levels
  - Optional subtle background blur, shadow, or semi-transparent backdrop for text legibility
  - Text acts as clickable area for interaction
- **Visibility Rules**:
  - Text visible when zoomed out (zoom level < 25%)
  - Fade out as user zooms in beyond 25% threshold
  - Act as navigational landmarks for the overall story structure through text positioning
- **Data Structure**:
  - Contains question text
  - Maintains array of pointers to related prompt nodes

**Excerpt Nodes**
- **Visual Representation**: Displayed as visible geometric shapes (circles for responses, squares for prompts) that users can interact with
- **Visual States**:
  - Unselected: Grey circles
  - Selected/Active: White circles
  - Reference: [Figma Frame 4-3496](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3496&t=JN4qdlt1xDfI1Af0-4)
- **Node Types**:
  - Prompt nodes: Grey squares when inactive, trigger question display when clicked
  - Response nodes: Grey circles when inactive, white when selected
- **Data Structure**:
  - Type field: "prompt" or "response"
  - "responds_to" field: pointer to parent node
  - Speaker name
  - Speaker text content
  - Audio timestamps (start and end)

#### Spatial Organization
- Questions positioned at calculated midpoint of connected prompts
- Automatic layout algorithm for optimal node distribution
- Zoom-dependent visibility layers for different node types

### 2. Comment Rail Interface

#### Display Modes

**Single Node View**
- **Response Node Selected**:
  - Full text display of the selected response
  - Speaker information and metadata
  - Beautiful, readable formatting optimized for content consumption
  - Reference: [Figma Frame 4-3280](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3280&t=JN4qdlt1xDfI1Af0-4)

**Question Node View**
- **Question Text Selected** (when user clicks on floating question text):
  - Display question text prominently in comment rail
  - Show brief overview/preview of each connected response node
  - Enable quick navigation between related responses
  - **Conversation Audio Player**: Prominent play button to play entire conversation
  - **Auto-play Option**: Setting to automatically start playing when question text is clicked
  - Reference: [Figma Frame 4-3428](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3428&t=JN4qdlt1xDfI1Af0-4)

**Multi-Node View**
- Display abridged versions of all selected nodes (unlimited capacity)
- Dynamic layout adjusts to accommodate any number of selected nodes
- "Click for full text" expansion capability for each node
- Efficient scrollable container with smart space usage
- Selection behavior:
  - Clicking a prompt node: Selects all response nodes attached to that prompt
  - Clicking a question node: Selects all prompt nodes attached to that question (but not their responses)
  - Manual multi-selection: Hold Shift/Cmd to add individual nodes to selection
- Intelligent grouping: Automatically organizes related nodes visually in the rail

#### Interface Features
- **Minimizable Card Design**: Comment rail can be collapsed and expanded
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Smooth Transitions**: Animated transitions between different view modes
- **Audio Playback Controls**: Integrated audio player for nodes with associated audio
- **Scalable Multi-Node Handling**:
  - Virtualized scrolling for performance with hundreds of selected nodes
  - Compact card view for large selections (showing speaker name and first line)
  - Expandable cards to view full content without leaving multi-node view
  - Smart grouping by parent node (responses grouped under their prompt)
  - Filter/sort options: By speaker, timestamp, or relationship
  - Batch operations: Play all selected audio, export selected text, etc.

### 3. Audio Playback System

#### Audio Player Components

**Play Button Design**
- **Visual Design**:
  - Circular play/pause button with standard media icons
  - Located prominently in the comment rail when viewing nodes with audio
  - Visual states: idle, playing, paused, buffering
  - Progress indicator showing current position in audio

**Audio Controls**
- **Primary Controls**:
  - Play/Pause toggle button
  - Timeline scrubber for seeking
  - Current time / total duration display
  - Volume control slider


**Audio-Text Synchronization**
- **Highlight System**:
  - Currently playing text segment highlighted in comment rail
  - Smooth scrolling to keep current audio position in view
  - Visual indicator showing which node's audio is playing
- **Interaction**:
  - Click on text to jump to that position in audio
  - Audio continues when selecting different nodes (optional setting)
  - Queue system for playing multiple nodes sequentially

**Conversation Playback Mode**
- **Automatic Conversation Play**:
  - When clicking a prompt/question node, automatically plays entire conversation
  - Seamlessly transitions between all connected response nodes
  - Maintains chronological order based on timestamps
  - Visual progress indicator shows position in overall conversation
- **Playback Settings**:
  - Toggle: "Auto-play full conversation" (user preference)
  - Option to include or exclude prompt audio in playback
  - Pause between responses (configurable 0-3 seconds)
  - Skip to next/previous response in conversation
- **Visual Feedback**:
  - Timeline shows all response segments as chapters
  - Currently playing response highlighted in comment rail overview
  - Node on map pulses/highlights when its audio is playing
  - Progress bar shows both segment progress and conversation progress

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
- **Playlist Generation**:
  - Automatically creates ordered playlist when question/prompt node selected
  - Sorts responses by timestamp for chronological playback
  - Handles multiple audio files if conversation spans multiple recordings
- **Playback Continuity**:
  - Gapless playback between response segments
  - Automatic crossfading option for smoother transitions
  - Memory of playback position if user navigates away and returns
- **Queue Controls**:
  - View upcoming responses in queue
  - Reorder playback sequence (manual override)
  - Add/remove individual responses from conversation playback

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

**Excerpt Node Structure**:
```
{
  "type": "prompt" | "response",
  "responds_to": [node_id],
  "speaker_name": string,
  "speaker_text": string,
  "audio_start": timestamp (milliseconds),
  "audio_end": timestamp (milliseconds),
  "audio_file": string (optional - URL or file path),
  "id": unique_identifier
}
```

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
- **Click Selection**:
  - Click excerpt nodes (circles/squares) to view details in comment rail
  - Click question text to view question overview and connected responses
- **Zoom Controls**: Progressive disclosure of information through zoom levels
- **Pan and Explore**: Free movement through the story map

### Information Architecture
- **Progressive Disclosure**: Show appropriate detail level based on zoom
- **Context Preservation**: Maintain user's place in the narrative
- **Multi-path Exploration**: Allow non-linear story navigation

### Audio Playback Settings
- **User Preferences**:
  - Auto-play conversations when selecting question/prompt nodes (on/off)
  - Continue playing when switching nodes (on/off)
  - Playback speed preference (saved between sessions)
  - Volume level persistence
  - Transition style between segments (gapless/pause/crossfade)
- **Playback Modes**:
  - **Single Node**: Play only selected node's audio
  - **Conversation**: Play entire conversation thread automatically
  - **Continuous**: Play through all available audio in the story
- **Keyboard Shortcuts**:
  - Space: Play/Pause
  - Arrow keys: Skip forward/backward
  - Shift+Arrow: Next/previous response in conversation
  - Numbers 1-5: Jump to response N in current conversation

## Technical Considerations

### Performance Requirements
- Smooth rendering of potentially hundreds of nodes
- Efficient zoom and pan operations
- Quick response to user interactions
- Lazy loading for large datasets

### Scalability
- Support for stories with varying complexity
- Efficient memory management for large node networks
- Progressive loading strategies for performance

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode options
- Text size adjustments

## Visual Design References

The interface should follow the aesthetic and interaction patterns demonstrated in the Figma designs:
- **Comment Rail Single View**: [Frame 4-3280](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3280&t=JN4qdlt1xDfI1Af0-4)
- **Comment Rail Question View**: [Frame 4-3428](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3428&t=JN4qdlt1xDfI1Af0-4)
- **Visual Map Layout**: [Frame 4-3496](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3496&t=JN4qdlt1xDfI1Af0-4)
- **Multi-Comment Rail**: [Frame 4-3760](https://www.figma.com/design/3RRAJtxVKX0kbSZT8ouJWa/Anthology-III?node-id=4-3760&t=JN4qdlt1xDfI1Af0-4)

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
- **State Management**: React Context API or Redux for managing selection states
- **Styling**: CSS Modules or Styled Components for component styling
- **Audio Playback**: Web Audio API with HTML5 audio element for controls
- **Audio Libraries**: Howler.js or WaveSurfer.js for advanced audio features

### UI/UX Specifications
- **Comment Rail**: Fixed right sidebar (30% width), map occupies 70% on left
- **Selection Behavior**:
  - Smart multi-selection mode with contextual behavior
  - Clicking prompt nodes: Auto-selects all connected response nodes
  - Clicking question nodes: Auto-selects all connected prompt nodes (not their responses)
  - Clicking response nodes: Adds/removes individual response from selection
  - Shift/Cmd+Click: Manual multi-selection for any combination of nodes
  - Clear selection: Click on empty map space or use Clear button in comment rail
- **Node Display**:
  - Excerpt nodes: Visible geometric shapes (circles for responses, squares for prompts)
  - Question nodes: Text-only display without visible node markers
- **Animation Priority**: Smooth transitions for zoom, pan, and node selection
- **Visual Feedback**: Hover states, selection highlights, and smooth morphing
- **Audio Player Position**: Fixed at bottom of comment rail, persists across node selection
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