# Plan: Semantic-Based Node Positioning

## Executive Summary

**Goal**: Use semantic meaning to influence node positioning while maintaining the dynamic force-directed graph behavior.

**Approach**:
1. Generate text embeddings for all response nodes using OpenAI API
2. Use UMAP to project embeddings to 2D coordinates
3. Use UMAP coordinates as **initial positions** for response nodes
4. Let existing D3 force simulation naturally reshape into familiar flower pattern
5. Result: Final positions influenced by both semantic similarity (start) and structural relationships (end)

**Key Principle**: UMAP only determines starting positions. D3 physics handles everything else. This remains a fully dynamic, interactive force-directed graph.

**Effort**: 12-19 hours | **Complexity**: Medium-High

---

## Overview
Implement positioning system where response nodes (comments) start at positions based on semantic similarity of their text content, then D3 forces naturally organize them into the structural flower layout.

---

## Current State Analysis

### Existing Architecture
- **Nodes**: Questions (pill shapes) and Responses (circles/rectangles)
- **Positioning**: D3 force-directed layout with 6 force types
  - Questions arranged in circle (radius=300px)
  - Responses orbit around parent questions (radius=100px)
  - Forces: link, charge, center, collision, forceX, forceY
- **Semantic Analysis**: Already exists for question assignment and quality filtering
  - Uses OpenAI API in `api/_lib/sensemaking.ts`
  - Scores: `standalone_score`, `direct_answer_score`

### Key Files
- `anthology-app/src/types/data.types.ts` - Node type definitions
- `anthology-app/src/utils/dataProcessor.ts` - Initial position calculation (lines 259-287)
- `anthology-app/src/stores/VisualizationStore.ts` - D3 force simulation (lines 34-139)
- `api/_lib/sensemaking.ts` - Semantic analysis pipeline

---

## Implementation Approach (User Confirmed)

### Strategy: Semantic Initial Positions + D3 Physics

**Core Principle**: Use UMAP embeddings to set initial node positions based on semantic meaning, then let D3 force simulation naturally reorganize into the familiar "flower shape" based on question-response links.

**Key Insight**:
- **Semantic influence = initial positions ONLY**
- **D3 physics handles everything after initialization**
- **Final layout combines semantic + structural patterns**
- **Critical: This remains a dynamic, force-directed graph (NOT a static map)**

**User Requirements**:
1. ✅ UMAP for dimensionality reduction
2. ✅ Semantic positions as starting point only
3. ✅ D3 forces reshape to flower/star pattern naturally
4. ✅ No additional visual indicators (keep it simple)
5. ✅ Maintain all existing D3 physics and interactivity

**Workflow**:
1. Generate embeddings for all response texts
2. Apply UMAP to reduce embeddings to 2D coordinates
3. Use UMAP coordinates as initial (x, y) positions for response nodes
4. **Let existing D3 force simulation run normally** - no force modifications needed
5. Watch as physics naturally pulls responses back toward their questions
6. Final positions reflect both semantic similarity (from start) and structure (from forces)

**What Changes**:
- Initial position calculation (`dataProcessor.ts`)
- Embedding generation and storage

**What Stays the Same**:
- All D3 force parameters and logic
- All visualization components and interactions
- All existing controls and UI

---

## Recommended Implementation

### Phase 1: Add Embedding Generation

**Create new API endpoint**: `api/embeddings/generate.ts`

```typescript
// Generate embeddings for response texts
POST /api/embeddings/generate
Body: { texts: string[] }
Response: { embeddings: number[][] }
```

**Implementation**:
- Use OpenAI Embeddings API (`text-embedding-3-small` model)
  - 1536 dimensions, $0.02 per 1M tokens
  - Fast and accurate for semantic similarity
- Batch requests (up to 2048 texts per call)
- Cache embeddings in Supabase

**Database schema addition** (Supabase migration):
```sql
ALTER TABLE responses
ADD COLUMN embedding vector(1536);

CREATE INDEX ON responses
USING ivfflat (embedding vector_cosine_ops);
```

### Phase 2: Store and Retrieve Embeddings

**Update `api/_lib/sensemaking.ts`**:
- After filtering responses (line ~511), generate embeddings
- Store embeddings with response records in database
- Add to `ResponseNode` type

**Update `anthology-app/src/types/data.types.ts`**:
```typescript
interface ResponseNode extends BaseNode {
  // ... existing fields
  embedding?: number[];  // 1536-dim vector
}
```

### Phase 3: Implement Dimensionality Reduction

