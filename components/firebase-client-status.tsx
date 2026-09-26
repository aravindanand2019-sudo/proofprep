"use client";

import { FirebaseError } from "firebase/app";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StatusRow, type Status } from "@/components/status-row";
import { getClientDb } from "@/lib/firebase/client";

type ClientCheck = { status: Status; detail: string };

async function checkClient(): Promise<ClientCheck> {
  try {
    const snapshot = await getDocs(query(collection(getClientDb(), "companies"), limit(1)));
    return {
      status: "ok",
      detail: `Connected. Read ${snapshot.size} document(s) from "companies".`,
    };
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      return {
        status: "warn",
        detail: "Reached Firestore, but security rules denied the read. Publish firestore.rules.",
      };
    }
    return { status: "error", detail: error instanceof Error ? error.message : String(error) };
  }
}

export function FirebaseClientStatus() {
  const [check, setCheck] = useState<ClientCheck>({ status: "checking", detail: "Checking..." });

  useEffect(() => {
    let cancelled = false;
    checkClient().then((result) => {
      if (!cancelled) setCheck(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <StatusRow label="Firebase client SDK (browser)" {...check} />;
}
