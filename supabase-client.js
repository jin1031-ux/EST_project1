// Supabase CDN 전역 객체(window.supabase)와 앱 클라이언트 이름을 분리합니다.
(function initializeSupabaseClient() {
  const SUPABASE_PROJECT_URL = "https://rntxgksrcsbnkrhdjezm.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mKmFZnGLvYlIoMy6QYE98Q_r6bka2Ba";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.warn("Supabase CDN을 불러오지 못했습니다.");
    return;
  }

  window.menuSupabaseClient = window.supabase.createClient(
    SUPABASE_PROJECT_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );

  if (!document.querySelector('script[src="supabase-auth.js"]')) {
    const authScript = document.createElement("script");
    authScript.src = "supabase-auth.js";
    authScript.async = false;
    document.head.appendChild(authScript);
  }
})();
