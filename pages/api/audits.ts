import type { NextApiRequest, NextApiResponse } from "next";
import { PersistedAuditRecord } from "@/types/circadian";

type ApiResponse =
  | { configured: false; audits: []; error?: string }
  | { configured: true; audits: PersistedAuditRecord[]; error?: string }
  | { configured: true; audit: PersistedAuditRecord; error?: string }
  | { configured: true; error: string }
  | { configured: false; error: string };

type SupabaseAuditRow = {
  id: string;
  client_id: string;
  created_at: string;
  answers: PersistedAuditRecord["answers"];
  scores: PersistedAuditRecord["scores"];
  insight: PersistedAuditRecord["insight"];
  protocol: PersistedAuditRecord["protocol"];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUDITS_TABLE = process.env.SUPABASE_AUDITS_TABLE ?? "circadian_audits";

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function toAuditRecord(row: SupabaseAuditRow): PersistedAuditRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    createdAt: row.created_at,
    answers: row.answers,
    scores: row.scores,
    insight: row.insight,
    protocol: row.protocol,
  };
}

function toSupabaseRow(record: PersistedAuditRecord) {
  return {
    id: record.id,
    client_id: record.clientId,
    answers: record.answers,
    scores: record.scores,
    insight: record.insight,
    protocol: record.protocol,
  };
}

async function supabaseRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY ?? "",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Supabase request failed.");
  }

  return (await response.json()) as T;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (!isConfigured()) {
    res.status(200).json({ configured: false, audits: [] });
    return;
  }

  try {
    if (req.method === "GET") {
      const clientId = req.query.clientId;
      const limit = Number(req.query.limit ?? 6);

      if (typeof clientId !== "string" || clientId.length === 0) {
        res.status(400).json({ configured: true, error: "clientId is required." });
        return;
      }

      const searchParams = new URLSearchParams({
        select: "id,client_id,created_at,answers,scores,insight,protocol",
        client_id: `eq.${clientId}`,
        order: "created_at.desc",
        limit: String(limit),
      });

      const rows = await supabaseRequest<SupabaseAuditRow[]>(
        `${AUDITS_TABLE}?${searchParams.toString()}`,
      );

      res.status(200).json({
        configured: true,
        audits: rows.map(toAuditRecord),
      });
      return;
    }

    if (req.method === "POST") {
      const record = req.body?.record as PersistedAuditRecord | undefined;

      if (!record?.clientId || !record.answers || !record.scores || !record.insight || !record.protocol) {
        res.status(400).json({ configured: true, error: "A complete audit record is required." });
        return;
      }

      const rows = await supabaseRequest<SupabaseAuditRow[]>(
        `${AUDITS_TABLE}?select=id,client_id,created_at,answers,scores,insight,protocol`,
        {
          method: "POST",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify([toSupabaseRow(record)]),
        },
      );

      res.status(200).json({
        configured: true,
        audit: toAuditRecord(rows[0]),
      });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ configured: true, error: "Method not allowed." });
  } catch (error) {
    res.status(500).json({
      configured: true,
      error: error instanceof Error ? error.message : "Unknown persistence error.",
    });
  }
}
