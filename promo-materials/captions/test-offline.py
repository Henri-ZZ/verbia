#!/usr/bin/env python3
"""Offline self-check for upload-to-youtube.py — no network, no credentials.

Run it before burning API quota:

    python3 test-offline.py

It injects a fake YouTube service and exercises the upload loop, and it also
validates every API call against the bundled YouTube discovery document, so a
wrong/unsupported keyword (e.g. passing `maxResults` to `captions.list`, which
does not accept it) fails here instead of mid-run.
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import warnings
from pathlib import Path

# The Google libraries shout about Python 3.9 being EOL on every import; that is
# noise here, not a test result.
warnings.filterwarnings("ignore")

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "upload-to-youtube.py"

# ---------------------------------------------------------------- load module
spec = importlib.util.spec_from_file_location("uploader", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def load_discovery() -> dict:
    import googleapiclient

    path = (
        Path(googleapiclient.__file__).parent
        / "discovery_cache/documents/youtube.v3.json"
    )
    return json.loads(path.read_text())


DISCOVERY = load_discovery()


def allowed_params(method: str) -> set[str]:
    """Query/path parameters the discovery doc declares for captions.<method>."""
    return set(
        DISCOVERY["resources"]["captions"]["methods"][method].get("parameters", {})
    )


# ------------------------------------------------------------------ fakes
class FakeRequest:
    def __init__(self, result=None, error=None):
        self._result, self._error = result, error

    def execute(self):
        if self._error:
            raise self._error
        return self._result


class FakeCaptions:
    def __init__(self, pages, log, quota_after=None):
        self.pages = list(pages)
        self.log = log
        self.quota_after = quota_after
        self.inserts = 0

    def list(self, **kw):
        self.log.append(("list", kw))
        if not self.pages:
            raise AssertionError("captions.list called more times than expected")
        return FakeRequest(self.pages.pop(0))

    def insert(self, **kw):
        self.log.append(("insert", kw))
        self.inserts += 1
        if self.quota_after is not None and self.inserts > self.quota_after:
            return FakeRequest(error=quota_error())
        return FakeRequest({"id": "new-track"})

    def delete(self, **kw):
        self.log.append(("delete", kw))
        return FakeRequest(None)


def quota_error():
    from googleapiclient.errors import HttpError

    class Res:
        status = 403
        reason = "quotaExceeded"

    payload = {"error": {"errors": [{"reason": "quotaExceeded",
                                     "message": "The request cannot be completed "
                                                "because you have exceeded your "
                                                "quota."}], "code": 403}}
    return HttpError(Res(), json.dumps(payload).encode())


class FakeService:
    def __init__(self, pages, log, quota_after=None):
        self._captions = FakeCaptions(pages, log, quota_after)

    def captions(self):
        return self._captions


def run(pages, argv, quota_after=None):
    log: list = []
    mod.build_service = lambda args: FakeService(pages, log, quota_after)
    code = mod.main(["--srt-dir", str(HERE.parent.parent / "artifacts/verbia-captions/srt"), *argv])
    return code, log


def ops(log):
    return [name for name, _ in log]


def inserted(log):
    return [kw["body"]["snippet"]["language"] for name, kw in log if name == "insert"]


def check_calls(log):
    """Every kwarg must be a parameter the API actually declares."""
    for name, kw in log:
        if name == "list":
            bad = set(kw) - allowed_params("list")
            assert not bad, f"captions.list got unsupported kwarg(s): {sorted(bad)}"
        elif name == "insert":
            bad = set(kw) - allowed_params("insert") - {"body", "media_body"}
            assert not bad, f"captions.insert got unsupported kwarg(s): {sorted(bad)}"
            assert kw["part"] == "snippet"
            for field in kw["body"]["snippet"]:
                assert field in DISCOVERY["schemas"]["CaptionSnippet"]["properties"], \
                    f"snippet.{field} is not a CaptionSnippet field"
        elif name == "delete":
            bad = set(kw) - allowed_params("delete")
            assert not bad, f"captions.delete got unsupported kwarg(s): {sorted(bad)}"


failures = 0


def section(title):
    print()
    print("=" * 68)
    print(title)
    print("=" * 68)


def attempt(title, fn):
    global failures
    section(title)
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 - report any failure, keep going
        failures += 1
        print(f"  FAIL  {type(exc).__name__}: {exc}")
    else:
        print("  ok")


# ---------------------------------------------------------------- the cases
def t1_existing_skipped():
    pages = [{"items": [{"id": "c1", "snippet": {"language": "iw"}},
                        {"id": "c2", "snippet": {"language": "ja"}}]}]
    code, log = run(pages, ["--video-id", "QRUixu_Hk6s",
                            "--lang", "ja", "--lang", "he", "--lang", "de"])
    assert ops(log) == ["list", "insert"], f"unexpected ops: {ops(log)}"
    assert inserted(log) == ["de"], f"expected only de, got {inserted(log)}"
    assert code == 0, f"exit code {code}"
    check_calls(log)
    print(f"  iw track skips 'he'; ja track skips 'ja'; only {inserted(log)} uploaded")


def t2_overwrite_replaces():
    pages = [{"items": [{"id": "c9", "snippet": {"language": "ja"}}]}]
    code, log = run(pages, ["--video-id", "QRUixu_Hk6s", "--lang", "ja", "--overwrite"])
    assert ops(log) == ["list", "delete", "insert"], f"unexpected ops: {ops(log)}"
    assert log[1][1]["id"] == "c9", "deleted the wrong track id"
    assert inserted(log) == ["ja"], inserted(log)
    assert code == 0, f"exit code {code}"
    check_calls(log)
    print("  old ja track deleted, then re-inserted (no duplicate left behind)")


def t3_fresh_upload():
    pages = [{"items": []}]
    code, log = run(pages, ["--video-id", "QRUixu_Hk6s",
                            "--lang", "ja", "--lang", "ko", "--lang", "de"])
    assert ops(log) == ["list", "insert", "insert", "insert"], f"unexpected ops: {ops(log)}"
    assert inserted(log) == ["ja", "ko", "de"], inserted(log)
    assert code == 0, f"exit code {code}"
    check_calls(log)
    print(f"  uploaded {inserted(log)}")


def t4_all_pending_skipped():
    pages = [{"items": [{"id": "a", "snippet": {"language": "ja"}}]}]
    code, log = run(pages, ["--video-id", "QRUixu_Hk6s", "--lang", "ja"])
    assert ops(log) == ["list"], f"should not insert anything, got {ops(log)}"
    assert code == 0, f"exit code {code}"
    check_calls(log)
    print("  nothing to do — exits cleanly without touching the API")


def t5_language_map_and_srt():
    # he -> iw (YouTube's legacy code), nb -> no; srt files must exist for all.
    assert mod.YOUTUBE_LANG.get("he", "he") == "iw", "he must map to iw"
    assert mod.YOUTUBE_LANG.get("es") == "es-419", "es must map to es-419"
    srt_dir = HERE.parent.parent / "artifacts/verbia-captions/srt"
    missing = [c for c in mod.DEFAULT_LANGUAGES
               if not (srt_dir / f"verbia-captions.{c}.srt").is_file()]
    assert not missing, f"missing srt for {missing}"
    assert len(mod.DEFAULT_LANGUAGES) == 25, f"default set is {len(mod.DEFAULT_LANGUAGES)}"
    print(f"  25 default languages all have an srt; he->iw / es->es-419 mapping intact")


def t6_quota_exhausted_resume():
    # One day of quota fits 24 inserts (the list call costs 50 units first), so
    # a 25-language run must stop cleanly with a copy-pasteable resume command.
    assert mod.TRACKS_PER_RUN == 24, f"TRACKS_PER_RUN is {mod.TRACKS_PER_RUN}"
    pages = [{"items": []}]
    buf = io.StringIO()
    with contextlib.redirect_stderr(buf):
        code, log = run(pages, ["--video-id", "QRUixu_Hk6s",
                                "--lang", "ja", "--lang", "ko", "--lang", "de"],
                        quota_after=2)
    err = buf.getvalue()
    assert code == 2, f"quota exhaustion must exit 2, got {code}"
    assert inserted(log) == ["ja", "ko", "de"], inserted(log)  # 3rd attempted
    assert "completed=2" in err, err
    assert "--lang de" in err and "QRUixu_Hk6s" in err, f"no resume command:\n{err}"
    check_calls(log)
    print("  stops at the quota wall, exits 2, prints the next-day resume command")


attempt("T1  existing tracks are skipped (incl. he/iw alias)", t1_existing_skipped)
attempt("T2  --overwrite deletes before re-inserting", t2_overwrite_replaces)
attempt("T3  fresh upload inserts every selected language", t3_fresh_upload)
attempt("T4  everything already present -> no API writes", t4_all_pending_skipped)
attempt("T5  language mapping + srt files present", t5_language_map_and_srt)
attempt("T6  quota exhaustion -> exit 2 + resume command", t6_quota_exhausted_resume)

section("RESULT")
if failures:
    print(f"  {failures} case(s) FAILED")
    sys.exit(1)
print("  all offline checks passed")
