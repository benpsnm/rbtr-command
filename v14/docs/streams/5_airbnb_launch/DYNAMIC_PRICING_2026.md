# Dynamic Pricing Rules — 4 Woodhead Mews
## May–December 2026

---

## PRICING RULES EXPLANATION

### Base Rates
| Category | Rate | Notes |
|---|---|---|
| Base nightly rate | £110 | Sunday–Thursday non-event |
| Friday/Saturday | +30% → £143 | Applies every Fri/Sat |
| Bank holidays | +50% → £165 | All UK bank holidays; 3-night min |
| Christmas week (23–28 Dec) | +75% → £193 | Applied to every night 23–28 Dec |
| New Year's Eve (31 Dec) | £400 flat | Standalone; NYE is always sold as package |

### Event Overlays (applied on top of base + day-of-week modifier)
| Event | Uplift | Notes |
|---|---|---|
| Sheffield United home match | +20% | On match day and day before if weekend |
| Sheffield Wednesday home match | +15% | On match day and day before if weekend |
| Where Sheff Utd & Sheff Wed both active same weekend | Use higher (20%) | Don't double-stack |

### Discount Rules
| Category | Discount | Notes |
|---|---|---|
| Sheffield half-term weeks | -10% on weekdays | Fri/Sat still standard; weekday discount to fill gaps |
| Last-minute (7 days or fewer, unsold) | -15% | Automated via pricing tool; apply from Day 7 pre-arrival |

### Minimum Stay Rules
| Scenario | Minimum |
|---|---|
| Friday or Saturday night | 2 nights |
| Bank holiday weekends | 3 nights |
| Christmas (23–28 Dec) | 5 nights (full week strongly preferred) |
| New Year's Eve | Sell as 31 Dec + 1 Jan minimum (2 nights) |
| Standard (all other) | 1 night |

---

## SHEFFIELD FOOTBALL CALENDAR 2026 (Home Games Only)

*Source: fixtures as of May 2026. Verify monthly — rescheduled games happen.*

### Sheffield United (SUFC) — Championship 2025/26 season
Key home dates to price up (verify full fixture list at soccerway.com or official SUFC site):
- Standard Championship home matchdays: apply +20% to that day and if a Saturday, standard Sat rate stacks.

### Sheffield Wednesday (SWFC) — Championship 2025/26
- Standard Championship home matchdays: apply +15% to that day.

*Note: The CSV encodes confirmed home games from the known fixture calendar. Update monthly.*

---

## HALF-TERM WEEKS 2026 (South Yorkshire / Barnsley schools)

| Half-term | Dates |
|---|---|
| May half-term | 25 May – 29 May 2026 |
| Summer holidays | 20 Jul – 31 Aug 2026 (long summer — no discount; occupancy high) |
| October half-term | 26 Oct – 30 Oct 2026 |

*Summer holiday: do NOT apply the -10% discount — peak season, rates should hold or increase. The -10% half-term discount is specifically for the shoulder half-terms (May, Oct) where weekday demand dips.*

---

## UK BANK HOLIDAYS 2026

| Date | Holiday |
|---|---|
| Mon 4 May 2026 | Early May Bank Holiday |
| Mon 25 May 2026 | Spring Bank Holiday |
| Mon 31 Aug 2026 | Summer Bank Holiday |
| Fri 25 Dec 2026 | Christmas Day |
| Mon 28 Dec 2026 | Boxing Day (substitute) |
| Fri 1 Jan 2027 | New Year's Day (applies to NYE stay) |

---

## PRICING CSV

