// SignInControls.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useAuth } from "../AuthContext";
import "./signInControls.css"; // your styles

export default function SignInControls() {
  const { user, role } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
    // After first sign-in, create /users/<uid> in console and set role:"admin" for your account.
  };

  const openConfirm = () => setShowConfirm(true);
  const closeConfirm = () => {
    if (!isSigningOut) setShowConfirm(false);
  };

  const confirmSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await signOut(auth);
      // Modal will naturally unmount after user becomes null,
      // but we also close it defensively:
      setShowConfirm(false);
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  // Close with Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeConfirm();
    };
    if (showConfirm) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showConfirm]);

  if (!user) {
    return (
      <div className='loggedOut'>
        <p className="signButton" onClick={handleSignIn}>Sign in</p>
      </div>
    );
  }

  return (
    <div className='loggedIn'>
      <span>{user.email} ({role})</span>
      <p className="signButton" onClick={openConfirm}>Sign out</p>

      {/* Confirm Sign Out Modal */}
      {showConfirm && (
        <div
          className="modal"
          style={{ display: "block", zIndex: 1050, background: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signoutTitle"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 id="signoutTitle" className="modal-title">Confirm Sign Out</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeConfirm}
                  disabled={isSigningOut}
                />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to log out?</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeConfirm}
                  disabled={isSigningOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? "Signing out..." : "Yes, log me out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
