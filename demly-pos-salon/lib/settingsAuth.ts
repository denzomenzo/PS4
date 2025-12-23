import { supabase } from "./supabaseClient";
import crypto from "crypto";

export async function requestSettingsAccess(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get user's email from license
    const { data: license } = await supabase
      .from("licenses")
      .select("email")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!license || license.email !== email) {
      return { success: false, error: "Email doesn't match license holder" };
    }

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await supabase.from("settings_access").insert({
      user_id: user.id,
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
    });

    // Send email with code
    await supabase.functions.invoke("send-verification-email", {
      body: {
        email: email,
        code: verificationCode,
        type: "settings_access",
      },
    });

    // Store verification code temporarily (in production, use Redis or similar)
    sessionStorage.setItem(`settings_verification_${accessToken}`, verificationCode);
    sessionStorage.setItem("settings_access_token", accessToken);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifySettingsAccess(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = sessionStorage.getItem("settings_access_token");
    if (!accessToken) {
      return { success: false, error: "No access request found" };
    }

    const storedCode = sessionStorage.getItem(`settings_verification_${accessToken}`);
    if (storedCode !== code) {
      return { success: false, error: "Invalid verification code" };
    }

    // Verify token is still valid
    const { data: access } = await supabase
      .from("settings_access")
      .select("*")
      .eq("access_token", accessToken)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!access) {
      return { success: false, error: "Access token expired or invalid" };
    }

    // Store in localStorage with expiration
    localStorage.setItem("settings_access", JSON.stringify({
      token: accessToken,
      expiresAt: access.expires_at,
    }));

    // Log the access
    await logAuditAction({
      action: "SETTINGS_ACCESS_GRANTED",
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function hasSettingsAccess(): boolean {
  try {
    const stored = localStorage.getItem("settings_access");
    if (!stored) return false;

    const { expiresAt } = JSON.parse(stored);
    return new Date(expiresAt) > new Date();
  } catch {
    return false;
  }
}

export function clearSettingsAccess() {
  localStorage.removeItem("settings_access");
  sessionStorage.removeItem("settings_access_token");
}