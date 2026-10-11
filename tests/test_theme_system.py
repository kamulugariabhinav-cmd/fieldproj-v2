"""
Test Suite: VoiceGuard Advanced Theme Customization System
==========================================================
Verifies:
1. Default theme is Dark mode and default accent is Indigo (#4F46E5).
2. All 3 theme modes (Light, Dark, System) switch instantly and apply proper attributes.
3. All 6 accent colors (Indigo, Blue, Purple, Emerald, Amber, Rose) match required hex codes.
4. Preferences persist in localStorage for guests.
5. Cycle theme rotates cleanly.
6. Reset to default restores Dark + Indigo.
7. Supabase user_preferences cloud reconciliation behaves predictably.
8. Design tokens for Light/Dark and Shadcn/Tailwind are present in style.css.
9. Mobile bottom navigation, Appearance tab, and quick header toggles exist in HTML files.
"""

import subprocess
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
THEME_JS = REPO_ROOT / "theme.js"
STYLE_CSS = REPO_ROOT / "style.css"
INDEX_HTML = REPO_ROOT / "index.html"
DASHBOARD_HTML = REPO_ROOT / "dashboard.html"


def run_theme_eval(setup_code: str) -> dict:
    runner = f"""
    const fs = require('fs');

    let storage = {{}};
    let domAttrs = {{}};

    global.window = {{
        matchMedia: (query) => ({{
            matches: query.includes('light') ? false : true,
            addEventListener: () => {{}}
        }}),
        dispatchEvent: () => true,
        CustomEvent: class {{
            constructor(name, opts) {{
                this.name = name;
                this.detail = opts ? opts.detail : {{}};
            }}
        }}
    }};

    global.document = {{
        readyState: 'complete',
        documentElement: {{
            setAttribute: (k, v) => {{ domAttrs[k] = String(v); }},
            getAttribute: (k) => domAttrs[k] || null
        }},
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: () => {{}}
    }};

    global.localStorage = {{
        getItem: (k) => (storage[k] !== undefined ? storage[k] : null),
        setItem: (k, v) => {{ storage[k] = String(v); }},
        removeItem: (k) => {{ delete storage[k]; }},
        clear: () => {{ storage = {{}}; }}
    }};

    const themeSrc = fs.readFileSync({json.dumps(str(THEME_JS))}, 'utf-8');
    eval(themeSrc);

    {setup_code}

    console.log(JSON.stringify({{
        mode: window.VoiceGuardTheme.getThemeMode(),
        theme: window.VoiceGuardTheme.getResolvedTheme(),
        accent: window.VoiceGuardTheme.getAccentColor(),
        domAttrs: domAttrs,
        storage: storage,
        accents: window.VoiceGuardTheme.getAccents()
    }}));
    """
    res = subprocess.run(
        ["node", "-e", runner],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        check=True
    )
    return json.loads(res.stdout.strip())


def test_theme_default_state():
    out = run_theme_eval("")
    assert out["mode"] == "dark"
    assert out["theme"] == "dark"
    assert out["accent"] == "indigo"
    assert out["domAttrs"]["data-theme"] == "dark"
    assert out["domAttrs"]["data-theme-mode"] == "dark"
    assert out["domAttrs"]["data-accent"] == "indigo"


def test_all_six_accent_colors_hex_values():
    out = run_theme_eval("")
    accents = out["accents"]
    expected = {
        "indigo": "#4F46E5",
        "blue": "#2563EB",
        "purple": "#9333EA",
        "emerald": "#059669",
        "amber": "#D97706",
        "rose": "#E11D48"
    }
    for acc_id, hex_val in expected.items():
        assert acc_id in accents, f"Missing accent: {acc_id}"
        assert accents[acc_id]["hex"].upper() == hex_val.upper(), f"Accent {acc_id} hex mismatch"


def test_theme_mode_switching():
    setup = "window.VoiceGuardTheme.setThemeMode('light');"
    out = run_theme_eval(setup)
    assert out["mode"] == "light"
    assert out["theme"] == "light"
    assert out["domAttrs"]["data-theme"] == "light"
    assert out["domAttrs"]["data-theme-mode"] == "light"


def test_system_theme_follows_os_preference():
    setup = """
    window.matchMedia = (query) => ({
        matches: query.includes('light') ? true : false,
        addEventListener: () => {}
    });
    window.VoiceGuardTheme.setThemeMode('system');
    """
    out = run_theme_eval(setup)
    assert out["mode"] == "system"
    assert out["theme"] == "light"
    assert out["domAttrs"]["data-theme"] == "light"
    assert out["domAttrs"]["data-theme-mode"] == "system"


def test_accent_color_switching_and_persistence():
    setup = "window.VoiceGuardTheme.setAccentColor('emerald');"
    out = run_theme_eval(setup)
    assert out["accent"] == "emerald"
    assert out["domAttrs"]["data-accent"] == "emerald"
    
    saved = json.loads(out["storage"]["voiceguard_theme_prefs"])
    assert saved["accent"] == "emerald"


