# SAT Question Generation Guide

Complete guide for generating all 11 SAT Reading & Writing question types.

---

## ✅ Implemented Generation Functions

All question generation functions are now implemented and ready to use!

### By Domain

**Domain 1: Information and Ideas** → Use `convex/readingQuestionGeneration.ts`
- Central Ideas and Details
- Inferences
- Command of Evidence (Textual)

**Domain 2: Craft and Structure**
- Words in Context → Use `convex/readingQuestionGeneration.ts`
- Text Structure and Purpose → Use `convex/readingQuestionGeneration.ts`
- **✨ Cross-Text Connections** → Use `convex/crossTextQuestionGeneration.ts`

**Domain 3: Expression of Ideas**
- Rhetorical Synthesis → Use `convex/readingQuestionGeneration.ts`
- **✨ Transitions** → Use `convex/transitionsQuestionGeneration.ts`

**Domain 4: Standard English Conventions** → Use `convex/grammarQuestionGeneration.ts`
- **✨ Boundaries - Between Sentences**
- **✨ Boundaries - Within Sentences**
- **✨ Subject-Verb Agreement**
- **✨ Pronoun-Antecedent Agreement**
- **✨ Verb Finiteness**
- **✨ Verb Tense & Aspect**
- **✨ Subject-Modifier Placement**
- **✨ Genitives & Plurals**

---

## 🚀 How to Generate Questions

### Option 1: Using Convex Dashboard (Recommended for Testing)

1. **Open Convex Dashboard:**
   ```bash
   npx convex dev
   ```
   Then navigate to `http://localhost:3000` (or your Convex dashboard URL)

2. **Navigate to Functions** → Find the generation function you want to test

3. **Run Function** → Provide arguments

---

## 📝 Generation Function Reference

### Reading Questions (Original 6 Types)

**File:** `convex/readingQuestionGeneration.ts`

#### Generate Single Question
```typescript
// Function: generateReadingQuestion
{
  "questionType": "central_ideas",  // or: inferences, vocabulary_in_context,
                                     //     text_structure, command_of_evidence,
                                     //     rhetorical_synthesis
  "passageType": "social_science",  // or: literary_narrative, natural_science, humanities
  "batchId": "optional-batch-id"
}
```

#### Generate Batch
```typescript
// Function: batchGenerateReadingQuestions
{
  "count": 10,
  "questionTypes": ["central_ideas", "inferences"],  // Optional: defaults to all types
  "passageTypes": ["social_science", "natural_science"],  // Optional
  "batchId": "optional-batch-id"
}
```

---

### Cross-Text Questions

**File:** `convex/crossTextQuestionGeneration.ts`

#### Generate Single Question
```typescript
// Function: generateCrossTextQuestion
{
  "relationshipType": "supports_extends",  // or: contradicts_challenges, provides_example,
                                           //     explains_mechanism, compares_contrasts,
                                           //     cause_effect, problem_solution, general_specific
  "batchId": "optional-batch-id"
}
```

#### Generate Batch
```typescript
// Function: batchGenerateCrossTextQuestions
{
  "count": 5,
  "batchId": "optional-batch-id"
}
```

**Output:** Creates TWO passages and links them to one question

---

### Transitions Questions

**File:** `convex/transitionsQuestionGeneration.ts`

#### Generate Single Question
```typescript
// Function: generateTransitionsQuestion
{
  "relationshipType": "contrast",  // or: addition, cause_effect, example, clarification,
                                   //     temporal, emphasis, concession, comparison, conclusion
  "batchId": "optional-batch-id"
}
```

#### Generate Batch
```typescript
// Function: batchGenerateTransitionsQuestions
{
  "count": 10,
  "batchId": "optional-batch-id"
}
```

**Output:** Creates short passage with blank `_____` for transition word

---

### Grammar/Conventions Questions (All 8 Types)

**File:** `convex/grammarQuestionGeneration.ts`

#### Generate Single Question
```typescript
// Function: generateGrammarQuestion
{
  "questionType": "subject_verb_agreement",  // or: boundaries_between_sentences,
                                             //     boundaries_within_sentences,
                                             //     pronoun_antecedent_agreement,
                                             //     verb_finiteness, verb_tense_aspect,
                                             //     subject_modifier_placement, genitives_plurals
  "patternType": "prepositional_phrase_distractor",  // Optional: specific pattern to test
  "batchId": "optional-batch-id"
}
```

#### Generate Batch
```typescript
// Function: batchGenerateGrammarQuestions
{
  "count": 20,
  "questionTypes": [  // Optional: defaults to all 8 types
    "subject_verb_agreement",
    "boundaries_between_sentences",
    "genitives_plurals"
  ],
  "batchId": "optional-batch-id"
}
```

**Output:** Creates questions with NO passage (standalone sentences)

---

## 🔧 Using Node.js Scripts

### Example: Generate 5 Cross-Text Questions

Create `scripts/generateCrossText.ts`:
```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function main() {
  const result = await client.action(
    api.crossTextQuestionGeneration.batchGenerateCrossTextQuestions,
    {
      count: 5,
      batchId: "cross-text-test-batch"
    }
  );

  console.log("Generation complete:", result);
}

main();
```

