# SAT Reading & Writing Question Types - Coverage Analysis

## Official SAT Structure (All 11 Question Types)

### Domain 1: Information and Ideas (Reading-focused)
- ✅ **Central Ideas and Details** - `central_ideas` in codebase
- ✅ **Inferences** - `inferences` in codebase
- ✅ **Command of Evidence** - `command_of_evidence` in codebase
  - ✅ Textual (choose text evidence)
  - ✅ Quantitative (choose data from graphic) - via `readingDataGeneration.ts`

### Domain 2: Craft and Structure (Reading-focused)
- ✅ **Words in Context** - `vocabulary_in_context` in codebase
- ✅ **Text Structure and Purpose** - `text_structure` in codebase
- ❌ **Cross-Text Connections** - **MISSING**
  - Draw connections between two related texts (agreement, disagreement, relationship)

### Domain 3: Expression of Ideas (Writing/revision-focused)
- ✅ **Rhetorical Synthesis** - `rhetorical_synthesis` in codebase
  - Integrate provided information to meet a rhetorical goal
- ❌ **Transitions** - **MISSING**
  - Choose effective transition word/phrase to connect ideas

### Domain 4: Standard English Conventions (Editing-focused)
- ❌ **Boundaries** - **MISSING**
  - ❌ Between Sentences (punctuation marking sentence end)
  - ❌ Within Sentences (joining clauses, series, appositives, etc.)
- ❌ **Form, Structure, and Sense** - **MISSING**
  - ❌ Subject–Verb Agreement
  - ❌ Pronoun–Antecedent Agreement
  - ❌ Verb Finiteness (gerunds/participles/infinitives)
  - ❌ Verb Tense and Aspect
  - ❌ Subject–Modifier Placement
  - ❌ Genitives and Plurals (its/it's, their/there/they're, etc.)

---

## Summary

### ✅ Currently Implemented (6 of 11 types)
1. Central Ideas and Details
2. Inferences
3. Command of Evidence (Textual + Quantitative)
4. Words in Context
5. Text Structure and Purpose
6. Rhetorical Synthesis

**Coverage:** All of Domain 1 (Information and Ideas) ✅
**Coverage:** 2 of 3 from Domain 2 (Craft and Structure) - Missing Cross-Text Connections

### ❌ Missing Question Types (5 of 11 types)

#### Domain 2: Craft and Structure
7. **Cross-Text Connections**

#### Domain 3: Expression of Ideas
8. **Transitions**

#### Domain 4: Standard English Conventions
9. **Boundaries** (2 subskills)
10. **Form, Structure, and Sense** (6 subskills)

---

## Implementation Files

### Current Implementation
- **Reading question templates:** `convex/readingQuestionTemplates.ts`
  - Lines 16-23: `QUESTION_TYPES` array defines 6 types
- **Reading question generation:** `convex/readingQuestionGeneration.ts`
- **Reading data (graphs/tables):** `convex/readingDataGeneration.ts`
- **Schema:** `convex/schema.ts`
  - Lines 687-696: `readingQuestionDLQ.questionType` union

### Files Needing Updates to Add Missing Types
1. `convex/readingQuestionTemplates.ts` - Add new question types
2. `convex/readingQuestionGeneration.ts` - Add generation logic
3. `convex/schema.ts` - Update `questionType` union
4. `src/lib/constants.ts` - Update `READING_WRITING_SKILLS`

---

## What's Missing: Detailed Breakdown

### 1. Cross-Text Connections (Domain 2)
**Format:** Two short related passages (50-100 words each) with one question asking about their relationship

**Example Question Types:**
- "Which choice best describes the relationship between Text 1 and Text 2?"
- "How would the author of Text 2 most likely respond to the claim in Text 1?"
- "Both texts discuss [topic]. What is the main difference in their perspectives?"

**Implementation Needs:**
- Generate **two related passages** instead of one
- Create question about relationship (agreement, disagreement, extends/supports, contrasts)
- Distractors: mischaracterize relationship, confuse which text said what

---

### 2. Transitions (Domain 3)
**Format:** Short passage with a blank where a transition word/phrase should go. Student picks the most logical connector.

**Example Structure:**
```
Scientists discovered X. _____ they also found Y.
A) However,
B) Therefore,
C) Additionally,
D) In other words,
```

