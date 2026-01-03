# UI Testing Guide for All 11 SAT Question Types

## Overview

The UI has been updated to display all 11 SAT Reading & Writing question types correctly. This guide helps you verify each format displays properly.

---

## Question Type Display Formats

### 1. Regular Questions (6 types)
**Types:** Central Ideas, Inferences, Vocabulary in Context, Text Structure, Command of Evidence, Rhetorical Synthesis

**Display:**
- Standard passage with title and author
- Question prompt below passage
- 4 multiple choice options (A, B, C, D)

**What to verify:**
- Passage displays with proper formatting
- Title and author shown (if present)
- Paragraphs separated correctly

---

### 2. Cross-Text Questions
**Type:** Cross-Text Connections

**Display:**
- **Two passages** displayed side-by-side
- Text 1: Green left border, labeled "Text 1"
- Text 2: Blue left border, labeled "Text 2"
- Each passage has its own title/author
- Question asks about relationship between texts

**What to verify:**
- ✅ Both passages display correctly
- ✅ Color-coded borders (green for Text 1, blue for Text 2)
- ✅ Labels "Text 1" and "Text 2" appear
- ✅ Question stem references both texts

**How to test:**
1. Generate a cross-text question:
   ```typescript
   // In Convex dashboard
   internal.crossTextQuestionGeneration.generateCrossTextQuestion({
     relationshipType: "supports_extends"
   })
   ```
2. Navigate to practice or endless mode
3. Find the cross-text question
4. Verify both passages appear with colored borders

---

### 3. Transitions Questions
**Type:** Transitions

**Display:**
- Short passage (50-100 words)
- Blank marked as `_____` in the passage
- **Blank is highlighted** with:
  - Blue dashed border
  - Light blue background
  - Bold formatting
- NO title or author displayed (these are exercises)
- Question asks for "most logical transition"

**What to verify:**
- ✅ Blank `_____` appears with blue dashed border
- ✅ Light blue background on blank
- ✅ Passage is short and focused
- ✅ Four transition word/phrase options

**How to test:**
1. Generate a transitions question:
   ```typescript
   internal.transitionsQuestionGeneration.generateTransitionsQuestion({
     relationshipType: "contrast"
   })
   ```
2. Navigate to practice or endless mode
3. Find the transitions question
4. Verify blank is highlighted in blue

---

### 4. Grammar Questions (8 types)
**Types:** Boundaries Between/Within Sentences, Subject-Verb Agreement, Pronoun-Antecedent Agreement, Verb Finiteness, Verb Tense & Aspect, Subject-Modifier Placement, Genitives & Plurals

**Display:**
- **NO passage panel** - shows message instead:
  - BookOpen icon (faded)
  - "This grammar question tests Standard English Conventions."
  - "Read the sentence carefully and choose the correct option."
- Sentence with underlined portion in the question prompt
- 4 options showing different ways to complete/fix the underlined part

**What to verify:**
- ✅ Left panel shows grammar message (not a passage)
- ✅ Icon and explanatory text appear
- ✅ Sentence appears in question prompt area
- ✅ Four grammar options (often including "NO CHANGE")

**How to test:**
1. Generate a grammar question:
   ```typescript
   internal.grammarQuestionGeneration.generateGrammarQuestion({
     questionType: "subject_verb_agreement"
   })
   ```
2. Navigate to practice or endless mode
3. Find the grammar question
4. Verify left panel shows message instead of passage

---

## Testing Checklist

### Practice Mode (`/practice`)
- [ ] Regular questions display correctly
- [ ] Cross-text shows two passages with colored borders
- [ ] Transitions highlight blank in blue
- [ ] Grammar shows explanatory message (no passage)
- [ ] Navigation between questions works
- [ ] Answer selection works for all types

### Endless Mode (`/endless`)
- [ ] Regular questions display correctly
- [ ] Cross-text shows two passages with colored borders
- [ ] Transitions highlight blank in blue
- [ ] Grammar shows explanatory message (no passage)
- [ ] Timer works correctly
- [ ] Streak tracking works for all types

### Responsive Design
- [ ] All question types display well on desktop
- [ ] All question types display well on tablet
- [ ] All question types display well on mobile
- [ ] Two-column layout works for cross-text on mobile

---

## Generating Test Questions

### Quick Test Set (One of Each Type)

Run these in the Convex dashboard to create one question of each new type:

```typescript
// Cross-Text
await ctx.runAction(internal.crossTextQuestionGeneration.generateCrossTextQuestion, {
  relationshipType: "supports_extends"
});

// Transitions
await ctx.runAction(internal.transitionsQuestionGeneration.generateTransitionsQuestion, {
  relationshipType: "contrast"
});

// Grammar - Subject-Verb Agreement
await ctx.runAction(internal.grammarQuestionGeneration.generateGrammarQuestion, {
  questionType: "subject_verb_agreement"
});

// Grammar - Boundaries Between Sentences
await ctx.runAction(internal.grammarQuestionGeneration.generateGrammarQuestion, {
  questionType: "boundaries_between_sentences"
});

// Grammar - Pronoun Agreement
await ctx.runAction(internal.grammarQuestionGeneration.generateGrammarQuestion, {
  questionType: "pronoun_antecedent_agreement"
});
```

### Generate Full Test Batch

```typescript
// Generate 3 of each new type (11 questions total)
await ctx.runAction(internal.crossTextQuestionGeneration.batchGenerateCrossTextQuestions, {
  count: 3,
  batchId: "ui-test-batch"
});

await ctx.runAction(internal.transitionsQuestionGeneration.batchGenerateTransitionsQuestions, {
  count: 3,
  batchId: "ui-test-batch"
});

await ctx.runAction(internal.grammarQuestionGeneration.batchGenerateGrammarQuestions, {
  count: 5,
  questionTypes: [
    "subject_verb_agreement",
    "boundaries_between_sentences",
    "pronoun_antecedent_agreement",
    "verb_tense_aspect",
    "genitives_plurals"
  ],
  batchId: "ui-test-batch"
});
```

---

## Common Issues & Fixes

### Issue: Cross-text only shows one passage
**Cause:** passage2 not being fetched from database
**Fix:** Verify `convex/questions.ts` queries include passage2 fetching logic

### Issue: Transitions blank not highlighted
**Cause:** Passage doesn't contain `_____`
**Fix:** Check that generated passage includes exactly `_____` (5 underscores)

### Issue: Grammar question shows "No passage" instead of message
**Cause:** questionSkill not being passed to PassageView
**Fix:** Verify PassageView receives `questionSkill` prop

### Issue: Colors not displaying
**Cause:** CSS variables not defined
**Fix:** Verify `globals.css` includes all color variables (`--grass-medium`, `--sky-medium`, etc.)

---

## Next Steps After Testing

Once you verify all question types display correctly:

1. **Generate production batches** of each type
2. **Update scoring** to show breakdown by all 11 types
3. **Add filters** to practice mode (e.g., "Grammar only")
4. **Track analytics** by question type
5. **Create custom practice sets** matching SAT distribution

---

## Questions?

- See `docs/question-generation-guide.md` for generation details
- See `docs/implementation-progress.md` for architecture
- See `docs/sat-question-types-coverage.md` for question type breakdown
