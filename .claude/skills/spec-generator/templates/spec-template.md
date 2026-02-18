# [Project Name] — Project Specification (SPEC)

> This document provides project-specific context to the Legacy Analysis Skill.
> Replace content in `[brackets]` with actual project information.
> Not all sections are required. Fill in only what you know — analysis can proceed with partial info.
> **Minimum required**: Tech Stack + Entry Point Class

---

## 1. Project Overview

- **System name**: [e.g., Order Management System (OMS)]
- **Purpose**: [Business problem this system solves]
- **Built**: [e.g., 2017]
- **Current status**: [In production / Maintenance mode / Partially operational]
- **Reason for analysis**: [e.g., Next-gen migration, original developers left, no documentation]

---

## 2. Tech Stack

| Category  | Technology                          | Version   | Notes             |
| --------- | ----------------------------------- | --------- | ----------------- |
| Language  | [Java / C# / Python / ...]          | [version] |                   |
| Framework | [Spring / .NET / Django / ...]      | [version] |                   |
| ORM/SQL   | [MyBatis / JPA / Hibernate / ...]   | [version] |                   |
| DB        | [Oracle / MySQL / PostgreSQL / ...] | [version] |                   |
| Build     | [Maven / Gradle / ...]              | [version] | Multi-module: Y/N |
| VCS       | [Git / SVN / ...]                   |           |                   |

---

## 3. Directory Structure

```
project-root/
├── [moduleA]/
│   └── src/main/java/com/example/[package]/ # ★ Mark if analysis target
│       ├── controller/
│       ├── service/
│       ├── dao/
│       └── dto/
├── [moduleB]/
│   └── ...
└── common/
```

> Mark packages that need analysis with ★.

---

## 4. Analysis Target Modules ★ Required

### Module: [Module Name]

모듈은 프로젝트의 SPEC.md 를 참조한다.

- **Path**: `[module root path]`
- **Role**: [One-line summary]
- **Entry point**: `[ClassName.methodName()]` ★
- **Key classes**:
  - `[Class1.java]` — [role]
  - `[Class2.java]` — [role]
- **Related SQL mappers**: `[MapperName.xml]`
- **Known quirks**: [if any]

> Repeat this section for each module to be analyzed.

---

## 5. Database

### Key Tables

| Table        | Role                  | Key Columns                       | Notes                          |
| ------------ | --------------------- | --------------------------------- | ------------------------------ |
| [T_ORDER]    | [Order master]        | [status, order_type, amount, ...] | [status acts as state machine] |
| [T_BILLING]  | [Billing records]     | [...]                             |                                |
| [T_XXX_RULE] | [Business rule table] | [...]                             |                                |

### ERD

> Attach an ERD image or text-based relationship diagram here.
> If unavailable, even a simple description of key table relationships helps.

```
T_ORDER (1) ──── (N) T_BILLING
T_ORDER (N) ──── (1) T_MERCHANT
T_SETTLEMENT_RULE (1) ──── (N) T_MERCHANT
```

### Known State Values (if available)

| Table.Column   | Value   | Meaning           |
| -------------- | ------- | ----------------- |
| T_ORDER.status | CREATED | Order created     |
| T_ORDER.status | PAID    | Payment completed |
| ...            | ...     | ...               |

---

## 6. External Integrations

| System         | Protocol              | Purpose                              | Notes |
| -------------- | --------------------- | ------------------------------------ | ----- |
| [PG Provider]  | [REST/SOAP]           | [Payment authorization/cancellation] |       |
| [ERP]          | [REST/SOAP/DB Link]   | [Sales slip transmission]            |       |
| [Notification] | [Kafka/RabbitMQ/HTTP] | [Event publishing]                   |       |

---

## 7. Glossary

> Define domain terms used in this project.
> Mapping between code variable/method names and business terms is especially useful.

| Term         | Definition                                                                | Code Representation         |
| ------------ | ------------------------------------------------------------------------- | --------------------------- |
| [Merchant]   | [Seller using the service]                                                | `merchant`, `T_MERCHANT`    |
| [Settlement] | [Calculation of payout after deducting fees from aggregated transactions] | `settlement`, `calculate()` |
| [Tax-free]   | [...]                                                                     | `TAX_FREE`, `isTaxFree()`   |

---

## 8. Known Issues / History

> Current bugs, past incident history, emergency patches, etc.
> Background information useful for analysis.

| Date      | Description                                  | Related Module | Notes                             |
| --------- | -------------------------------------------- | -------------- | --------------------------------- |
| [2024-03] | [Settlement amount mismatch]                 | [billing]      | [Tax-free + taxable mixed orders] |
| [2023-01] | [Emergency patch for tax calculation change] | [billing]      | [Commit: abc1234]                 |

---

## 9. Analysis Requests

> Describe what you specifically want to learn about this project.
> Questions beyond the standard Task types (Business Logic / State Transition / Functional Spec)
> are also welcome here.

- [ ] [e.g., I want to understand the full fee calculation flow in the billing module]
- [ ] [e.g., I want to know all possible order status transition paths]
- [ ] [e.g., I want to find the root cause of the settlement mismatch since the March 2024 patch]
