# Netstack

> **This is a vibe-coded project** — built entirely through iterative AI-assisted sessions with no formal software engineering background. Every compose file, script, and config was written collaboratively with Claude. If something looks overengineered for a home lab, that's why, and that's the point.

A self-hosted home lab stack built around offline resilience, local AI, and full digital autonomy. Runs on a single beefy machine. No cloud dependency. No subscriptions. No surveillance. Just your hardware, your data, and open source software all the way down.

**Designed to run from `~/Netstack/` on Debian Linux.**

---

## Philosophy

Every component in this stack was chosen to be:

- **Free and open source** — no proprietary runtime licenses, no paywalls, no BSL/SSPL traps
- **Copyleft-compatible** — the whole stack can be forked under AGPL-3.0 without license conflicts
- **Offline-capable** — the prepper stack runs without internet; knowledge, AI, and tools stay available when infrastructure doesn't
- **Self-contained** — one machine, one stack, everything owned locally

This project is released under **GNU Affero General Public License v3.0**. Fork it, modify it, share it — just keep it free.

---

## Hardware

| Component | Spec |
|-----------|------|
| Machine | GMKtec EVO-X2 |
| CPU | AMD Ryzen AI Max+ 395 |
| RAM | 96GB unified memory |
| GPU | AMD Radeon 8060S (gfx1151) |
| OS | Debian Linux |

The unified memory architecture means the GPU has access to the full RAM pool — Ollama sees ~63GB of VRAM and can run large models entirely on-device.

---

## Stack Overview

### Infrastructure Layer

| Container | Image | Role | Port |
|-----------|-------|------|------|
| `npm` | `jc21/nginx-proxy-manager` | Reverse proxy + SSL termination | 80, 443, 81 |
| `portainer` | `portainer/portainer-ce` | Docker management UI | 9000 |

### Prepper Stack (Project N.O.M.A.D.)