def test_reset_to_defaults():
    setup = """
    window.VoiceGuardTheme.setThemeMode('light');
    window.VoiceGuardTheme.setAccentColor('rose');
    window.VoiceGuardTheme.resetToDefaults();
    """
    out = run_theme_eval(setup)
    assert out["mode"] == "dark"
    assert out["theme"] == "dark"
    assert out["accent"] == "indigo"
    assert out["domAttrs"]["data-theme"] == "dark"
    assert out["domAttrs"]["data-accent"] == "indigo"


def test_cycle_theme_mode():
    setup = """
    window.VoiceGuardTheme.resetToDefaults();
    window.VoiceGuardTheme.cycleThemeMode();
    const mode1 = window.VoiceGuardTheme.getThemeMode();
    window.VoiceGuardTheme.cycleThemeMode();
    const mode2 = window.VoiceGuardTheme.getThemeMode();
    window.VoiceGuardTheme.cycleThemeMode();
    const mode3 = window.VoiceGuardTheme.getThemeMode();
    """
    runner = f"""
    const fs = require('fs');
    let domAttrs = {{}};
    let storage = {{}};
    global.window = {{
        matchMedia: () => ({{ matches: false, addEventListener: () => {{}} }}),
        dispatchEvent: () => true,
        CustomEvent: class {{ constructor() {{}} }}
    }};
    global.document = {{
        readyState: 'complete',
        documentElement: {{ setAttribute: (k,v) => {{ domAttrs[k]=v; }}, getAttribute: (k) => domAttrs[k] }},
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: () => {{}}
    }};
    global.localStorage = {{ getItem: (k) => storage[k] || null, setItem: (k,v) => {{ storage[k]=v; }} }};

    const themeSrc = fs.readFileSync({json.dumps(str(THEME_JS))}, 'utf-8');
    eval(themeSrc);

    {setup}

    console.log(JSON.stringify({{ mode1, mode2, mode3 }}));
    """
    res = subprocess.run(["node", "-e", runner], capture_output=True, text=True, cwd=str(REPO_ROOT), check=True)
    out = json.loads(res.stdout.strip())
    assert out["mode1"] == "light"
    assert out["mode2"] == "system"
    assert out["mode3"] == "dark"


def test_supabase_reconciliation_logic():
    setup = """
    const fakeSupabase = {
        from: (tbl) => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({
                        data: { theme_mode: 'light', accent_color: 'purple' }
                    })
                })
            }),
            upsert: () => Promise.resolve({ error: null })
        })
    };
    window.VoiceGuardTheme.onSignIn(fakeSupabase, 'usr_123');
    """
    runner = f"""
    const fs = require('fs');
    let domAttrs = {{}};
    let storage = {{}};
    global.window = {{
        matchMedia: () => ({{ matches: false, addEventListener: () => {{}} }}),
        dispatchEvent: () => true,
        CustomEvent: class {{ constructor() {{}} }}
    }};
    global.document = {{
        readyState: 'complete',
        documentElement: {{ setAttribute: (k,v) => {{ domAttrs[k]=v; }}, getAttribute: (k) => domAttrs[k] }},
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: () => {{}}
    }};
    global.localStorage = {{ getItem: (k) => storage[k] || null, setItem: (k,v) => {{ storage[k]=v; }} }};

    const themeSrc = fs.readFileSync({json.dumps(str(THEME_JS))}, 'utf-8');
    eval(themeSrc);

    {setup}

    setTimeout(() => {{
        console.log(JSON.stringify({{
            mode: window.VoiceGuardTheme.getThemeMode(),
            accent: window.VoiceGuardTheme.getAccentColor()
        }}));
    }}, 50);
    """
    res = subprocess.run(["node", "-e", runner], capture_output=True, text=True, cwd=str(REPO_ROOT), check=True)
    out = json.loads(res.stdout.strip())
    assert out["mode"] == "light"
    assert out["accent"] == "purple"


def test_style_css_has_all_theme_tokens():
    css_content = STYLE_CSS.read_text(encoding="utf-8")
    for accent in ["indigo", "blue", "purple", "emerald", "amber", "rose"]:
        assert f'[data-accent="{accent}"]' in css_content
        
    assert '[data-theme="light"]' in css_content
    assert ':root' in css_content

    for token in ["--primary", "--primary-foreground", "--card", "--background", "--ring", "--destructive"]:
        assert token in css_content


def test_html_ui_elements_exist():
    appearance_tsx = (REPO_ROOT / "src" / "components" / "dashboard" / "AppearanceSettings.tsx").read_text(encoding="utf-8")
    header_tsx = (REPO_ROOT / "src" / "components" / "layout" / "GlassHeader.tsx").read_text(encoding="utf-8")
    mobile_nav_tsx = (REPO_ROOT / "src" / "components" / "layout" / "GlassMobileNav.tsx").read_text(encoding="utf-8")
    auth_modal_tsx = (REPO_ROOT / "src" / "components" / "public" / "AuthModal.tsx").read_text(encoding="utf-8")

    # Verify Liquid Glass Theme UI components exist and cover modes and accents
    assert "Theme Mode" in appearance_tsx
    assert "Accent Color" in appearance_tsx
    assert "toggleThemeMode" in header_tsx
    assert "GlassMobileNav" in mobile_nav_tsx
    assert "AuthModal" in auth_modal_tsx
