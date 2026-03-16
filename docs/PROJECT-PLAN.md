# FridgeChef AI - End-to-End Build Plan

This document is written for a team that wants to build the project from scratch.
Its purpose is not just to answer "what should be built?", but "in what order, with which deliverables, and with which exit criteria should it be built?"

The core logic of this plan is:

1. lock the product idea and scope first
2. build the technical foundation next
3. make the core user flows work
4. leave polish, performance, testing, and release readiness for the end

---

## 0. Project Definition

### Product Goal

The user scans ingredients from a fridge or kitchen setup with the camera, the app analyzes them, suggests suitable meals, shows recipe steps, and lets the user save recipes for later.

### Core Value Proposition

- Fast ingredient detection with fridge scan
- AI recipe suggestions based on available ingredients
- Written recipe search through "Ask Fridge AI"
- Pantry-aware suggestions using ingredients the user already has
- Step-by-step cooking mode

### MVP Boundary

For the MVP, the following flow is enough:

`Recipes -> Scan -> Analyze -> Ingredients -> Suggestions -> Recipe -> Cooking -> Completion`

Things that can stay outside the MVP:

- social features
- profile/account systems
- cloud sync accounts
- notification automation
- payments or premium plans

---

## 1. Product and Scope Planning

### Goal

Define not only what the app is, but also what it is not.

### Work Items

- write the main user stories
- list the core screens
- define each screen in one sentence
- separate MVP from post-MVP work
- list API dependencies
- identify major risks early

### Deliverables

- product summary
- screen list
- user flow diagram
- MVP scope
- technical risk list

### Exit Criteria

The team should give the same answer when asked: "What is included in version one, and what is not?"

---

## 2. UX and Flow Design

### Goal

Clarify how the app should feel and how screens connect before writing feature code.

### Main Screens

- `RecipesHub`
- `Camera`
- `AnalysisLoading`
- `Ingredients`
- `MealSuggestions`
- `Recipe`
- `CookingMode`
- `Completion`
- `PantryHub`
- `Settings`
- `AskFridgeModal`

### Work Items

- create wireframes or Stitch designs for each screen
- decide whether bottom navigation exists and where
- define the language for chat, cards, hero areas, CTAs, and empty states
- design first-open, loading, error, and empty-state experiences

### Deliverables

- screen mockups
- navigation map
- component list
- design token draft

### Exit Criteria

There should be no ambiguity left around "which screen opens from where?"

---

## 3. Technical Architecture Decision

### Goal

Set up mobile, backend, and data flow in a way that is simple at the beginning but scalable later.

### Recommended Architecture

- Mobile: Expo + React Native + TypeScript
- Backend: Node.js + Express + TypeScript
- State: Zustand
- Server state: TanStack Query
- i18n: i18next
- Local persistence: AsyncStorage
- AI: OpenAI Responses API
- Image fallback: Pexels

### Work Items

- decide the repository structure
- choose between a single package and workspaces
- define environment variables
- write API contracts
- create navigation param types

### Deliverables

- folder structure
- `.env.example`
- shared type model
- route types
- service boundaries

### Exit Criteria

Before feature work starts, the answer to "which layer is responsible for what?" should already be clear.

---

## 4. Foundation and Development Environment

### Goal

Make sure every teammate can run the project with the same commands.

### Work Items

- create the Expo project
- create the backend folder and TypeScript config
- add lint, typecheck, and test scripts
- set up base navigation, query provider, and store provider
- add the backend health endpoint

### Deliverables

- working empty Expo app
- working backend `GET /health`
- `npm run typecheck`
- `npm test`
- `python3 scripts/verify_all.py`

### Exit Criteria

A new contributor should be able to clone the repository and run the project successfully.

---

## 5. Core Mobile Skeleton

### Goal

Even if the UI is still basic, navigation and state architecture should already be in place.

### Work Items

- set up the root navigator
- connect the main `Recipes / Scan / Pantry` flow
- define theme and color system
- extract shared atoms like buttons, cards, and icon buttons
- create the settings and locale switching foundation

### Deliverables

- working screen-to-screen navigation
- shared component base
- working i18n setup

### Exit Criteria

The user should be able to move through the app even if no real data exists yet.

---

## 6. Camera and Image Intake Flow

### Goal

Let the user actually capture a photo or choose one from the gallery and start the flow.

### Work Items

- camera permission flow
- physical-device and simulator fallback behavior
- gallery selection
- image compression
- mime type and size checks
- route into the `AnalysisLoading` screen

### Deliverables

- `useCamera` hook
- `useImageProcessor` hook
- route transport for the captured image

### Exit Criteria

Taking or selecting a photo should reliably move the user into the analysis flow.

---

## 7. Backend Upload and Analyze Flow

### Goal

Receive the uploaded image safely on the backend and prepare it for AI analysis.

### Work Items

- `POST /api/v1/analyze`
- multipart upload middleware
- file validation
- error codes
- OpenAI request integration
- schema validation

### Deliverables

- upload controller
- ingredient/recipe service
- stable JSON response

### Exit Criteria

A real image should reach the backend and return `detectedIngredients + suggestedRecipe`.

---

## 8. Ingredients Review Screen

### Goal

Give the user control over the AI result instead of forcing them to accept it as-is.

### Work Items

- list detected ingredients
- allow selection and deselection
- display quantity or category where available
- decide how ingredients are written into pantry state
- pass selected ingredients into the next step

### Deliverables

- ingredients review flow
- `selectedIngredients` store logic

### Exit Criteria

The user should be able to review and adjust the AI output before continuing.

---

## 9. Meal Suggestions and Recipe Screens

### Goal

