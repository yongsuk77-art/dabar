#!/usr/bin/env python3
"""Deploy the static export to Cloudflare Pages using the stored credential.

Usage: deploy.py [--project dabar] [--dir out]
The surrogate token is passed to wrangler via CLOUDFLARE_API_TOKEN without
ever being printed or logged.
"""
import os
import subprocess
import sys

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import dynamic_credential_entry

project = "dabar"
outdir = "out"
for i, a in enumerate(sys.argv[1:]):
    if a == "--project":
        project = sys.argv[i + 2]
    elif a == "--dir":
        outdir = sys.argv[i + 2]

entry = dynamic_credential_entry("custom.cloudflare")
surrogate = str(entry["surrogate"]).strip()

env = dict(os.environ)
env["CLOUDFLARE_API_TOKEN"] = surrogate

cmd = [
    "npx", "-y", "wrangler",
    "pages", "deploy", outdir,
    "--project-name", project,
    "--commit-dirty", "true",
]
print(f"deploying {outdir}/ -> pages project {project}", flush=True)
r = subprocess.run(cmd, env=env, cwd=os.path.dirname(os.path.abspath(__file__)) + "/..")
sys.exit(r.returncode)
