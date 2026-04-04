# EAA Compliance Review — SDG-8612

**Directive:** (EU) 2019/882 (European Accessibility Act)  
**Review basis:** Documents provided March 2026  

**Product:** SDG-8612 / SDG-8614  
**Firmware variants:** SmartOS, PlumeOS DHCP, PlumeOS PPPoE  
**Reviewer:** ___________________________  
**Date:** ____________

---

## Scope and methodology

This review assesses the SDG-8612 against all EAA accessibility requirements applicable to consumer terminal equipment used for electronic communications services (Recital 30; Annex I, Sections I and II). The product is in scope as a router/gateway foreseeably used as part of the setup for accessing electronic communications services.

*Documents reviewed:*  
Quick Start Guide Issue C (Oct 2025, 6SDG861214-13C); SmartOS User Guide Issue A (Jan 2026, doc 80000082599); CMF/Device design file (BP_Device_CMF_13May2025); Giftbox diecut (COS-1_12June2025); CE Declaration of Conformity (DOC_CE_Mark_SRG86xy_3704-5-6, dated May 17 2024); RF Exposure Report (EA341804-01); ITU‑T K.21 Test Report (105670181LEX-001, dated Jan 8 2024); EUT Photographs (EP341804-01).

---

## Status key

| Status |
|-------|
| **CONFIRMED GAP** |
| **LIKELY GAP** |
| **PARTIALLY MET** |
| **MET / LIKELY MET** |
| **N/A** |
| **CANNOT ASSESS** |

---

## Assessment findings

### A. Product Labelling & On‑Device Markings  
*Annex I, Section I, points 1(a) & 2(d)*

| Ref | Team | Requirement | Evidence / Finding | Status | Comments |
|----|------|-------------|-------------------|--------|----------|
| A.1 | Hardware | All on‑product labels and indicators convey information via more than one sensory channel | Multifunction LED states differentiated exclusively by color and blink pattern; no text or tactile alternative. **Partial WebUI mitigation implemented (Apr 2026):** SmartOS WebUI Device Info card now mirrors all 13 LED states as a labeled text indicator with animation class. Color is not the sole differentiator in the WebUI. Physical LED hardware gap remains. | **CONFIRMED GAP (WebUI partial mitigation applied)** | WebUI mitigation complete. Still required: text legend for Ethernet LEDs in QSG; physical product hardware remains non-compliant. |
| A.2 | Hardware | On‑product text uses sufficient size & contrast | CMF specifies Poppins font, contrast appears sufficient; physical measurement not confirmed | **LIKELY MET** | |
| A.3 | Hardware | Color‑only status indicators have non‑color alternative | Ethernet and SFP LEDs rely on color only. WebUI mirrors LED state as labeled text (see A.1). | **CONFIRMED GAP (WebUI partial mitigation applied)** | Same as A.1 |

---

### B. Product Documentation & Web‑Hosted Instructions  
*Annex I, Section I, points 1(b) & 1(b)(i–ix)*

| Ref | Team | Requirement | Evidence / Finding | Status | Comments |
|----|------|-------------|-------------------|--------|----------|
| B.1 | Documentation | Documentation is in accessible digital format | PDFs show no evidence of accessibility tagging | **LIKELY GAP** | Assign to Tech Pubs |
| B.2 | Documentation | Available via more than one sensory channel | PDF only; no HTML, audio, or video | **CONFIRMED GAP** | Tech Pubs |
| B.3 | Documentation | Plain, understandable language | QSG is clear and installer‑friendly | **MET** | |
| B.4 | Documentation | Diagrams/icons have text equivalents | Figures lack descriptive captions or alt‑text | **CONFIRMED GAP** | Tech Pubs |
| B.5 | Documentation | Accessibility features described and how to activate | No accessibility section anywhere | **CONFIRMED GAP** | Tech Pubs |
| B.6 | Documentation | Functionality addressing disabilities described | Entirely absent | **CONFIRMED GAP** | Tech Pubs |
| B.7 | Documentation | Assistive devices tested listed | No compatibility or test info | **CONFIRMED GAP** | Tech Pubs |
| B.8 | Documentation | Publicly available over product lifetime | Confirmed public access | **MET** | |

---

### C. Software / UI

