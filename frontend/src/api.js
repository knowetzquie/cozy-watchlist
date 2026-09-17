const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  `${window.location.protocol}//${window.location.hostname}:5000`;
const BASE_URL = `${API_ORIGIN}/api`;
const detailsCache = new Map();
async function handle(response) {
  if (!response.ok) {
    let message = "Something went wrong talking to the server.";
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors, keep default message
    }
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  list(status) {
    const query =
      status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return fetch(`${BASE_URL}/items${query}`).then(handle);
  },

  create(item) {
    return fetch(`${BASE_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).then(handle);
  },

  update(id, changes) {
    return fetch(`${BASE_URL}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }).then(handle);
  },

  remove(id) {
    return fetch(`${BASE_URL}/items/${id}`, { method: "DELETE" }).then(handle);
  },

  searchTitles(query) {
    return fetch(
      `${BASE_URL}/search-titles?q=${encodeURIComponent(query)}`,
    ).then(handle);
  },

  getTitleDetails(tmdbId, mediaType) {
    const key = `${tmdbId}:${mediaType || "movie"}`;
    if (detailsCache.has(key)) {
      return Promise.resolve(detailsCache.get(key));
    }
    return fetch(
      `${BASE_URL}/title-details/${tmdbId}?media_type=${encodeURIComponent(mediaType || "movie")}`,
    )
      .then(handle)
      .then((data) => {
        detailsCache.set(key, data);
        return data;
      });
  },

  getProfile() {
    return fetch(`${BASE_URL}/profile`).then(handle);
  },

  getProfileTalent() {
    return fetch(`${BASE_URL}/profile/talent`).then(handle);
  },

  updateProfile(changes) {
    return fetch(`${BASE_URL}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }).then(handle);
  },
};