**Create new utility**: `anthology-app/src/utils/semanticLayout.ts`

```typescript
export function projectEmbeddingsTo2D(
  embeddings: number[][],
  method: 'umap' | 'tsne' | 'pca' = 'umap'
): { x: number; y: number }[]
```

**Library options**:
1. **UMAP.js** (Recommended)
   - Better preserves global structure than t-SNE
   - Faster than t-SNE for large datasets
   - Good for clustering visualization
   - Library: `umap-js` npm package

2. **t-SNE.js**
   - Industry standard for visualization
   - Better for very high-dimensional data
   - Library: `tsne-js` npm package

3. **PCA** (via ml-pca)
   - Fastest, deterministic results
   - Linear method (may miss nonlinear patterns)
   - Good fallback option

**Recommended**: Start with UMAP.js

### Phase 4: Modify Initial Position Calculation

**D3 v7 Behavior**: In D3 v7's `forceSimulation()`, nodes with existing `x` and `y` properties will use those values as starting positions. Nodes without `x`/`y` get random positions.

**Current Code Flow** (from your codebase):
1. `createGraphNodes()` in `dataProcessor.ts` creates nodes WITHOUT x/y
2. `initSimulation()` in `VisualizationStore.ts` passes nodes to `d3.forceSimulation()`
3. D3 assigns random positions since x/y are undefined
4. 100-tick pre-warming settles from random positions

**UMAP Integration Point**: Set x/y on GraphNode objects AFTER `createGraphNodes()` but BEFORE passing to `initSimulation()`.

**Option A: Modify `createGraphNodes()` to accept positions**

Update `anthology-app/src/utils/dataProcessor.ts`:

```typescript
import * as d3 from 'd3';
import { projectEmbeddingsTo2D } from './semanticLayout';

/**
 * Creates graph nodes from questions and responses
 * Optionally applies UMAP-based semantic positions to response nodes
 */
export const createGraphNodes = (
  questions: QuestionNode[],
  responses: ResponseNode[],
  colorAssignments: Map<string, ColorAssignment>,
  options?: { useSemanticLayout?: boolean }
): GraphNode[] => {
  const nodes: GraphNode[] = [];

  // Position questions in a circle (unchanged)
  const questionRadius = 300;
  questions.forEach((question, qIndex) => {
    const angle = (qIndex / questions.length) * 2 * Math.PI;
    nodes.push({
      id: question.id,
      type: 'question',
      data: question,
      x: Math.cos(angle) * questionRadius,
      y: Math.sin(angle) * questionRadius
    });
  });

  // Check if we should use semantic layout for responses
  const useSemanticLayout = options?.useSemanticLayout &&
    responses.length > 0 &&
    responses.every(r => r.embedding && r.embedding.length > 0);

  if (useSemanticLayout) {
    // Extract embeddings and run UMAP
    const embeddings = responses.map(r => r.embedding!);
    const coords = projectEmbeddingsTo2D(embeddings);

    // Scale UMAP output to visualization area
    const scaleX = d3.scaleLinear()
      .domain([d3.min(coords, c => c.x)!, d3.max(coords, c => c.x)!])
      .range([-500, 500]);

    const scaleY = d3.scaleLinear()
      .domain([d3.min(coords, c => c.y)!, d3.max(coords, c => c.y)!])
      .range([-500, 500]);

    // Add response nodes with UMAP positions
    responses.forEach((response, i) => {
      const color = colorAssignments.get(response.conversation_id)?.color;
      nodes.push({
        id: response.id,
        type: 'response',
        data: response,
        color,
        x: scaleX(coords[i].x),
        y: scaleY(coords[i].y)
      });
    });
  } else {
    // FALLBACK: Position responses around their parent questions
    const questionPositions = new Map(
      nodes.filter(n => n.type === 'question').map(n => [n.id, { x: n.x!, y: n.y! }])
    );
    const responseRadius = 100;

    // Group responses by question for even distribution
    const responsesByQuestion = new Map<string, ResponseNode[]>();
    responses.forEach(r => {
      const existing = responsesByQuestion.get(r.responds_to) || [];
      existing.push(r);
      responsesByQuestion.set(r.responds_to, existing);
    });

    responses.forEach(response => {
      const color = colorAssignments.get(response.conversation_id)?.color;
      const parentPos = questionPositions.get(response.responds_to);

      if (parentPos) {
        const siblings = responsesByQuestion.get(response.responds_to) || [];
        const rIndex = siblings.indexOf(response);
        const angle = (rIndex / siblings.length) * 2 * Math.PI;

        nodes.push({
          id: response.id,
          type: 'response',
          data: response,
          color,
          x: parentPos.x + Math.cos(angle) * responseRadius,
          y: parentPos.y + Math.sin(angle) * responseRadius
        });
      } else {
        // No parent question found - use random position
        nodes.push({
          id: response.id,
          type: 'response',
          data: response,
          color
          // x, y undefined - D3 will assign random
        });
      }
    });
  }

  return nodes;
};
```