| Ref | Requirement | Evidence / Finding | Status | Comments |
|----|-------------|-------------------|--------|----------|
| C.1 | Screen reader compatibility | ARIA implemented in Port Status widget: `role=button` on SVG port shapes, `role=listitem` on detail cards, `role=log`+`aria-live=polite` on event log, `role=tooltip`+`aria-describedby` on tooltip; canvas `aria-label` updated live. Full dashboard audit pending. | **PARTIALLY MET** | Remaining dashboard cards not yet audited |
| C.2 | Multi‑sensory UI feedback | Port Status tooltips fire on focus and hover, providing text alternatives to all visual indicators in that widget. Color‑coded charts in other cards not yet remediated. | **PARTIALLY MET** | Extend to remaining dashboard charts |
| C.3 | No speech‑only operation | Keyboard navigation validated: all Port Status interactive elements reachable via Tab; focus order matches visual order | **LIKELY MET** | |
| C.4 | WCAG contrast & magnification | No data or screenshots | **CANNOT ASSESS** | Engineering |
| C.5 | Non‑color UI indicators | Port Status state dots: filled circle (up) vs hollow ring (down) — shape differs independently of color. Event log dots same pattern. Badge text labels carry meaning without color. Device Info card: all 13 hardware LED states mirrored as labeled text indicator (Apr 2026) — addresses hardware A.1/A.3 gap at WebUI level. Dashboard charts (throughput, airtime) remain color‑primary. | **PARTIALLY MET** | Extend shape/pattern coding to remaining charts |
| C.6 | Audio alerts alternatives | No audio output | **N/A** | |
| C.7 | Visual clarity options | Dark mode toggle available. `@media (forced-colors: active)` implemented: covers state dots, focus rings, badges, LTE bars, tooltip. Relies on OS‑level HC mode; no custom in‑app HC toggle. | **PARTIALLY MET** | Tech pubs to document HC mode activation (B.5/B.6) |
| C.8 | Audio volume control | No audio output | **N/A** | |
| C.9 | No fine‑motor‑only workflows | Form‑based UI | **LIKELY MET** | |
| C.10 | Configurable timeouts | Pending‑changes dialog documented | **LIKELY MET** | |
| C.11 | No seizure‑inducing flashing | No high‑frequency flashing described | **MET** | |
| C.12 | Privacy with accessibility | No features documented | **CANNOT ASSESS** | |
| C.13 | Non‑biometric login option | Password login available | **LIKELY MET** | |
| C.14 | Assistive tech APIs | ARIA implemented in Port Status: SVG shapes linked to detail cards via `aria-describedby`; tooltip uses `role=tooltip`; live region uses standard DOM pattern. Remaining dashboard cards not yet assessed. | **PARTIALLY MET** | Full dashboard ARIA audit pending |

---

### D. Physical Hardware Design  
*Annex I, Section I, points 2(h),(i),(j)*

| Ref | Requirement | Evidence / Finding | Status |
|----|-------------|-------------------|--------|
| D.1 | Tactile buttons | Reset button recessed; tactile switch | **MET** |
| D.2 | No multi‑button operations | Single‑button only | **MET** |
| D.3 | Reach & force | Appears accessible | **MET** |
| D.4 | No hazardous flashing LEDs | Blink rates unquantified but appear safe | **MET** |

---

### E. Hearing Technology & RF Non‑Interference  
*Annex I, Section I, point 2(o)(iii)*

| Ref | Requirement | Evidence / Finding | Status |
|----|-------------|-------------------|--------|
| E.1 | No hearing‑aid interference | No EN 301 489‑17 evidence | **CONFIRMED GAP** |
| E.2 | Audio coupling to T‑coil | No audio hardware | **N/A** |

---

### F. Support Services  
*Annex I, Section I, point 3*

| Ref | Requirement | Evidence / Finding | Status |
|----|-------------|-------------------|--------|
| F.1 | Accessibility info in support | None present | **CONFIRMED GAP** |
| F.2 | Accessible support formats | Phone + email only | **PARTIALLY MET** |
| F.3 | Trained support staff | No evidence | **CANNOT ASSESS** |

---

### G. Packaging  
*Annex I, Section II*

| Ref | Requirement | Evidence / Finding | Status |
|----|-------------|-------------------|--------|
| G.1 | Accessible information on packaging | Not assessed | **CANNOT ASSESS** |
| G.2 | Accessibility features highlighted | None documented | **CONFIRMED GAP** |
| G.3 | Online install/maintenance docs accessible | Same gaps as Section B | **CONFIRMED GAP** |

---

## Priority remediation actions

| Ref | Team | Action required | Priority |
|----|------|-----------------|----------|
| E.1 | Hardware | Commission EN 301 489‑17 hearing‑aid interference testing | **CRITICAL** |
| B.5–B.7 | Documentation | Add Accessibility sections + assistive device list | **HIGH** |
| B.1 / B.4 | Documentation | Produce WCAG/PDF‑UA compliant docs; add alt‑text | **HIGH** |
| C.1–C.5 / C.14 | Software / UI | Port Status widget: ARIA, keyboard nav, focus rings, shape coding, forced‑colors — **complete**. Remaining: extend ARIA + shape coding to dashboard charts (throughput, airtime, QoE); formal 4.5:1 contrast audit | **HIGH (in progress)** |
| F.1 | Support | Add accessibility statements to support pages | **MEDIUM** |

---

## Sign‑off

| Role | Name | Signature | Date |
|-----|------|-----------|------|
| Hardware Lead | | | |
| Software / UI Lead | | | |
| Documentation Lead | | | |
| Compliance / Legal | | | |

---

*Document control:* retain completed review ≥5 years (EAA Article 14(5)).
Next review: 12 months from review date or upon product revision.

---

## Revision history

| Date | Author | Changes |
|------|--------|---------|
| Mar 2026 | Initial review | Baseline assessment against documents provided |
| Apr 2026 | Software / UI team | C.1, C.2, C.3, C.5, C.7, C.14 updated: Port Status widget ARIA, keyboard nav, focus rings, shape‑coded indicators, `forced-colors` media query implemented. C.1/C.14: CANNOT ASSESS → PARTIALLY MET. C.2/C.5: LIKELY GAP → PARTIALLY MET. C.3: evidence strengthened. C.7: forced‑colors coverage added. Remediation action C.1–C.5/C.14 marked in progress. |
| Apr 2026 | Software / UI team | A.1, A.3, C.5 updated: Device Info card LED state indicator implemented. All 13 MCU LED states mirrored as labeled text in WebUI (no color dependency). Partially addresses hardware A.1/A.3 gap at software layer. |

