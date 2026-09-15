"use client";

import { useEffect } from "react";
import { onExtensionSignOutRequest, signOut } from "../lib/verbia-auth";

// The extension can sign out while the visitor is on any page of this site, and
// that sign-out is one state shared by both surfaces — so every page has to
// answer it, not just the account page. Without this, the header keeps offering
// an account the extension has already ended, because the page it sits on never
// learns that anything happened.
export function SessionWatch() {
  useEffect(() => onExtensionSignOutRequest(() => { void signOut(); }), []);
  return null;
}
