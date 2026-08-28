/**
 * Firebase stub — project uses Supabase, not Firebase.
 * Keeps existing <script src="firebase.js"> tags from erroring.
 */
(function () {
  const FirebaseService = {
    enabled: false,
    async init() { return false; },
    async signOut() {
      localStorage.removeItem('mm_session');
      localStorage.removeItem('ipa_user');
    }
  };
  window.FirebaseService = FirebaseService;
})();
