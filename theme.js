/**
 * VoiceGuard Advanced Theme Customization Engine
 * ===============================================
 * Handles Light/Dark/System theme modes, 6 premium accent colors,
 * live theme preview, instant transition without refresh,
 * localStorage guest persistence, and Supabase user_preferences sync.
 */
(function() {
    'use strict';

    var STORAGE_KEY = 'voiceguard_theme_prefs';

    var ACCENTS = {
        indigo: { id: 'indigo', name: 'Indigo', hex: '#4F46E5', hover: '#4338CA', threeHex: 0x4F46E5 },
        blue:   { id: 'blue',   name: 'Blue',   hex: '#2563EB', hover: '#1D4ED8', threeHex: 0x2563EB },
        purple: { id: 'purple', name: 'Purple', hex: '#9333EA', hover: '#7E22CE', threeHex: 0x9333EA },
        emerald:{ id: 'emerald',name: 'Emerald',hex: '#059669', hover: '#047857', threeHex: 0x059669 },
        amber:  { id: 'amber',  name: 'Amber',  hex: '#D97706', hover: '#B45309', threeHex: 0xD97706 },
        rose:   { id: 'rose',   name: 'Rose',   hex: '#E11D48', hover: '#BE123C', threeHex: 0xE11D48 }
    };

    var state = {
        mode: 'dark',        // 'light' | 'dark' | 'system'
        accent: 'indigo',    // 'indigo' | 'blue' | 'purple' | 'emerald' | 'amber' | 'rose'
        resolvedTheme: 'dark',
        currentUser: null,
        isSupabaseConnected: false
    };

    /**
     * Read preferences from localStorage
     */
    function loadSavedPrefs() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed.mode && ['light', 'dark', 'system'].indexOf(parsed.mode) !== -1) {
                    state.mode = parsed.mode;
                }
                if (parsed.accent && ACCENTS[parsed.accent]) {
                    state.accent = parsed.accent;
                }
            }
        } catch (e) {
            console.warn('[VoiceGuard Theme] Failed to parse saved theme preferences:', e);
        }
    }

    /**
     * Save preferences to localStorage
     */
    function savePrefsLocally() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                mode: state.mode,
                accent: state.accent,
                updatedAt: new Date().toISOString()
            }));
        } catch (e) {}
    }

    /**
     * Determines whether system prefers dark mode
     */
    function getSystemPreference() {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    /**
     * Resolves effective theme ('light' or 'dark') given mode
     */
    function resolveTheme(mode) {
        if (mode === 'system') {
            return getSystemPreference();
        }
        return mode === 'light' ? 'light' : 'dark';
    }

    /**
     * Apply DOM attributes and CSS variables immediately
     */
    function applyThemeToDOM() {
        state.resolvedTheme = resolveTheme(state.mode);
        if (typeof document === 'undefined') return;
        var root = document.documentElement;

        root.setAttribute('data-theme', state.resolvedTheme);
        root.setAttribute('data-theme-mode', state.mode);
        root.setAttribute('data-accent', state.accent);

        // Also update three.js background sphere if present
        if (typeof window !== 'undefined' && typeof window.updateThreeSphereColor === 'function' && ACCENTS[state.accent]) {
            window.updateThreeSphereColor(ACCENTS[state.accent].threeHex);
        }

        updateHeaderToggleButtons();
        updateSettingsModalUI();
        updateLivePreview();

        // Dispatch themechange event for other components (e.g., charts, waveforms)
        if (typeof window !== 'undefined') {
            try {
                window.dispatchEvent(new CustomEvent('voiceguard:themechange', {
                    detail: {
                        mode: state.mode,
                        theme: state.resolvedTheme,
                        accent: state.accent,
                        accentHex: ACCENTS[state.accent] ? ACCENTS[state.accent].hex : '#4F46E5'
                    }
                }));
            } catch (e) {}
        }
    }

    /**
     * Change Theme Mode ('light' | 'dark' | 'system')
     */
    function setThemeMode(mode) {
        if (['light', 'dark', 'system'].indexOf(mode) === -1) return;
        state.mode = mode;
        savePrefsLocally();
        applyThemeToDOM();
        syncWithCloud();
    }

    /**
     * Change Accent Color
     */
    function setAccentColor(accentId) {
        if (!ACCENTS[accentId]) return;
        state.accent = accentId;
        savePrefsLocally();
        applyThemeToDOM();
        syncWithCloud();
    }

    /**
     * Reset to Default (Dark Mode + Indigo Accent)
     */
    function resetToDefaults() {
        state.mode = 'dark';
        state.accent = 'indigo';
        savePrefsLocally();
        applyThemeToDOM();
        syncWithCloud();
    }

    /**
     * Header Quick Theme Toggle Button
     * Cycles: dark -> light -> system -> dark
     */
    function cycleThemeMode() {
        if (state.mode === 'dark') {
            setThemeMode('light');
        } else if (state.mode === 'light') {
            setThemeMode('system');
        } else {
            setThemeMode('dark');
        }
    }

    /**
     * Update header toggle button appearance and icon
     */
    function updateHeaderToggleButtons() {
        if (typeof document === 'undefined') return;
        var buttons = document.querySelectorAll('.theme-toggle-btn, #quick-theme-toggle-btn');
        buttons.forEach(function(btn) {
            var iconContainer = btn.querySelector('.theme-toggle-icon') || btn;
            var label = btn.querySelector('.theme-toggle-label');

            var iconSvg = '';
            var title = '';

            if (state.mode === 'light') {
                // Sun Icon
                iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<circle cx="12" cy="12" r="5"></circle>' +
                    '<line x1="12" y1="1" x2="12" y2="3"></line>' +
                    '<line x1="12" y1="21" x2="12" y2="23"></line>' +
                    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>' +
                    '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>' +
                    '<line x1="1" y1="12" x2="3" y2="12"></line>' +
                    '<line x1="21" y1="12" x2="23" y2="12"></line>' +
                    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>' +
                    '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' +
                    '</svg>';
                title = 'Theme: Light (Click to switch to System)';
            } else if (state.mode === 'system') {
                // Laptop / Monitor Icon
                iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>' +
                    '<line x1="8" y1="21" x2="16" y2="21"></line>' +
                    '<line x1="12" y1="17" x2="12" y2="21"></line>' +
                    '</svg>';
                title = 'Theme: System (' + state.resolvedTheme + ')';
            } else {
                // Moon Icon
                iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
                    '</svg>';
                title = 'Theme: Dark (Click to switch to Light)';
            }

            if (btn.querySelector('.theme-toggle-icon')) {
                btn.querySelector('.theme-toggle-icon').innerHTML = iconSvg;
            } else {
                btn.innerHTML = iconSvg + (label ? ' <span class="theme-toggle-label">' + label.textContent + '</span>' : '');
            }
            btn.setAttribute('title', title);
            btn.setAttribute('aria-label', title);
        });
    }

    /**
     * Update Appearance section in Settings Modal
     */
    function updateSettingsModalUI() {
        if (typeof document === 'undefined') return;
        // 1. Update Mode Segmented Controls
        var modeBtns = document.querySelectorAll('[data-theme-choice]');
        modeBtns.forEach(function(btn) {
            var choice = btn.getAttribute('data-theme-choice');
            if (choice === state.mode) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });

        // 2. Update Accent Swatches
        var swatches = document.querySelectorAll('[data-accent-choice]');
        swatches.forEach(function(btn) {
            var choice = btn.getAttribute('data-accent-choice');
            if (choice === state.accent) {
                btn.classList.add('selected');
                btn.setAttribute('aria-checked', 'true');
            } else {
                btn.classList.remove('selected');
                btn.setAttribute('aria-checked', 'false');
            }
        });
    }

    /**
     * Update Live Theme Preview in Appearance Tab
     */
    function updateLivePreview() {
        if (typeof document === 'undefined') return;
        var preview = document.getElementById('theme-preview-box');
        if (!preview) return;

        var accentInfo = ACCENTS[state.accent] || ACCENTS.indigo;
        var badge = preview.querySelector('.preview-badge');
        var btn = preview.querySelector('.preview-btn');
        var bar = preview.querySelector('.preview-progress-fill');
        var accentNameEl = preview.querySelector('.preview-accent-name');
        var themeNameEl = preview.querySelector('.preview-theme-name');

        if (accentNameEl) accentNameEl.textContent = accentInfo.name;
        if (themeNameEl) themeNameEl.textContent = state.mode.charAt(0).toUpperCase() + state.mode.slice(1);

        if (badge) {
            badge.style.color = accentInfo.hex;
            badge.style.borderColor = accentInfo.hex;
            badge.style.backgroundColor = 'rgba(' + parseInt(accentInfo.hex.slice(1,3),16) + ',' +
                                                   parseInt(accentInfo.hex.slice(3,5),16) + ',' +
                                                   parseInt(accentInfo.hex.slice(5,7),16) + ',0.15)';
        }

        if (btn) {
            btn.style.background = 'linear-gradient(135deg, ' + accentInfo.hex + ', ' + accentInfo.hover + ')';
            btn.style.boxShadow = '0 0 15px rgba(' + parseInt(accentInfo.hex.slice(1,3),16) + ',' +
                                                     parseInt(accentInfo.hex.slice(3,5),16) + ',' +
                                                     parseInt(accentInfo.hex.slice(5,7),16) + ',0.4)';
        }

        if (bar) {
            bar.style.backgroundColor = accentInfo.hex;
        }
    }

    /**
     * Cloud / Supabase Sync Logic
     * Syncs with user_preferences table if Supabase client is available and user is authenticated
     */
    function syncWithCloud() {
        if (typeof window === 'undefined') return;
        var supabase = window.supabase || (window._supabaseClient ? window._supabaseClient : null);
        if (!supabase) {
            updateSyncStatusUI('guest');
            return;
        }

        try {
            if (supabase.auth && typeof supabase.auth.getUser === 'function') {
                supabase.auth.getUser().then(function(res) {
                    if (res && res.data && res.data.user) {
                        state.currentUser = res.data.user;
                        state.isSupabaseConnected = true;
                        persistUserPreferencesToSupabase(supabase, res.data.user.id);
                    } else {
                        updateSyncStatusUI('guest');
                    }
                }).catch(function() {
                    updateSyncStatusUI('guest');
                });
            } else {
                updateSyncStatusUI('guest');
            }
        } catch (e) {
            updateSyncStatusUI('guest');
        }
    }

    /**
     * Persist to Supabase user_preferences table
     */
    function persistUserPreferencesToSupabase(supabase, userId) {
        if (!supabase || !userId) return;
        updateSyncStatusUI('syncing');

        supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                theme_mode: state.mode,
                accent_color: state.accent,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .then(function(res) {
                if (res.error) {
                    console.warn('[VoiceGuard Theme] Supabase sync error:', res.error.message);
                    updateSyncStatusUI('error', res.error.message);
                } else {
                    updateSyncStatusUI('synced');
                }
            })
            .catch(function(err) {
                console.warn('[VoiceGuard Theme] Supabase sync exception:', err);
                updateSyncStatusUI('error', err.message);
            });
    }

    /**
     * Load Preferences from Supabase on User Sign-in
     * Reconciles cloud and local preferences predictably
     */
    function loadUserPreferencesFromSupabase(supabase, userId) {
        if (!supabase || !userId) return;
        updateSyncStatusUI('syncing');

        supabase
            .from('user_preferences')
            .select('theme_mode, accent_color, updated_at')
            .eq('user_id', userId)
            .maybeSingle()
            .then(function(res) {
                if (res.data) {
                    // Cloud preferences exist -> adopt them without clobbering
                    var cloud = res.data;
                    var changed = false;
                    if (cloud.theme_mode && ['light', 'dark', 'system'].indexOf(cloud.theme_mode) !== -1) {
                        state.mode = cloud.theme_mode;
                        changed = true;
                    }
                    if (cloud.accent_color && ACCENTS[cloud.accent_color]) {
                        state.accent = cloud.accent_color;
                        changed = true;
                    }
                    if (changed) {
                        savePrefsLocally();
                        applyThemeToDOM();
                    }
                    updateSyncStatusUI('synced');
                } else {
                    // First time sign-in: save local preferences to cloud
                    persistUserPreferencesToSupabase(supabase, userId);
                }
            })
            .catch(function() {
                updateSyncStatusUI('synced');
            });
    }

    /**
     * Update appearance sync status banner in settings modal
     */
    function updateSyncStatusUI(status, detail) {
        if (typeof document === 'undefined') return;
        var statusEl = document.getElementById('theme-sync-status');
        var descEl = document.getElementById('theme-sync-desc');
        var authBtn = document.getElementById('theme-auth-btn');
        if (!statusEl) return;

        if (status === 'synced') {
            statusEl.textContent = 'Synced to Supabase Cloud';
            statusEl.className = 'theme-sync-badge synced';
            if (descEl) descEl.textContent = 'Theme and accent synced across all your devices.';
            if (authBtn) authBtn.style.display = 'none';
        } else if (status === 'syncing') {
            statusEl.textContent = 'Syncing...';
            statusEl.className = 'theme-sync-badge syncing';
            if (descEl) descEl.textContent = 'Saving preferences to your account...';
        } else if (status === 'error') {
            statusEl.textContent = 'Local Mode (Cloud offline)';
            statusEl.className = 'theme-sync-badge local';
            if (descEl) descEl.textContent = 'Preferences saved locally: ' + (detail || 'Cloud unavailable');
        } else {
            statusEl.textContent = 'Saved in Browser (Guest)';
            statusEl.className = 'theme-sync-badge local';
            if (descEl) descEl.textContent = 'Preferences saved in localStorage. Sign in to sync across devices.';
            if (authBtn) authBtn.style.display = 'inline-flex';
        }
    }

    /**
     * Initialize theme engine and event listeners
     */
    function init() {
        loadSavedPrefs();
        applyThemeToDOM();

        // Listen for OS scheme changes in System mode
        if (typeof window !== 'undefined' && window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                if (state.mode === 'system') {
                    applyThemeToDOM();
                }
            });
        }

        if (typeof document === 'undefined') return;

        // Attach Header Quick Toggle Buttons
        var toggleBtns = document.querySelectorAll('.theme-toggle-btn, #quick-theme-toggle-btn');
        toggleBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                cycleThemeMode();
            });
        });

        // Attach Mode Segmented Buttons
        var modeBtns = document.querySelectorAll('[data-theme-choice]');
        modeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var choice = btn.getAttribute('data-theme-choice');
                setThemeMode(choice);
            });
        });

        // Attach Accent Swatch Buttons
        var swatchBtns = document.querySelectorAll('[data-accent-choice]');
        swatchBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var choice = btn.getAttribute('data-accent-choice');
                setAccentColor(choice);
            });
        });

        // Attach Reset Button
        var resetBtn = document.getElementById('reset-theme-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                resetToDefaults();
            });
        }

        // Attach Settings Tab Switcher for Appearance
        var tabAppearance = document.getElementById('mtab-appearance');
        var contentAppearance = document.getElementById('mcontent-appearance');
        if (tabAppearance && contentAppearance) {
            tabAppearance.addEventListener('click', function() {
                // Remove active from other tabs
                document.querySelectorAll('.modal-tab-btn').forEach(function(b) { b.classList.remove('active'); });
                tabAppearance.classList.add('active');

                // Hide other content panes
                var serverPane = document.getElementById('mcontent-server');
                var extPane = document.getElementById('mcontent-external');
                if (serverPane) serverPane.style.display = 'none';
                if (extPane) extPane.style.display = 'none';

                contentAppearance.style.display = 'block';
                updateLivePreview();
                updateSettingsModalUI();
            });
        }

        // Attach Auth / Sync Sign-in Button
        var authModalBtn = document.getElementById('theme-auth-btn');
        var authModal = document.getElementById('auth-modal');
        var authCloseBtn = document.getElementById('auth-modal-close-btn');
        if (authModalBtn && authModal) {
            authModalBtn.addEventListener('click', function() {
                authModal.style.display = 'flex';
            });
        }
        if (authCloseBtn && authModal) {
            authCloseBtn.addEventListener('click', function() {
                authModal.style.display = 'none';
            });
        }

        // Mobile Bottom Nav Theme Button
        var mobNavTheme = document.getElementById('mob-nav-theme');
        if (mobNavTheme) {
            mobNavTheme.addEventListener('click', function(e) {
                e.preventDefault();
                var modal = document.getElementById('settings-modal');
                var tab = document.getElementById('mtab-appearance');
                if (modal && tab) {
                    modal.style.display = 'flex';
                    tab.click();
                }
            });
        }

        // Check Supabase authentication status if initialized
        syncWithCloud();
    }

    // Public API
    var api = {
        init: init,
        setThemeMode: setThemeMode,
        setAccentColor: setAccentColor,
        getThemeMode: function() { return state.mode; },
        getResolvedTheme: function() { return state.resolvedTheme; },
        getAccentColor: function() { return state.accent; },
        getAccents: function() { return ACCENTS; },
        resetToDefaults: resetToDefaults,
        cycleThemeMode: cycleThemeMode,
        syncWithCloud: syncWithCloud,
        onSignIn: loadUserPreferencesFromSupabase,
        onSignOut: function() {
            state.currentUser = null;
            state.isSupabaseConnected = false;
            updateSyncStatusUI('guest');
        }
    };

    if (typeof window !== 'undefined') {
        window.VoiceGuardTheme = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    // Auto-init when DOM is ready in browser
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})();