Make recipes not only generated, but also browsable, understandable, and actionable.

### Work Items

- recipe suggestion cards
- recipe detail hero image
- ingredient list
- step preview
- save recipe action
- clean back-navigation behavior

### Deliverables

- recipe card system
- recipe detail screen
- local recipe save repository

### Exit Criteria

The user should be able to choose a recipe and understand it comfortably.

---

## 10. Ask Fridge AI

### Goal

Allow the user to request recipes using their own written prompt.

### Work Items

- `POST /api/v1/ask-fridge`
- modal/chat design
- prompt input
- result cards
- `Info` and `Cook this` actions
- chat session persistence
- local agent message when pantry is empty

### Deliverables

- written AI chat flow
- local persisted chat session
- Ask Fridge suggestion cards

### Exit Criteria

The user should be able to type prompts like "Use my pantry", "quick dinner", or "high protein" and receive meaningful results.

---

## 11. Pantry Logic

### Goal

Make pantry data a more stable layer than scan results.

### Work Items

- pantry store
- manual ingredient entry
- edit and remove actions
- ingredient thumbnail fetching
- search and filtering

### Deliverables

- working pantry screen
- swipe/edit/delete flow
- ingredient thumbnails

### Exit Criteria

The pantry should feel like the user's persistent inventory, not temporary scan output.

---

## 12. Cooking Mode

### Goal

Turn a recipe into an actual guided cooking experience.

### Work Items

- step-by-step cooking screen
- next/back navigation
- progress display
- keep-awake behavior
- TTS / voice guidance
- completion screen

### Deliverables

- cooking session store
- completion flow

### Exit Criteria

The user should be able to follow the recipe, not just read it.

---

## 13. Visual Quality and Image Matching

### Goal

Avoid showing irrelevant or low-quality stock photos on recipe cards.

### Work Items

- detect dish types from titles
- score title and ingredient overlap
- fall back when the match is weak
- use ingredient fallback only when needed
- push generic ingredients like egg or onion lower in hero image selection
- write regression tests for known image-matching bugs

### Deliverables

- smarter Pexels selection logic
- better image behavior for tortilla, shakshuka, wrap, and similar dishes

### Exit Criteria

The image should represent the recipe. If it does not, showing no image is better than showing the wrong one.

---

## 14. Local Persistence

### Goal

Preserve the most important user state even if the app is closed and reopened.

### Persist These

- saved recipes
- pantry data
- Ask Fridge chat session
- locale and preferences

### Do Not Necessarily Persist

- temporary loading state
- old mutation state
- one-off navigation state

### Exit Criteria

Closing and reopening the app should not wipe the main user experience.

---

## 15. Error Handling and Empty State Layer

### Goal

Make the app feel understandable and stable even when something goes wrong.

### Work Items

- camera unavailable state
- pantry empty state
- AI unavailable state
- upload failed state
- unsuitable image state
- no image found state
- no saved recipes state

### Exit Criteria

For every critical error state, the user should understand what happened and what to do next.

---

## 16. Testing Strategy

### Goal

Prevent core flows from silently breaking as the app grows.

### Unit Tests

- stores
- scoring and matching heuristics
- helper functions

### Integration Tests

- backend endpoints
- analyze upload
- Ask Fridge response shape

### Manual QA

- physical phone camera test
- slow network test
- locale switching
- back button and modal flows
- empty-state behavior

### Exit Criteria

New changes should not break the core user flow without being caught.

---

## 17. Performance and Stabilization

### Goal

Make sure the app feels stable and usable on a real device, not just like a prototype.

### Work Items

- reduce expensive query refetch behavior
- add daily feed cache logic
- persist Ask Fridge state
- reduce unnecessary remounts
- control image and processing cost

### Exit Criteria

The app should feel like a usable product, not a fragile demo.

---

## 18. Final Delivery Preparation

### Goal

Even if the code is done, the delivery should also be clean and understandable.

### Work Items

- setup and run guide
- `.env.example`
- final demo script
- screenshots
- sprint and Scrum summary
- known limitations list

### Exit Criteria

A new reviewer should be able to answer "what is this project, how do I run it, and how complete is it?" within a few minutes.

---

## Recommended Implementation Order

For a team building from scratch, the safest order is:

1. scope and screen list
2. technical architecture and repo structure
3. Expo and backend skeleton
4. navigation, store, and i18n
5. camera, gallery, and loading
6. backend upload and analyze
7. ingredients review
8. meal suggestions and recipe detail
9. pantry system
10. Ask Fridge AI
11. cooking mode
12. persistence
13. image matching quality
14. testing and stabilization
15. release and delivery preparation

---

## Recommended Working Principle

The main rule for building this project correctly is:

- get the flow working first
- make the state persistent second
- improve the presentation third
- optimize and polish last

The biggest mistakes would be:

- polishing too early
- overbuilding the UI before the AI flow is stable
- keeping pantry, chat, and recipe state too temporary
- skipping testing and verification until the end

---

## Definition of Done

This project should only be considered truly complete when:

- camera flow works on a physical device
- analyze produces ingredients and a recipe
- Ask Fridge chat session persists correctly
- pantry works as persistent user state
- recipe detail and cooking mode flow correctly
- recipe card images are reasonably accurate
- save, reopen, and back flows are not broken
- typecheck is clean
- tests are clean
- verify is clean
- setup and delivery documents are ready

---

## Final Note

The goal of this plan is not to make the team do everything at once.
It is the opposite:

- clarify sequence
- reduce unnecessary zigzags
- stop technical debt from growing too early
- avoid reaching submission week with an unstable core flow

For this project, especially on mobile, the right order has always been:

**first the right flow, then persistence, then quality, then polish.**
