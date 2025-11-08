try to minimize interdependencies: the goal really is to keep everything as modular and encapsulated as possible




[ ] input handling

 
 
line 29:
- (text remains constant relative to screen)
- 


Line 40: highlight by exclusion

Line 51: pull quotes



Line 162: conversation playback mode, have it only be for question nodes
    - remove timeline
    we don't want them to hit play once and listen to everything.
    stops at the end. Change to a shuffle


change to a shuffle button

[X] remove future enhancements: tech considerations


[X] line 457: when we select question, it just selects nodes

[ ] keep the graph creation seperate from other things
[ ] What do you mean by that? Facilitator's intejection issue...

[X] Question node audio suffle button... remove playlists


[ ] Line 468: pull quotes: question nodes, semantic zoom
[X] Combine medleys and auto conversation
  
remove prompts: prompt view

[X] how do conversation data structures work? How are colors decided? Where are these put? in the data structure?
[ ] invisible question circle
[ ] Overall view
[X] D3 curves
[ ] Give an example of the JSON data it takes in
  


### Extensibility Considerations
- Plugin architecture for custom node types
- API for external data sources
- Theming and customization options
- Integration with other storytelling platforms


  7. Performance vs Feature Requirements Conflict

  Issue: Requirements conflict between:
  - "hundreds of nodes" (line 319)
  - "unlimited capacity" for multi-node view (line
  104)
  - "virtualized scrolling" (line 120)
  - Real-time highlighting during playback

  Fix:
  - Implement progressive enhancement:
    - Basic: <100 nodes - full features
    - Medium: 100-500 nodes - virtualization enabled
    - Large: >500 nodes - reduced animations,
  clustering
  - Use React.memo and useMemo for expensive
  calculations


  Recommended Architecture Fixes

  1. Implement Clear Layer Separation

  Presentation Layer (React Components)
      ↓
  Application Layer (Business Logic)
      ↓
  State Management Layer (Redux/Zustand)
      ↓
  Data Layer (API, Processing)

  2. Create Service Classes

  - AudioService: Manages all audio playback
  - SelectionService: Handles node selection logic
  - VisualizationService: Manages D3 graph
  - DataService: Handles data processing and
  validation

  3. Define Clear Event Flow

  User Action → Service Layer → State Update →
  Component Re-render

  4. Establish Data Contracts

  Create TypeScript interfaces for all data
  structures to prevent schema drift

  5. Implement Feature Flags

  Allow gradual rollout and testing of complex
  features like the "medley" playback

  These fixes will help create a more maintainable
  and scalable architecture while reducing the risk
  of runtime conflicts and state management issues.