Orchestrated by [Project NOMAD](https://github.com/Crosstalk-Solutions/project-nomad) — a self-contained offline survival computer packed with knowledge, AI, and essential tools.

| Container | Image | Role | Port |
|-----------|-------|------|------|
| `nomad_admin` | `ghcr.io/crosstalk-solutions/project-nomad` | NOMAD Command Center | 8080 |
| `nomad_mysql` | `mysql:8.0` | NOMAD database | internal |
| `nomad_redis` | `redis:8-alpine` | Session cache / message broker | internal |
| `nomad_dozzle` | `amir20/dozzle:v10.0` | Live container log viewer | 9999 |
| `nomad_toggle` | custom build | NPM proxy host toggle dashboard | 8095 |
| `nomad_ollama` | `ollama/ollama:rocm` | Local LLM inference (AMD ROCm GPU) | 11434 |
| `nomad_qdrant` | `qdrant/qdrant` | Vector database for RAG | 6333–6334 |
| `nomad_kiwix_server` | `ghcr.io/kiwix/kiwix-serve` | Offline Wikipedia + content library | 8090 |
| `nomad_kolibri` | `treehouses/kolibri` | Offline learning platform | 8300 |
| `nomad_flatnotes` | `dullage/flatnotes` | Markdown note-taking | 8200 |
| `nomad_cyberchef` | `ghcr.io/gchq/cyberchef` | Data analysis / encoding toolkit | 8100 |

---

## Current Status

| Component | State |
|-----------|-------|
| NPM + Portainer | ✅ Operational |
| NOMAD Command Center | ✅ Operational |
| Ollama (GPU) | ✅ Operational — 100% GPU, 63GB VRAM, 128k context |
| Qdrant | ✅ Operational |
| Dozzle | ✅ Operational |
| Toggle Dashboard | ✅ Operational |
| CyberChef | ✅ Operational |
| FlatNotes | ✅ Operational |
| Kolibri | ✅ Operational |
| Kiwix | ⚠️ Restarting — content packs being resolved |

---

## GPU Setup (AMD ROCm)

The Ollama container uses AMD ROCm for GPU inference. The Radeon 8060S (gfx1151) is not officially supported by ROCm but works with a GFX version override.

**Critical devices required for ROCm passthrough:**
```bash
--device /dev/dri/renderD128
--device /dev/dri/card1
--device /dev/kfd              # ← this one is the one everyone misses
```

**Environment variables:**
```bash
HSA_OVERRIDE_GFX_VERSION=11.0.1   # treats gfx1151 as gfx1101
OLLAMA_GPU=1
```

**Group membership inside container:**
```bash
--group-add 992   # render
--group-add 44    # video
```

The image must be `ollama/ollama:rocm` — the default `ollama/ollama` tag does not include ROCm libraries.

Full docker run command:
```bash
docker run -d \
  --name nomad_ollama \
  --restart unless-stopped \
  --device /dev/dri/renderD128:/dev/dri/renderD128 \
  --device /dev/dri/card1:/dev/dri/card1 \
  --device /dev/kfd:/dev/kfd \
  -v /opt/project-nomad/storage/ollama:/root/.ollama \
  -p 11434:11434 \
  -e HSA_OVERRIDE_GFX_VERSION=11.0.1 \
  -e OLLAMA_GPU=1 \
  --network prepper-stack_prepper_internal \
  --group-add 992 \
  --group-add 44 \
  ollama/ollama:rocm
```

---

## License Audit

Every component is open source with a copyleft-compatible license:

| Component | License |
|-----------|---------|
| Project NOMAD | Apache 2.0 |
| Ollama | MIT |
| Kiwix | GPL-3.0 |
| Kolibri | MIT |
| FlatNotes | MIT |
| CyberChef | Apache 2.0 |
| Qdrant | Apache 2.0 |
| Dozzle | MIT |
| Nginx Proxy Manager | MIT |
| Portainer CE | zlib |
| MySQL | GPL-2.0 |
| Redis | AGPLv3 (tri-license, v8+) |

No BSL. No SSPL. No source-available traps. The whole stack can be forked under AGPL-3.0.

---

## Repo Structure
```
~/Netstack/
  start.sh                        # Stack launcher with local image cache support
  sterilize.sh                    # Scrubs personal values before committing (run from ~/Git/)
  npm/
    docker-compose.yml            # NPM + Portainer
  prepper-stack/
    docker-compose.yml            # NOMAD + supporting services
    .env.example                  # Environment variable template → copy to .env
    entrypoint.sh                 # NOMAD container entrypoint
    wait-for-it.sh                # Service dependency wait helper
    collect_disk_info.sh          # Disk info collector for NOMAD dashboard
    toggle/
      Dockerfile
      server.js                   # NPM proxy toggle API
      index.html                  # Toggle dashboard UI
  ai-stack/                       # Planned — dedicated AI stack
  radio-stack/                    # Planned — DMR / AllStar / SVXLink configs
```

---

## Getting Started
```bash
git clone https://github.com/festro/Netstack ~/Netstack
cd ~/Netstack

# Infrastructure first
bash start.sh npm

# Prepper stack
cp prepper-stack/.env.example prepper-stack/.env
# Edit .env — fill in APP_KEY, passwords, URL
bash start.sh prepper-stack
```

For GPU inference, recreate the Ollama container manually using the command in the GPU Setup section above after the prepper stack is running.

---

## Roadmap

- [ ] Fix Kiwix content pack restarting issue
- [ ] Upgrade Ollama models (llama3.1:8b now viable with full GPU)
- [ ] Wire Toggle dashboard NPM proxy hosts
- [ ] Persist `project-nomad_default` Docker network in stack config
- [ ] AI stack — dedicated compose for heavier inference workloads
- [ ] Radio stack — DMR (MMDVMHost), Analog FM (SVXLink), AllStarLink configs
- [ ] v0.3.0 → v1.0 once GPU and radio stacks confirmed stable

---

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).

This project is free software. You are free to use, modify, and redistribute it under the terms of the AGPL-3.0. If you run a modified version as a network service, you must make the source available to users of that service.

Fork it. Break it. Make it yours.
