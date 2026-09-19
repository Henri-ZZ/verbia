#!/usr/bin/env python3
"""Push Verbia's promo-video subtitles to a YouTube video via the Data API.

YouTube Studio has no bulk subtitle upload: no zip, no multi-select, one
language at a time. This script walks the generated .srt files and uploads each
one as a caption track with captions.insert, skipping languages that already
have a track on the video (so it is safe to re-run).

Setup, quota notes and troubleshooting live in YOUTUBE-UPLOAD.md next to this
file. Quick start:

    pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
    python3 upload-to-youtube.py --video-id dQw4w9WgXcQ --dry-run
    python3 upload-to-youtube.py --video-id dQw4w9WgXcQ

Typical usage: with no --lang the script uploads PENDING_LANGUAGES, the leftovers
of the last run (falling back to the full DEFAULT_LANGUAGES set once that is
empty). Pass --lang/--all to change what gets uploaded and --list to preview.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
import zipfile
from pathlib import Path

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]

# Where the .srt files live. A directory wins over the zip; both are checked in
# this order, and --srt-dir / --zip override the search entirely.
SRT_DIR_CANDIDATES = [
    REPO_ROOT / "artifacts" / "verbia-captions" / "srt",
    SCRIPT_DIR / "srt",
]
ZIP_CANDIDATES = [
    REPO_ROOT / "artifacts" / "verbia-captions.zip",
    SCRIPT_DIR / "verbia-captions.zip",
]

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
DEFAULT_CLIENT_SECRET = SCRIPT_DIR / "client_secret.json"
DEFAULT_TOKEN = SCRIPT_DIR / "token.json"

# Caption API quota costs, in YouTube Data API units:
#   captions.insert 400 · captions.delete 50 · captions.list 50
# The default project quota is 10,000 units per day. Listing the existing
# tracks is not free, so one run can insert (10_000 - 50) / 400 = 24 tracks —
# not 25. The 25th needs the next day (the quota resets at midnight Pacific).
# See YOUTUBE-UPLOAD.md.
QUOTA_PER_INSERT = 400
QUOTA_PER_LIST = 50
DAILY_QUOTA = 10_000
TRACKS_PER_RUN = (DAILY_QUOTA - QUOTA_PER_LIST) // QUOTA_PER_INSERT  # 24

# Caption tracks already published on the first video — never re-uploaded.
PUBLISHED = {"en", "zh-Hans", "zh-Hant"}

# Default upload set: the languages the Verbia UI itself ships in, minus the
# three already published, minus the three smallest / most English-proficient
# Nordic markets (Norwegian, Danish, Finnish — Swedish stays as the Nordic
# representative). 31 UI languages - 3 published - 3 held back = 25.
#
# One day of quota covers TRACKS_PER_RUN (24), so the 25th language spills to
# the next day — that is why sv sits last.
#
# Order = upload priority: if the quota runs out mid-run, the biggest markets
# are already done and you can resume with --limit/--lang the next day.
#
# This is now the fallback set — for the first video the job is nearly done, so
# PENDING_LANGUAGES below takes precedence. See the quota note above.
DEFAULT_LANGUAGES = [
    "es",       # Spanish (Latin America)
    "pt-BR",    # Portuguese (Brazil)
    "de",       # German
    "fr",       # French
    "ja",       # Japanese
    "ko",       # Korean
    "it",       # Italian
    "ar",       # Arabic
    "id",       # Indonesian
    "ru",       # Russian
    "hi",       # Hindi
    "tr",       # Turkish
    "vi",       # Vietnamese
    "th",       # Thai
    "pl",       # Polish
    "nl",       # Dutch
    "uk",       # Ukrainian
    "ms",       # Malay
    "fil",      # Filipino
    "ro",       # Romanian
    "hu",       # Hungarian
    "cs",       # Czech
    "he",       # Hebrew
    "el",       # Greek
    "sv",       # Swedish
]

# Languages still missing from the video. The .srt pack holds 43 translations
# (there is no `en` file — English is the source), of which:
#   - zh-Hans / zh-Hant were published by hand before the script existed,
#   - the 2026-09-18 run pushed 24 more before the daily caption quota ran out,
# leaving these 17. A bare run now uploads exactly these, which makes finishing
# the job a single no-argument command:
#
#     python3 upload-to-youtube.py --video-id QRUixu_Hk6s
#
# 43 - 2 - 24 = 17 fits one day of quota (TRACKS_PER_RUN = 24). Empty this list
# once the video is complete (or pass --lang/--all to ignore it).
PENDING_LANGUAGES = [
    "pt-PT",    # Portuguese (Portugal)
    "sv",       # Swedish
    "da",       # Danish
    "fi",       # Finnish
    "nb",       # Norwegian (YouTube only has "no")
    "bg",       # Bulgarian
    "sk",       # Slovak
    "hr",       # Croatian
    "sr",       # Serbian
    "sl",       # Slovenian
    "lt",       # Lithuanian
    "lv",       # Latvian
    "et",       # Estonian
    "is",       # Icelandic
    "ca",       # Catalan
    "fa",       # Persian
    "bn",       # Bengali
]

# Caption file suffix -> YouTube caption language code. Our tags are already
# BCP-47-ish so the map is nearly the identity; it is explicit so an override
# is a one-line edit. Keys not listed here fall back to the file suffix.
#
# Two legacy exceptions YouTube still uses on its own side:
#   he -> iw   YouTube lists Hebrew as "iw"
#   nb -> no   YouTube only has one Norwegian track ("no", Bokmål)
YOUTUBE_LANG = {
    "es": "es-419",   # YouTube tracks Latin American Spanish separately
    "pt-BR": "pt-BR",
    "pt-PT": "pt-PT",
    "zh-Hans": "zh-Hans",
    "zh-Hant": "zh-Hant",
    "nb": "no",
    "he": "iw",
    "fil": "fil",
}

# Codes YouTube has used for the same language over time. Both sides of an
# "is this track already there?" comparison are folded through this map so a
# legacy/BCP-47 mismatch cannot create a duplicate upload.
LANG_ALIASES = {
    "iw": "he",
    "in": "id",
    "ji": "yi",
    "nb": "no",
    "tl": "fil",
    "zh": "zh-hans",
    "zh-cn": "zh-hans",
    "zh-tw": "zh-hant",
    "zh-hk": "zh-hant",
}


def norm_lang(code: str) -> str:
    code = code.strip().lower()
    return LANG_ALIASES.get(code, code)

# Native endonyms, used as the caption track name shown in Studio. Optional:
# a language missing here is uploaded without an explicit track name.
TRACK_NAME = {
    "zh-Hans": "简体中文",
    "zh-Hant": "繁體中文",
    "es": "Español (Latinoamérica)",
    "pt-BR": "Português (Brasil)",
    "pt-PT": "Português (Portugal)",
    "fr": "Français",
    "de": "Deutsch",
    "it": "Italiano",
    "nl": "Nederlands",
    "sv": "Svenska",
    "da": "Dansk",
    "nb": "Norsk (bokmål)",
    "fi": "Suomi",
    "pl": "Polski",
    "cs": "Čeština",
    "sk": "Slovenčina",
    "hu": "Magyar",
    "ro": "Română",
    "el": "Ελληνικά",
    "bg": "Български",
    "hr": "Hrvatski",
    "sr": "Srpski",
    "sl": "Slovenščina",
    "lt": "Lietuvių",
    "lv": "Latviešu",
    "et": "Eesti",
    "is": "Íslenska",
    "ru": "Русский",
    "uk": "Українська",
    "tr": "Türkçe",
    "ca": "Català",
    "ar": "العربية",
    "he": "עברית",
    "fa": "فارسی",
    "hi": "हिन्दी",
    "bn": "বাংলা",
    "id": "Bahasa Indonesia",
    "ms": "Bahasa Melayu",
    "fil": "Filipino",
    "vi": "Tiếng Việt",
    "th": "ไทย",
    "ja": "日本語",
    "ko": "한국어",
}


# --------------------------------------------------------------------------
# Source discovery
# --------------------------------------------------------------------------


def _scan_dir(directory: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    for path in sorted(directory.glob("verbia-captions.*.srt")):
        code = path.name[len("verbia-captions.") : -len(".srt")]
        if code:
            found[code] = path
    return found


def _extract_zip(archive: Path) -> dict[str, Path]:
    """Extract srt entries to a temp dir and return code -> path."""
    target = Path(tempfile.mkdtemp(prefix="verbia-captions-"))
    found: dict[str, Path] = {}
    with zipfile.ZipFile(archive) as zf:
        for name in zf.namelist():
            if not re.fullmatch(r"(?:.*/)?verbia-captions\.[^/]+\.srt", name):
                continue
            code = name.rsplit("verbia-captions.", 1)[1][: -len(".srt")]
            out = target / Path(name).name
            out.write_bytes(zf.read(name))
            found[code] = out
    return found


def load_sources(args: argparse.Namespace) -> dict[str, Path]:
    if args.srt_dir:
        directory = Path(args.srt_dir).expanduser()
        if not directory.is_dir():
            die(f"--srt-dir is not a directory: {directory}")
        sources = _scan_dir(directory)
        origin = str(directory)
    elif args.zip:
        archive = Path(args.zip).expanduser()
        if not archive.is_file():
            die(f"--zip is not a file: {archive}")
        sources = _extract_zip(archive)
        origin = str(archive)
    else:
        sources, origin = {}, ""
        for directory in SRT_DIR_CANDIDATES:
            if directory.is_dir() and (found := _scan_dir(directory)):
                sources, origin = found, str(directory)
                break
        if not sources:
            for archive in ZIP_CANDIDATES:
                if archive.is_file():
                    sources, origin = _extract_zip(archive), str(archive)
                    break

    if not sources:
        searched = "\n".join(
            f"  - {p}" for p in [*SRT_DIR_CANDIDATES, *ZIP_CANDIDATES]
        )
        die(
            "no caption files found. Looked in:\n"
            f"{searched}\n"
            "Pass --srt-dir <folder> or --zip <file> to point at them."
        )
    print(f"Source: {origin}  ({len(sources)} caption files)")
    return sources


# --------------------------------------------------------------------------
# Selection
# --------------------------------------------------------------------------


def select_codes(sources: dict[str, Path], args: argparse.Namespace) -> list[str]:
    available = set(sources)

    if args.all:
        wanted = sorted(available)
    elif args.lang:
        wanted = list(dict.fromkeys(args.lang))  # de-dupe, keep order
    elif PENDING_LANGUAGES:
        wanted = list(PENDING_LANGUAGES)
    else:
        wanted = [c for c in DEFAULT_LANGUAGES if c in available]

    missing = [c for c in wanted if c not in available]
    for code in missing:
        warn(f"no caption file for '{code}' — skipped")
    wanted = [c for c in wanted if c in available]

    if not args.keep_published:
        wanted = [c for c in wanted if c not in PUBLISHED]

    if args.limit is not None:
        wanted = wanted[: args.limit]
    return wanted


def cmd_list(sources: dict[str, Path], args: argparse.Namespace) -> int:
    pending = [c for c in PENDING_LANGUAGES if c in sources]
    default = pending or [c for c in DEFAULT_LANGUAGES if c in sources]
    codes = sorted(sources)
    kind = "pending leftovers" if pending else "default set"
    print(f"\n{len(codes)} caption files available — "
          f"{kind}: {len(default)}\n")
    print(f"{'code':<10} {'upload':<7} {'YouTube code':<14} native")
    print("-" * 60)
    for code in codes:
        if code in PUBLISHED:
            mark = "pub"
        elif code in default:
            mark = "YES"
        else:
            mark = "-"
        print(
            f"{code:<10} {mark:<7} {YOUTUBE_LANG.get(code, code):<14} "
            f"{TRACK_NAME.get(code, '')}"
        )
    print()
    return 0


# --------------------------------------------------------------------------
# YouTube plumbing
# --------------------------------------------------------------------------


def die(message: str, code: int = 1) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(code)


def warn(message: str) -> None:
    print(f"warning: {message}", file=sys.stderr)


def parse_video_id(value: str) -> str:
    """Accept a bare ID or any YouTube URL and return the 11-char ID."""
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value
    match = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", value)
    if match:
        return match.group(1)
    match = re.search(r"(?:youtu\.be/|/shorts/|/embed/)([A-Za-z0-9_-]{11})", value)
    if match:
        return match.group(1)
    die(f"could not read a video ID from '{value}'")


def build_service(args: argparse.Namespace):
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as exc:  # pragma: no cover - environment dependent
        die(
            f"missing dependency ({exc.name}). Install them with:\n"
            "  pip install google-api-python-client google-auth-oauthlib "
            "google-auth-httplib2"
        )

    token_path = Path(args.token).expanduser() if args.token else DEFAULT_TOKEN
    secret_path = (
        Path(args.client_secrets).expanduser()
        if args.client_secrets
        else DEFAULT_CLIENT_SECRET
    )

    creds = None
    if token_path.is_file():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if creds and creds.valid:
        pass
    elif creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not secret_path.is_file():
            die(
                f"OAuth client secret not found at {secret_path}\n"
                "Create a Desktop-app OAuth client in Google Cloud and save "
                "the JSON there\n(see YOUTUBE-UPLOAD.md, step 2)."
            )
        print("Opening a browser to authorise YouTube access …")
        flow = InstalledAppFlow.from_client_secrets_file(str(secret_path), SCOPES)
        # Desktop-app clients accept the loopback redirect on any port; pin one
        # with --auth-port if the browser flow ever reports a redirect mismatch.
        try:
            creds = flow.run_local_server(port=args.auth_port)
        except Exception as exc:  # noqa: BLE001 - translate into a readable hint
            text = f"{exc}"
            if "access_denied" in text or "403" in text:
                die(
                    "Google refused the authorisation (Error 403: access_denied).\n"
                    "The OAuth consent screen is still in Testing mode and the "
                    "account you signed in\nwith is not on its test-user list. "
                    "In the Cloud Console:\n"
                    "  APIs & Services -> OAuth consent screen -> Audience -> "
                    "Test users -> + ADD USERS\n"
                    "Add the EXACT Google account used for the upload (the one "
                    "that owns the channel),\nSave, wait a minute, then retry. "
                    "Details: YOUTUBE-UPLOAD.md, step 2.\n"
                    f"(project: check the client_secret.json belongs to the "
                    f"project you edited)"
                )
            die(f"authorisation failed: {exc}")

    token_path.write_text(creds.to_json())
    print(f"Authorised. Token cached at {token_path}")
    return build("youtube", "v3", credentials=creds)


def existing_tracks(service, video_id: str) -> dict[str, str]:
    """Return language code -> caption id for tracks already on the video.

    `captions.list` is *not* paginated: it accepts only part / videoId / id /
    onBehalfOf*, declares no `maxResults`, and its response has no
    `nextPageToken` — a single call returns every track on the video.
    """
    response = service.captions().list(part="snippet", videoId=video_id).execute()
    tracks: dict[str, str] = {}
    for item in response.get("items", []):
        language = item.get("snippet", {}).get("language")
        if language:
            tracks[language] = item.get("id", "")
    return tracks


def is_quota_error(exc) -> bool:
    try:
        payload = json.loads(exc.content.decode("utf-8"))
    except Exception:
        return False
    for err in payload.get("error", {}).get("errors", []):
        if err.get("reason") in {"quotaExceeded", "rateLimitExceeded", "dailyLimitExceeded"}:
            return True
    return False


def cmd_upload(sources: dict[str, Path], args: argparse.Namespace) -> int:
    codes = select_codes(sources, args)
    if not codes:
        die("nothing selected to upload")

    video_id = parse_video_id(args.video_id)
    # Also skip codes whose YouTube-side language already has a track.
    upload_langs = {c: YOUTUBE_LANG.get(c, c) for c in codes}

    print(f"\nVideo: {video_id}")
    print(f"Plan:  {len(codes)} language(s) — {', '.join(codes)}")
    if not args.all and not args.lang and PENDING_LANGUAGES:
        print("Set:   pending leftovers from the last run "
              "(--all / --lang to override)")
    if len(codes) > TRACKS_PER_RUN:
        warn(
            f"{len(codes)} tracks exceed what one day of quota allows "
            f"(~{TRACKS_PER_RUN}: 24 x {QUOTA_PER_INSERT} units, plus "
            f"{QUOTA_PER_LIST} for listing); the run stops when the quota is "
            "hit and you resume the rest the next day."
        )
    print()

    if args.dry_run:
        for i, code in enumerate(codes, 1):
            print(f"  {i:>2}. {code:<10} -> {upload_langs[code]:<14} "
                  f"{TRACK_NAME.get(code, '')}")
        print("\nDry run: nothing was uploaded.")
        return 0

    try:
        from googleapiclient.errors import HttpError
        from googleapiclient.http import MediaFileUpload
    except ImportError as exc:  # pragma: no cover - environment dependent
        die(
            f"missing dependency ({exc.name}). Install them with:\n"
            "  pip install google-api-python-client google-auth-oauthlib "
            "google-auth-httplib2"
        )

    service = build_service(args)
    if args.auth_only:
        print("Authorisation complete (--auth-only).")
        return 0

    already = existing_tracks(service, video_id)
    already_norm = {norm_lang(code) for code in already}
    # Normalised language -> caption id, so --overwrite can delete the old track
    # instead of leaving a duplicate behind.
    already_ids = {norm_lang(code): cid for code, cid in already.items()}
    print(f"Already on the video: {len(already)} track(s)"
          + (f" — {', '.join(sorted(already))}" if already else ""))
    print()

    done, skipped, failed = 0, 0, 0
    pending: list[tuple[str, Path]] = []

    for code in codes:
        yt_lang = upload_langs[code]
        if norm_lang(yt_lang) in already_norm and not args.overwrite:
            print(f"  skip  {code:<10} (track already exists)")
            skipped += 1
            continue
        pending.append((code, sources[code]))

    if not pending:
        print("\nNothing to do — every selected language already has a track.")
        return 0

    for index, (code, path) in enumerate(pending, 1):
        yt_lang = upload_langs[code]
        label = f"[{index}/{len(pending)}] {code} ({yt_lang})"

        if args.overwrite:
            old_id = already_ids.get(norm_lang(yt_lang))
            if old_id:
                try:
                    service.captions().delete(id=old_id).execute()
                    print(f"  --    {label}: removed the existing track")
                except HttpError as exc:
                    warn(f"could not remove the existing {code} track: {exc}")

        body = {"snippet": {"videoId": video_id, "language": yt_lang}}
        if not args.no_track_name and TRACK_NAME.get(code):
            body["snippet"]["name"] = TRACK_NAME[code]
        if args.draft:
            body["snippet"]["isDraft"] = True

        media = MediaFileUpload(
            str(path), mimetype="application/octet-stream", resumable=False
        )
        try:
            service.captions().insert(
                part="snippet", body=body, media_body=media
            ).execute()
        except HttpError as exc:
            if is_quota_error(exc):
                remaining = [c for c, _ in pending[index - 1 :]]
                print(
                    f"\nQuota exhausted after {done} upload(s). "
                    "YouTube resets the caption quota at midnight Pacific "
                    "Time.",
                    file=sys.stderr,
                )
                print(
                    f"\nNot uploaded yet ({len(remaining)}): "
                    f"{', '.join(remaining)}\n"
                    "Tomorrow, re-run:",
                    file=sys.stderr,
                )
                flags = " ".join(f"--lang {c}" for c in remaining)
                print(
                    f"  python3 {Path(sys.argv[0]).name} "
                    f"--video-id {video_id} {flags}",
                    file=sys.stderr,
                )
                print(
                    f"completed={done} skipped={skipped} failed={failed}",
                    file=sys.stderr,
                )
                return 2
            failed += 1
            reason = ""
            try:
                payload = json.loads(exc.content.decode("utf-8"))
                reason = payload.get("error", {}).get("message", "")
            except Exception:
                reason = str(exc)
            print(f"  FAIL  {label}: {reason}", file=sys.stderr)
            if exc.resp.status in (401, 403):
                print(
                    "        hint: check the OAuth scope, that the API is "
                    "enabled, and that the video belongs to the authorised "
                    "channel.",
                    file=sys.stderr,
                )
            continue

        done += 1
        print(f"  ok    {label}")

    print(
        f"\nDone. uploaded={done} skipped={skipped} failed={failed}"
        + ("  (drafts — publish them in Studio)" if args.draft else "")
    )
    return 0 if failed == 0 else 1


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Upload Verbia promo-video subtitles to a YouTube video.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  upload-to-youtube.py --video-id <id> --list\n"
            "  upload-to-youtube.py --video-id <id> --dry-run\n"
            "  upload-to-youtube.py --video-id <id>\n"
            "  upload-to-youtube.py --video-id <id> --lang ja --lang ko\n"
            "  upload-to-youtube.py --video-id <id> --all --limit 25\n"
        ),
    )
    parser.add_argument(
        "--video-id",
        help="YouTube video ID or full URL (required unless --list)",
    )
    parser.add_argument(
        "--lang",
        action="append",
        metavar="CODE",
        help="upload only this language (repeatable). Defaults to "
        "PENDING_LANGUAGES, or the curated 25-language set once that is empty.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="use every caption file found, not just the default set",
    )
    parser.add_argument(
        "--limit",
        type=int,
        metavar="N",
        help="upload at most N tracks (useful to stay inside the daily quota)",
    )
    parser.add_argument(
        "--keep-published",
        action="store_true",
        help="include English / Chinese, which are already published",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="re-upload languages that already have a track (duplicates them)",
    )
    parser.add_argument(
        "--draft",
        action="store_true",
        help="upload as drafts; review and publish them in Studio",
    )
    parser.add_argument(
        "--no-track-name",
        action="store_true",
        help="do not set an explicit caption track name",
    )
    parser.add_argument(
        "--list",
        dest="list_only",
        action="store_true",
        help="list available languages and the default set, then exit",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print what would be uploaded without calling the API",
    )
    parser.add_argument(
        "--auth-only",
        action="store_true",
        help="run the OAuth flow and cache the token, then exit",
    )
    parser.add_argument(
        "--auth-port",
        type=int,
        default=0,
        help="fixed loopback port for the OAuth browser flow (default: any free "
        "port). Use it if authorisation reports a redirect_uri_mismatch.",
    )
    parser.add_argument("--srt-dir", help="folder containing the .srt files")
    parser.add_argument("--zip", help="zip archive containing srt/")
    parser.add_argument(
        "--client-secrets",
        help=f"OAuth client secret JSON (default: {DEFAULT_CLIENT_SECRET.name})",
    )
    parser.add_argument(
        "--token",
        help=f"cached OAuth token path (default: {DEFAULT_TOKEN.name})",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    sources = load_sources(args)

    if args.list_only:
        return cmd_list(sources, args)
    if not args.video_id:
        die("--video-id is required (or use --list)")
    return cmd_upload(sources, args)


if __name__ == "__main__":
    raise SystemExit(main())
