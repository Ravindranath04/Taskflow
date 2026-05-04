// src/api/client.js
// Central axios instance — handles base URL, auth headers, token refresh

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Simple fetch wrapper with auth + auto token refresh
class ApiClient {
  constructor() {
    this.baseURL = BASE_URL;
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
    this._refreshPromise = null;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  async _refresh() {
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = fetch(`${this.baseURL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.accessToken) {
          this.setTokens(data.accessToken, data.refreshToken);
          return data.accessToken;
        }
        this.clearTokens();
        window.location.href = "/";
        throw new Error("Session expired");
      })
      .finally(() => { this._refreshPromise = null; });
    return this._refreshPromise;
  }

  async request(method, path, body = null, retry = true) {
    const headers = { "Content-Type": "application/json" };
    if (this.accessToken) headers["Authorization"] = `Bearer ${this.accessToken}`;

    const res = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    // Token expired — try refresh once
    if (res.status === 401 && retry && this.refreshToken) {
      await this._refresh();
      return this.request(method, path, body, false);
    }

    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status, data });
    return data;
  }

  get   (path)        { return this.request("GET",    path); }
  post  (path, body)  { return this.request("POST",   path, body); }
  patch (path, body)  { return this.request("PATCH",  path, body); }
  delete(path)        { return this.request("DELETE", path); }
}

export const api = new ApiClient();