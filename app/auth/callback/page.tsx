"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Auth callback page: Processing OAuth response");

        // Check if we have tokens in the URL hash
        const hash = window.location.hash;
        if (hash) {
          console.log("Auth callback page: Found hash, processing tokens");
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            console.log("Auth callback page: Setting session from tokens");

            const { data, error: setSessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (setSessionError) {
              console.error(
                "Auth callback page: Error setting session:",
                setSessionError
              );
              setError("Failed to establish session");
              setLoading(false);
              return;
            }

            if (data.session) {
              console.log(
                "Auth callback page: Session established successfully for user:",
                data.user?.email
              );
              // Clear the hash from the URL
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );

              // Wait a moment for cookies to be set
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Redirect to dashboard using window.location for more reliability
              window.location.href = "/dashboard";
              return;
            }
          }
        }

        // Check if we have a code parameter
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
          console.log("Auth callback page: Found code, exchanging for session");

          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "Auth callback page: Error exchanging code:",
              exchangeError
            );
            setError("Failed to exchange authorization code");
            setLoading(false);
            return;
          }

          if (data.session) {
            console.log(
              "Auth callback page: Session established from code for user:",
              data.user?.email
            );

            // Wait a moment for cookies to be set
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Redirect to dashboard using window.location for more reliability
            window.location.href = "/dashboard";
            return;
          }
        }

        // No valid tokens or code found
        console.error("Auth callback page: No valid tokens or code found");
        setError("No valid authentication data found");
        setLoading(false);
      } catch (err) {
        console.error("Auth callback page: Unexpected error:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we set up your session
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Authentication Failed</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
