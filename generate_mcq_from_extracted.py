#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build MCQ items from extracted lecture .txt files (see extract_pdf_text.py).
Uses operation tables, numbered 'Title: description' lines, and bullet points.
"""
from __future__ import annotations

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXTRACTED = ROOT / "extracted"
OUT = ROOT / "questions_pdf.json"

random.seed(42)


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def trunc(s: str, n: int = 160) -> str:
    s = norm(s)
    return s if len(s) <= n else s[: n - 1] + "…"


def mcq_match_description(
    topic: str,
    operation_name: str,
    correct_desc: str,
    pool_descs: list[str],
    lecture: str,
) -> dict | None:
    correct_desc = trunc(correct_desc, 200)
    distractors = [trunc(d, 200) for d in pool_descs if d != correct_desc and len(d) > 12]
    random.shuffle(distractors)
    picks = distractors[:3]
    if len(picks) < 3:
        return None
    opts_list = [correct_desc] + picks
    random.shuffle(opts_list)
    letters = "ABCD"
    correct_letter = letters[opts_list.index(correct_desc)]
    return {
        "question": {
            "en": f"In {topic}, which description matches the operation «{operation_name}»? ({lecture})",
            "ar": "",
        },
        "options": {L: o for L, o in zip(letters, opts_list)},
        "correct": correct_letter,
        "explanation": norm(correct_desc),
    }


def gen_from_operation_tables() -> list[dict]:
    """Curated from PDF text — unique correct answer per question."""
    blocks: list[tuple[str, str, list[tuple[str, str]]]] = [
        (
            "a singly linked list",
            "Lec 6 DSA Linked List",
            [
                ("InsertAtBeginning", "Attaches a new node at the start of the linked-list."),
                ("InsertAtEnd", "Attaches a new node at the end of the linked-list."),
                ("InsertAtPosition", "Attaches a new node at a specific position in the linked-list."),
                (
                    "DeleteFromBeginning",
                    "Removes the Head of the linked-list and updates the Head to the next node.",
                ),
                ("DeleteFromEnd", "Removes the node present at the end of the linked-list."),
                ("DeleteFromPosition", "Removes a node from a given position of the linked-list."),
                ("Display", "Prints all the values of the nodes present in the linked-list."),
                ("Traversal", "access each element of the linked list"),
            ],
        ),
        (
            "a stack",
            "Lec 4 DSA Stack",
            [
                (
                    "Push",
                    "adds a data value to the top of the stack (pushed). There is no way to inserting element at any other position of the stack.",
                ),
                ("Pop", "removes the last data value on top of the stack"),
                ("Peek", "returns the top data value of the stack, without removing it."),
                (
                    "IsEmpty",
                    "is a function that check if the stack is empty. Returns true if stack is empty else returns false.",
                ),
                (
                    "IsFull",
                    "is a function that returns true if the stack is full, then it is said to be an Overflow condition else returns false.",
                ),
                ("Size", "is a function that returns the number of elements in the stack."),
            ],
        ),
        (
            "an array-based queue",
            "Lec 5 DSA Queue",
            [
                ("Enqueue", "Inserts an element into the queue using the rear pointer."),
                ("Dequeue", "Deletes an element from the queue using the front pointer and returns it."),
                ("Size", "Returns the total numbers of elements present in the queue"),
                ("front()", "Returns the element at the front end without removing it."),
                ("rear()", "Returns the element at the rear end without removing it."),
                ("isEmpty", "Returns true if the queue is empty."),
                ("isFull", "Returns true if the queue is fully and there is no space left."),
            ],
        ),
    ]
    out: list[dict] = []
    for topic, lec, ops in blocks:
        pool = [d for _, d in ops]
        for name, desc in ops:
            m = mcq_match_description(topic, name, desc, pool, lec)
            if m:
                out.append(m)
    return out


def colon_facts_from_text(text: str, lecture: str) -> list[tuple[str, str]]:
    facts: list[tuple[str, str]] = []
    for line in text.splitlines():
        line = line.strip()
        m = re.match(r"^\d+\.\s+(.+)$", line)
        if not m:
            continue
        body = m.group(1)
        if ":" not in body[:140]:
            continue
        title, _, rest = body.partition(":")
        title, rest = title.strip(), rest.strip()
        if len(title) < 3 or len(title) > 100 or len(rest) < 25:
            continue
        low = body.lower()
        if any(x in low for x in ("def ", "import ", "print(", "step 1", "step 2", "python code")):
            continue
        facts.append((trunc(title, 90), rest))
    return facts


def gen_from_colon_facts(text: str, lecture: str) -> list[dict]:
    facts = colon_facts_from_text(text, lecture)
    if len(facts) < 4:
        return []
    pool_descs = [d for _, d in facts]
    out: list[dict] = []
    for title, desc in facts:
        correct = trunc(desc, 200)
        distractors = [trunc(d, 200) for d in pool_descs if d != desc]
        random.shuffle(distractors)
        picks = distractors[:3]
        if len(picks) < 3:
            continue
        opts_list = [correct] + picks
        random.shuffle(opts_list)
        letters = "ABCD"
        correct_letter = letters[opts_list.index(correct)]
        out.append(
            {
                "question": {
                    "en": f'Which description best matches «{title}»? ({lecture})',
                    "ar": "",
                },
                "options": {L: o for L, o in zip(letters, opts_list)},
                "correct": correct_letter,
                "explanation": norm(f"{title}: {desc}"),
            }
        )
    return out


def bullets_from_text(text: str) -> list[str]:
    out: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if re.match(r"^[•·]\s*", line):
            b = re.sub(r"^[•·]\s*", "", line)
            b = norm(b)
            if len(b) > 45:
                out.append(b)
    return out


def gen_from_bullets(bullets: list[str], lecture: str, topic_hint: str) -> list[dict]:
    if len(bullets) < 5:
        return []
    out: list[dict] = []
    pool = bullets[:]
    for correct in bullets:
        distractors = [b for b in pool if b != correct and b[:40] != correct[:40]]
        random.shuffle(distractors)
        picks = distractors[:3]
        if len(picks) < 3:
            continue
        opts_list = [trunc(correct, 200)] + [trunc(p, 200) for p in picks]
        random.shuffle(opts_list)
        letters = "ABCD"
        correct_short = trunc(correct, 200)
        correct_letter = letters[opts_list.index(correct_short)]
        out.append(
            {
                "question": {
                    "en": f"Which statement appears in the slides about {topic_hint}? ({lecture})",
                    "ar": "",
                },
                "options": {L: o for L, o in zip(letters, opts_list)},
                "correct": correct_letter,
                "explanation": trunc(correct, 280),
            }
        )
    return out


def bst_and_sort_facts() -> list[dict]:
    """Short factual MCQs from BST / sorting slides (hand-picked)."""
    return [
        {
            "question": {
                "en": "In a binary search tree, values in the left sub-tree of a node with value v are: (Lec 8 DSA BST)",
                "ar": "",
            },
            "options": {
                "A": "all greater than v",
                "B": "all less than v",
                "C": "unordered relative to v",
                "D": "always equal to v",
            },
            "correct": "B",
            "explanation": "BST property: every value in the left sub-tree is < v.",
        },
        {
            "question": {
                "en": "To find the minimum in a BST you typically walk: (Lec 8 DSA BST)",
                "ar": "",
            },
            "options": {
                "A": "repeatedly to the right child",
                "B": "repeatedly to the left child",
                "C": "level-order from the root",
                "D": "only the root",
            },
            "correct": "B",
            "explanation": "Smallest value is at the leftmost node.",
        },
        {
            "question": {
                "en": "Merge sort primarily follows which approach? (Lec 9 sort)",
                "ar": "",
            },
            "options": {
                "A": "Greedy",
                "B": "Divide and Conquer",
                "C": "Brute force only",
                "D": "Dynamic programming only",
            },
            "correct": "B",
            "explanation": "Merge sort divides the array, sorts halves, then merges.",
        },
        {
            "question": {
                "en": "Bubble sort compares which pairs in each inner step? (Lec 9 sort)",
                "ar": "",
            },
            "options": {
                "A": "elements far apart (gap > 1)",
                "B": "adjacent pairs",
                "C": "only first and last",
                "D": "random pairs",
            },
            "correct": "B",
            "explanation": "It walks through the list comparing adjacent elements and swapping if out of order.",
        },
        {
            "question": {
                "en": "Worst-case time complexity of bubble sort is typically: (Lec 9 sort)",
                "ar": "",
            },
            "options": {
                "A": "O(n)",
                "B": "O(n log n)",
                "C": "O(n²)",
                "D": "O(1)",
            },
            "correct": "C",
            "explanation": "Nested loops over the list yield quadratic time in the worst case.",
        },
        {
            "question": {
                "en": "An undirected graph's adjacency matrix for a simple graph is often: (Lec 7 Graph & Tree)",
                "ar": "",
            },
            "options": {
                "A": "asymmetric",
                "B": "symmetric",
                "C": "always diagonal only",
                "D": "always zero",
            },
            "correct": "B",
            "explanation": "Edges go both ways, so entries (i,j) and (j,i) match.",
        },
        {
            "question": {
                "en": "In adjacency list representation, each array entry typically stores: (Lec 7 Graph & Tree)",
                "ar": "",
            },
            "options": {
                "A": "only vertex names",
                "B": "neighbors of that vertex (often as a list)",
                "C": "the full matrix row",
                "D": "edge weights only, never vertices",
            },
            "correct": "B",
            "explanation": "array[i] lists vertices adjacent to vertex i.",
        },
    ]


def main():
    all_mcqs: list[dict] = []

    all_mcqs.extend(gen_from_operation_tables())

    for txt in sorted(EXTRACTED.glob("*.txt")):
        text = txt.read_text(encoding="utf-8")
        name = txt.stem
        all_mcqs.extend(gen_from_colon_facts(text, name))

    lec7 = (EXTRACTED / "Lec 7 DSA Graph & Tree .txt").read_text(encoding="utf-8")
    all_mcqs.extend(gen_from_bullets(bullets_from_text(lec7), "Lec 7 DSA Graph & Tree", "graphs and representations"))

    intro = (EXTRACTED / "introduction to DSA .txt").read_text(encoding="utf-8")
    all_mcqs.extend(gen_from_bullets(bullets_from_text(intro), "introduction to DSA", "data structures vs data types"))

    for fname, hint in (
        ("Lec 3 DSA Operations in array .txt", "array operations, search, and complexity"),
        ("Lec 9 sort .txt", "sorting algorithms and complexity"),
        ("Lec 8 DSA BST .txt", "binary search trees"),
    ):
        p = EXTRACTED / fname
        if p.exists():
            all_mcqs.extend(
                gen_from_bullets(bullets_from_text(p.read_text(encoding="utf-8")), fname, hint)
            )

    all_mcqs.extend(bst_and_sort_facts())

    # De-duplicate
    seen: set[str] = set()
    unique: list[dict] = []
    for m in all_mcqs:
        sig = m["question"]["en"] + "".join(m["options"].values())
        if sig in seen:
            continue
        seen.add(sig)
        unique.append(m)

    for i, m in enumerate(unique, start=1):
        m["id"] = i

    payload = {
        "title": "أسئلة مولَّدة من محاضرات PDF (DSA)",
        "questions": unique,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(unique)} questions to {OUT}")


if __name__ == "__main__":
    main()
