// Clé API TMDB et Endpoints
const API_KEY = '83ee83afab7ac546fd886732b4f1d9b9'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const POPULAR_URL = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=fr-FR&page=1`;
const SEARCH_URL = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=fr-FR&query=`;
const GENRES_URL = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=fr-FR`;

// Sélecteurs HTML
const moviesContainer = document.getElementById('movies-container');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const sectionTitle = document.getElementById('section-title');

const btnPopular = document.getElementById('btn-popular');
const btnFavorites = document.getElementById('btn-favorites');
const favCountSpan = document.getElementById('fav-count');

// Éléments de la Modale
const modal = document.getElementById('movie-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalPoster = document.getElementById('modal-poster');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalRating = document.getElementById('modal-rating');
const modalGenres = document.getElementById('modal-genres');
const modalOverview = document.getElementById('modal-overview');

// Stockage Local / Global
let favorites = JSON.parse(localStorage.getItem('tmdb_favorites')) || [];
let genresMap = {};

// Initialisation
init();

async function init() {
  updateFavCount();
  await fetchGenres();
  getMovies(POPULAR_URL, "Films Populaires");
}

// Récupérer le dictionnaire des genres (pour la modale)
async function fetchGenres() {
  try {
    const res = await fetch(GENRES_URL);
    if (res.ok) {
      const data = await res.json();
      data.genres.forEach(g => genresMap[g.id] = g.name);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des genres :", err);
  }
}

// --- NIVEAU 1 : Connexion API, Loader & Gestion d'erreurs ---
async function getMovies(url, title = "") {
  showLoader();
  hideError();
  if (title) sectionTitle.textContent = title;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
    
    const data = await res.json();

    if (data.results.length === 0) {
      showError("Aucun film trouvé pour cette recherche.");
      moviesContainer.innerHTML = '';
    } else {
      displayMovies(data.results);
    }
  } catch (err) {
    console.error("Erreur API :", err);
    showError("Impossible de récupérer les films. Vérifiez votre connexion ou votre clé API.");
    moviesContainer.innerHTML = '';
  } finally {
    hideLoader();
  }
}

// --- NIVEAU 1 & 2 : Affichage DOM & Code Couleur des Notes ---
function displayMovies(movies) {
  moviesContainer.innerHTML = '';

  movies.forEach(movie => {
    const { id, title, poster_path, vote_average, release_date } = movie;
    const isFav = favorites.some(fav => fav.id === id);

    const card = document.createElement('div');
    card.classList.add('movie-card');

    const posterUrl = poster_path 
      ? `${IMAGE_BASE_URL}${poster_path}` 
      : 'https://via.placeholder.com/500x750?text=Image+Non+Disponible';

    const formattedDate = release_date ? formatDate(release_date) : 'Non communiquée';
    const ratingClass = getRatingClass(vote_average);

    card.innerHTML = `
      <div class="poster-container">
        <img src="${posterUrl}" alt="${title}">
        <button class="btn-fav ${isFav ? 'active' : ''}" title="Bascule favori">
          <i class="fa-solid fa-heart"></i>
        </button>
      </div>
      <div class="movie-info">
        <h3>${title}</h3>
        <div class="movie-meta">
          <span>${formattedDate}</span>
          <span class="rating-badge ${ratingClass}">${vote_average ? vote_average.toFixed(1) : 'N/A'}</span>
        </div>
      </div>
    `;

    // Gestion du clic Cœur (Niveau 3)
    const favBtn = card.querySelector('.btn-fav');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Évite d'ouvrir la modale lors du clic sur le cœur
      toggleFavorite(movie);
      favBtn.classList.toggle('active');
    });

    // Clic sur la carte -> Ouverture de la modale (Niveau 3)
    card.addEventListener('click', () => {
      openModal(movie);
    });

    moviesContainer.appendChild(card);
  });
}

// Dynamisation des couleurs des notes (Niveau 2)
function getRatingClass(vote) {
  if (vote >= 7) return 'rating-green';
  if (vote >= 5) return 'rating-orange';
  return 'rating-red';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// --- NIVEAU 2 : Barre de Recherche ---
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const searchTerm = searchInput.value.trim();

  btnPopular.classList.remove('active-tab');
  btnFavorites.classList.remove('active-tab');

  if (searchTerm !== '') {
    getMovies(`${SEARCH_URL}${encodeURIComponent(searchTerm)}`, `Résultats pour : "${searchTerm}"`);
  } else {
    getMovies(POPULAR_URL, "Films Populaires");
    btnPopular.classList.add('active-tab');
  }
});

// Onglet Populaires
btnPopular.addEventListener('click', () => {
  btnPopular.classList.add('active-tab');
  btnFavorites.classList.remove('active-tab');
  searchInput.value = '';
  getMovies(POPULAR_URL, "Films Populaires");
});

// Onglet Favoris
btnFavorites.addEventListener('click', () => {
  btnFavorites.classList.add('active-tab');
  btnPopular.classList.remove('active-tab');
  searchInput.value = '';
  displayFavorites();
});

// --- NIVEAU 3 : Modale de Détails ---
function openModal(movie) {
  const posterUrl = movie.poster_path 
    ? `${IMAGE_BASE_URL}${movie.poster_path}` 
    : 'https://via.placeholder.com/500x750?text=Image+Non+Disponible';

  modalPoster.src = posterUrl;
  modalTitle.textContent = movie.title;
  modalDate.textContent = `Sortie : ${movie.release_date ? formatDate(movie.release_date) : 'Inconnue'}`;
  
  modalRating.textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  modalRating.className = `badge rating-badge ${getRatingClass(movie.vote_average)}`;

  // Intégration des tags de genres
  modalGenres.innerHTML = '';
  if (movie.genre_ids && movie.genre_ids.length > 0) {
    movie.genre_ids.forEach(id => {
      const tag = document.createElement('span');
      tag.classList.add('genre-tag');
      tag.textContent = genresMap[id] || 'Genre';
      modalGenres.appendChild(tag);
    });
  }

  modalOverview.textContent = movie.overview || "Aucun synopsis disponible pour ce film.";

  modal.classList.remove('hidden');
}

closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

// --- NIVEAU 3 : Favoris & localStorage ---
function toggleFavorite(movie) {
  const index = favorites.findIndex(fav => fav.id === movie.id);

  if (index === -1) {
    favorites.push(movie);
  } else {
    favorites.splice(index, 1);
  }

  localStorage.setItem('tmdb_favorites', JSON.stringify(favorites));
  updateFavCount();

  if (btnFavorites.classList.contains('active-tab')) {
    displayFavorites();
  }
}

function displayFavorites() {
  sectionTitle.textContent = "Mes Films Favoris";
  hideError();

  if (favorites.length === 0) {
    moviesContainer.innerHTML = '';
    showError("Vous n'avez aucun film enregistré dans vos favoris.");
  } else {
    displayMovies(favorites);
  }
}

function updateFavCount() {
  favCountSpan.textContent = favorites.length;
}

// Utilitaires États d'affichage
function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }
function showError(msg) { errorMessage.textContent = msg; errorMessage.classList.remove('hidden'); }
function hideError() { errorMessage.textContent = ''; errorMessage.classList.add('hidden'); }