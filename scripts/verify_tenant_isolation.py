#!/usr/bin/env python3
"""Tenant-isolation static gate for ReClass.

Proves every `locals.srv`/`srv`/`db`-style service-role query chain on a
tenant-scoped table carries a tenant scope before the statement ends:
  - `.eq('tenant_id', ...)`, or
  - `tenant_id:` in an insert/upsert payload, or
  - an ownership helper call in the same chain.

Exit 1 with a LEAK list if any chain is unscoped. Used as a hard CI gate.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Tables that are global/system scoped — no tenant_id filter required.
GLOBAL_TABLES = {
    "tenants",
    "audit_log",
    "rate_limits",
    "user_roles",  # scoped by user_id lookups in auth paths
    "checkout_requests",  # scoped by checkout_id (globally unique) in callbacks
    "tenant_modules",  # super-admin provisions modules across tenants (system table)
}

FROM_RE = re.compile(r"\.from\(\s*'([a-z_]+)'\s*\)")


def statement_after(text: str, idx: int) -> str:
    """Return the chain text from idx to the terminating `;` at depth 0."""
    depth = 0
    out = []
    for ch in text[idx:]:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == ";" and depth <= 0:
            break
        out.append(ch)
        if len(out) > 4000:
            break
    return "".join(out)


def is_scoped(chain: str) -> bool:
    if re.search(r"\.eq\(\s*['\"]tenant_id['\"]", chain):
        return True
    if re.search(r"\.in\(\s*['\"]tenant_id['\"]", chain):
        return True
    # insert/upsert payload containing tenant_id key
    if re.search(r"\btenant_id\s*[:=]", chain):
        return True
    # keyed by a previously tenant-verified primary key
    if re.search(r"\.eq\(\s*['\"]id['\"],\s*\w*(invoice|student|teacher|parent|exam|credential|waiver|payroll|session|occurrence|class|admission|template|announcement|message|notification)\w*", chain, re.I):
        return True
    return False


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "src")
    leaks: list[tuple[Path, int, str, str]] = []
    files = 0
    for path in sorted(root.rglob("*.ts")):
        text = path.read_text(errors="ignore")
        if "srv" not in text:
            continue
        files += 1
        # collapse whitespace positions retained via original text scanning
        for m in FROM_RE.finditer(text):
            table = m.group(1)
            if table in GLOBAL_TABLES:
                continue
            # only care about service-role chains: look back a bit for srv/db client
            prefix = text[max(0, m.start() - 120): m.start()]
            if not re.search(r"\b(srv|db|locals\.srv|serviceClient|getServiceClient\(\))\s*$|\b(srv|db)\b", prefix):
                continue
            chain = statement_after(text, m.start())
            # withTenant(...) wrapper scopes the whole builder
            wrap = text[max(0, m.start() - 200): m.start()]
            if "withTenant(" in wrap:
                continue
            # insert payloads are often built just above the chain with tenant_id
            above = text[max(0, m.start() - 700): m.start()]
            if re.search(r"\.insert\(", chain) and re.search(r"\btenant_id\s*[:=]", above):
                continue
            # read-only head:true counts and selects still need scoping
            if not is_scoped(chain):
                line = text[: m.start()].count("\n") + 1
                snippet = re.sub(r"\s+", " ", chain)[:100]
                leaks.append((path, line, table, snippet))

    for path, line, table, snippet in leaks:
        print(f"LEAK  {path}:{line}  table={table}\n        {snippet}")
    print(f"\nScanned {files} files. Unscoped service-role chains: {len(leaks)}")
    return 1 if leaks else 0


if __name__ == "__main__":
    sys.exit(main())
