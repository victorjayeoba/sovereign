# MERIDIAN CAPITAL PARTNERS, LLP

**14 Cheapside · London EC2V 6DN · Established 1998 · FRN 412309**

---

> **CONFIDENTIAL — INTERNAL ONLY**

|             |                                                  |
|-------------|--------------------------------------------------|
| **To**      | Investment Committee                             |
| **From**    | Compliance & On-Chain Forensics Desk             |
| **Cc**      | Office of the General Counsel; Risk Management   |
| **Date**    | 14 March 2026                                    |
| **Re**      | Project ATLAS — Pre-Investment Risk Assessment   |
| **File**    | MCP/CO-2026-0314-ATLAS-R1                        |

# Pre-Investment Risk Assessment — Project ATLAS

*Counterparty: Argonaut Trading Ltd. (Cayman Islands)*

---

## 1. Executive Summary

This memorandum summarises preliminary findings from the Compliance Desk's on-chain review of **Argonaut Trading Ltd.** ("Argonaut"), a Cayman-incorporated digital-asset trading firm that has approached Meridian Capital Partners regarding a proposed **USD 50,000,000** strategic investment.

The review covers wallet addresses provided by Argonaut's principals during onboarding, supplemented by addresses identified through public-source clustering. Several concerns warrant escalation to the Investment Committee before further engagement is approved. A formal Tier-2 forensic review is recommended.

## 2. Subject Counterparty Profile

| Field                  | Value                                                                                                |
|------------------------|------------------------------------------------------------------------------------------------------|
| Legal entity           | Argonaut Trading Ltd. (Cayman Islands; Registration 2021-AT-99182)                                   |
| Founded                | April 2021                                                                                           |
| Stated AUM             | USD 180,000,000 (unaudited)                                                                          |
| Auditor                | None disclosed                                                                                       |
| Principals             | Mikhail Volkov (CEO); Lena Petrova (CFO); Daniel Reyes (CTO)                                         |
| Banking — prior        | Signature Bank (closed March 2023)                                                                   |
| Banking — current      | Mercantile Trust Bahamas                                                                             |
| Stated trading hours   | 24/7, peak volume 03:00–05:00 UTC                                                                    |

Onboarding documentation was received on 6 March 2026 via the firm's secure data room. Source materials include (i) a self-prepared compliance questionnaire, (ii) an unstructured spreadsheet listing wallet addresses across three blockchains, and (iii) passport copies for each named principal. Materials are filed under MCP/CO-2026-0306-ATLAS-D1.

## 3. Counterparty Wallet Inventory

The following wallet addresses were disclosed by **Argonaut Trading Ltd.** during standard Know-Your-Business onboarding. Disclosure was unstructured (spreadsheet attachment); ownership-control signatures have not yet been verified by the Compliance Desk.

| Chain    | Address                                          | Stated Purpose         |
|----------|--------------------------------------------------|------------------------|
| Ethereum | `0x098B716B8Aaf21512996dC57EB0615e2383E2f96`     | Operating treasury     |
| Ethereum | `0x8589427373D6D84E98730D7795D8f6f8731FDA16`     | OTC settlement pool    |
| Ethereum | `0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B`     | Market-making float    |
| Bitcoin  | `bc1qm97vqzgj934vnaq9s53ynkyf9dgr05rargr04n`     | Cold-storage reserve   |
| Solana   | `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`   | DeFi yield positions   |
| Solana   | `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`   | Operational hot wallet |

Argonaut represents that the above inventory constitutes the firm's complete operating wallet set and that no additional wallets hold client funds. We note that the *Operating treasury* address has historical inflow patterns predating Argonaut's stated incorporation date, and that several of the listed addresses appear in open-source intelligence advisories. These are addressed in §4 below.

### 3.1 Verification status

Proof-of-control signatures have not been received. The Compliance Desk has requested a fresh signed message from each disclosed address against a Meridian-supplied nonce. Argonaut has not yet responded; this remains outstanding as of 14 March 2026.

## 4. Preliminary On-Chain Findings

The Compliance Desk performed a first-pass screen of the disclosed addresses using publicly-available datasets. The following observations require further review:

### 4.1 Operating Treasury (Ethereum)

The Operating Treasury address shows historical inflow patterns from clusters that have appeared in open-source intelligence advisories (Chainalysis Q4 2024 report; FBI public advisories). Activity precedes Argonaut's stated date of incorporation by roughly two years. While the firm represents that addresses were "rotated in" from prior personal use of the principals, the Compliance Desk has not received supporting documentation.

### 4.2 OTC Settlement Pool (Ethereum)

The OTC settlement address has been referenced in third-party sanctions monitoring tools, though the Compliance Desk has not independently confirmed the underlying source dataset. A Tier-2 cross-reference against the live OFAC SDN list is recommended before any further engagement.

### 4.3 Trading-Hours Anomaly

Argonaut self-reports a North American clientele yet operates with peak volume between 03:00 and 05:00 UTC (i.e. 22:00–00:00 US Eastern, 11:00–13:00 Moscow). This asymmetry does not constitute a finding in isolation but is noted for the Investment Committee's awareness.

## 5. Linked Counterparties

Onboarding documentation references the following entities as Argonaut's primary trading counterparties. Of these, **Halcyon Markets** has previously appeared in regulatory enforcement actions (FinCEN advisory FIN-2024-A001). Cross-counterparty exposure analysis is pending.

| Counterparty                       | Jurisdiction              | Notes                                            |
|-----------------------------------|---------------------------|--------------------------------------------------|
| Halcyon Markets                    | British Virgin Islands    | FinCEN advisory FIN-2024-A001 (May 2024)         |
| Aetherflow Technologies, Inc.      | Delaware, USA             | None                                             |
| Bridgepoint Treasury Services Ltd. | Hong Kong SAR             | None                                             |
| Vertex Liquidity Partners          | Singapore                 | None                                             |

## 6. Recommendation

The Compliance Desk recommends **pausing Argonaut engagement** pending a Tier-2 forensic review of all disclosed wallet addresses against the current OFAC Specially Designated Nationals (SDN) list, FATF travel-rule registries, and proprietary intelligence databases. Specifically:

1. **Commission third-party forensic assessment** per Compliance Policy 4.7 (Tier-2 — addresses screened against SDN, FATF, mixer-exposure, and counterparty-risk registries).
2. **Require Argonaut to provide signed proof-of-control** for each disclosed address, against a Meridian-supplied nonce, within five (5) business days.
3. **Defer further legal or commercial engagement** with Argonaut until forensic review is complete and signed off by the General Counsel and the Head of Compliance.

Decision required from: Investment Committee.
Target completion of forensic review: **21 March 2026**.

---

_Mikhail Volkov_
**Mikhail Volkov**
Chief Executive Officer · Argonaut Trading Ltd.

_Elena Hartwell_
**Elena Hartwell**
Head of Compliance · Meridian Capital Partners, LLP

---

*This document contains material non-public information and may be subject to attorney–client privilege. Distribution outside the named recipients is prohibited under Meridian Capital Partners Information Security Policy 2.3. Unauthorised disclosure is grounds for immediate termination and may constitute a violation of the UK Data Protection Act 2018, the EU GDPR, and applicable Cayman financial-services regulation.*
