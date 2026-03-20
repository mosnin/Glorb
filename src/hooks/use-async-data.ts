"use client";

import { useState, useEffect, useCallback } from "react";

interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching data from an API endpoint with loading/error states
 * and automatic retry support.
 */
export function useAsyncData<T>(
  url: string | null,
  options?: { deps?: unknown[]; transform?: (raw: unknown) => T }
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const depsKey = JSON.stringify(options?.deps || []);

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      setData(options?.transform ? options.transform(json) : json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, retryCount, depsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { data, loading, error, refetch };
}

/**
 * Fetch multiple URLs in parallel with combined loading/error states.
 */
export function useParallelData<T extends Record<string, unknown>>(
  urls: Record<keyof T, string | null>
): {
  data: { [K in keyof T]: T[K] | null };
  loading: boolean;
  errors: { [K in keyof T]?: string };
  refetch: () => void;
} {
  const keys = Object.keys(urls) as (keyof T)[];
  const [data, setData] = useState<{ [K in keyof T]: T[K] | null }>(
    () => Object.fromEntries(keys.map((k) => [k, null])) as { [K in keyof T]: T[K] | null }
  );
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ [K in keyof T]?: string }>({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setErrors({});

    const urlEntries = keys.map((key) => [key, urls[key]] as const);

    Promise.allSettled(
      urlEntries.map(async ([key, url]) => {
        if (!url) return { key, data: null };
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw { key, message: body.error || `Request failed (${res.status})` };
        }
        return { key, data: await res.json() };
      })
    ).then((results) => {
      const newData = { ...data };
      const newErrors: { [K in keyof T]?: string } = {};

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { key, data: value } = result.value as { key: keyof T; data: T[keyof T] };
          newData[key] = value;
        } else {
          const err = result.reason as { key: keyof T; message: string };
          newErrors[err.key] = err.message;
        }
      }

      setData(newData);
      setErrors(newErrors);
      setLoading(false);
    });
  }, [retryCount]);

  const refetch = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { data, loading, errors, refetch };
}