**Option B: Apply positions after node creation (simpler, less invasive)**

Apply UMAP positions in the component/store that calls `initSimulation()`:

```typescript
// After createGraphNodes() but before initSimulation()
function applySemanticPositions(nodes: GraphNode[]): void {
  const responses = nodes.filter(n => n.type === 'response' && n.data.embedding);

  if (responses.length === 0) return;

  const embeddings = responses.map(n => (n.data as ResponseNode).embedding!);
  const coords = projectEmbeddingsTo2D(embeddings);

  // Scale to visualization bounds
  const scaleX = d3.scaleLinear()
    .domain([d3.min(coords, c => c.x)!, d3.max(coords, c => c.x)!])
    .range([-500, 500]);

  const scaleY = d3.scaleLinear()
    .domain([d3.min(coords, c => c.y)!, d3.max(coords, c => c.y)!])
    .range([-500, 500]);

  // Set positions directly on node objects
  responses.forEach((node, i) => {
    node.x = scaleX(coords[i].x);
    node.y = scaleY(coords[i].y);
  });
}

// Usage:
const nodes = createGraphNodes(questions, responses, colorAssignments);
applySemanticPositions(nodes);  // Mutates nodes in place
initSimulation(nodes, edges);   // D3 will use the x/y values we set
```

**Why This Works (D3 v7)**:

Your `VisualizationStore.ts` line 81:
```typescript
const simulation = d3.forceSimulation(d3Nodes)
```

D3 v7 checks each node: if `node.x` exists, use it; otherwise assign random. So we just need to set x/y before this line runs. The existing 100-tick pre-warming (lines 112-114) will then settle from UMAP positions rather than random positions.

### Phase 5: Add Configuration Toggle (Optional)

**Update `anthology-app/src/stores/VisualizationStore.ts`**:

```typescript
interface VisualizationState {
  // ... existing fields
  semanticLayoutEnabled: boolean;

  // Actions
  toggleSemanticLayout: () => void;
}
```

**Add UI control** (in Map settings panel):
- Simple toggle: "Use Semantic Initial Positions"
- Default: ON (if embeddings available)
- Fallback: Automatically disables if embeddings missing

**Note**: This toggle is optional for MVP. Could start with semantic layout always enabled when embeddings exist.

### Phase 6: Verify D3 Physics Unchanged

**Critical Confirmation**:
- **NO changes to D3 force parameters** in `VisualizationStore.ts`
- All existing forces remain unchanged:
  - Link force: strength 0.5, distance 150px
  - Charge force: strength -400, maxDistance 800px
  - Collision, center, forceX, forceY: all unchanged
- The simulation will naturally pull semantically-positioned nodes back toward structural layout

**Expected Behavior**:
1. Nodes start at UMAP-derived semantic positions (potentially scattered)
2. Link forces pull responses toward their parent questions
3. Charge forces spread nodes apart to prevent overlap
4. Collision forces prevent node overlap
5. After ~100 ticks, layout settles into familiar flower shape
6. Final positions influenced by both semantic starting point and structural forces

---

## Technical Specifications

### Embedding Pipeline
1. **Trigger**: After sensemaking completes (line ~511 in `api/_lib/sensemaking.ts`)
2. **Batch size**: 100 responses per embedding API call
3. **Retry logic**: Exponential backoff for API failures
4. **Caching**: Store in `responses.embedding` column

### Performance Targets
- **Embedding generation**: <2s for 100 responses
- **UMAP projection**: <500ms for 200 embeddings
- **Layout initialization**: <100ms (existing target)
- **Total overhead**: <3s added to sensemaking pipeline

### Error Handling
- **Missing embeddings**: Fall back to circular orbit layout
- **API failures**: Queue for retry, use fallback layout
- **Invalid embeddings**: Log error, skip semantic layout

---

## Implementation Checklist

### Backend (API)
- [ ] Create `api/embeddings/generate.ts` endpoint
- [ ] Add OpenAI embeddings API integration
- [ ] Create Supabase migration for `embedding` column
- [ ] Update `sensemaking.ts` to generate embeddings
- [ ] Add embedding retrieval to data fetch queries

