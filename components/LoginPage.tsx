"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function UnauthorizedModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          width: "100%",
          maxWidth: 380,
          overflow: "hidden",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Red top bar */}
        <div style={{
          background: "linear-gradient(135deg, #dc2626, #b91c1c)",
          padding: "28px 32px 24px",
          textAlign: "center",
        }}>
          <div style={{
            width: 60, height: 60,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            fontSize: 28,
          }}>⛔</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>
            Access Denied
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px 24px", textAlign: "center" }}>
          <p style={{
            color: "#1e293b", fontSize: 15, fontWeight: 600,
            margin: "0 0 8px",
          }}>
            Your account is not authorized for this dashboard.
          </p>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
            Please contact your administrator to request access.
          </p>
          <button
            onClick={onClose}
            style={{
              background: "#1a2744",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 32px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            OK
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();

  // NextAuth redirects back with ?error=AccessDenied when signIn() returns false
  const urlError = searchParams.get("error");
  // Show modal immediately if the URL already carries the error (e.g. after redirect)
  const initialUnauthorized = urlError === "AccessDenied";
  const [modalVisible, setModalVisible] = useState(initialUnauthorized);

  async function handleGoogle() {
    setLoading(true);
    const res = await signIn("google", { redirect: false, callbackUrl: "/" });
    if (res?.error) {
      setModalVisible(true);
      setLoading(false);
    }
    // On success NextAuth redirects automatically
  }

  return (
    <>
      {modalVisible && <UnauthorizedModal onClose={() => setModalVisible(false)} />}

      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a2744 0%, #2e3f80 50%, #1a2744 100%)",
        padding: 20,
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1a2744, #2563eb)",
            padding: "40px 40px 32px",
            textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
              fontSize: 32,
            }}>🏗️</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 21, letterSpacing: 0.3 }}>
              Homeland Global Park
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 5 }}>
              Project Dashboard · Homeland Group
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "36px 40px 40px", textAlign: "center" }}>
            <p style={{
              color: "#64748b", fontSize: 14, marginBottom: 28, lineHeight: 1.6,
            }}>
              Sign in with your authorised Google account to access the dashboard.
            </p>

            {/* Google Sign-In button */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f2",
                background: loading ? "#f8fafc" : "#fff",
                color: "#1e293b",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.2s, border-color 0.2s",
              }}
              onMouseEnter={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e8";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f2";
              }}
            >
              {!loading ? (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              ) : (
                <span style={{ fontSize: 18 }}>⏳</span>
              )}
              {loading ? "Signing in…" : "Continue with Google"}
            </button>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: "1px solid #f1f5f9",
            padding: "14px 40px",
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
          }}>
            © {new Date().getFullYear()} Homeland Group · Authorised access only
          </div>
        </div>
      </div>
    </>
  );
}

// useSearchParams requires a Suspense boundary in Next.js 13+
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
