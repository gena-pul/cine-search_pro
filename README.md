# Cine-Search Pro
A production-grade movie search dashboard built with Vanilla JS, HTML, and CSS.

## Features
- *Debounced Searching:* Prevents excessive API calls.
- *Abort Pattern:* Cancels in-flight requests using AbortController.
- *Performance:* Uses DocumentFragment and <template> for DOM rendering.
- *Resilient Fetching:* Concurrent data retrieval using Promise.allSettled.
- *XSS Hardened:* Zero usage of innerHTML with user-controlled input.

## Getting Started
1. Clone the repo.
2. Get an API Key from [TMDB](https://www.themoviedb.org/).
3. Open index.html in your browser.