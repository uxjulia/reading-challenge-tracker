export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {
      // Ignore body parse failures.
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export function formatDate(dateText) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-");
  return `${month}/${day}/${year}`;
}

export function titleInitials(title = "") {
  return title.slice(0, 2).toUpperCase();
}
