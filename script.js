// State management
const cache = new Map();
let abortController = null;
let debounceTimer = null;

const input = document.getElementById('search-input');
const list = document.getElementById('result-list');
const container = document.getElementById('results-container');
const template = document.getElementById('result-template');

const API_KEY = "3282da21e0f6a28905f7f0d03db5a110";

// Safety check for DOM elements
if (!input || !list || !container || !template) {
  console.error("Required DOM elements not found");
}

// Security: XSS-Safe Highlighter
function buildHighlightedTitle(title, query) {
    const span = document.createElement('span');
    if (!query) {
      span.textContent = title;
      return span;
    }

    const idx = title.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) {
      span.textContent = title;
      return span;
    }

    span.appendChild(document.createTextNode(title.slice(0, idx)));

    const match = document.createElement('span');
    match.className = 'highlight';
    match.textContent = title.slice(idx, idx + query.length);

    span.appendChild(match);

    span.appendChild(
      document.createTextNode(title.slice(idx + query.length))
    );
    return span;
}

// Requirement: Debounce (300ms delay)
input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (!query) {
      list.innerHTML = '';
      return;
    }
    debounceTimer = setTimeout(() => performSearch(query), 300);
});

// Requirement: Async fetch with AbortController
async function performSearch(query) {

    // 1. Check Cache
    if (cache.has(query)) {
      renderResults(cache.get(query), query);
      return;
    }

    // 2. Abort old request
    if (abortController) abortController.abort();
    abortController = new AbortController();

    // 3. UI State (Show Spinner)
    container.dataset.loading = 'true';

    try {
        const url =
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        const response = await fetch(url, {
          signal: abortController.signal
        });

        if (!response.ok) throw new Error("Network response failed");
        const data = await response.json();
        cache.set(query, data.results || []);
        renderResults(data.results || [], query);
    }

    catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
    finally {
        container.dataset.loading = 'false';
    }
}

// Requirement: Fragment Pattern

function renderResults(movies, query) {

    list.innerHTML = '';
    const frag = new DocumentFragment();
    movies.forEach(movie => {
      const clone = template.content.cloneNode(true);
      const poster = clone.querySelector('.result-poster');

      // Populate Image
      if (movie.poster_path) {
        poster.src =
        `https://image.tmdb.org/t/p/w92/${movie.poster_path}`;
        } else {
        // Transparent placeholder
          poster.src =
          'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        }

        clone
        .querySelector('.title-container')
        .appendChild(
            buildHighlightedTitle(movie.title, query)
        );

        clone
        .querySelector('.result-meta')
        .textContent =
        ` (${movie.release_date?.slice(0,4) || 'N/A'})`;
        frag.appendChild(clone);
    });

    // Only one DOM update
    list.appendChild(frag);

}