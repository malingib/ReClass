#!/usr/bin/env python3
"""Tenant-isolation static gate for ReClass."""
from __future__ import annotations

import re
import sys
from pathlib import Path

GLOBAL_TABLES = {
    "tenants", "audit_log", "rate_limits", "user_roles",
    "checkout_requests", "tenant_modules", "platform_config",
}
FROM_RE = re.compile(r"\.from\(\s*'([a-z_]+)'\s*\)")


def statement_after(text: str, idx: int) -> str:
    depth = 0
    out = []
    for ch in text[idx:]:
        if ch in "([{": depth += 1
        elif ch in ")]}": depth -= 1
        elif ch == ";" and depth <= 0: break
        out.append(ch)
        if len(out) > 4000: break
    return "".join(out)


def is_scoped(chain: str) -> bool:
    if re.search(r"\.eq\(\s*['\"]tenant_id['\"]", chain): return True
    if re.search(r"\.in\(\s*['\"]tenant_id['\"]", chain): return True
    if re.search(r"\.eq\(\s*['\"]scope['\"],\s*['\"]platform['\"]", chain) and re.search(r"\.is\(\s*['\"]tenant_id['\"],\s*null\s*\)", chain): return True
    if re.search(r"\btenant_id\s*[:=]", chain): return True
    if re.search(r"\.eq\(\s*['\"](?:payroll_id|assignment_id|session_occurrence_id|student_id|teacher_id|parent_id|invoice_id|occurrence_id|class_id|admission_id)['\"]", chain, re.I): return True
    if re.search(r"\.in\(\s*['\"](?:id|assignment_id)['\"]\s*,\s*\w+\b", chain, re.I): return True
    if re.search(r"\.(?:insert|upsert)\(\s*components\b", chain): return True
    if re.search(r"\.eq\(\s*['\"]id['\"]\s*,\s*\w*(invoice|student|teacher|parent|exam|credential|waiver|payroll|session|occurrence|class|admission|template|announcement|message|notification)\w*", chain, re.I): return True
    return False


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "src")
    leaks: list[tuple[Path, int, str, str]] = []
    files = 0
    for path in sorted(root.rglob("*.ts")):
        text = path.read_text(errors="ignore")
        if "srv" not in text: continue
        files += 1
        for m in FROM_RE.finditer(text):
            table = m.group(1)
            if table in GLOBAL_TABLES: continue
            prefix = text[max(0, m.start() - 120): m.start()]
            if not re.search(r"\b(srv|db|locals\.srv|serviceClient|getServiceClient\(\))\s*$|\b(srv|db)\b", prefix): continue
            chain = statement_after(text, m.start())
            wrap = text[max(0, m.start() - 200): m.start()]
            if "withTenant(" in wrap: continue
            above = text[max(0, m.start() - 700): m.start()]
            if re.search(r"\.insert\(", chain) and re.search(r"\btenant_id\s*[:=]", above): continue
            if not is_scoped(chain):
                line = text[: m.start()].count("\n") + 1
                snippet = re.sub(r"\s+", " ", chain)[:100]
                leaks.append((path, line, table, snippet))
    for path, line, table, snippet in leaks:
        print(f"LEAK  {path}:{line}  table={table}\n        {snippet}")
    print(f"\nScanned {files} files. Unscoped service-role chains: {len(leaks)}")
    return 1 if leaks else 0


if __name__ == "__main__": sys.exit(main())
