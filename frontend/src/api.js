const BASE_URL = "http://localhost:5000/api";

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
};
