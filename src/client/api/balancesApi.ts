import type { Balance, LteSchedule } from "../types/sourceBalanceTypes";

export async function getBalanceIds(): Promise<string[]> {
  return getJson<string[]>("/api/balances");
}

export async function getBalance(balanceId: string): Promise<Balance> {
  return getJson<Balance>(`/api/balances/${balanceId}`);
}

export async function getSchedule(): Promise<LteSchedule> {
  return getJson<LteSchedule>("/api/schedule");
}

export async function getLocalization(): Promise<string> {
  const response = await fetch("/api/localization");

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  return response.text();
}

export async function getSave(
  platform: "ios" | "android",
  deviceId: string,
): Promise<unknown> {
  return getJson<unknown>("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, deviceId }),
  });
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `${String(response.status)} ${errorData?.detail || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}
