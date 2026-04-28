# Cheyla Site — Project Documentation

## Phase 1 Infrastructure + Phase 2A Platform Foundation

**Repository:** `cheyla-site`
**Project Type:** Self-hosted web platform / micro-hosting appliance
**Primary Stack:** Raspberry Pi + Apache + WordPress + MariaDB + Cloudflare + GitHub CI/CD
**Status:** Phase 1 Complete ✅ | Phase 2A Complete ✅

---

# Executive Summary

This project established a production-style, self-hosted web presence for **Cheyla Tavarez**, beginning with secure infrastructure and evolving into a content-managed publishing platform.

The solution progressed from static site hosting into a hardened micro-hosting appliance with:

* Secure web hosting on Raspberry Pi
* GitHub-backed deployment workflow
* Cloudflare Tunnel and Web Analytics integration
* Automated Git webhook deployment
* Uptime monitoring
* WordPress CMS enablement for non-technical content management
* SSH key-only administrative hardening
* Reduced attack surface through service minimization

Design philosophy followed Lean principles:

* Build MVP first
* Validate functionality
* Add operability for nontechnical users
* Harden before scale
* Document for repeatability

---

# Architecture Overview

```text
GitHub Repository
   ↓
Git Webhook Deploy Automation
   ↓
Raspberry Pi Hosting Appliance
   ├── Apache / PHP
   ├── WordPress CMS
   ├── MariaDB
   ├── Cloudflared Tunnel
   └── Monitoring + Security Controls
          ↓
Cloudflare Edge
          ↓
cheylajtavarez.com
```

---

# Phase 1 — Infrastructure Foundation (Completed)

## Objectives

Deliver secure, lightweight, owner-controlled hosting platform.

---

## Scope Delivered

## 1. Web Hosting Foundation

Implemented:

* Apache web server
* HTTPS support
* Virtual host configuration
* Domain routing
* Static website deployment

Outcome:

* Production website live
* Secure traffic enabled
* Stable hosting baseline established

---

## 2. GitHub Deployment Workflow

Implemented Git-based deployment model:

* Repository as source of truth
* Version-controlled website assets
* Push-to-deploy workflow
* GitHub integration from Pi

Workflow:

```bash
Git commit
Git push origin main
Webhook triggers deployment
Site updates automatically
```

Value:

* Repeatable deployment
* Rollback capability
* Change traceability
* Foundation for reusable service model

---

## 3. Automated Webhook Deployment Service

Built GitHub webhook deployment service:

Components:

* Python Flask webhook listener
* Systemd service
* Git pull automation
* Apache reload integration

Result:

Near real-time deployment automation.

---

## 4. Cloudflare Tunnel Integration

Implemented:

* Cloudflare Tunnel
* DNS routing
* Secure origin exposure reduction
* Deploy endpoint routing

Benefits:

* Reduced direct origin exposure
* Added edge protection
* Simplified remote publishing architecture

---

## 5. Cloudflare Web Analytics

Added:

* Privacy-friendly analytics beacon
* Traffic insights
* Lightweight analytics without heavy scripts

Use cases:

* Visitor behavior
* Content optimization
* Growth measurement

---

## 6. Uptime Monitoring

Implemented external monitoring:

Monitors:

* Website availability
* Keyword monitoring
* Incident alerting

Outcome:

Operational visibility established.

---

## 7. Security Hardening

Completed:

### SSH Hardening

Implemented:

* SSH key-based authentication
* Password authentication disabled
* Root login disabled
* User restriction (`AllowUsers`)
* Reduced authentication attempts

State:

```text
Key-only SSH administration enabled
```

---

## 8. Service Attack Surface Reduction

Disabled unnecessary services including:

* Bluetooth
* Avahi
* ModemManager
* WayVNC services
* Triggerhappy
* Additional nonessential services

Outcome:

Reduced attack surface and background footprint.

---

## 9. Backup and Recovery

Implemented:

* Site backup to USB
* Apache config backup
* Cloudflare config backup
* Webhook backup
* WordPress database dump
* Package inventory capture

Recovery readiness established.

---

## Phase 1 Deliverables Summary

| Deliverable        | Status   |
| ------------------ | -------- |
| Hosting Platform   | Complete |
| Git Deployment     | Complete |
| Webhook Automation | Complete |
| Cloudflare Tunnel  | Complete |
| Analytics          | Complete |
| Monitoring         | Complete |
| Security Hardening | Complete |
| Backup Strategy    | Complete |

---

# Phase 1 Outcomes

Delivered capabilities:

* Self-hosted production website
* Automated deployment platform
* Hardened Linux hosting appliance
* Repeatable architecture pattern
* Potential reusable service offering foundation

