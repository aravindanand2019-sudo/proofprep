"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorAlert } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/client/api";
import { ROLE_SUGGESTIONS } from "@/lib/onboarding";
import { MAX_TARGET_COMPANIES } from "@/lib/schemas";

type Values = {
  name: string;
  email: string;
  targetRole: string;
  targetCompanies: string[];
  placementDate: string;
  hoursPerDay: number;
};

export function ProfileForm({
  companies,
  initial,
}: {
  companies: Array<{ id: string; name: string }>;
  initial: Values;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSaved(false);
    setV((cur) => {
      const has = cur.targetCompanies.includes(id);
      if (!has && cur.targetCompanies.length >= MAX_TARGET_COMPANIES) return cur;
      return {
        ...cur,
        targetCompanies: has
          ? cur.targetCompanies.filter((c) => c !== id)
          : [...cur.targetCompanies, id],
      };
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: {
          name: v.name,
          targetRole: v.targetRole,
          targetCompanies: v.targetCompanies,
          placementDate: v.placementDate,
          hoursPerDay: v.hoursPerDay,
        },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={v.email} disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Target role</Label>
        <Input
          id="role"
          list="roles"
          value={v.targetRole}
          onChange={(e) => setV({ ...v, targetRole: e.target.value })}
        />
        <datalist id="roles">
          {ROLE_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          Target companies (up to {MAX_TARGET_COMPANIES})
        </legend>
        <div className="flex flex-wrap gap-2">
          {companies.map((c) => {
            const on = v.targetCompanies.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="date">Placement date</Label>
          <Input
            id="date"
            type="date"
            value={v.placementDate}
            onChange={(e) => setV({ ...v, placementDate: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hours">Hours per day</Label>
          <Input
            id="hours"
            type="number"
            min={0.5}
            max={16}
            step={0.5}
            value={v.hoursPerDay}
            onChange={(e) => setV({ ...v, hoursPerDay: Number(e.target.value) })}
          />
        </div>
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