**Transition Types to Test:**
- Addition: furthermore, additionally, moreover
- Contrast: however, nevertheless, conversely
- Cause/Effect: therefore, consequently, as a result
- Clarification: in other words, that is, specifically
- Temporal: meanwhile, subsequently, previously

**Implementation Needs:**
- Generate passage with logical connection point
- Select correct transition based on relationship
- Create distractors using wrong transition types

---

### 3. Boundaries (Domain 4)
**Format:** Sentence or sentences with underlined portion. Student picks correct punctuation.

**Between Sentences (punctuation marking sentence boundaries):**
```
The experiment succeeded _____ the results were unexpected.
A) . The
B) , the
C) ; the
D) the
```

**Within Sentences (clauses, series, appositives):**
```
The study—which began in 2020—showed clear results.
or
The team analyzed three variables: time, temperature, and pressure.
```

**Implementation Needs:**
- Generate sentences with punctuation decision points
- Test: periods, semicolons, commas, dashes, colons
- Common errors: comma splices, run-ons, fragments

---

### 4. Form, Structure, and Sense (Domain 4)
**Format:** Sentence with underlined portion. Student picks grammatically correct option.

**Subskills to Implement:**

**A) Subject-Verb Agreement**
```
The collection of paintings [is/are] valuable.
```

**B) Pronoun-Antecedent Agreement**
```
Each student brought [their/his or her] laptop.
```

**C) Verb Finiteness (using verbs vs. verbals)**
```
The data [suggesting/suggests] a trend.
```

**D) Verb Tense and Aspect**
```
By next year, the project [will have been completed/will complete].
```

**E) Subject-Modifier Placement**
```
[Running quickly/Quickly running], the athlete...
```

**F) Genitives and Plurals**
```
[Its/It's] important to note [their/they're/there] findings.
```

**Implementation Needs:**
- Generate sentences with specific grammar issue
- Create correct answer + 3 distractors with common errors
- Tag each question with specific subskill

---

## Recommended Implementation Priority

### Phase 1: Easier to Implement (Reading-focused)
1. **Cross-Text Connections** - Similar to existing reading generation, just needs 2 passages
   - Modify `readingQuestionGeneration.ts` to generate passage pairs
   - Add relationship types: supports, contradicts, extends, contrasts

### Phase 2: Medium Difficulty (Writing - Transitions)
2. **Transitions** - Relatively straightforward rule-based
   - Create short passages with logical connection points
   - Database of transition words by category
   - Generate context that requires specific transition type

### Phase 3: More Complex (Grammar/Conventions)
3. **Boundaries** - Punctuation rules
   - Sentence generation with punctuation decision points
   - Test all major punctuation marks

4. **Form, Structure, and Sense** - Grammar rules
   - Implement 6 subskills separately
   - Start with easier ones (Subject-Verb Agreement, Its/It's)
   - Build up to harder ones (Verb Finiteness, Tense/Aspect)

---

## Next Steps

1. **Decide scope:** Do you want all 11 types, or just reading-focused (add Cross-Text)?
2. **Update schema:** Add new question types to unions
3. **Create templates:** Similar to `readingQuestionTemplates.ts` for each new type
4. **Generate prompts:** LLM prompts for each question type
5. **Update UI:** Ensure practice mode can handle all types
6. **Testing:** Validate that generated questions match SAT format

---

## Current vs. Complete Coverage

| Domain | Skills | Currently Have | Missing | % Complete |
|--------|--------|----------------|---------|------------|
| Domain 1: Information & Ideas | 3 skills | 3 ✅ | 0 | 100% |
| Domain 2: Craft & Structure | 3 skills | 2 ✅ | 1 ❌ | 67% |
| Domain 3: Expression of Ideas | 2 skills | 1 ✅ | 1 ❌ | 50% |
| Domain 4: Conventions | 2 skills (8 subskills) | 0 | 2 ❌ | 0% |
| **TOTAL** | **11 types** | **6** | **5** | **55%** |

**Note:** Your app currently covers all reading comprehension question types (Domains 1-2 minus Cross-Text), but doesn't cover writing/editing questions (grammar, transitions, punctuation from Domains 3-4).
