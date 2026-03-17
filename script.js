class SearchComponent {
  constructor() {
    this.cache = new Map();
    this.abortController = null;
    this.debounceTimer = null;
    this.input = document.getElementById('search-input');
    this.list = document.getElementById('result-list');
    this.searchWrap = document.getElementById('results-container');
    this.template = document.getElementById('result-template');
    this.API_KEY = "3282da21e0f6a28905f7f0d03db5a110"; 

    this.init();
  }

  init() {
    console.log("Component Initialized");
    this.input.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });
  }

  handleInput(query) {
    clearTimeout(this.debounceTimer);
    const q = query.trim();
    if (!q) {
      this.clearResults();
      return;
    }
    this.debounceTimer = setTimeout(() => this.performSearch(q), 300);
  }

  async performSearch(query) {
    console.log("Attempting search for:", query);

    if (this.cache.has(query)) {
      console.log("Found in cache");
      this.searchWrap.dataset.loading = 'false';
      this.renderResults(this.cache.get(query), "CACHE HIT");
      return;
    }

    if (this.abortController) {
      console.log("Aborting previous request");
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.searchWrap.dataset.loading = 'true';

    try {
      const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${this.API_KEY}`;
      console.log("Fetching URL:", url);
      
      const response = await fetch(url, { signal: this.abortController.signal });
      
      if (!response.ok) throw new Error("Network failed");
      
      const data = await response.json();
      const movies = data.results || [];

      console.log("API returned", movies.length, "results");
      this.cache.set(query, movies);
      this.renderResults(movies, "NETWORK");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
      }
    } finally {
      this.searchWrap.dataset.loading = 'false';
    }
  }

  renderResults(movies, source) {
    console.log("Rendering", movies.length, "results");
    const frag = new DocumentFragment();
    movies.forEach(movie => {
      const clone = this.template.content.cloneNode(true);
      const title = clone.querySelector('.result-title');
      if (title) title.textContent = movie.title || "Untitled";
      frag.appendChild(clone);
    });

    this.list.innerHTML = '';
    this.list.appendChild(frag);
  }

  clearResults() {
    this.list.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => new SearchComponent());