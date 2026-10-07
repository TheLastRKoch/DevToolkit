#!/usr/bin/env python3
"""Apply an OpenSpec task through an OpenAI-compatible model endpoint."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path.cwd()
CHANGE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
TASK_RE = re.compile(r"^- \[([ xX])\] (\d+(?:\.\d+)*) (.+)$")


def fail(message: str) -> None:
    print(f"::error::{message}", file=sys.stderr)
    raise SystemExit(1)


def run(command: list[str], *, capture: bool = True) -> str:
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=capture,
        check=False,
    )
    if result.returncode:
        output = (result.stderr or result.stdout or "").strip()
        fail(f"Command failed ({' '.join(command)}): {output}")
    return result.stdout if capture else ""


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        fail(f"Required environment variable {name} is not set")
    return value


def load_tasks(tasks_path: Path) -> list[dict[str, str | bool]]:
    tasks: list[dict[str, str | bool]] = []
    for line in tasks_path.read_text(encoding="utf-8").splitlines():
        match = TASK_RE.match(line)
        if match:
            tasks.append(
                {
                    "id": match.group(2),
                    "description": match.group(3),
                    "done": match.group(1).lower() == "x",
                }
            )
    if not tasks:
        fail(f"No checkbox tasks were found in {tasks_path}")
    return tasks


def _validate_specs_content(change_dir: Path) -> None:
    """Fail early if the change's specs/ directory has no substantive content."""
    spec_files = sorted((change_dir / "specs").glob("**/*.md"))
    if not spec_files or all(not path.read_text(encoding="utf-8").strip() for path in spec_files):
        fail(
            f"OpenSpec change '{change_dir.name}' has no substantive specification content "
            f"in {change_dir / 'specs'}; add at least one non-empty spec file before invoking the model"
        )


def validate_change(change: str) -> tuple[Path, list[dict[str, str | bool]]]:
    if not CHANGE_RE.fullmatch(change) or change.startswith(("/", ".")) or ".." in Path(change).parts:
        fail("Invalid change name; use an OpenSpec change directory name")

    change_dir = ROOT / "openspec" / "changes" / change
    required = [
        change_dir / "proposal.md",
        change_dir / "design.md",
        change_dir / "tasks.md",
    ]
    if not change_dir.is_dir():
        fail(f"OpenSpec change does not exist: {change_dir}")
    spec_files = sorted((change_dir / "specs").glob("**/*.md"))
    if not spec_files:
        fail(f"OpenSpec change has no specification files: {change_dir / 'specs'}")
    required.extend(spec_files)
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        fail(f"OpenSpec change is missing required artifacts: {', '.join(missing)}")

    run(["openspec", "validate", change, "--json"])
    _validate_specs_content(change_dir)
    return change_dir, load_tasks(change_dir / "tasks.md")


def select_tasks(tasks: list[dict[str, str | bool]], selection: str) -> list[dict[str, str | bool]]:
    if selection == "all":
        selected = [task for task in tasks if not task["done"]]
    else:
        selected = [task for task in tasks if task["id"] == selection]
        if not selected:
            fail(f"Task {selection!r} was not found in tasks.md")
        if selected[0]["done"]:
            fail(f"Task {selection!r} is already complete")
    if not selected:
        fail("No pending tasks are available for this request")
    return selected


def read_context(change_dir: Path, spec_files: list[Path]) -> str:
    paths = [
        change_dir / "proposal.md",
        *spec_files,
        change_dir / "design.md",
        change_dir / "tasks.md",
    ]
    sections = []
    for path in paths:
        relative = path.relative_to(ROOT)
        sections.append(f"\n--- {relative} ---\n{path.read_text(encoding='utf-8')}")
    return "".join(sections)


def _call_model(url: str, payload: bytes, headers: dict[str, str]) -> str:
    """Send one HTTP request to the model and return the raw content string.

    Raises SystemExit (via fail()) on network/HTTP errors or a malformed response.
    """
    request = urllib.request.Request(url, data=payload, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=900) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
        fail(f"Model request failed: {error}")
    try:
        return result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        fail("Model response did not contain a chat completion")


def _extract_diff(content: str) -> str | None:
    """Return the stripped unified diff string, or None if no diff block is found."""
    match = re.search(r"```diff\s*(.*?)```", content, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    return match.group(1).strip() + "\n"


def request_patch(endpoint: str, provider: str, model: str, api_key: str, prompt: str) -> str:
    url = endpoint.rstrip("/") + "/chat/completions"
    payload = json.dumps(
        {
            "model": model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an implementation agent. Apply the requested OpenSpec task "
                        "to the checked-out repository. Return exactly one unified git diff "
                        "inside a ```diff fenced block and no other code blocks. The diff "
                        "must include marking the completed task(s) in tasks.md. Do not include "
                        "credentials or modify files outside the repository."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
    ).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": f"openspec-apply/{provider}",
    }

    content = _call_model(url, payload, headers)
    diff = _extract_diff(content)
    if diff is not None:
        return diff

    print(f"::debug::Raw model response (attempt 1):\n{content}", file=sys.stderr)
    time.sleep(5)

    content = _call_model(url, payload, headers)
    diff = _extract_diff(content)
    if diff is not None:
        return diff

    print(f"::debug::Raw model response (attempt 2):\n{content}", file=sys.stderr)
    fail("Model response did not contain a unified diff")


def main() -> None:
    change = require_env("OPENSPEC_CHANGE")
    selection = require_env("OPENSPEC_TASK")
    provider = os.environ.get("MODEL_PROVIDER", "deepseek").strip()
    model = require_env("MODEL_NAME")
    endpoint = require_env("MODEL_ENDPOINT")
    api_key = require_env("MODEL_API_KEY")

    change_dir, tasks = validate_change(change)
    selected = select_tasks(tasks, selection)
    spec_files = sorted((change_dir / "specs").glob("**/*.md"))
    selected_text = "\n".join(f"- {task['id']}: {task['description']}" for task in selected)
    prompt = (
        f"Implement these pending task(s) from OpenSpec change {change}:\n{selected_text}\n\n"
        "Use the following repository planning artifacts as the source of truth:\n"
        f"{read_context(change_dir, spec_files)}"
    )
    patch = request_patch(endpoint, provider, model, api_key, prompt)
    patch_path = ROOT / ".openspec-generated.patch"
    patch_path.write_text(patch, encoding="utf-8")
    try:
        run(["git", "apply", "--check", str(patch_path)])
        run(["git", "apply", "--whitespace=nowarn", str(patch_path)])
    finally:
        patch_path.unlink(missing_ok=True)
    if not run(["git", "status", "--porcelain"]).strip():
        fail("Model produced no repository changes")
    print(f"Applied {len(selected)} task(s) using {provider}/{model}")


if __name__ == "__main__":
    main()