Run:
```bash
npx tsx scripts/generateCrossText.ts
```

---

## 📊 Expected Output

### Reading Questions
```javascript
{
  "success": true,
  "questionId": "k5j7...",
  "passageId": "k8m2...",
  "sampledParams": {
    "questionType": "central_ideas",
    "passageType": "social_science",
    "passageComplexity": 0.55,
    "inferenceDepth": 0.48,
    // ... more params
  }
}
```

### Cross-Text Questions
```javascript
{
  "success": true,
  "questionId": "k9n4...",
  "passage1Id": "k1a7...",
  "passage2Id": "k2b8...",
  "sampledParams": {
    "relationshipType": "supports_extends",
    "topicCategory": "scientific_research",
    // ... more params
  }
}
```

### Grammar Questions
```javascript
{
  "success": true,
  "questionId": "k3c9...",
  // No passageId - grammar questions are standalone
  "sampledParams": {
    "questionType": "subject_verb_agreement",
    "patternType": "prepositional_phrase_distractor",
    // ... more params
  }
}
```

---

## 🎯 Generating a Balanced Practice Set

To create a realistic SAT section, generate questions matching the official distribution:

```typescript
// Generate 54 Reading & Writing questions (Digital SAT Module)
const distribution = {
  // Domain 1: Information and Ideas (26%)
  central_ideas: 6,      // 12%
  inferences: 6,          // 12%
  command_of_evidence: 6, // 12%

  // Domain 2: Craft and Structure (28%)
  vocabulary_in_context: 5,  // 10%
  text_structure: 7,          // 13%
  cross_text_connections: 3,  // 5%

  // Domain 3: Expression of Ideas (20%)
  rhetorical_synthesis: 7,    // 13%
  transitions: 4,             // 7%

  // Domain 4: Standard English Conventions (26%)
  boundaries_between_sentences: 3,  // 6%
  boundaries_within_sentences: 4,   // 7%
  subject_verb_agreement: 2,        // 3%
  pronoun_antecedent_agreement: 2,  // 3%
  verb_finiteness: 1,               // 2%
  verb_tense_aspect: 2,             // 3%
  subject_modifier_placement: 1,    // 1%
  genitives_plurals: 1,             // 1%
};
// Total: 60 questions (54 SAT standard + 6 buffer)
```

---

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY environment variable is required"
**Solution:** Make sure you have `ANTHROPIC_API_KEY` set in your `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### "Claude returned no text response"
**Cause:** API timeout or invalid response
**Solution:**
- Check your API key is valid
- Try again (may be temporary API issue)
- Check Claude API status

### "Generated question missing required fields"
**Cause:** Claude returned malformed JSON
**Solution:**
- Check the prompt template in `newQuestionTypePrompts.ts`
- Review Claude's actual response in logs
- May need to adjust prompt instructions

### Questions not appearing in UI
**Cause:** Questions may have `reviewStatus: "pending"`
**Solution:** Update question's `reviewStatus` to `"verified"` in database

---

## 📈 Monitoring Generation

### Check Batch Progress
All batch generation functions return:
```javascript
{
  "batchId": "grammar-1704123456789",
  "total": 20,
  "successful": 18,
  "failed": 2,
  "results": [
    { "index": 0, "success": true, "questionId": "..." },
    { "index": 1, "success": false, "error": "..." },
    // ...
  ]
}
```

### Query Generated Questions
```typescript
// In Convex dashboard or query
const questions = await ctx.db
  .query("questions")
  .filter(q => q.eq(q.field("source.type"), "agent_generated"))
  .collect();
```

---

## 🔒 Quality Control

All generated questions include metadata for tracking:

```typescript
{
  generationMetadata: {
    generatedAt: 1704123456789,
    agentVersion: "grammar-question-v1",
    promptTemplate: "grammar_subject_verb_agreement",
    promptParameters: { /* sampled params */ },
    verbalizedSampling: { /* difficulty distribution */ }
  }
}
```

This allows you to:
- Track which agent version generated each question
- Identify low-quality batches
- Adjust prompts based on output quality
- Filter questions by generation parameters

---

## 🎓 Best Practices

1. **Start Small:** Generate 1-5 questions first to test quality
2. **Review Output:** Manually check first batch before mass generation
3. **Use Batches:** Batch generation includes rate limiting and error handling
4. **Tag Appropriately:** Use consistent batchId for related questions
5. **Monitor Costs:** Claude API calls cost money - track usage
6. **Version Prompts:** Update agentVersion when changing prompts

---

## 📚 Next Steps

Now that generation is working:

1. **Generate Test Batches** for each question type
2. **Review Quality** - Do questions match SAT format?
3. **Update UI** to display new question formats
4. **Create Practice Sets** with proper distribution
5. **Test Student Flow** - Can students answer all types?
6. **Add Analytics** to track performance by type

---

## 🆘 Need Help?

- **Templates:** See `convex/*Templates.ts` for available parameters
- **Prompts:** See `convex/newQuestionTypePrompts.ts` for LLM instructions
- **Examples:** Check existing reading questions in database
- **Documentation:** See `docs/implementation-progress.md` for architecture
