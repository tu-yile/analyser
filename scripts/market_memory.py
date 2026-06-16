#!/usr/bin/env python3
"""File operations for A-share report context and history.

This script intentionally avoids deciding when day/week rollover should happen.
Rollover judgment and summarization belong to the a-share-context-rollover skill.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CONTEXT = DATA / "context"
HISTORY = DATA / "history"

TODAY = CONTEXT / "today.md"
TODAY_STATE = CONTEXT / "today_state.md"
WEEK = CONTEXT / "week.md"
WEEK_STATE = CONTEXT / "week_state.md"
RECENT = CONTEXT / "recent.md"
RECENT_INDEX = CONTEXT / "recent_index.json"

SKILL_SLUGS = {
    "overnight": "a-share-overnight-brief",
    "call-auction": "a-share-call-auction-analysis",
    "midday": "a-share-midday-review",
    "close": "a-share-close-review",
}


def now_shanghai() -> dt.datetime:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=8)))


def today_str() -> str:
    return now_shanghai().strftime("%Y-%m-%d")


def week_str() -> str:
    return now_shanghai().strftime("%G-W%V")


def timestamp() -> str:
    return now_shanghai().strftime("%Y-%m-%d %H:%M:%S %z")


def timestamp_compact() -> str:
    return now_shanghai().strftime("%Y%m%d-%H%M%S")


def ensure_layout() -> None:
    for directory in [
        CONTEXT,
        HISTORY / "reports",
        HISTORY / "today",
        HISTORY / "week",
        HISTORY / "recent",
        HISTORY / "states",
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    defaults = {
        TODAY: "# Today Context\n\n",
        TODAY_STATE: "# Today State\n\n",
        WEEK: "# Week Context\n\n",
        WEEK_STATE: "# Week State\n\n",
        RECENT: "# Recent Context\n\n",
    }
    for path, content in defaults.items():
        if not path.exists():
            path.write_text(content, encoding="utf-8")

    if not RECENT_INDEX.exists():
        RECENT_INDEX.write_text("[]\n", encoding="utf-8")


def require_file(path: Path, label: str) -> Path:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise SystemExit(f"{label} file not found: {resolved}")
    return resolved


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def append_section(path: Path, title: str, body: str) -> None:
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    separator = "\n\n" if existing.strip() else ""
    path.write_text(f"{existing.rstrip()}{separator}## {title}\n\n{body.strip()}\n", encoding="utf-8")


def archive_file(source: Path, target: Path) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    return target


def archive_context_file(source: Path, kind: str, label: str) -> Path:
    target = HISTORY / kind / f"{label}.md"
    return archive_file(source, target)


def archive_state_before_replace(path: Path, state_name: str) -> Path:
    target = HISTORY / "states" / f"{timestamp_compact()}-{state_name}-before-replace{path.suffix}"
    return archive_file(path, target)


def report_filename(skill: str, trading_date: str) -> Path:
    safe_skill = SKILL_SLUGS.get(skill, skill)
    seq = now_shanghai().strftime("%H%M%S")
    return HISTORY / "reports" / trading_date / f"{seq}-{safe_skill}.md"


def add_report(args: argparse.Namespace) -> None:
    ensure_layout()
    source = require_file(Path(args.report), "report")
    trading_date = args.date or today_str()
    target = report_filename(args.skill, trading_date)
    archive_file(source, target)

    title = f"{trading_date} {args.skill} report ({timestamp()})"
    append_section(TODAY, title, read_text(target))

    print(f"archived_report={target}")
    print(f"updated_context={TODAY}")


def replace_markdown_context(args: argparse.Namespace, target: Path, state_name: str) -> None:
    ensure_layout()
    source = require_file(Path(args.file), state_name)
    snapshot = archive_state_before_replace(target, state_name)
    shutil.copyfile(source, target)
    print(f"archived_previous={snapshot}")
    print(f"updated_context={target}")


def update_today_state(args: argparse.Namespace) -> None:
    replace_markdown_context(args, TODAY_STATE, "today_state")


def update_week_state(args: argparse.Namespace) -> None:
    replace_markdown_context(args, WEEK_STATE, "week_state")


def replace_recent(args: argparse.Namespace) -> None:
    replace_markdown_context(args, RECENT, "recent")


def replace_recent_index(args: argparse.Namespace) -> None:
    ensure_layout()
    source = require_file(Path(args.file), "recent_index")
    try:
        json.loads(source.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"recent_index must be valid JSON: {exc}") from exc
    snapshot = archive_state_before_replace(RECENT_INDEX, "recent_index")
    shutil.copyfile(source, RECENT_INDEX)
    print(f"archived_previous={snapshot}")
    print(f"updated_context={RECENT_INDEX}")


def archive_today(args: argparse.Namespace) -> None:
    ensure_layout()
    label = args.date or today_str()
    snapshot = archive_context_file(TODAY, "today", label)
    print(f"archived_today={snapshot}")


def archive_week(args: argparse.Namespace) -> None:
    ensure_layout()
    label = args.week or week_str()
    snapshot = archive_context_file(WEEK, "week", label)
    print(f"archived_week={snapshot}")


def archive_recent(args: argparse.Namespace) -> None:
    ensure_layout()
    label = args.label or f"{timestamp_compact()}-recent"
    snapshot = archive_context_file(RECENT, "recent", label)
    print(f"archived_recent={snapshot}")


def append_week(args: argparse.Namespace) -> None:
    ensure_layout()
    source = require_file(Path(args.file), "week append")
    label = args.label or f"daily summary ({timestamp()})"
    append_section(WEEK, label, read_text(source))
    print(f"updated_context={WEEK}")


def append_recent(args: argparse.Namespace) -> None:
    ensure_layout()
    source = require_file(Path(args.file), "recent append")
    label = args.label or f"weekly summary ({timestamp()})"
    append_section(RECENT, label, read_text(source))
    print(f"updated_context={RECENT}")


def clear_today(_: argparse.Namespace) -> None:
    ensure_layout()
    TODAY.write_text("# Today Context\n\n", encoding="utf-8")
    TODAY_STATE.write_text("# Today State\n\n", encoding="utf-8")
    print(f"cleared_context={TODAY}")
    print(f"cleared_context={TODAY_STATE}")


def clear_week(_: argparse.Namespace) -> None:
    ensure_layout()
    WEEK.write_text("# Week Context\n\n", encoding="utf-8")
    WEEK_STATE.write_text("# Week State\n\n", encoding="utf-8")
    print(f"cleared_context={WEEK}")
    print(f"cleared_context={WEEK_STATE}")


def show_context(_: argparse.Namespace) -> None:
    ensure_layout()
    print(f"today={TODAY}")
    print(f"today_state={TODAY_STATE}")
    print(f"week={WEEK}")
    print(f"week_state={WEEK_STATE}")
    print(f"recent={RECENT}")
    print(f"recent_index={RECENT_INDEX}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage context/history files for A-share reports.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Create the data directory layout and context files.").set_defaults(func=lambda args: ensure_layout())

    show = sub.add_parser("show-context", help="Print context file paths that every skill should load.")
    show.set_defaults(func=show_context)

    add = sub.add_parser("add-report", help="Archive one skill report and append the full report to context/today.md.")
    add.add_argument("--skill", required=True, help="Skill key or name, e.g. overnight, call-auction, midday, close.")
    add.add_argument("--report", required=True, help="Path to the generated report markdown file.")
    add.add_argument("--date", help="Trading date in YYYY-MM-DD. Defaults to current Asia/Shanghai date.")
    add.set_defaults(func=add_report)

    today_state = sub.add_parser("update-today-state", help="Replace context/today_state.md with an AI-maintained state file.")
    today_state.add_argument("--file", required=True, help="Path to the new today_state.md content.")
    today_state.set_defaults(func=update_today_state)

    week_state = sub.add_parser("update-week-state", help="Replace context/week_state.md with an AI-maintained state file.")
    week_state.add_argument("--file", required=True, help="Path to the new week_state.md content.")
    week_state.set_defaults(func=update_week_state)

    recent = sub.add_parser("replace-recent", help="Replace context/recent.md after AI removes low-value content.")
    recent.add_argument("--file", required=True, help="Path to the new recent.md content.")
    recent.set_defaults(func=replace_recent)

    recent_index = sub.add_parser("replace-recent-index", help="Replace context/recent_index.json after AI updates recent metadata.")
    recent_index.add_argument("--file", required=True, help="Path to the new recent_index.json content.")
    recent_index.set_defaults(func=replace_recent_index)

    archive_today_parser = sub.add_parser("archive-today", help="Archive context/today.md to history/today.")
    archive_today_parser.add_argument("--date", help="Trading date label in YYYY-MM-DD. Defaults to current Asia/Shanghai date.")
    archive_today_parser.set_defaults(func=archive_today)

    archive_week_parser = sub.add_parser("archive-week", help="Archive context/week.md to history/week.")
    archive_week_parser.add_argument("--week", help="Week label, e.g. 2026-W25. Defaults to current ISO week.")
    archive_week_parser.set_defaults(func=archive_week)

    archive_recent_parser = sub.add_parser("archive-recent", help="Archive context/recent.md to history/recent.")
    archive_recent_parser.add_argument("--label", help="Snapshot label. Defaults to a timestamped recent label.")
    archive_recent_parser.set_defaults(func=archive_recent)

    append_week_parser = sub.add_parser("append-week", help="Append a daily summary file to context/week.md.")
    append_week_parser.add_argument("--file", required=True, help="Path to the daily summary markdown file.")
    append_week_parser.add_argument("--label", help="Section title to use in week.md.")
    append_week_parser.set_defaults(func=append_week)

    append_recent_parser = sub.add_parser("append-recent", help="Append a weekly summary file to context/recent.md.")
    append_recent_parser.add_argument("--file", required=True, help="Path to the weekly summary markdown file.")
    append_recent_parser.add_argument("--label", help="Section title to use in recent.md.")
    append_recent_parser.set_defaults(func=append_recent)

    sub.add_parser("clear-today", help="Clear context/today.md and context/today_state.md.").set_defaults(func=clear_today)
    sub.add_parser("clear-week", help="Clear context/week.md and context/week_state.md.").set_defaults(func=clear_week)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    result = args.func(args)
    if args.command == "init":
        print(f"initialized={DATA}")
    return result


if __name__ == "__main__":
    main()
