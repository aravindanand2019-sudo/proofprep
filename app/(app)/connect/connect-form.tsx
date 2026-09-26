"use client";

import { useState, type FormEvent } from "react";
import { ErrorAlert } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/client/api";

type Links = { github: string; linkedin: string; leetcode: string };

const FIELDS: Array<[keyof Links, string, string]> = [
  ["github", "GitHub", "https://github.com/your-name"],
  ["linkedin", "LinkedIn", "https://linkedin.com/in/your-name"],
  ["leetcode", "LeetCode", "https://leetcode.com/u/your-name"],
];

export function ConnectForm({
  initial,
  resumePath,
}: {
  initial: Links;
  resumePath: string | null;
}) {
  const [links, setLinks] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [path, setPath] = useState(resumePath);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function saveLinks(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLinkErr(null);
    setLinkMsg(null);
    try {
      await api("/api/connect", { method: "PUT", body: links });
      setLinkMsg("Saved");
    } catch (err) {
      setLinkErr(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await api<{ storagePath: string }>("/api/connect/resume", { form });
      setPath(res.storagePath);
    } catch (err) {
      setUploadErr(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
          <CardDescription>Only the URLs are stored.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveLinks} className="flex flex-col gap-4">
            {FIELDS.map(([key, label, placeholder]) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={links[key]}
                  placeholder={placeholder}
                  onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                />
              </div>
            ))}
            {linkErr && <ErrorAlert message={linkErr} />}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save links"}
              </Button>
              {linkMsg && <span className="text-sm text-emerald-600">{linkMsg}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>
            PDF, up to 5 MB. Stored in Firebase Storage; only its path is saved. To extract your
            projects and claims, use Projects → Import from resume.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {uploadErr && <ErrorAlert message={uploadErr} onRetry={upload} />}
          <div className="flex items-center gap-3">
            <Button onClick={upload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload resume"}
            </Button>
            {path && <span className="text-muted-foreground truncate text-sm">Saved: {path}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