---

# Phase 2A — Content Platform Foundation (Completed)

## Objective

Enable non-technical business owner content management without developer dependency.

---

## Decision Made

Adopt hybrid model:

```text
Static front-end + WordPress CMS
```

Reasoning:

Balanced:

* Ease of use
* Scalability
* Maintainability
* Git-backed infrastructure continuity

---

## 1. WordPress Deployment

Implemented:

* WordPress installation
* Database provisioning
* Application configuration
* Apache integration
* `/wp` content environment

Result:

Content publishing platform operational.

---

## 2. CMS Enablement for Cheyla

Design principle:

```text
Owner-operated content without technical dependency
```

Supports:

* Content publishing
* Media upload
* Blog growth
* Future delegation

Lean principle:

Operate without engineer involvement.

---

## 3. Database Security

Completed:

* WordPress database user credential rotation
* Config update validation
* Connectivity verification
* Backup integration

Security hygiene improved.

---

## 4. Editorial Operating Model Defined

Initial content structure planned:

Proposed categories:

* Faith
* Family
* Purpose
* Motherhood

Supports scalable content taxonomy.

---

## 5. WordPress Architecture Positioning Decision

Decision:

Use WordPress as:

```text
Staged content platform (/wp)
```

Not yet replacing root website.

Rationale:

Validate before migration.

Lean staged rollout.

---

## 6. Operability Strategy Established

Recommended future content model:

* WordPress editing for owner
* GitHub retains infrastructure source control
* Hybrid publishing model preserved

Result:

Technical governance + business usability.

---

## Phase 2A Deliverables Summary

| Deliverable                  | Status   |
| ---------------------------- | -------- |
| WordPress Platform           | Complete |
| CMS Owner Enablement         | Complete |
| DB Security                  | Complete |
| Content Taxonomy Start       | Complete |
| Hybrid Architecture Decision | Complete |
| Operability Model            | Complete |

---

# Technology Stack

## Infrastructure

* Raspberry Pi
* Debian Linux
* Apache
* PHP
* MariaDB

## Edge / Security

* Cloudflare Tunnel
* Cloudflare Analytics
* UFW Firewall
* SSH Key Authentication

## DevOps / Automation

* Git
* GitHub
* Python Flask Webhook
* Systemd Services

## Content Platform

* WordPress

---

# Skills Demonstrated Through Project

This project exercised capabilities across:

## DevOps

* CI/CD automation
* Git deployment workflows
* Service management

## Infrastructure Engineering

* Web hosting architecture
* Reverse tunneling
* Linux administration

## Security

* SSH hardening
* Attack surface reduction
* Backup / recovery

## Product Thinking

* MVP sequencing
* Lean staged delivery
* Operability-driven architecture decisions

## Platform Engineering

* Reusable hosting pattern
* Self-managed micro platform design

---

# Estimated Phase Effort (Approx.)

| Workstream               | Estimated Hours |
| ------------------------ | --------------- |
| Infrastructure Setup     | 10-15           |
| Deployment Automation    | 8-12            |
| Security Hardening       | 6-8             |
| Cloudflare / Monitoring  | 5-7             |
| WordPress Enablement     | 6-8             |
| Architecture / Decisions | 5-8             |
| Total                    | 30-50+          |

---

# Risks Addressed

Mitigated:

* Origin exposure risk
* Manual deployment risk
* Credential risk
* Single-user technical dependency risk
* Recovery risk
* Content scalability risk

---

# Parking Lot / Future Backlog (Phase 2B+)

Potential next phases:

## Phase 2B Brand + Content

* Homepage polish
* Brand design refinement
* SEO foundations
* Contact form
* Image/media workflow

## Phase 3 Growth

* Root migration decision
* Content expansion
* Analytics optimization
* Lead capture
* Newsletter

## Phase 4 Advanced

* AI-assisted publishing ideas
* Client service productization
* Multi-site repeatable deployment model

---

# Lessons Learned

Key principles reinforced:

1. Start simple.
2. Harden early.
3. Operability matters as much as technology.
4. Git-backed infrastructure reduces risk.
5. Lean staged architecture avoids rabbit holes.

---

# Current Status

## Completed

✅ Phase 1 Infrastructure
✅ Phase 2A Platform Foundation

---

## Current State

Project has evolved from:

```text
Personal website
```

into:

```text
Secure self-hosted content platform
```

with repeatable service potential.

---

## Next Recommended Focus

Move into:

Phase 2B
Brand, Content, SEO, Contact Form, Polish




End of Phase 1 / Phase 2A Documentation.