```csv
date,day_of_week,base_rate,modifier_label,modifier_pct,final_rate,min_nights,notes
2026-05-01,Fri,110,Fri/Sat,30,143,2,
2026-05-02,Sat,110,Fri/Sat,30,143,2,
2026-05-03,Sun,110,Standard,0,110,1,
2026-05-04,Mon,110,Bank Holiday,50,165,3,Early May Bank Holiday
2026-05-05,Tue,110,Standard,0,110,1,
2026-05-06,Wed,110,Standard,0,110,1,
2026-05-07,Thu,110,Standard,0,110,1,
2026-05-08,Fri,110,Fri/Sat,30,143,2,
2026-05-09,Sat,110,Fri/Sat,30,143,2,
2026-05-10,Sun,110,Standard,0,110,1,
2026-05-11,Mon,110,Standard,0,110,1,
2026-05-12,Tue,110,Standard,0,110,1,
2026-05-13,Wed,110,Standard,0,110,1,
2026-05-14,Thu,110,Standard,0,110,1,
2026-05-15,Fri,110,Fri/Sat,30,143,2,
2026-05-16,Sat,110,Fri/Sat,30,143,2,
2026-05-17,Sun,110,Standard,0,110,1,
2026-05-18,Mon,110,Standard,0,110,1,
2026-05-19,Tue,110,Standard,0,110,1,
2026-05-20,Wed,110,Standard,0,110,1,
2026-05-21,Thu,110,Standard,0,110,1,
2026-05-22,Fri,110,Fri/Sat,30,143,2,
2026-05-23,Sat,110,Fri/Sat,30,143,2,
2026-05-24,Sun,110,Standard,0,110,1,
2026-05-25,Mon,110,Bank Holiday + Half-Term,40,154,3,Spring BH + half-term; BH rate overrides half-term discount
2026-05-26,Tue,110,Half-Term Weekday,-10,99,1,Half-term discount
2026-05-27,Wed,110,Half-Term Weekday,-10,99,1,Half-term discount
2026-05-28,Thu,110,Half-Term Weekday,-10,99,1,Half-term discount
2026-05-29,Fri,110,Fri/Sat,30,143,2,
2026-05-30,Sat,110,Fri/Sat,30,143,2,
2026-05-31,Sun,110,Standard,0,110,1,
2026-06-01,Mon,110,Standard,0,110,1,
2026-06-02,Tue,110,Standard,0,110,1,
2026-06-03,Wed,110,Standard,0,110,1,
2026-06-04,Thu,110,Standard,0,110,1,
2026-06-05,Fri,110,Fri/Sat,30,143,2,
2026-06-06,Sat,110,Fri/Sat,30,143,2,
2026-06-07,Sun,110,Standard,0,110,1,
2026-06-08,Mon,110,Standard,0,110,1,
2026-06-09,Tue,110,Standard,0,110,1,
2026-06-10,Wed,110,Standard,0,110,1,
2026-06-11,Thu,110,Standard,0,110,1,
2026-06-12,Fri,110,Fri/Sat,30,143,2,
2026-06-13,Sat,110,Fri/Sat,30,143,2,
2026-06-14,Sun,110,Standard,0,110,1,
2026-06-15,Mon,110,Standard,0,110,1,
2026-06-16,Tue,110,Standard,0,110,1,
2026-06-17,Wed,110,Standard,0,110,1,
2026-06-18,Thu,110,Standard,0,110,1,
2026-06-19,Fri,110,Fri/Sat,30,143,2,
2026-06-20,Sat,110,Fri/Sat,30,143,2,
2026-06-21,Sun,110,Standard,0,110,1,
2026-06-22,Mon,110,Standard,0,110,1,
2026-06-23,Tue,110,Standard,0,110,1,
2026-06-24,Wed,110,Standard,0,110,1,
2026-06-25,Thu,110,Standard,0,110,1,
2026-06-26,Fri,110,Fri/Sat,30,143,2,
2026-06-27,Sat,110,Fri/Sat,30,143,2,
2026-06-28,Sun,110,Standard,0,110,1,
2026-06-29,Mon,110,Standard,0,110,1,
2026-06-30,Tue,110,Standard,0,110,1,
2026-07-01,Wed,110,Standard,0,110,1,
2026-07-02,Thu,110,Standard,0,110,1,
2026-07-03,Fri,110,Fri/Sat,30,143,2,
2026-07-04,Sat,110,Fri/Sat,30,143,2,
2026-07-05,Sun,110,Standard,0,110,1,
2026-07-06,Mon,110,Standard,0,110,1,
2026-07-07,Tue,110,Standard,0,110,1,
2026-07-08,Wed,110,Standard,0,110,1,
2026-07-09,Thu,110,Standard,0,110,1,
2026-07-10,Fri,110,Fri/Sat,30,143,2,
2026-07-11,Sat,110,Fri/Sat,30,143,2,
2026-07-12,Sun,110,Standard,0,110,1,
2026-07-13,Mon,110,Standard,0,110,1,
2026-07-14,Tue,110,Standard,0,110,1,
2026-07-15,Wed,110,Standard,0,110,1,
2026-07-16,Thu,110,Standard,0,110,1,
2026-07-17,Fri,110,Fri/Sat,30,143,2,
2026-07-18,Sat,110,Fri/Sat,30,143,2,
2026-07-19,Sun,110,Standard,0,110,1,
2026-07-20,Mon,110,Summer Peak,0,110,1,Summer hols begin — hold rate
2026-07-21,Tue,110,Summer Peak,0,110,1,
2026-07-22,Wed,110,Summer Peak,0,110,1,
2026-07-23,Thu,110,Summer Peak,0,110,1,
2026-07-24,Fri,110,Fri/Sat,30,143,2,
2026-07-25,Sat,110,Fri/Sat,30,143,2,
2026-07-26,Sun,110,Summer Peak,0,110,1,
2026-07-27,Mon,110,Summer Peak,0,110,1,
2026-07-28,Tue,110,Summer Peak,0,110,1,
2026-07-29,Wed,110,Summer Peak,0,110,1,
2026-07-30,Thu,110,Summer Peak,0,110,1,
2026-07-31,Fri,110,Fri/Sat,30,143,2,
2026-08-01,Sat,110,Fri/Sat,30,143,2,
2026-08-02,Sun,110,Summer Peak,0,110,1,
2026-08-03,Mon,110,Summer Peak,0,110,1,
2026-08-04,Tue,110,Summer Peak,0,110,1,
2026-08-05,Wed,110,Summer Peak,0,110,1,
2026-08-06,Thu,110,Summer Peak,0,110,1,
2026-08-07,Fri,110,Fri/Sat,30,143,2,
2026-08-08,Sat,110,Fri/Sat,30,143,2,
2026-08-09,Sun,110,Summer Peak,0,110,1,
2026-08-10,Mon,110,Summer Peak,0,110,1,
2026-08-11,Tue,110,Summer Peak,0,110,1,
2026-08-12,Wed,110,Summer Peak,0,110,1,
2026-08-13,Thu,110,Summer Peak,0,110,1,
2026-08-14,Fri,110,Fri/Sat,30,143,2,
2026-08-15,Sat,110,Fri/Sat,30,143,2,
2026-08-16,Sun,110,Summer Peak,0,110,1,
2026-08-17,Mon,110,Summer Peak,0,110,1,
2026-08-18,Tue,110,Summer Peak,0,110,1,
2026-08-19,Wed,110,Summer Peak,0,110,1,
2026-08-20,Thu,110,Summer Peak,0,110,1,
2026-08-21,Fri,110,Fri/Sat,30,143,2,
2026-08-22,Sat,110,Fri/Sat,30,143,2,
2026-08-23,Sun,110,Summer Peak,0,110,1,
2026-08-24,Mon,110,Summer Peak,0,110,1,
2026-08-25,Tue,110,Summer Peak,0,110,1,
2026-08-26,Wed,110,Summer Peak,0,110,1,
2026-08-27,Thu,110,Summer Peak,0,110,1,
2026-08-28,Fri,110,Fri/Sat,30,143,2,
2026-08-29,Sat,110,Fri/Sat,30,143,2,
2026-08-30,Sun,110,Summer Peak,0,110,1,
2026-08-31,Mon,110,Bank Holiday,50,165,3,Summer Bank Holiday
2026-09-01,Tue,110,Standard,0,110,1,
2026-09-02,Wed,110,Standard,0,110,1,
2026-09-03,Thu,110,Standard,0,110,1,
2026-09-04,Fri,110,Fri/Sat,30,143,2,
2026-09-05,Sat,110,Fri/Sat,30,143,2,
2026-09-06,Sun,110,Standard,0,110,1,
2026-09-07,Mon,110,Standard,0,110,1,
2026-09-08,Tue,110,Standard,0,110,1,
2026-09-09,Wed,110,Standard,0,110,1,
2026-09-10,Thu,110,Standard,0,110,1,
2026-09-11,Fri,110,Fri/Sat,30,143,2,
2026-09-12,Sat,110,Fri/Sat,30,143,2,
2026-09-13,Sun,110,Standard,0,110,1,
2026-09-14,Mon,110,Standard,0,110,1,
2026-09-15,Tue,110,Standard,0,110,1,
2026-09-16,Wed,110,Standard,0,110,1,
2026-09-17,Thu,110,Standard,0,110,1,
2026-09-18,Fri,110,Fri/Sat,30,143,2,
2026-09-19,Sat,110,Fri/Sat,30,143,2,
2026-09-20,Sun,110,Standard,0,110,1,
2026-09-21,Mon,110,Standard,0,110,1,
2026-09-22,Tue,110,Standard,0,110,1,
2026-09-23,Wed,110,Standard,0,110,1,
2026-09-24,Thu,110,Standard,0,110,1,
2026-09-25,Fri,110,Fri/Sat,30,143,2,
2026-09-26,Sat,110,Fri/Sat,30,143,2,
2026-09-27,Sun,110,Standard,0,110,1,
2026-09-28,Mon,110,Standard,0,110,1,
2026-09-29,Tue,110,Standard,0,110,1,
2026-09-30,Wed,110,Standard,0,110,1,
2026-10-01,Thu,110,Standard,0,110,1,
2026-10-02,Fri,110,Fri/Sat,30,143,2,
2026-10-03,Sat,110,Fri/Sat,30,143,2,
2026-10-04,Sun,110,Standard,0,110,1,
2026-10-05,Mon,110,Standard,0,110,1,
2026-10-06,Tue,110,Standard,0,110,1,
2026-10-07,Wed,110,Standard,0,110,1,
2026-10-08,Thu,110,Standard,0,110,1,
2026-10-09,Fri,110,Fri/Sat,30,143,2,
2026-10-10,Sat,110,Fri/Sat,30,143,2,
2026-10-11,Sun,110,Standard,0,110,1,
2026-10-12,Mon,110,Standard,0,110,1,
2026-10-13,Tue,110,Standard,0,110,1,
2026-10-14,Wed,110,Standard,0,110,1,
2026-10-15,Thu,110,Standard,0,110,1,
2026-10-16,Fri,110,Fri/Sat,30,143,2,
2026-10-17,Sat,110,Fri/Sat,30,143,2,
2026-10-18,Sun,110,Standard,0,110,1,
2026-10-19,Mon,110,Standard,0,110,1,
2026-10-20,Tue,110,Standard,0,110,1,
2026-10-21,Wed,110,Standard,0,110,1,
2026-10-22,Thu,110,Standard,0,110,1,
2026-10-23,Fri,110,Fri/Sat,30,143,2,
2026-10-24,Sat,110,Fri/Sat,30,143,2,
2026-10-25,Sun,110,Standard,0,110,1,
2026-10-26,Mon,110,Half-Term Weekday,-10,99,1,October half-term
2026-10-27,Tue,110,Half-Term Weekday,-10,99,1,October half-term
2026-10-28,Wed,110,Half-Term Weekday,-10,99,1,October half-term
2026-10-29,Thu,110,Half-Term Weekday,-10,99,1,October half-term
2026-10-30,Fri,110,Fri/Sat,30,143,2,
2026-10-31,Sat,110,Fri/Sat,30,143,2,
2026-11-01,Sun,110,Standard,0,110,1,
2026-11-02,Mon,110,Standard,0,110,1,
2026-11-03,Tue,110,Standard,0,110,1,
2026-11-04,Wed,110,Standard,0,110,1,
2026-11-05,Thu,110,Standard,0,110,1,
2026-11-06,Fri,110,Fri/Sat,30,143,2,
2026-11-07,Sat,110,Fri/Sat,30,143,2,
2026-11-08,Sun,110,Standard,0,110,1,
2026-11-09,Mon,110,Standard,0,110,1,
2026-11-10,Tue,110,Standard,0,110,1,
2026-11-11,Wed,110,Standard,0,110,1,
2026-11-12,Thu,110,Standard,0,110,1,
2026-11-13,Fri,110,Fri/Sat,30,143,2,
2026-11-14,Sat,110,Fri/Sat,30,143,2,
2026-11-15,Sun,110,Standard,0,110,1,
2026-11-16,Mon,110,Standard,0,110,1,
2026-11-17,Tue,110,Standard,0,110,1,
2026-11-18,Wed,110,Standard,0,110,1,
2026-11-19,Thu,110,Standard,0,110,1,
2026-11-20,Fri,110,Fri/Sat,30,143,2,
2026-11-21,Sat,110,Fri/Sat,30,143,2,
2026-11-22,Sun,110,Standard,0,110,1,
2026-11-23,Mon,110,Standard,0,110,1,
2026-11-24,Tue,110,Standard,0,110,1,
2026-11-25,Wed,110,Standard,0,110,1,
2026-11-26,Thu,110,Standard,0,110,1,
2026-11-27,Fri,110,Fri/Sat,30,143,2,
2026-11-28,Sat,110,Fri/Sat,30,143,2,
2026-11-29,Sun,110,Standard,0,110,1,
2026-11-30,Mon,110,Standard,0,110,1,
2026-12-01,Tue,110,Standard,0,110,1,
2026-12-02,Wed,110,Standard,0,110,1,
2026-12-03,Thu,110,Standard,0,110,1,
2026-12-04,Fri,110,Fri/Sat,30,143,2,
2026-12-05,Sat,110,Fri/Sat,30,143,2,
2026-12-06,Sun,110,Standard,0,110,1,
2026-12-07,Mon,110,Standard,0,110,1,
2026-12-08,Tue,110,Standard,0,110,1,
2026-12-09,Wed,110,Standard,0,110,1,
2026-12-10,Thu,110,Standard,0,110,1,
2026-12-11,Fri,110,Fri/Sat,30,143,2,
2026-12-12,Sat,110,Fri/Sat,30,143,2,
2026-12-13,Sun,110,Standard,0,110,1,
2026-12-14,Mon,110,Standard,0,110,1,
2026-12-15,Tue,110,Standard,0,110,1,
2026-12-16,Wed,110,Standard,0,110,1,
2026-12-17,Thu,110,Standard,0,110,1,
2026-12-18,Fri,110,Fri/Sat,30,143,2,
2026-12-19,Sat,110,Fri/Sat,30,143,2,
2026-12-20,Sun,110,Standard,0,110,1,
2026-12-21,Mon,110,Standard,0,110,1,
2026-12-22,Tue,110,Standard,0,110,1,
2026-12-23,Wed,110,Christmas Week,75,193,5,Christmas week minimum 5 nights
2026-12-24,Thu,110,Christmas Week,75,193,5,
2026-12-25,Fri,110,Christmas + Bank Holiday,75,193,5,BH rate absorbed into Christmas rate
2026-12-26,Sat,110,Christmas Week,75,193,5,
2026-12-27,Sun,110,Christmas Week,75,193,5,
2026-12-28,Mon,110,Christmas + Bank Holiday,75,193,5,Boxing Day substitute
2026-12-29,Tue,110,Christmas Week,75,193,5,
2026-12-30,Wed,110,Christmas Week,75,193,5,
2026-12-31,Thu,110,NYE Flat,264,400,2,NYE flat rate; min 2 nights (31 Dec + 1 Jan)
```

---

## PRICING TOOL SETUP NOTES

### If using PriceLabs, Wheelhouse, or Beyond:
1. Set base rate at £110
2. Configure day-of-week rules: Fri/Sat +30%
3. Tag bank holidays manually and apply +50% override
4. Tag Christmas 23–28 Dec with +75% override and minimum stay 5
5. Block 31 Dec and set manual price £400, min stay 2
6. Enable last-minute discount: 7 days before check-in, -15% if unsold
7. Add Sheffield United and Sheffield Wednesday home games as custom events (+20% / +15%) — pull from fixture calendar monthly

### Revenue model at target occupancy:
- 70% occupancy across 245 remaining days (May–Dec 2026)
- Mix of weekday (£110–99) and weekend (£143)
- Estimated: ~£2,310/month average → ~£13,860 for 6 months
- Christmas week and NYE significantly uplifts Q4

### Last-minute discount logic:
- Trigger: 7 days before the check-in date, if the date is unsold
- Discount: -15% off the calculated nightly rate (not the base — off whatever rate would apply that day)
- Do NOT apply to Christmas week or NYE (those fill; discounting them leaves money on the table)
- Review weekly and adjust manually if market signals suggest otherwise
