const PREF_KEY = "nexus_prefs";

export const preferencesStorage = {
  get() {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : {};
  },
  set(prefs) {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }
};
