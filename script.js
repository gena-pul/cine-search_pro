// STATE
const cache = new Map();
let abortController = null;
let debounceTimer = null;
let currentResults = [];
let currentIndex = -1;

// ----------------------------
// DOM ELEMENTS
// ----------------------------
const input = document.getElementById("search-input");
const list = document.getElementById("result-list");
const container = document.getElementById("results-container");
const template = document.getElementById("result-template");
const detailsPanel = document.getElementById("movie-details");

const API_KEY = "3282da21e0f6a28905f7f0d03db5a110";

// ----------------------------
// XSS SAFE HIGHLIGHT
// ----------------------------
function buildHighlightedTitle(title, query) {
  const span = document.createElement("span");
  if (!query) {
    span.textContent = title;
    return span;
  }

  const index = title.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    span.textContent = title;
    return span;
  }

  span.appendChild(document.createTextNode(title.slice(0, index)));

  const match = document.createElement("span");
  match.className = "highlight";
  match.textContent = title.slice(index, index + query.length);

  span.appendChild(match);
  span.appendChild(
    document.createTextNode(title.slice(index + query.length))
  );
  return span;
}

// ----------------------------
// SEARCH INPUT (DEBOUNCE)
// ----------------------------
input.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  const query = e.target.value.trim();
  if (!query) {
    list.innerHTML = "";
    return;
  }
  debounceTimer = setTimeout(() => {
    performSearch(query);
  }, 300);
});

// ----------------------------
// SEARCH REQUEST
// ----------------------------
async function performSearch(query) {
  if (cache.has(query)) {
    renderResults(cache.get(query), query);
    return;
  }

  if (abortController) abortController.abort();
  abortController = new AbortController();
  container.dataset.loading = "true";

  try {
    const url =
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${API_KEY}`;

    const response = await fetch(url, { signal: abortController.signal });
    const data = await response.json();
    cache.set(query, data.results || []);
    renderResults(data.results || [], query);
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
    }
  } finally {
    container.dataset.loading = "false";
  }
}

// ----------------------------
// RENDER SEARCH RESULTS
// ----------------------------
function renderResults(movies, query) {
  list.innerHTML = "";
  currentResults = movies;
  currentIndex = -1;
  const fragment = new DocumentFragment();

  movies.forEach((movie) => {
    const clone = template.content.cloneNode(true);
    const poster = clone.querySelector(".result-poster");
    if (movie.poster_path) {
      poster.src =
        `https://image.tmdb.org/t/p/w92/${movie.poster_path}`;
    }

    const titleContainer = clone.querySelector(".title-container");
    titleContainer.appendChild(
      buildHighlightedTitle(movie.title, query)
    );

    const meta = clone.querySelector(".result-meta");
    meta.textContent =
      `(${movie.release_date?.slice(0, 4) || "N/A"})`;
    fragment.appendChild(clone);
  });
  list.appendChild(fragment);
}

// ----------------------------
// KEYBOARD NAVIGATION
// ----------------------------
document.addEventListener("keydown", (e) => {
  const items = list.querySelectorAll(".movie-item");
  if (!items.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    currentIndex = (currentIndex + 1) % items.length;
    updateSelection(items);
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    updateSelection(items);
  }

  if (e.key === "Enter" && currentIndex >= 0) {
    showDetails(currentResults[currentIndex]);
  }
});

// ----------------------------
// UPDATE SELECTED RESULT
// ----------------------------
function updateSelection(items) {
  items.forEach((item) => {
    item.classList.remove("selected");
  });
  const selected = items[currentIndex];

  if (selected) {
    selected.classList.add("selected");
    selected.scrollIntoView({ block: "nearest" });
  }
}

// ----------------------------
// CLICK SELECTION
// ----------------------------
list.addEventListener("click", (e) => {
  const item = e.target.closest(".movie-item");
  if (!item) return;

  const items = Array.from(list.children);
  currentIndex = items.indexOf(item);
  updateSelection(items);
  showDetails(currentResults[currentIndex]);
});

// ----------------------------
// PART 2: CONCURRENT FETCHING
// ----------------------------
async function showDetails(movie) {
  detailsPanel.textContent = "Loading movie details...";
  const movieId = movie.id;
  const endpoints = [
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`,
    `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`,
    `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}`
  ];

  const results = await Promise.allSettled(
    endpoints.map(url => fetch(url).then(r => r.json()))
  );
  renderMovieDetails(results);
}

// ----------------------------
// RENDER DETAILS SAFELY
// ----------------------------
function renderMovieDetails(results) {
  detailsPanel.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "Movie Information";
  detailsPanel.appendChild(title);

  // DETAILS
  if (results[0].status === "fulfilled") {
    const movie = results[0].value;
    const info = document.createElement("p");
    info.textContent =
      `${movie.title} (${movie.release_date?.slice(0, 4) || "N/A"})`;
    detailsPanel.appendChild(info);
    const overview = document.createElement("p");
    overview.textContent = movie.overview || "No overview available.";
    detailsPanel.appendChild(overview);
  }

  // CREDITS
  if (results[1].status === "fulfilled") {
    const cast = results[1].value.cast.slice(0, 3);
    const castTitle = document.createElement("h4");
    castTitle.textContent = "Main Cast";
    detailsPanel.appendChild(castTitle);
    cast.forEach(actor => {
      const actorEl = document.createElement("p");
      actorEl.textContent = actor.name;
      detailsPanel.appendChild(actorEl);
    });
  }

  // VIDEOS
  if (results[2].status === "fulfilled") {
    const videos = results[2].value.results;
    const trailer = videos.find(v => v.type === "Trailer");
    if (trailer) {
      const link = document.createElement("a");
      link.textContent = "Watch Trailer";
      link.href = `https://www.youtube.com/watch?v=${trailer.key}`;
      link.target = "_blank";
      link.className = "trailer-button";
      detailsPanel.appendChild(link);
    }
  }
}