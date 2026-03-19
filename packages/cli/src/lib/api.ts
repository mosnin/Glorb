import * as https from "node:https";
import * as http from "node:http";
import { readConfig } from "./config.js";

const DEFAULT_URL = "https://glorb.vercel.app";

export function getApiUrl(): string {
  const config = readConfig();
  return config.api_url || DEFAULT_URL;
}

export function getApiKey(): string {
  const config = readConfig();
  if (!config.api_key) {
    throw new Error("Not authenticated. Run: glorb login <api-key>");
  }
  return config.api_key;
}

export function apiGet(path: string): Promise<{ status: number; data: unknown }> {
  const baseUrl = getApiUrl();
  const apiKey = getApiKey();
  const url = new URL(`/api/v1${path}`, baseUrl);

  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(
      url.toString(),
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 0, data: body });
          }
        });
      }
    );
    req.on("error", reject);
  });
}

export function apiPost(apiPath: string, body: unknown): Promise<{ status: number; data: unknown }> {
  const baseUrl = getApiUrl();
  const apiKey = getApiKey();
  const url = new URL(`/api/v1${apiPath}`, baseUrl);
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url.toString(),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload).toString(),
        },
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk: Buffer) => (respBody += chunk.toString()));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(respBody) });
          } catch {
            resolve({ status: res.statusCode || 0, data: respBody });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export function apiGetBuffer(apiPath: string): Promise<{ status: number; data: Buffer }> {
  const baseUrl = getApiUrl();
  const apiKey = getApiKey();
  const url = new URL(`/api/v1${apiPath}`, baseUrl);

  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(
      url.toString(),
      { headers: { Authorization: `Bearer ${apiKey}` } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, data: Buffer.concat(chunks) });
        });
      }
    );
    req.on("error", reject);
  });
}
