# Content Import JSON Format

## Subjects

```json
[
  {
    "slug": "digital-electronics",
    "title": "Digital Electronics",
    "description": "Logic gates, sequential circuits, FSM",
    "phase": 1,
    "is_premium": false,
    "monthly_price_inr": 0
  }
]
```

## MCQs

```json
[
  {
    "subject_slug": "digital-electronics",
    "question_text": "Which gate outputs 1 only when all inputs are 1?",
    "option_a": "OR",
    "option_b": "NAND",
    "option_c": "AND",
    "option_d": "XOR",
    "correct_option": "C",
    "explanation": "AND outputs 1 if all inputs are 1",
    "difficulty": "easy",
    "is_premium": false,
    "is_interview": false,
    "company": "",
    "topic": "Logic Gates"
  }
]
```

- `difficulty`: one of `easy`, `medium`, `hard`.
- `is_premium`: optional, defaults to `false`. Set `true` to gate an individual question behind a subscription (independent of the subject-level gate).
- `is_interview`: optional, defaults to `false`. Marks a question as an interview question. Interview questions are the **only premium content** (see Premium Policy below) and are auto-marked premium on import.
- `company`: optional, defaults to `""`. Company that commonly asks this (e.g. `"Qualcomm"`, `"NVIDIA"`).
- `topic`: optional, defaults to `""`. Sub-topic tag used for topic-based filtering.

## Notes

```json
[
  {
    "subject_slug": "digital-electronics",
    "topic": "Boolean Algebra",
    "title": "Canonical Forms",
    "content_markdown": "SOP and POS are standard forms for Boolean expressions."
  }
]
```

## Premium Policy

- **Premium = interview questions only.** All regular learning content (practice MCQs, notes, tutorials, non-interview coding) is **free** across every subject.
- A question/problem becomes premium when `is_interview=true`. The importer auto-sets `is_premium=true` for any item with `is_interview=true`, and for any subject whose slug starts with `interview-`.
- Interview content is tagged by `topic` and `company` so it can be filtered by topic and by the company that asks it.
- Subscription price is **INR 299/month**.

## Freemium Preview Model

- Regular practice content is fully free and is **not** capped.
- Interview questions expose a **5-question free preview** per subject (`INTERVIEW_PREVIEW_LIMIT` in the content API) so users can try before subscribing.
  - `GET /api/v1/content/subjects/{id}/interview/mcqs` returns up to 5 interview MCQs (pass `include_premium=true` for the full set after unlock).
  - `GET /api/v1/content/subjects/{id}/interview/coding` returns up to 5 interview coding problems.
- `GET /api/v1/content/subjects/{id}/preview` returns the free vs locked breakdown and the unlock message.

## Tutorials (GeeksforGeeks-style)

```json
[
  {
    "subject_slug": "digital-electronics",
    "topic": "Number Systems",
    "title": "Number Systems and Codes",
    "content_markdown": "# Number Systems\n\nBinary, octal, hex...",
    "order_index": 1,
    "reading_minutes": 8
  }
]
```

- Tutorials are free, long-form Markdown lessons served by `GET /api/v1/content/subjects/{id}/tutorials`, ordered by `order_index` then `id`.
- `order_index`: optional, defaults to `0`. Controls lesson ordering within a subject.
- `reading_minutes`: optional, defaults to `5`. Estimated reading time shown in the UI.
- Import tutorials with `--tutorials docs/seed/tutorials.json`. Existing tutorials for a subject are replaced on import.

## Scoring Endpoints

- `POST /api/v1/progress/quiz/submit` — body `{ subject_id, time_seconds, answers: [{ mcq_id, selected_option }] }`. Returns per-question correctness with explanations, `correct_count`, `score_percent`, and a letter `grade`. The result is persisted to `quiz_results`.
- `POST /api/v1/progress/coding/submit` — body `{ coding_question_id, tests_total, tests_passed, time_seconds }`. Returns `all_passed`, a `score`, and a message that reflects how many test cases passed and the time taken. The result is persisted to `coding_submissions`.

## Feedback & Rating

- `POST /api/v1/feedback` — body `{ rating (1-5), comment, display_name }`. Stores a star rating plus an improvement comment.
- `GET /api/v1/feedback/summary` — returns `total_reviews`, `average_rating`, a per-star `distribution`, and recent reviews.

## Coding Questions

```json
[
  {
    "subject_slug": "verilog-hdl",
    "title": "2:1 Multiplexer",
    "prompt": "Implement a 2:1 mux",
    "constraints": "Use continuous assignment",
    "expected_output": "y equals a when sel=0, b when sel=1",
    "starter_code": "module mux2(...); endmodule",
    "solution_code": "module mux2(...); assign y = sel ? b : a; endmodule",
    "difficulty": "easy",
    "is_premium": false,
    "is_interview": false,
    "company": "",
    "topic": "Combinational",
    "test_cases": [
      { "name": "sel=0", "input": "a=1 b=0 sel=0", "expected": "y=1" },
      { "name": "sel=1", "input": "a=1 b=0 sel=1", "expected": "y=0" }
    ]
  }
]
```

- Coding questions follow an **HDLBits-style tiered model**: each topic has `easy`, `medium`, and `hard` problems. The number of problems per topic varies, and the toughest (`hard`) problems are typically marked `is_premium=true`.
- `difficulty`: one of `easy`, `medium`, `hard` (defaults to `easy`).
- `is_premium`: optional, defaults to `false`.
- `is_interview`, `company`, `topic`: same meaning as for MCQs. Interview coding problems are premium.
- `test_cases`: optional list of `{ name, input, expected }`. The count drives coding scoring (how many test cases the student passed). Stored as JSON.
