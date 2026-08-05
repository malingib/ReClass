# UI/UX Guidelines for ReClass

## Purpose

This project should feel like a calm, dependable admin tool, not a generic marketing site or an over-styled demo. The goal is clarity, trust, and efficient task completion.

## Core principles

1. Clarity over decoration
   - Users should understand the page purpose in a few seconds.
   - If a visual element does not help the user complete a task, remove it.

2. Reduce cognitive load
   - Avoid unnecessary choices, extra words, and competing signals.
   - Make the next best action obvious.

3. Show state and feedback
   - Every action should communicate what happened.
   - Loading, success, error, and empty states should be specific and useful.

4. Be consistent
   - Reuse the same patterns for navigation, forms, tables, dialogs, and actions.
   - Users should not have to learn a new mental model on every screen.

5. Prioritize the task
   - The most important content should appear first.
   - One primary action per screen is usually better than several equally loud options.

6. Accessibility by default
   - Good UX is inclusive UX.
   - Meet the spirit of WCAG 2.2, not just the minimum checkbox.

7. Respect the user’s time
   - Reduce clicks, avoid unnecessary steps, and remove friction.
   - Good interfaces feel efficient without feeling cramped.

## Rules to follow

- Use short, plain language. Prefer concrete verbs over abstract buzzwords.
- Use real labels, not decorative filler. Replace vague phrases like “streamline your workflow” with specific task-oriented copy.
- Keep hierarchy clear: heading, supporting text, primary action, secondary actions.
- Use spacing consistently. A simple rhythm is more trustworthy than random visual drama.
- Keep text readable: comfortable size, strong contrast, enough line height, and reasonable line length.
- Use color to communicate meaning, not to decorate.
- Make interactive targets large enough to use comfortably.
- Keep focus states visible and keyboard navigation predictable.
- Provide helpful empty states, loading states, and error messages.
- Prefer calm surfaces and restrained emphasis over excessive gradients, effects, or ornament.

## What to avoid

- Generic “AI slop” copy that sounds polished but says nothing.
- Marketing language in admin or operational screens.
- Overuse of gradients, shadows, glass effects, and decorative illustrations.
- Too many colors, too many icons, too many badges, and too many competing calls to action.
- Hover-only affordances or hidden actions.
- Busy layouts where everything feels equally important.
- Vague status messages such as “something went wrong” without context.
- Interfaces that look impressive but make simple work harder.

## Practical design checklist

Before shipping a screen, ask:

- Can a new user understand the purpose of this page in five seconds?
- Is the main action obvious?
- Is the copy specific and useful?
- Does the page feel calm rather than crowded?
- Is the content grouped in a logical order?
- Are labels, errors, and buttons clear?
- Is the contrast strong enough for comfortable reading?
- Can the page be used with a keyboard?
- Would this still work if the visual polish were removed?

## UX review heuristics

Use these as a quick sanity check:

- Visibility of system status: tell the user what is happening.
- Match the real world: use familiar language and sensible task flow.
- User control and freedom: make cancel, back, and undo easy.
- Consistency: reuse patterns instead of inventing new ones.
- Error prevention: reduce the chance of mistakes before they happen.
- Recognition over recall: keep options visible and reduce memory burden.
- Minimalism: remove anything that does not support the task.
- Help users recover from errors: make problems understandable and fixable.

## Recommended references

- Jakob Nielsen, “10 Usability Heuristics for User Interface Design”
- W3C, “Web Content Accessibility Guidelines (WCAG) 2.2”
- Google Material Design 3 guidance
- Don Norman, The Design of Everyday Things

## Rule of thumb

If a design choice cannot be explained as helping a user complete a task, it probably should be simplified or removed.