### Frontend (Anthology App)
- [ ] Install `umap-js` package
- [ ] Create `utils/semanticLayout.ts` with projection functions
- [ ] Update `dataProcessor.ts` with semantic positioning logic (Option A or B from Phase 4)
- [ ] Add `semanticLayoutEnabled` to VisualizationStore (optional toggle)
- [ ] Update type definitions with `embedding` field
- [ ] Add UI toggle (optional - can default to enabled when embeddings exist)

### Testing & Validation
- [ ] Test embedding generation with sample responses
- [ ] Validate UMAP output coordinates are reasonable
- [ ] Compare semantic vs. circular layouts visually
- [ ] Test performance with 100+ responses
- [ ] Verify fallback behavior when embeddings missing

---

## Critical Files to Modify

| File Path | Changes | Lines |
|-----------|---------|-------|
| `api/_lib/sensemaking.ts` | Add embedding generation after filtering | ~511+ |
| `api/embeddings/generate.ts` | New file - embedding API endpoint | New |
| `anthology-app/src/types/data.types.ts` | Add `embedding` field to ResponseNode | ~20-40 |
| `anthology-app/src/utils/dataProcessor.ts` | Modify `createGraphNodes()` to apply UMAP positions | 111-139 |
| `anthology-app/src/utils/semanticLayout.ts` | New file - UMAP projection function | New |
| `anthology-app/src/stores/VisualizationStore.ts` | Add `semanticLayoutEnabled` state (optional) | 17-30 |
| Supabase migration | Add `embedding` column to responses table | New |

**Note**: No changes needed to D3 force parameters in `VisualizationStore.ts`. D3 v7 automatically uses existing `x`/`y` values on nodes.

---

## Future Enhancements (Post-MVP)

### Animation: Watch Semantic → Structural Transformation
Could add visual animation showing nodes moving from semantic positions to final layout:
- Start with UMAP positions visible for 1-2 seconds
- Then animate D3 simulation ticks (slow motion)
- Shows how semantic clustering transforms into flower shape
- Educational and visually interesting

### Semantic Edge Highlighting
Complementary enhancement for future consideration:
- Color edges by semantic similarity between question and response
- High similarity = saturated color, low = faded
- Makes quality of responses more visible
- Does NOT affect positioning

---

## Verification Strategy

### End-to-End Test Plan
1. **Create test anthology** with responses about 3 distinct topics
2. **Enable semantic layout** via UI toggle
3. **Verify clustering**: Responses on same topic should cluster together
4. **Check readability**: Layout should remain navigable
5. **Test performance**: <5s total for 100 responses with embeddings

### Success Criteria
- ✅ Semantically similar responses positioned closer than dissimilar ones
- ✅ Question-response links still visible
- ✅ No severe overlap or collision issues
- ✅ <5s added latency to sensemaking pipeline
- ✅ Graceful fallback when embeddings unavailable

---

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1: Embedding API | 2-3 hours | Medium |
| Phase 2: Database integration | 1-2 hours | Low |
| Phase 3: UMAP implementation | 2-3 hours | Medium |
| Phase 4: Layout modification | 2-3 hours | Medium |
| Phase 5: UI controls | 1-2 hours | Low |
| Phase 6: Force tuning | 1-2 hours | Medium |
| Testing & refinement | 3-4 hours | High |
| **Total** | **12-19 hours** | **Medium-High** |

---

## Design Decisions (User Confirmed)

1. **Layout balance**: ✅ Semantic positions for initialization ONLY, then D3 physics naturally reshapes to flower pattern
   - Initial = UMAP semantic positions
   - Final = D3 force-directed layout (structural)
   - Result = hybrid of both influences

2. **Algorithm**: ✅ UMAP for dimensionality reduction
   - Best balance of speed (~500ms) and accuracy
   - Preserves both local and global semantic structure

3. **Visual feedback**: ✅ Keep it simple - no additional visual indicators
   - Positioning is the only semantic signal
   - No edge coloring, no cluster highlighting
   - Focus on maintaining dynamic force-directed graph behavior

4. **Scope**: ✅ Apply to all response nodes
   - Every response gets semantic initial position (when embedding available)
   - Fallback to circular orbit if embeddings missing

5. **Critical requirement**: ✅ Must remain a DYNAMIC force-directed graph
   - Not a static map
   - All D3 interactivity preserved
   - All force simulation unchanged
