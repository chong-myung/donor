# Phase 6: 외부 연동 계획 (Alchemy Pay + XRPL)

## 목표

Mock 서비스로 구현된 결제(Payment)와 블록체인(Blockchain) 연동을 실제 외부 서비스로 교체한다. Alchemy Pay SDK/API를 통한 실제 결제 처리와 XRPL을 통한 실제 블록체인 트랜잭션을 구현한다.

## 선행 조건

- **Phase 3 완료**: DonationsModule에서 Mock 서비스가 정상 동작
- **Alchemy Pay SDK/API 문서 확보**
- **XRPL SDK 문서 확보**
- **테스트넷 API 키 및 지갑 준비**

## 현재 상태

| 항목 | 상태 |
|------|------|
| `IPaymentService` 인터페이스 | 구현됨 (Phase 3) |
| `IBlockchainService` 인터페이스 | 구현됨 (Phase 3) |
| MockPaymentService | 구현됨 (Phase 3) |
| MockBlockchainService | 구현됨 (Phase 3) |
| AlchemyPayService (실제 구현) | 미구현 |
| XrplBlockchainService (실제 구현) | 미구현 |

## 구현 방향

Phase 6는 Alchemy Pay SDK/API 문서와 XRPL SDK 문서가 확보된 후 별도 구현 계획을 수립한다. Mock 서비스의 인터페이스(`IPaymentService`, `IBlockchainService`)를 구현하는 방식으로, **기존 코드 변경 없이 DI token만 교체**하면 된다.

### 교체 방법

`src/modules/donations.module.ts`에서:

```typescript
// Mock → 실제로 교체
{ provide: 'IPaymentService', useClass: AlchemyPayService },     // MockPaymentService 대신
{ provide: 'IBlockchainService', useClass: XrplBlockchainService }, // MockBlockchainService 대신
```

### 예상 구현 파일

| 파일 | 설명 |
|------|------|
| `src/infrastructure/payment/alchemy-pay.service.ts` | Alchemy Pay API 실제 연동 |
| `src/infrastructure/blockchain/xrpl-blockchain.service.ts` | XRPL SDK 실제 연동 |
| `src/infrastructure/payment/alchemy-pay.config.ts` | Alchemy Pay 설정 (API Key 등) |
| `src/infrastructure/blockchain/xrpl.config.ts` | XRPL 네트워크 설정 |

### 필요 환경 변수

```env
# Alchemy Pay
ALCHEMY_PAY_API_KEY=xxx
ALCHEMY_PAY_SECRET=xxx
ALCHEMY_PAY_WEBHOOK_SECRET=xxx
ALCHEMY_PAY_ENVIRONMENT=testnet  # testnet | mainnet

# XRPL
XRPL_NETWORK=testnet  # testnet | mainnet
XRPL_PLATFORM_WALLET_ADDRESS=rPlatform...
XRPL_PLATFORM_WALLET_SECRET=sSecret...
```

### 구현 시 고려사항

1. **테스트넷 우선**: 모든 외부 연동은 테스트넷에서 먼저 검증
2. **환경 분리**: `ConfigService`를 통한 환경별 설정 관리
3. **에러 처리**: 외부 서비스 장애 시 graceful degradation
4. **재시도 로직**: 네트워크 오류 시 exponential backoff 적용
5. **로깅**: 모든 외부 API 호출에 대한 상세 로깅
6. **Webhook 보안**: HMAC 서명 검증으로 Webhook 진위 확인

## 검증 방법

- [ ] Alchemy Pay 테스트넷에서 체크아웃 URL 생성 확인
- [ ] Alchemy Pay Webhook 수신 및 검증 확인
- [ ] XRPL 테스트넷에서 트랜잭션 전송 확인
- [ ] 트랜잭션 상태 조회 확인
- [ ] 기존 Mock 테스트가 여전히 통과 (DI token만 교체)
- [ ] E2E 테스트: 기부 시작 → 결제 완료 → 블록체인 분배 전체 플로우
